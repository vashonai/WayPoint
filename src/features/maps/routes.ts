import type { LngLat } from '../tracking';
import { googleRequest, MapsApiError } from './client';
import { decodePolyline } from './polyline';

export type DrivingRoute = {
  coords: LngLat[];
  distanceMeters: number;
  /** In current traffic. */
  durationSeconds: number;
  /** With no traffic. The difference is what a traffic-delay fare line explains. */
  staticDurationSeconds: number;
};

type ComputeRoutesResponse = {
  routes?: {
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    polyline?: { encodedPolyline?: string };
  }[];
};

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/**
 * A traffic-aware driving route, Routes API v2.
 *
 * STAND-IN FOR THE TRIP API. In production the server calls this, decodes the
 * polyline and saves it as the trip's route snapshot: the route a deviation is
 * judged against and a fare is quoted from must never be something a client
 * supplies. Until that endpoint exists, the app calls Google directly so the
 * maps show real roads. Swap the body of this function, not its callers.
 */
export async function computeDrivingRoute(
  origin: LngLat,
  destination: LngLat,
  signal?: AbortSignal,
): Promise<DrivingRoute> {
  const res = await googleRequest<ComputeRoutesResponse>(ROUTES_URL, {
    body: {
      origin: waypoint(origin),
      destination: waypoint(destination),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      // Full-detail geometry: the snap-to-route check is only as good as the line.
      polylineQuality: 'HIGH_QUALITY',
    },
    fieldMask:
      'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline',
    signal,
  });

  const route = res.routes?.[0];
  const encoded = route?.polyline?.encodedPolyline;
  if (!route || !encoded) throw new MapsApiError(404, 'No driving route found', 'NO_ROUTE');

  return {
    coords: decodePolyline(encoded),
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: parseDuration(route.duration),
    staticDurationSeconds: parseDuration(route.staticDuration ?? route.duration),
  };
}

const waypoint = ([lng, lat]: LngLat) => ({
  location: { latLng: { latitude: lat, longitude: lng } },
});

/** "367s" → 367. */
function parseDuration(d: string | undefined): number {
  return d ? Number.parseFloat(d) || 0 : 0;
}
