import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { geographyPoint } from '../postgis';
import { users } from './auth';
import {
  disputeStatus,
  id,
  panicEscalationStatus,
  panicRole,
  shareDuration,
  softDelete,
  timestamps,
} from './common';
import { trips } from './trips';

export const trustedContacts = pgTable(
  'trusted_contacts',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    name: text().notNull(),
    phone: text().notNull(),
    relationship: text(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index().on(t.userId)],
);

/**
 * A Share My Ride link. Only the token's hash is stored. `tripId` is null for
 * "until I stop it", which outlives any one trip (PLAN-DATA-LAYER.md, C10);
 * `expiresAt` is null for the same reason. Revocation is `revokedAt`.
 */
export const shareSessions = pgTable(
  'share_sessions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    tripId: uuid().references(() => trips.id),
    contactId: uuid()
      .notNull()
      .references(() => trustedContacts.id),
    duration: shareDuration().notNull(),
    tokenHash: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId), index().on(t.tripId)],
);

export const disputes = pgTable(
  'disputes',
  {
    id: id(),
    tripId: uuid()
      .notNull()
      .references(() => trips.id),
    openedBy: uuid()
      .notNull()
      .references(() => users.id),
    reason: text().notNull(),
    status: disputeStatus().notNull().default('open'),
    resolution: text(),
    notes: text(),
    resolvedBy: uuid().references(() => users.id),
    resolvedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.tripId), index().on(t.status)],
);

/** Never deleted. `location` is null when the phone had no fix at the time. */
export const panicEvents = pgTable(
  'panic_events',
  {
    id: id(),
    tripId: uuid()
      .notNull()
      .references(() => trips.id),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    role: panicRole().notNull(),
    location: geographyPoint(),
    escalationStatus: panicEscalationStatus().notNull().default('triggered'),
    acknowledgedAt: timestamp({ withTimezone: true }),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.tripId), index().on(t.userId), index().using('gist', t.location)],
);

/**
 * Append-only: a trigger rejects UPDATE and DELETE (migration 0002).
 * `actorId` is null for system actions. `entityId` is text so it can hold a
 * country code as well as a UUID.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    actorId: uuid().references(() => users.id),
    action: text().notNull(),
    entity: text().notNull(),
    entityId: text().notNull(),
    data: jsonb().$type<Record<string, unknown>>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.entity, t.entityId), index().on(t.actorId), index().on(t.createdAt)],
);
