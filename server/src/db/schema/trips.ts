import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { FareComponent } from '../../domain/trips';
import { geographyLine, geographyPoint } from '../postgis';
import { users } from './auth';
import {
  deviationReviewStatus,
  id,
  routeSnapshotKind,
  timestamps,
  tripPointSource,
  tripStatus,
} from './common';
import { countries } from './countries';
import { drivers } from './drivers';
import { hazards } from './hazards';

/**
 * Money columns are integer ISO 4217 minor units (cents) of `currency` — J$1,180
 * is 118000 — whatever the app's display precision (PLAN-DATA-LAYER.md, C9).
 */
export const trips = pgTable(
  'trips',
  {
    id: id(),
    passengerId: uuid()
      .notNull()
      .references(() => users.id),
    driverId: uuid().references(() => drivers.id),
    countryCode: text()
      .notNull()
      .references(() => countries.code),
    status: tripStatus().notNull().default('requested'),
    pickup: geographyPoint().notNull(),
    pickupAddress: text(),
    dropoff: geographyPoint().notNull(),
    dropoffAddress: text(),
    requestedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    matchedAt: timestamp({ withTimezone: true }),
    startedAt: timestamp({ withTimezone: true }),
    endedAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    currency: text().notNull(),
    fareEstimateMinMinor: integer(),
    fareEstimateMaxMinor: integer(),
    finalFareMinor: integer(),
    /** The receipt's lines, in the shape the app's presentFare reads. */
    fareBreakdown: jsonb().$type<FareComponent[]>(),
    ...timestamps,
  },
  (t) => [
    index().on(t.passengerId),
    index().on(t.driverId),
    index().on(t.status),
    index().using('gist', t.pickup),
    index().using('gist', t.dropoff),
  ],
);

/**
 * The route a trip was quoted and judged against. FARE EVIDENCE: a trigger
 * rejects UPDATE and DELETE (migration 0002), so a snapshot can't be
 * rewritten after the fact. A reroute is a new row, never an edit.
 */
export const routeSnapshots = pgTable(
  'route_snapshots',
  {
    id: id(),
    tripId: uuid()
      .notNull()
      .references(() => trips.id),
    kind: routeSnapshotKind().notNull(),
    geometry: geographyLine().notNull(),
    distanceM: integer().notNull(),
    durationS: integer().notNull(),
    provider: text().notNull(),
    hazardsConsidered: uuid().array().notNull().default([]),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.tripId), index().using('gist', t.geometry)],
);

/**
 * Every raw GPS point of a trip. Partitioned by month on `recorded_at`
 * (migration 0002 — drizzle-kit can't express partitioning). The primary key
 * is (trip_id, recorded_at): it must include the partition key, and it is
 * exactly the dedupe key for the same fix arriving by socket and by batch.
 */
export const tripPoints = pgTable(
  'trip_points',
  {
    tripId: uuid()
      .notNull()
      .references(() => trips.id),
    recordedAt: timestamp({ withTimezone: true }).notNull(),
    location: geographyPoint().notNull(),
    /** m/s */
    speed: real(),
    /** Degrees clockwise from north. */
    heading: real(),
    /** Metres. */
    accuracy: real(),
    source: tripPointSource().notNull(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.recordedAt] }), index().using('gist', t.location)],
);

/** The trace snapped to roads by map matching. Filled after the trip. */
export const matchedTraces = pgTable(
  'matched_traces',
  {
    id: id(),
    tripId: uuid()
      .notNull()
      .unique()
      .references(() => trips.id),
    geometry: geographyLine().notNull(),
    distanceM: integer().notNull(),
    provider: text().notNull(),
    ...timestamps,
  },
  (t) => [index().using('gist', t.geometry)],
);

/**
 * A detected departure from the route snapshot. Flagged for review, never
 * treated as guilt (Proposal 2.3): GPS fails and roads close without notice.
 */
export const deviations = pgTable(
  'deviations',
  {
    id: id(),
    tripId: uuid()
      .notNull()
      .references(() => trips.id),
    detectedAt: timestamp({ withTimezone: true }).notNull(),
    location: geographyPoint().notNull(),
    distanceOffRouteM: real().notNull(),
    driverReason: text(),
    autoExcused: boolean().notNull().default(false),
    excusedByHazardId: uuid().references(() => hazards.id),
    reviewStatus: deviationReviewStatus().notNull().default('none'),
    ...timestamps,
  },
  (t) => [index().on(t.tripId), index().on(t.reviewStatus), index().using('gist', t.location)],
);

/**
 * A driver's photo evidence. The client's GPS and clock are ATTESTATIONS
 * (PLAN-DATA-LAYER.md, C12): kept as `client*`, beside the server's own
 * receipt time and the position the trace puts the car at.
 */
export const evidence = pgTable(
  'evidence',
  {
    id: id(),
    tripId: uuid()
      .notNull()
      .references(() => trips.id),
    deviationId: uuid().references(() => deviations.id),
    submittedBy: uuid()
      .notNull()
      .references(() => users.id),
    conditionType: text().notNull(),
    photoR2Key: text().notNull(),
    /** Where the trip trace puts the vehicle at `serverTimestamp`. Backend-filled. */
    location: geographyPoint(),
    clientLocation: geographyPoint(),
    clientTimestamp: timestamp({ withTimezone: true }),
    serverTimestamp: timestamp({ withTimezone: true }).notNull().defaultNow(),
    vehicleSpeedAtSubmit: real(),
  },
  (t) => [index().on(t.tripId), index().on(t.deviationId), index().using('gist', t.location)],
);
