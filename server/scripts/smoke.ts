/**
 * `pnpm db:smoke` — proves a migrated database works end to end, then leaves
 * it exactly as it found it.
 *
 * Everything runs in ONE transaction that is always rolled back, so this is
 * safe against any database, production included. It checks the things that
 * are easy to get wrong on a new host: PostGIS geography round-trips, distance
 * queries in metres, partition routing, (trip_id, recorded_at) dedupe, and
 * the append-only triggers.
 */
import { eq, sql } from 'drizzle-orm';
import { TransactionRollbackError } from 'drizzle-orm/errors';

import { createDb } from '../src/db/client';
import { pointSql } from '../src/db/postgis';
import { countries, hazards, routeSnapshots, tripPoints, trips, users } from '../src/db/schema';
import { env } from '../src/env';

const HALF_WAY_TREE: [number, number] = [-76.7967, 18.0124];
const NEW_KINGSTON: [number, number] = [-76.7849, 18.0126];

const { DATABASE_URL } = env.db();
const { db, pool } = createDb(DATABASE_URL);
const checks: string[] = [];
const ok = (label: string) => {
  checks.push(label);
  console.log(`  ✓ ${label}`);
};

console.log(`Smoke test against ${new URL(DATABASE_URL).host} (rolled back at the end)`);

try {
  const [info] = (
    await db.execute<{ pg: string; postgis: string }>(
      sql`select current_setting('server_version') as pg, postgis_lib_version() as postgis`,
    )
  ).rows;
  ok(`connected — Postgres ${info?.pg}, PostGIS ${info?.postgis}`);

  await db.transaction(async (tx) => {
    await tx.insert(countries).values({
      code: 'ZZ',
      name: 'Smoke test',
      currency: 'JMD',
      timezone: 'America/Jamaica',
      config: {} as never,
    });
    const [user] = await tx
      .insert(users)
      .values({ name: 'Smoke', email: 'smoke@test.invalid', countryCode: 'ZZ' })
      .returning();
    if (!user) throw new Error('user insert returned nothing');

    const [trip] = await tx
      .insert(trips)
      .values({
        passengerId: user.id,
        countryCode: 'ZZ',
        pickup: HALF_WAY_TREE,
        dropoff: NEW_KINGSTON,
        currency: 'JMD',
      })
      .returning();
    if (!trip) throw new Error('trip insert returned nothing');
    if (trip.pickup[0] !== HALF_WAY_TREE[0] || trip.pickup[1] !== HALF_WAY_TREE[1]) {
      throw new Error(`geography round-trip changed the point: ${trip.pickup}`);
    }
    ok('geography(Point) round-trips as [lng, lat]');

    const [dist] = (
      await tx.execute<{ m: number }>(
        sql`select ST_Distance(${pointSql(HALF_WAY_TREE)}, ${pointSql(NEW_KINGSTON)}) as m`,
      )
    ).rows;
    const metres = Number(dist?.m);
    if (!(metres > 1200 && metres < 1300)) throw new Error(`unexpected distance ${metres} m`);
    ok(`geography distance in metres (Half Way Tree → New Kingston ≈ ${Math.round(metres)} m)`);

    const now = new Date();
    const points = [0, 1, 2].map((i) => ({
      tripId: trip.id,
      recordedAt: new Date(now.getTime() + i * 1000),
      location: HALF_WAY_TREE,
      source: 'fg_socket' as const,
    }));
    await tx.insert(tripPoints).values(points).onConflictDoNothing();
    // The same fixes again, as the background batch would send them.
    await tx
      .insert(tripPoints)
      .values(points.map((p) => ({ ...p, source: 'bg_batch' as const })))
      .onConflictDoNothing();
    const stored = (
      await tx.execute<{ part: string; n: number }>(
        sql`select tableoid::regclass::text as part, count(*)::int as n
            from trip_points where trip_id = ${trip.id} group by 1`,
      )
    ).rows;
    if (stored.length !== 1 || stored[0]?.n !== 3) {
      throw new Error(`expected 3 deduped points in one partition, got ${JSON.stringify(stored)}`);
    }
    if (stored[0].part === 'trip_points_default') {
      throw new Error('current month has no partition — run `pnpm db:maintain`');
    }
    ok(`trip_points: 6 inserts → 3 rows, routed to partition ${stored[0].part}`);

    await tx.insert(hazards).values({
      type: 'pothole',
      location: [-76.7942, 18.0113],
      h3Cell: 'smoke',
      countryCode: 'ZZ',
    });
    const near = await tx
      .select({ id: hazards.id })
      .from(hazards)
      .where(sql`ST_DWithin(${hazards.location}, ${pointSql(HALF_WAY_TREE)}, 500)`);
    if (near.length !== 1) throw new Error(`ST_DWithin found ${near.length} hazards, expected 1`);
    ok('ST_DWithin on geography (GiST-indexed) finds a hazard 300 m away');

    const [snapshot] = await tx
      .insert(routeSnapshots)
      .values({
        tripId: trip.id,
        kind: 'recommended',
        geometry: [HALF_WAY_TREE, NEW_KINGSTON],
        distanceM: 1700,
        durationS: 360,
        provider: 'smoke',
      })
      .returning();
    if (!snapshot) throw new Error('snapshot insert returned nothing');
    let rejected = false;
    try {
      await tx.transaction(async (sp) => {
        await sp
          .update(routeSnapshots)
          .set({ distanceM: 1 })
          .where(eq(routeSnapshots.id, snapshot.id));
      });
    } catch (err) {
      rejected = /append-only/.test(String((err as { cause?: unknown }).cause ?? err));
    }
    if (!rejected) throw new Error('route_snapshots accepted an UPDATE');
    ok('route_snapshots rejects UPDATE (fare evidence is immutable)');

    tx.rollback();
  });
} catch (err) {
  if (!(err instanceof TransactionRollbackError)) {
    console.error(`  ✗ ${err instanceof Error ? err.message : err}`);
    await pool.end();
    process.exit(1);
  }
}

await pool.end();
console.log(`All ${checks.length} checks passed; nothing was written.`);
