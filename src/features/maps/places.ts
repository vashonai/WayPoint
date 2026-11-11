import type { CountryConfig } from '../country';
import type { LngLat } from '../tracking';
import { googleRequest, MapsApiError } from './client';

/** A resolved place: something a trip can start or end at. */
export type Place = {
  /** Google place id. Null for a raw GPS position. */
  id: string | null;
  name: string;
  address: string;
  coord: LngLat;
};

export type PlaceSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  /** From the passenger's position, when known. */
  distanceMeters: number | null;
};

const PLACES = 'https://places.googleapis.com/v1';

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
      distanceMeters?: number;
    };
  }[];
};

type PlaceResponse = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
};

/**
 * A billing session for one search: every keystroke's autocomplete plus the
 * final details lookup share it, and Google bills them as one. Start a new one
 * after each `fetchPlace`.
 */
export function newSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Place suggestions as the passenger types. Restricted to the active market,
 * biased towards its centre, and ranked by distance from the passenger.
 */
export async function autocompletePlaces({
  input,
  sessionToken,
  country,
  origin,
  signal,
}: {
  input: string;
  sessionToken: string;
  country: CountryConfig;
  origin?: LngLat | null;
  signal?: AbortSignal;
}): Promise<PlaceSuggestion[]> {
  const [lng, lat] = origin ?? country.map.center;
  const res = await googleRequest<AutocompleteResponse>(`${PLACES}/places:autocomplete`, {
    body: {
      input,
      sessionToken,
      includedRegionCodes: [country.code.toLowerCase()],
      languageCode: country.locale,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: country.map.searchRadiusMeters,
        },
      },
      ...(origin ? { origin: { latitude: origin[1], longitude: origin[0] } } : {}),
    },
    signal,
  });

  return (res.suggestions ?? []).flatMap(({ placePrediction: p }) =>
    p
      ? [
          {
            placeId: p.placeId,
            primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
            secondary: p.structuredFormat?.secondaryText?.text ?? '',
            distanceMeters: p.distanceMeters ?? null,
          },
        ]
      : [],
  );
}

/** Resolves a suggestion to coordinates. Ends the session token's billing session. */
export async function fetchPlace(
  placeId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<Place> {
  const res = await googleRequest<PlaceResponse>(
    `${PLACES}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    { method: 'GET', fieldMask: 'id,displayName,formattedAddress,location', signal },
  );
  const place = toPlace(res);
  if (!place) throw new MapsApiError(404, 'Place has no location', 'NO_LOCATION');
  return place;
}

/**
 * The nearest named place to a GPS position, to label "Current location"
 * with something a driver recognises. The pickup stays the GPS point itself.
 */
export async function nearestPlace(coord: LngLat, signal?: AbortSignal): Promise<Place | null> {
  const res = await googleRequest<{ places?: PlaceResponse[] }>(`${PLACES}/places:searchNearby`, {
    body: {
      locationRestriction: {
        circle: { center: { latitude: coord[1], longitude: coord[0] }, radius: 100 },
      },
      maxResultCount: 1,
      rankPreference: 'DISTANCE',
    },
    fieldMask: 'places.id,places.displayName,places.formattedAddress,places.location',
    signal,
  });
  const first = res.places?.[0];
  return first ? toPlace(first) : null;
}

/** Null without a location — a [0, 0] fallback would put a pickup in the Gulf of Guinea. */
function toPlace(p: PlaceResponse): Place | null {
  if (!p.location) return null;
  return {
    id: p.id,
    name: p.displayName?.text ?? p.formattedAddress ?? 'Selected place',
    address: p.formattedAddress ?? '',
    coord: [p.location.longitude, p.location.latitude],
  };
}
