import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import {
  bearingDeg,
  createFixFilter,
  distanceMeters,
  routeProgress,
  simulateFixes,
  watchDeviceFixes,
  type Fix,
  type FixFilter,
  type FixVerdict,
  type LngLat,
  type StopFn,
} from '../features/tracking';

/**
 * The LIVE line — drawn on the phone from fixes as they arrive.
 *
 * Fast and slightly messy by design. The OFFICIAL route taken is the server's
 * map-matched trace; it sets the fare distance, appears on the receipt, and
 * replaces this line at trip end. That one is server-owned and belongs in
 * TanStack Query. This one is a rendering of a stream, so it lives here and
 * dies with the trip.
 */

/** Trail points closer together than this are dropped. Keeps a long trip's path short. */
const TRAIL_MIN_STEP_M = 3;

/** Below this speed, GPS heading is noise; derive it from movement instead. */
const MIN_HEADING_SPEED_MPS = 1.5;

type TrackingState = {
  route: LngLat[];
  /** The route still to drive. Shrinks as the trail grows. */
  remaining: LngLat[];
  /** Breadcrumbs: where the vehicle has actually been. */
  trail: LngLat[];
  /** Where to draw the vehicle. Null until the first good fix. */
  position: LngLat | null;
  /** Degrees clockwise from north. */
  heading: number;
  onRoute: boolean;
  offRouteMeters: number;
  /** Timestamp of the last accepted fix — drives the glide duration. */
  lastFixAt: number | null;
  rejected: number;

  segment: number;
  filter: FixFilter;

  /** Starts a fresh trip on `route`. */
  load: (route: LngLat[]) => void;
  ingest: (fix: Fix) => FixVerdict;
  reset: () => void;
};

const initial = () => ({
  route: [] as LngLat[],
  remaining: [] as LngLat[],
  trail: [] as LngLat[],
  position: null,
  heading: 0,
  onRoute: true,
  offRouteMeters: 0,
  lastFixAt: null,
  rejected: 0,
  segment: 0,
  filter: createFixFilter(),
});

export const useTrackingStore = create<TrackingState>((set, get) => ({
  ...initial(),

  load: (route) => set({ ...initial(), route, remaining: route }),

  ingest: (fix) => {
    const s = get();
    const verdict = s.filter(fix);
    if (!verdict.ok) {
      set({ rejected: s.rejected + 1 });
      return verdict;
    }

    const progress = routeProgress(s.route, fix.coord, s.segment);
    const last = s.trail[s.trail.length - 1];
    const moved = last ? distanceMeters(last, progress.display) : Infinity;

    set({
      position: progress.display,
      heading: pickHeading(s, fix, progress.onRoute, progress.segment, progress.display),
      onRoute: progress.onRoute,
      offRouteMeters: progress.offRouteMeters,
      segment: progress.segment,
      remaining: progress.remaining ?? s.remaining,
      trail: moved >= TRAIL_MIN_STEP_M ? [...s.trail, progress.display] : s.trail,
      lastFixAt: fix.timestamp,
    });
    return verdict;
  },

  reset: () => set(initial()),
}));

/**
 * On route, the arrow follows the road — steadier than any compass. Off route,
 * trust GPS heading only at speed, else infer it from the last step, else hold.
 */
function pickHeading(
  s: TrackingState,
  fix: Fix,
  onRoute: boolean,
  segment: number,
  display: LngLat,
): number {
  const a = s.route[segment];
  const b = s.route[segment + 1];
  if (onRoute && a && b) return bearingDeg(a, b);
  if (fix.heading !== null && (fix.speed ?? 0) >= MIN_HEADING_SPEED_MPS) return fix.heading;
  if (s.position && distanceMeters(s.position, display) > 2) return bearingDeg(s.position, display);
  return s.heading;
}

export type FixSource = 'device' | 'simulated';

/**
 * Runs one trip's fix stream into the store while `enabled`.
 *
 * Stopping — on unmount, or when the trip leaves a live phase — clears the
 * store. That mirrors the server removing viewers from the trip room when the
 * ride ends: access to the live position expires with the trip.
 *
 * `onAccepted` sees every fix that passed the filter, raw and unsnapped. The
 * driver app feeds it to the trace outbox.
 */
export function useLiveTracking({
  route,
  source,
  enabled = true,
  onAccepted,
}: {
  route: LngLat[];
  source: FixSource;
  enabled?: boolean;
  onAccepted?: (fix: Fix) => void;
}) {
  const onAcceptedRef = useRef(onAccepted);
  useEffect(() => {
    onAcceptedRef.current = onAccepted;
  });

  useEffect(() => {
    if (!enabled) return;

    const store = useTrackingStore.getState();
    store.load(route);

    const handle = (fix: Fix) => {
      if (useTrackingStore.getState().ingest(fix).ok) onAcceptedRef.current?.(fix);
    };

    let stop: StopFn | undefined;
    let cancelled = false;

    if (source === 'simulated') {
      stop = simulateFixes(route, handle);
    } else {
      watchDeviceFixes(handle)
        .then((s) => (cancelled ? s() : (stop = s)))
        .catch(() => {
          // Permission denied. The map still shows the planned route.
        });
    }

    return () => {
      cancelled = true;
      stop?.();
      useTrackingStore.getState().reset();
    };
  }, [route, source, enabled]);
}
