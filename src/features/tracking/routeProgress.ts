import { nearestPointOnLine, splitLineAt, type LngLat } from './geo';

/**
 * Within this distance of the planned route, the puck is drawn ON the route
 * line. It stops the car drifting through buildings on a GPS wobble.
 */
export const SNAP_TOLERANCE_M = 40;

export type RouteProgress = {
  onRoute: boolean;
  /** Where to draw the vehicle: snapped when on route, raw otherwise. */
  display: LngLat;
  /** Distance from the planned route. A rendering hint only — see below. */
  offRouteMeters: number;
  /** Segment the vehicle has reached. Feed back in as `fromSegment`. */
  segment: number;
  /** The route still to drive. Null when off route — keep the last one. */
  remaining: LngLat[] | null;
};

/**
 * Where a fix sits relative to the planned route.
 *
 * This decides how the map LOOKS and nothing else. Whether a deviation
 * happened, and whether it affects the fare, is decided by the server from the
 * map-matched trace (Proposal 2.3). The client never computes that verdict.
 */
export function routeProgress(route: LngLat[], coord: LngLat, fromSegment = 0): RouteProgress {
  // One segment of backtrack so a fix that lands just behind a vertex still
  // snaps cleanly instead of reading as off route.
  const nearest = nearestPointOnLine(route, coord, Math.max(0, fromSegment - 1));

  if (!nearest) {
    return {
      onRoute: false,
      display: coord,
      offRouteMeters: 0,
      segment: fromSegment,
      remaining: null,
    };
  }

  const onRoute = nearest.distanceMeters <= SNAP_TOLERANCE_M;
  return {
    onRoute,
    display: onRoute ? nearest.point : coord,
    offRouteMeters: nearest.distanceMeters,
    segment: onRoute ? Math.max(fromSegment, nearest.segment) : fromSegment,
    remaining: onRoute ? splitLineAt(route, nearest).remaining : null,
  };
}
