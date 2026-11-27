import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './auth';
import {
  documentStatus,
  driverVerificationStatus,
  id,
  softDelete,
  timestamps,
  vehicleSizeClass,
  vehicleStatus,
  verificationLayerStatus,
} from './common';

/**
 * A user who drives. Six-layer verification (Proposal §2.5); the onboarding
 * screens cover layers 1–3. Layer names are not fixed yet, so the columns
 * are numbered.
 */
export const drivers = pgTable(
  'drivers',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .unique()
      .references(() => users.id),
    verificationStatus: driverVerificationStatus().notNull().default('pending'),
    layer1Status: verificationLayerStatus().notNull().default('not_started'),
    layer2Status: verificationLayerStatus().notNull().default('not_started'),
    layer3Status: verificationLayerStatus().notNull().default('not_started'),
    layer4Status: verificationLayerStatus().notNull().default('not_started'),
    layer5Status: verificationLayerStatus().notNull().default('not_started'),
    layer6Status: verificationLayerStatus().notNull().default('not_started'),
    verifiedAt: timestamp({ withTimezone: true }),
    rating: numeric({ precision: 3, scale: 2, mode: 'number' }),
    ratingCount: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index().on(t.verificationStatus)],
);

/** One uploaded file of a document — e.g. the front of an ID. */
export type DocumentFile = { field: string; r2Key: string };

/**
 * A driver's verification document.
 *
 * `type` is the document slug from the driver's country config (e.g.
 * `police-record`), validated in the backend — not an enum, because each
 * market requires a different set (PLAN-DATA-LAYER.md, C7). Only R2 keys are
 * stored, never the files.
 */
export const driverDocuments = pgTable(
  'driver_documents',
  {
    id: id(),
    driverId: uuid()
      .notNull()
      .references(() => drivers.id),
    type: text().notNull(),
    files: jsonb().$type<DocumentFile[]>().notNull().default([]),
    /**
     * Non-file form values (expiry date, licence class). Do NOT store ID or
     * licence numbers here until encryption is decided (open question 5).
     */
    fields: jsonb().$type<Record<string, string>>().notNull().default({}),
    status: documentStatus().notNull().default('pending'),
    expiresAt: timestamp({ withTimezone: true }),
    reviewedBy: uuid().references(() => users.id),
    reviewedAt: timestamp({ withTimezone: true }),
    rejectionReason: text(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index().on(t.driverId), index().on(t.expiresAt), index().on(t.status)],
);

export type VehiclePhoto = {
  slot: 'front' | 'rear' | 'left' | 'right' | 'interior' | 'plate';
  r2Key: string;
};

export const vehicles = pgTable(
  'vehicles',
  {
    id: id(),
    driverId: uuid()
      .notNull()
      .references(() => drivers.id),
    make: text().notNull(),
    model: text().notNull(),
    year: integer().notNull(),
    colour: text().notNull(),
    plate: text().notNull(),
    sizeClass: vehicleSizeClass().notNull().default('standard'),
    photos: jsonb().$type<VehiclePhoto[]>().notNull().default([]),
    status: vehicleStatus().notNull().default('pending'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index().on(t.driverId),
    // One live registration per plate; a deleted vehicle frees it.
    uniqueIndex('vehicles_plate_live_unique')
      .on(sql`upper(${t.plate})`)
      .where(sql`${t.deletedAt} is null`),
  ],
);
