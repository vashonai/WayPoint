import { sql } from 'drizzle-orm';

import type { Executor } from './client';

/**
 * Empties every application table. DEV AND TEST ONLY — callers must check the
 * target first (see scripts/seed.ts). TRUNCATE is not a row operation, so it
 * passes the append-only triggers on route_snapshots and audit_log by design.
 */
export async function truncateAll(exec: Executor): Promise<void> {
  const { rows } = await exec.execute<{ tablename: string }>(
    sql`select tablename from pg_tables
        where schemaname = 'public' and tablename <> 'spatial_ref_sys'
          and tablename not like 'trip\\_points\\_%'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await exec.execute(sql.raw(`TRUNCATE ${list} RESTART IDENTITY CASCADE`));
}

/** True when a connection URL (Postgres or Valkey) points at this machine. */
export function isLocalUrl(url: string): boolean {
  const host = new URL(url).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}
