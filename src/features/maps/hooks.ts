import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

import type { CountryConfig } from '../country';
import type { LngLat } from '../tracking';
import { MapsApiError } from './client';
import { autocompletePlaces, nearestPlace, type Place } from './places';
import { computeDrivingRoute, type DrivingRoute } from './routes';

/** Retrying cannot fix a missing key or a route that doesn't exist. */
const retryable = (count: number, err: unknown) =>
  count < 2 && !(err instanceof MapsApiError && ['NO_KEY', 'NO_ROUTE'].includes(err.reason ?? ''));

export function useDrivingRoute(origin: LngLat | null, destination: LngLat | null) {
  return useQuery({
    queryKey: ['maps', 'route', origin, destination],
    queryFn: ({ signal }) => computeDrivingRoute(origin!, destination!, signal),
    enabled: !!origin && !!destination,
    staleTime: 5 * 60_000,
    retry: retryable,
  });
}

/**
 * The route to draw for a trip: Google's when it arrives, `fallback` when it
 * can't (no key, offline, no route). `route` is null only while the first
 * request is in flight — callers hold off live tracking until it settles, so
 * the simulated car doesn't restart on a different line.
 */
export function useTripRoute(
  origin: LngLat | null,
  destination: LngLat | null,
  fallback: LngLat[],
): { route: LngLat[] | null; details: DrivingRoute | null } {
  const q = useDrivingRoute(origin, destination);
  if (q.data) return { route: q.data.coords, details: q.data };
  if (q.isError || !origin || !destination) return { route: fallback, details: null };
  return { route: null, details: null };
}

/** Autocomplete for the search box, debounced so it fires once the typing pauses. */
export function usePlaceSuggestions({
  input,
  sessionToken,
  country,
  origin,
}: {
  input: string;
  sessionToken: string;
  country: CountryConfig;
  origin: LngLat | null;
}) {
  const query = useDebounced(input.trim(), 250);
  return useQuery({
    queryKey: ['maps', 'autocomplete', query, sessionToken, country.code],
    queryFn: ({ signal }) =>
      autocompletePlaces({ input: query, sessionToken, country, origin, signal }),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: retryable,
  });
}

/**
 * The phone's position as a pickup, labelled with the nearest named place.
 * Asks for location permission — call it where the passenger is choosing a
 * pickup, never at launch. Null if permission is refused.
 */
export async function locatePickup(): Promise<Place | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const coord: LngLat = [loc.coords.longitude, loc.coords.latitude];
  const near = await nearestPlace(coord).catch(() => null);
  return { id: null, name: 'Current location', address: near ? `Near ${near.name}` : '', coord };
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
