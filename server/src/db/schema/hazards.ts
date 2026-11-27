import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { geographyPoint } from '../postgis';
import { users } from './auth';
import { hazardStatus, hazardType, id, timestamps } from './common';
import { countries } from './countries';

/**
 * A road condition, merged from one or more reports. `h3Cell` is the
 * resolution-9 cell of `location`, computed in application code (h3-js) so
 * the database needs nothing beyond PostGIS.
 */
export const hazards = pgTable(
  'hazards',
  {
    id: id(),
    type: hazardType().notNull(),
    location: geographyPoint().notNull(),
    h3Cell: text().notNull(),
    status: hazardStatus().notNull().default('active'),
    confirmations: integer().notNull().default(1),
    firstReportedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastConfirmedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Null = stays active until cleared. */
    expiresAt: timestamp({ withTimezone: true }),
    clearedAt: timestamp({ withTimezone: true }),
    countryCode: text()
      .notNull()
      .references(() => countries.code),
    ...timestamps,
  },
  (t) => [
    index().using('gist', t.location),
    index().on(t.status, t.expiresAt),
    index().on(t.h3Cell),
    index().on(t.countryCode),
  ],
);

/** One report per reporter per hazard: a second tap from the same person isn't a confirmation. */
export const hazardReports = pgTable(
  'hazard_reports',
  {
    id: id(),
    hazardId: uuid()
      .notNull()
      .references(() => hazards.id),
    reporterId: uuid()
      .notNull()
      .references(() => users.id),
    location: geographyPoint().notNull(),
    photoR2Key: text(),
    reportedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.hazardId, t.reporterId),
    index().on(t.reporterId),
    index().using('gist', t.location),
  ],
);
