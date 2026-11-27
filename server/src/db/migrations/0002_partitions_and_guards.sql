-- ── trip_points: monthly partitions ─────────────────────────────────────────
-- Creates `months` monthly partitions starting at the month containing
-- `from_month`. Boundaries are UTC midnights, whatever the session timezone.
-- Idempotent. Call it ahead of time (src/jobs/maintain.ts): once rows for a
-- month have landed in the DEFAULT partition, that month can't be created
-- until they are moved.
CREATE OR REPLACE FUNCTION create_trip_points_partitions(from_month date, months integer)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  m date := date_trunc('month', from_month)::date;
BEGIN
  FOR i IN 0 .. months - 1 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF trip_points FOR VALUES FROM (%L) TO (%L)',
      'trip_points_' || to_char(m, 'YYYY_MM'),
      m::text || ' 00:00:00+00',
      (m + interval '1 month')::date::text || ' 00:00:00+00'
    );
    m := (m + interval '1 month')::date;
  END LOOP;
END;
$$;
--> statement-breakpoint
-- Anything outside the created months (a phone with a wrong clock, a batch
-- uploaded long after the fact) lands here instead of failing the insert.
CREATE TABLE IF NOT EXISTS trip_points_default PARTITION OF trip_points DEFAULT;
--> statement-breakpoint
SELECT create_trip_points_partitions(
  (date_trunc('month', now() AT TIME ZONE 'UTC') - interval '1 month')::date,
  4
);
--> statement-breakpoint
-- ── Evidence that must never be rewritten ───────────────────────────────────
-- route_snapshots are fare evidence; audit_log is append-only. Row triggers
-- reject UPDATE and DELETE for every role and code path. TRUNCATE is not a row
-- operation and is not blocked, so dev/test resets still work — revoke
-- TRUNCATE from the application role in staging and production.
CREATE OR REPLACE FUNCTION forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER route_snapshots_immutable
  BEFORE UPDATE OR DELETE ON route_snapshots
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
