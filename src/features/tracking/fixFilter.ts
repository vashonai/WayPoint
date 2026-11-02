import { distanceMeters, type LngLat } from './geo';

/** One GPS reading, normalised away from any particular location library. */
export type Fix = {
  coord: LngLat;
  /** Horizontal accuracy radius in metres. Null when the platform withholds it. */
  accuracy: number | null;
  /** Degrees clockwise from north. Null when unknown or the vehicle is stationary. */
  heading: number | null;
  /** Metres per second. */
  speed: number | null;
  /** Milliseconds since epoch — the moment the fix was taken, not received. */
  timestamp: number;
};

/** Fixes with a wider accuracy radius than this are discarded. */
export const MAX_ACCURACY_M = 30;

/** 200 km/h. Nothing on a Jamaican road legitimately exceeds it. */
export const MAX_SPEED_MPS = 200 / 3.6;

/**
 * After this many consecutive "impossible jump" rejections, the filter assumes
 * the LAST ACCEPTED fix was the outlier and re-anchors on the new position.
 * Without this, one bad fix that slipped through would freeze the puck forever.
 */
export const JUMP_RESET_AFTER = 5;

export type FixVerdict =
  { ok: true } | { ok: false; reason: 'inaccurate' | 'stale' | 'impossible_jump' };

/**
 * Creates a stateful filter for one trip's fix stream.
 *
 * Rejects fixes that are imprecise, arrive out of order, or imply a speed no
 * car can reach. Unknown accuracy counts as imprecise — a fix that cannot say
 * how good it is cannot be trusted to draw a route someone may be billed for.
 */
export function createFixFilter() {
  let last: Fix | null = null;
  let jumpRejects = 0;

  return function check(fix: Fix): FixVerdict {
    if (fix.accuracy === null || fix.accuracy > MAX_ACCURACY_M) {
      return { ok: false, reason: 'inaccurate' };
    }

    if (last) {
      const dt = (fix.timestamp - last.timestamp) / 1000;
      if (dt <= 0) return { ok: false, reason: 'stale' };

      const speed = distanceMeters(last.coord, fix.coord) / dt;
      if (speed > MAX_SPEED_MPS && jumpRejects < JUMP_RESET_AFTER - 1) {
        jumpRejects++;
        return { ok: false, reason: 'impossible_jump' };
      }
    }

    jumpRejects = 0;
    last = fix;
    return { ok: true };
  };
}

export type FixFilter = ReturnType<typeof createFixFilter>;
