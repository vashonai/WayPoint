/**
 * The periodic housekeeping (`pnpm db:maintain`). Idempotent; run it at least
 * daily (where it runs is open question 6 in PLAN-DATA-LAYER.md).
 *
 *   - trip_points partitions for the next three months, so new fixes never
 *     land in the DEFAULT partition
 *   - hazards past their expiry window → expired
 *   - documents past their expiry date (approved or still pending) → expired
 */
import { sql } from 'drizzle-orm';

import { expireDocuments } from '../data/documents';
import { expireStale } from '../data/hazards';
import { getDb } from '../db/client';

export async function maintain(now = new Date()) {
  const db = getDb();
  const thisMonth = `${now.toISOString().slice(0, 7)}-01`;
  await db.execute(sql`select create_trip_points_partitions(${thisMonth}::date, 4)`);
  const hazardsExpired = await expireStale(db, now);
  const documentsExpired = await expireDocuments(db, now);
  return { hazardsExpired, documentsExpired };
}
