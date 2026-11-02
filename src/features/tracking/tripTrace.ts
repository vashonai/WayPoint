import { createFixFilter, type Fix } from './fixFilter';
import { createTraceOutbox, uploadTraceBatch } from './traceOutbox';

/**
 * The driver's two location paths, kept apart on purpose.
 *
 *   EVIDENCE  every good fix → queue → HTTP batch upload. Fed by the
 *             background task, so it keeps running when the driver switches
 *             apps or loses signal. This builds the trace the fare and any
 *             dispute are decided from.
 *   LIVE      while the app is on screen, each fix is also broadcast to the
 *             trip room so the passenger's car moves without waiting on a
 *             batch.
 *
 * The same fix can arrive by both paths; the server deduplicates by timestamp
 * and keeps whichever landed first.
 */

type TracePoint = { tripId: string; fix: Fix };

let activeTripId: string | null = null;
let filter = createFixFilter();

const outbox = createTraceOutbox<TracePoint>({
  send: async (batch) => {
    // A batch can straddle two trips if one ended offline. Upload per trip; if
    // a later group fails, earlier ones are re-sent next time and deduplicated.
    const byTrip = new Map<string, Fix[]>();
    for (const { tripId, fix } of batch) {
      byTrip.set(tripId, [...(byTrip.get(tripId) ?? []), fix]);
    }
    for (const [tripId, fixes] of byTrip) await uploadTraceBatch(tripId, fixes);
  },
});

export function beginTripTrace(tripId: string): void {
  activeTripId = tripId;
  filter = createFixFilter();
}

/**
 * Filters and queues fixes for the active trip.
 *
 * Fixes with no active trip are dropped. That includes a background delivery
 * after the OS killed and relaunched the app, until the active trip id is
 * persisted alongside the queue (MMKV — see README, Known gaps).
 */
export async function recordFixes(fixes: Fix[]): Promise<void> {
  const tripId = activeTripId;
  if (!tripId) return;
  const good = fixes.filter((f) => filter(f).ok).map((fix) => ({ tripId, fix }));
  if (good.length > 0) await outbox.push(...good);
}

/** Stops recording. Anything still queued keeps its trip id and uploads later. */
export async function endTripTrace(): Promise<void> {
  activeTripId = null;
  await outbox.flush();
}

export function pendingTracePoints(): number {
  return outbox.size();
}

/** Placeholder for the trip room broadcast — `socket.emit('loc', …)` or a Realtime channel. */
export function publishLiveFix(_tripId: string, _fix: Fix): void {}
