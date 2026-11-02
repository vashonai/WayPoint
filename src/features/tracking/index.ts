/**
 * The tracking feature's public surface.
 *
 * Live position for the trip map: filter raw GPS, snap it to the planned
 * route, split the route into "taken" and "remaining", and buffer the raw
 * trace for upload, in the foreground and from the background task.
 * Rendering lives in components/LiveMap; state in store/tracking.store.
 */
export {
  bearingDeg,
  distanceMeters,
  lineLengthMeters,
  nearestPointOnLine,
  pointAlong,
  splitLineAt,
  type LngLat,
  type NearestPoint,
} from './geo';
export {
  createFixFilter,
  JUMP_RESET_AFTER,
  MAX_ACCURACY_M,
  MAX_SPEED_MPS,
  type Fix,
  type FixFilter,
  type FixVerdict,
} from './fixFilter';
export { routeProgress, SNAP_TOLERANCE_M, type RouteProgress } from './routeProgress';
export { createTraceOutbox, uploadTraceBatch, type TraceOutbox } from './traceOutbox';
export {
  beginTripTrace,
  endTripTrace,
  pendingTracePoints,
  publishLiveFix,
  recordFixes,
} from './tripTrace';
export {
  backgroundTrackingSupported,
  requestTripLocationAccess,
  startBackgroundTracking,
  stopBackgroundTracking,
  TRIP_LOCATION_TASK,
  type LocationAccess,
} from './backgroundTask';
export {
  fromLocationObject,
  simulateFixes,
  watchDeviceFixes,
  type FixListener,
  type StopFn,
} from './sources';
