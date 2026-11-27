import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import type { CountryConfig } from '../../../../src/features/country/types';
import type { HazardRule, HazardType } from '../../domain/hazards';
import { timestamps } from './common';

/**
 * The app's CountryConfig (src/features/country/types.ts), minus the fields
 * that have their own columns, plus the server-side hazard rules.
 */
export type CountryRecordConfig = Omit<CountryConfig, 'code' | 'name'> & {
  hazardRules: Record<HazardType, HazardRule>;
};

/**
 * One row per market. Keyed by ISO 3166-1 alpha-2 code rather than a UUID:
 * the code is stable, human-readable in every other table, and what the app
 * already uses.
 */
export const countries = pgTable('countries', {
  code: text().primaryKey(),
  name: text().notNull(),
  currency: text().notNull(),
  timezone: text().notNull(),
  config: jsonb().$type<CountryRecordConfig>().notNull(),
  ...timestamps,
});
