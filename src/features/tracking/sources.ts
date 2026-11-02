import * as Location from 'expo-location';

import type { Fix } from './fixFilter';
import { distanceMeters, lineLengthMeters, pointAlong, type LngLat } from './geo';

export type FixListener = (fix: Fix) => void;
export type StopFn = () => void;

/** Converts an expo-location reading into a Fix. */
export function fromLocationObject(loc: Location.LocationObject): Fix {
  const { latitude, longitude, accuracy, heading, speed } = loc.coords;
  return {
    coord: [longitude, latitude],
    accuracy,
    // iOS reports -1 for "no valid heading".
    heading: heading !== null && heading >= 0 ? heading : null,
    speed: speed !== null && speed >= 0 ? speed : null,
    timestamp: loc.timestamp,
  };
}

/**
 * The phone's own GPS, at trip-grade settings: best accuracy, about once a
 * second or every 5 m. `timeInterval` is honoured on Android only; iOS paces
 * itself from `distanceInterval`.
 *
 * Foreground only. Tracking that survives the driver switching apps needs
 * `Location.startLocationUpdatesAsync` with a task defined through
 * expo-task-manager, plus a development build — not available in Expo Go.
 */
export async function watchDeviceFixes(onFix: FixListener): Promise<StopFn> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('location_permission_denied');

  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 5,
    },
    (loc) => onFix(fromLocationObject(loc)),
  );
  return () => sub.remove();
}

/**
 * A believable drive along `route`, for the scaffold.
 *
 * Stands in for the trip room's `driver_location` broadcasts until there is a
 * server. It deliberately includes GPS jitter and the occasional garbage fix,
 * so the filter and the snapping are exercised every time the screen opens.
 */
export function simulateFixes(
  route: LngLat[],
  onFix: FixListener,
  {
    speedMps = 9,
    intervalMs = 1000,
    jitterM = 6,
    badFixEvery = 12,
    onArrive,
  }: {
    speedMps?: number;
    intervalMs?: number;
    jitterM?: number;
    badFixEvery?: number;
    onArrive?: () => void;
  } = {},
): StopFn {
  const total = lineLengthMeters(route);
  let along = 0;
  let tick = 0;
  let prev: LngLat | null = null;

  const timer = setInterval(() => {
    const at = pointAlong(route, along);
    if (!at) return;

    tick++;
    const bad = badFixEvery > 0 && tick % badFixEvery === 0;
    const coord = jitter(at.point, bad ? 120 : jitterM);
    onFix({
      coord,
      accuracy: bad ? 65 : 4 + Math.random() * 8,
      heading: at.bearing,
      speed: prev ? distanceMeters(prev, coord) / (intervalMs / 1000) : 0,
      timestamp: Date.now(),
    });
    if (!bad) prev = coord;

    if (along >= total) {
      clearInterval(timer);
      onArrive?.();
      return;
    }
    along = Math.min(total, along + speedMps * (intervalMs / 1000));
  }, intervalMs);

  return () => clearInterval(timer);
}

/** Offsets a coordinate by up to `meters` in a random direction. */
function jitter([lng, lat]: LngLat, meters: number): LngLat {
  const r = Math.random() * meters;
  const θ = Math.random() * 2 * Math.PI;
  const dLat = (r * Math.cos(θ)) / 111_320;
  const dLng = (r * Math.sin(θ)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lng + dLng, lat + dLat];
}
