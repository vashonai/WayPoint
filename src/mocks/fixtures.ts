import type { FinalFare, Quote } from '../features/fare/presentFare';
import type { HazardPin } from '../components/MapSurface';
import type { Place } from '../features/maps';
import type { LngLat } from '../features/tracking';

/**
 * Kingston fixtures for the frontend scaffold.
 *
 * These stand in for server responses. Note that even here the fare arrives
 * PRE-COMPUTED with reasons attached — the client is never handed rates to
 * multiply, because doing so once would make it possible to do so always.
 */

export const DEMO_QUOTE: Quote = {
  low: 850,
  high: 1050,
  currencyCode: 'JMD',
};

export const DEMO_FINAL_FARE: FinalFare = {
  total: 1180,
  currencyCode: 'JMD',
  components: [
    { kind: 'base', label: 'Base fare', amount: 300 },
    { kind: 'distance', label: 'Distance — 7.4 km', amount: 520 },
    { kind: 'time', label: 'Travel time — 22 min', amount: 220 },
    {
      kind: 'traffic',
      label: 'Traffic delay',
      amount: 140,
      reason: '14 minutes of heavy traffic on Half Way Tree Road',
      verified: true,
    },
  ],
};

export const DEMO_DRIVER = {
  name: 'Marlon B.',
  rating: 4.9,
  trips: 1284,
  vehicle: 'Toyota Axio — Silver',
  plate: '9134 KJ',
  etaMinutes: 4,
};

export const DEMO_TRIP_ID = 'trip_kgn_0142';

export const DEMO_CONTACT = {
  id: 'c1',
  name: 'Mikayla J.',
  relationship: 'Mother',
  initials: 'MJ',
};

export const DEMO_TRIP_HISTORY = [
  { id: 't1', from: 'Half Way Tree', to: 'New Kingston', date: '6 Sep', fare: 1180, disputed: false },
  { id: 't2', from: 'Liguanea', to: 'Cross Roads', date: '4 Sep', fare: 940, disputed: false },
  { id: 't3', from: 'Papine', to: 'Downtown', date: '1 Sep', fare: 1620, disputed: true },
];

/**
 * Planned route, Half Way Tree → New Kingston: [lng, lat] vertices.
 * Illustrative — traced by hand. Only drawn when Google's route is unavailable
 * (no key, offline); otherwise the Routes API supplies the real road geometry.
 */
export const DEMO_ROUTE: LngLat[] = [
  [-76.7967, 18.0124],
  [-76.7951, 18.0115],
  [-76.7934, 18.0105],
  [-76.7915, 18.0094],
  [-76.7897, 18.0083],
  [-76.7878, 18.0073],
  [-76.7866, 18.0068],
  [-76.7861, 18.0081],
  [-76.7857, 18.0097],
  [-76.7853, 18.0113],
  [-76.7849, 18.0126],
];

export const DEMO_PICKUP: LngLat = [-76.7967, 18.0124];
export const DEMO_DESTINATION: LngLat = [-76.7849, 18.0126];

/** The demo trip's ends, as the trip record will carry them. */
export const DEMO_PICKUP_PLACE: Place = {
  id: null,
  name: 'Half Way Tree',
  address: 'Half Way Tree, Kingston',
  coord: DEMO_PICKUP,
};
export const DEMO_DESTINATION_PLACE: Place = {
  id: null,
  name: 'New Kingston',
  address: 'Knutsford Blvd, Kingston',
  coord: DEMO_DESTINATION,
};

/** Hazards along the demo route, standing in for `/hazards?bbox=…`. */
export const DEMO_HAZARD_PINS: HazardPin[] = [
  { id: 'hp1', type: 'pothole', coord: [-76.7942, 18.0113] },
  { id: 'hp2', type: 'construction', coord: [-76.7905, 18.0092] },
  { id: 'hp3', type: 'flooding', coord: [-76.7879, 18.0061] },
  { id: 'hp4', type: 'accident', coord: [-76.7858, 18.009] },
  { id: 'hp5', type: 'enforcement', coord: [-76.7851, 18.0119] },
];
