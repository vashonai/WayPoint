/**
 * Server trip statuses and the transitions between them.
 *
 * Mirrors the app's trip machine (src/features/trip/machine/tripMachine.ts).
 * The app's `driver_waiting` is `driver_arrived` here, and `arrived` (at the
 * destination, fare settling) exists on both sides (PLAN-DATA-LAYER.md, C4).
 * The app's `idle` and `quoting` are local only — there is no trip yet.
 */
export const TRIP_STATUSES = [
  'requested',
  'matched',
  'en_route',
  'driver_arrived',
  'in_progress',
  'arrived',
  'completed',
  'cancelled',
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

/** Allowed next statuses. Anything else is rejected by `transitionTrip`. */
export const TRIP_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  requested: ['matched', 'cancelled'],
  matched: ['en_route', 'driver_arrived', 'cancelled', 'requested'],
  en_route: ['driver_arrived', 'in_progress', 'cancelled', 'requested'],
  driver_arrived: ['in_progress', 'cancelled', 'requested'],
  // No cancel once in progress: ending a trip early is a support and safety
  // flow, not a client action — same rule as the app.
  in_progress: ['arrived'],
  arrived: ['completed'],
  completed: [],
  cancelled: [],
};

/** One line of a server-computed fare, in the shape the app's receipt reads. */
export type FareComponent = {
  kind: 'base' | 'distance' | 'time' | 'traffic' | 'wait' | 'adjustment';
  label: string;
  /**
   * Integer ISO 4217 minor units (cents): J$1,180 is 118000. The country
   * config's `currency.decimals` is display precision only (JMD shows 0).
   */
  amountMinor: number;
  reason?: string;
  verified?: boolean;
};
