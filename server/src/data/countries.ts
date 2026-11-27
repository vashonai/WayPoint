import { eq } from 'drizzle-orm';

import type { Executor } from '../db/client';
import { countries } from '../db/schema';
import { DEFAULT_HAZARD_RULES, type HazardRule, type HazardType } from '../domain/hazards';

export type Country = typeof countries.$inferSelect;

export async function getCountry(exec: Executor, code: string): Promise<Country | null> {
  const [row] = await exec.select().from(countries).where(eq(countries.code, code));
  return row ?? null;
}

/** A country's rule for a hazard type, falling back to the app taxonomy's default. */
export function hazardRule(country: Country, type: HazardType): HazardRule {
  return country.config.hazardRules?.[type] ?? DEFAULT_HAZARD_RULES[type];
}
