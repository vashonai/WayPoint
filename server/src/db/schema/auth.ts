import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { id, softDelete, timestamps, userRole, userStatus } from './common';
import { countries } from './countries';

/**
 * Better Auth's four tables, under this schema's names (`modelName` in
 * src/auth/auth.ts). `users` doubles as Better Auth's user model: its first
 * columns are the ones Better Auth and its phone-number plugin require; the
 * rest are Waypoint's, registered as `additionalFields`.
 *
 * There is no passenger/driver role. Passenger vs driver is a per-session
 * MODE — a user is a driver when a `drivers` row exists (PLAN-DATA-LAYER.md, C1).
 */
export const users = pgTable(
  'users',
  {
    id: id(),
    // Better Auth core
    name: text().notNull(),
    /** Required and unique by Better Auth. Phone-only sign-ups get a placeholder (C3). */
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    // Better Auth phone-number plugin
    phoneNumber: text().unique(),
    phoneNumberVerified: boolean().notNull().default(false),
    // Waypoint
    role: userRole().notNull().default('user'),
    status: userStatus().notNull().default('active'),
    /** Set during onboarding. Never defaulted — nothing hardcodes a market. */
    countryCode: text().references(() => countries.code),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index().on(t.countryCode)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier)],
);
