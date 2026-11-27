import { and, eq, inArray, or } from 'drizzle-orm';

import type { Db, Executor } from '../db/client';
import { drivers, routeSnapshots, trips } from '../db/schema';
import type { LngLat } from '../domain/geo';
import { TRIP_TRANSITIONS, type FareComponent, type TripStatus } from '../domain/trips';
import { recordAudit } from './audit';

export type Trip = typeof trips.$inferSelect;
export type RouteSnapshot = typeof routeSnapshots.$inferSelect;

export class TripTransitionError extends Error {}

export async function createTrip(
  exec: Executor,
  input: {
    passengerId: string;
    countryCode: string;
    currency: string;
    pickup: LngLat;
    pickupAddress?: string | null;
    dropoff: LngLat;
    dropoffAddress?: string | null;
    fareEstimateMinMinor?: number | null;
    fareEstimateMaxMinor?: number | null;
  },
): Promise<Trip> {
  const [trip] = await exec.insert(trips).values(input).returning();
  if (!trip) throw new Error('trip insert returned nothing');
  return trip;
}

/**
 * A trip, only if `userId` is its passenger or its driver. The backend's
 * replacement for a row-level-security policy: every read path for one
 * user's trip goes through here, so there is one place to get it right.
 */
export async function getTripForParticipant(
  exec: Executor,
  tripId: string,
  userId: string,
): Promise<Trip | null> {
  const [row] = await exec
    .select({ trip: trips })
    .from(trips)
    .leftJoin(drivers, eq(drivers.id, trips.driverId))
    .where(
      and(eq(trips.id, tripId), or(eq(trips.passengerId, userId), eq(drivers.userId, userId))),
    );
  return row?.trip ?? null;
}

/** Statuses a trip may move to `to` from. */
const fromStatusesFor = (to: TripStatus) =>
  (Object.entries(TRIP_TRANSITIONS) as [TripStatus, readonly TripStatus[]][])
    .filter(([, next]) => next.includes(to))
    .map(([from]) => from);

/** The timestamp each status stamps, if any. */
const STAMP: Partial<Record<TripStatus, 'matchedAt' | 'startedAt' | 'endedAt' | 'cancelledAt'>> = {
  matched: 'matchedAt',
  in_progress: 'startedAt',
  arrived: 'endedAt',
  cancelled: 'cancelledAt',
};

/**
 * Moves a trip to `to`, if the transition is allowed from its CURRENT status.
 *
 * The check is in the UPDATE's WHERE clause, not a read-then-write, so two
 * racing requests (a cancel and a driver's "start trip") can't both succeed.
 */
export async function transitionTrip(
  db: Db,
  {
    tripId,
    to,
    actorId,
    driverId,
    now = new Date(),
  }: { tripId: string; to: TripStatus; actorId: string | null; driverId?: string; now?: Date },
): Promise<Trip> {
  const from = fromStatusesFor(to);
  if (to === 'matched' && !driverId) throw new TripTransitionError('Matching needs a driver');
  if (to === 'completed') throw new TripTransitionError('Use settleFare to complete a trip');

  return db.transaction(async (tx) => {
    const stamp = STAMP[to];
    const [trip] = await tx
      .update(trips)
      .set({
        status: to,
        ...(stamp ? { [stamp]: now } : {}),
        ...(to === 'matched' ? { driverId } : {}),
        // Back to matching after a driver drops: the trip has no driver again.
        ...(to === 'requested' ? { driverId: null, matchedAt: null } : {}),
      })
      .where(and(eq(trips.id, tripId), inArray(trips.status, from)))
      .returning();
    if (!trip) {
      const [current] = await tx
        .select({ status: trips.status })
        .from(trips)
        .where(eq(trips.id, tripId));
      throw new TripTransitionError(
        current ? `Trip ${tripId} can't go from ${current.status} to ${to}` : `No trip ${tripId}`,
      );
    }
    await recordAudit(tx, {
      actorId,
      action: `trip.${to}`,
      entity: 'trip',
      entityId: trip.id,
      data: driverId ? { driverId } : undefined,
    });
    return trip;
  });
}

/**
 * Stores the route a trip is quoted and judged against. Immutable once written
 * (a database trigger enforces it): a reroute is a new snapshot, not an edit.
 */
export async function saveRouteSnapshot(
  exec: Executor,
  input: {
    tripId: string;
    kind: 'recommended' | 'reroute';
    geometry: LngLat[];
    distanceM: number;
    durationS: number;
    provider: string;
    hazardsConsidered?: string[];
  },
): Promise<RouteSnapshot> {
  if (input.geometry.length < 2) throw new Error('A route needs at least two points');
  const [snapshot] = await exec.insert(routeSnapshots).values(input).returning();
  if (!snapshot) throw new Error('snapshot insert returned nothing');
  return snapshot;
}

/**
 * Settles the fare at the end of a trip: stores the server-computed lines and
 * their total, and completes the trip. The client never supplies an amount.
 */
export async function settleFare(
  db: Db,
  {
    tripId,
    components,
    actorId,
  }: { tripId: string; components: FareComponent[]; actorId: string | null },
): Promise<Trip> {
  if (components.length === 0) throw new Error('A fare needs at least one line');
  if (components.some((c) => !Number.isInteger(c.amountMinor))) {
    throw new Error('Fare amounts must be integer minor units');
  }
  const total = components.reduce((sum, c) => sum + c.amountMinor, 0);

  return db.transaction(async (tx) => {
    const [trip] = await tx
      .update(trips)
      .set({ status: 'completed', finalFareMinor: total, fareBreakdown: components })
      .where(and(eq(trips.id, tripId), eq(trips.status, 'arrived')))
      .returning();
    if (!trip) throw new TripTransitionError(`Trip ${tripId} is not awaiting its fare`);
    await recordAudit(tx, {
      actorId,
      action: 'trip.fare_settled',
      entity: 'trip',
      entityId: trip.id,
      data: { totalMinor: total, currency: trip.currency },
    });
    return trip;
  });
}
