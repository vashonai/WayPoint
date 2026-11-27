import { getDb } from '../src/db/client';
import { truncateAll } from '../src/db/reset';
import { countries, drivers, trips, users } from '../src/db/schema';
import type { LngLat } from '../src/domain/geo';
import { DEFAULT_HAZARD_RULES } from '../src/domain/hazards';
import { JM } from '../../src/features/country/configs';

export const db = () => getDb();

/** Empties every table between tests. */
export const resetData = () => truncateAll(db());

export async function seedJamaica(): Promise<void> {
  const { code, name, ...config } = JM;
  await db()
    .insert(countries)
    .values({
      code,
      name,
      currency: JM.currency.code,
      timezone: 'America/Jamaica',
      config: { ...config, hazardRules: DEFAULT_HAZARD_RULES },
    })
    .onConflictDoNothing();
}

let n = 0;
export async function makeUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  n += 1;
  const [user] = await db()
    .insert(users)
    .values({
      name: `User ${n}`,
      email: `user${n}-${Date.now()}@test.invalid`,
      countryCode: 'JM',
      ...overrides,
    })
    .returning();
  return user!;
}

export async function makeDriver() {
  const user = await makeUser();
  const [driver] = await db()
    .insert(drivers)
    .values({ userId: user.id, verificationStatus: 'verified' })
    .returning();
  return { user, driver: driver! };
}

export async function makeTrip(passengerId: string, pickup: LngLat, dropoff: LngLat) {
  const [trip] = await db()
    .insert(trips)
    .values({ passengerId, countryCode: 'JM', currency: 'JMD', pickup, dropoff })
    .returning();
  return trip!;
}

/** A point `metres` north and `east` metres east of `p`. Good enough at city scale. */
export function offset([lng, lat]: LngLat, north: number, east = 0): LngLat {
  return [lng + east / (111_320 * Math.cos((lat * Math.PI) / 180)), lat + north / 111_320];
}

export const HALF_WAY_TREE: LngLat = [-76.7967, 18.0124];
