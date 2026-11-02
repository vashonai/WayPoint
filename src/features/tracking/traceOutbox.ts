import type { Fix } from './fixFilter';

export type TraceOutbox<T = Fix> = {
  /** Queues items and tries to send everything queued. Never throws. */
  push: (...items: T[]) => Promise<void>;
  /** Sends everything queued, in order, batch by batch. Never throws. */
  flush: () => Promise<void>;
  size: () => number;
};

/**
 * The driver's trip trace, buffered against dead zones.
 *
 * Every accepted fix keeps the timestamp it was TAKEN with, and nothing leaves
 * the queue until the server has acknowledged it. A run through the Blue
 * Mountains with no signal therefore uploads as one late batch rather than a
 * gap — which matters, because the server's map-matched trace is what sets the
 * fare distance and settles disputes.
 *
 * Raw fixes are sent, not snapped ones: the server re-snaps the whole trace
 * against real roads, and client-side snapping would only hide evidence.
 *
 * Production: the queue is MMKV-backed so it survives the app being killed
 * mid-trip, and `flush` is also called from the NetInfo reconnect listener.
 */
export function createTraceOutbox<T = Fix>({
  send,
  maxBatch = 200,
}: {
  send: (batch: T[]) => Promise<void>;
  maxBatch?: number;
}): TraceOutbox<T> {
  let queue: T[] = [];
  let inFlight = false;

  async function flush() {
    if (inFlight) return;
    inFlight = true;
    try {
      while (queue.length > 0) {
        const batch = queue.slice(0, maxBatch);
        await send(batch);
        queue = queue.slice(batch.length);
      }
    } catch {
      // Offline or rejected. Everything stays queued for the next attempt.
    } finally {
      inFlight = false;
    }
  }

  return {
    push: (...items) => {
      queue.push(...items);
      return flush();
    },
    flush,
    size: () => queue.length,
  };
}

/** Placeholder for `POST /trips/:id/points`, the location service's batch ingest. */
export async function uploadTraceBatch(_tripId: string, _batch: Fix[]): Promise<void> {
  return Promise.resolve();
}
