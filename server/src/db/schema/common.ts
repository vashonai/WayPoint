import { pgEnum, timestamp, uuid } from 'drizzle-orm/pg-core';

import { HAZARD_TYPES } from '../../domain/hazards';
import { TRIP_STATUSES } from '../../domain/trips';

/**
 * Shared columns and enums. Column names are derived from the TS keys
 * (camelCase → snake_case) by the `casing` option on the client and in
 * drizzle.config.ts, so tables don't repeat them.
 */

export const id = () => uuid().primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const softDelete = {
  deletedAt: timestamp({ withTimezone: true }),
};

export const userRole = pgEnum('user_role', ['user', 'admin']);
export const userStatus = pgEnum('user_status', ['active', 'suspended']);

export const driverVerificationStatus = pgEnum('driver_verification_status', [
  'pending',
  'in_review',
  'verified',
  'suspended',
  'rejected',
]);
export const verificationLayerStatus = pgEnum('verification_layer_status', [
  'not_started',
  'pending',
  'passed',
  'failed',
]);
export const documentStatus = pgEnum('document_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
]);
export const vehicleSizeClass = pgEnum('vehicle_size_class', [
  'compact',
  'standard',
  'large',
  'van',
]);
export const vehicleStatus = pgEnum('vehicle_status', [
  'pending',
  'approved',
  'rejected',
  'inactive',
]);

export const tripStatus = pgEnum('trip_status', TRIP_STATUSES);
export const routeSnapshotKind = pgEnum('route_snapshot_kind', ['recommended', 'reroute']);
export const tripPointSource = pgEnum('trip_point_source', ['fg_socket', 'bg_batch']);

export const hazardType = pgEnum('hazard_type', HAZARD_TYPES);
export const hazardStatus = pgEnum('hazard_status', ['active', 'expired', 'cleared']);

export const deviationReviewStatus = pgEnum('deviation_review_status', [
  'none',
  'flagged',
  'reviewed_ok',
  'reviewed_violation',
]);

export const shareDuration = pgEnum('share_duration', ['this_trip', 'until_i_stop', 'time_limit']);
export const disputeStatus = pgEnum('dispute_status', [
  'open',
  'under_review',
  'resolved',
  'rejected',
]);
export const panicRole = pgEnum('panic_role', ['passenger', 'driver']);
export const panicEscalationStatus = pgEnum('panic_escalation_status', [
  'triggered',
  'acknowledged',
  'escalated',
  'resolved',
]);
