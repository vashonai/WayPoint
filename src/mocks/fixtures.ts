import type { FinalFare, Quote } from '../features/fare/presentFare';

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
