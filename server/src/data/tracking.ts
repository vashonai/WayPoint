import type { Executor } from '../db/client';
import { tripPoints } from '../db/schema';
import type { LngLat } from '../domain/geo';

export type TracePointInput = {
  /** When the phone took the fix — not when the server received it. */
  recordedAt: Date;
  location: LngLat;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  source: 'fg_socket' | 'bg_batch';
};

/** 8 columns × 500 rows stays well under Postgres's 65,535 bind-parameter limit. */
const CHUNK = 500;

/**
 * Stores a trip's GPS points, skipping any already stored.
 *
 * The same fix can arrive twice — live over the socket and again in the
 * background batch — so (trip_id, recorded_at) is the primary key and
 * duplicates are dropped with ON CONFLICT DO NOTHING, including duplicates
 * within one batch. Points route to their month's partition automatically.
 */
export async function insertPointsBatch(
  exec: Executor,
  tripId: string,
  points: TracePointInput[],
): Promise<{ inserted: number; duplicates: number }> {
  let inserted = 0;
  for (let i = 0; i < points.length; i += CHUNK) {
    const rows = points.slice(i, i + CHUNK).map((p) => ({
      tripId,
      recordedAt: p.recordedAt,
      location: p.location,
      speed: p.speed ?? null,
      heading: p.heading ?? null,
      accuracy: p.accuracy ?? null,
      source: p.source,
    }));
    const result = await exec
      .insert(tripPoints)
      .values(rows)
      .onConflictDoNothing({ target: [tripPoints.tripId, tripPoints.recordedAt] })
      .returning({ recordedAt: tripPoints.recordedAt });
    inserted += result.length;
  }
  return { inserted, duplicates: points.length - inserted };
}

/** Live positions live in Valkey; re-exported so tracking has one entry point. */
export { nearestDrivers, removeDriver, setDriverPosition, type NearbyDriver } from '../live/valkey';
