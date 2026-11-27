import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { insertPointsBatch } from '../src/data/tracking';
import { closeDb } from '../src/db/client';
import {
  createValkey,
  nearestDrivers,
  removeDriver,
  setDriverPosition,
  type ValkeyClient,
} from '../src/live/valkey';
import { db, HALF_WAY_TREE, makeTrip, makeUser, offset, resetData, seedJamaica } from './helpers';

let v: ValkeyClient;

beforeAll(() => {
  v = createValkey();
});
beforeEach(async () => {
  await resetData();
  await seedJamaica();
  await v.flushdb();
});
afterAll(async () => {
  await v.quit();
  await closeDb();
});

describe('insertPointsBatch', () => {
  it('drops points already stored, across batches and within one', async () => {
    const passenger = await makeUser();
    const trip = await makeTrip(passenger.id, HALF_WAY_TREE, offset(HALF_WAY_TREE, 1000));
    const t0 = Date.now();
    const fixes = [0, 1, 2, 3].map((i) => ({
      recordedAt: new Date(t0 + i * 2000),
      location: offset(HALF_WAY_TREE, i * 15),
      speed: 7.5,
      heading: 0,
      accuracy: 6,
    }));

    // Live socket delivers the first three…
    const live = await insertPointsBatch(
      db(),
      trip.id,
      fixes.slice(0, 3).map((f) => ({ ...f, source: 'fg_socket' as const })),
    );
    expect(live).toEqual({ inserted: 3, duplicates: 0 });

    // …then the background batch re-sends everything, with one fix twice.
    const batch = await insertPointsBatch(
      db(),
      trip.id,
      [...fixes, fixes[3]!].map((f) => ({ ...f, source: 'bg_batch' as const })),
    );
    expect(batch).toEqual({ inserted: 1, duplicates: 4 });

    const [{ n } = { n: 0 }] = (
      await db().execute<{ n: number }>(
        sql`select count(*)::int as n from trip_points where trip_id = ${trip.id}`,
      )
    ).rows;
    expect(n).toBe(4);
  });

  it('routes points to their month, and stragglers to the default partition', async () => {
    const passenger = await makeUser();
    const trip = await makeTrip(passenger.id, HALF_WAY_TREE, offset(HALF_WAY_TREE, 1000));
    await insertPointsBatch(db(), trip.id, [
      { recordedAt: new Date(), location: HALF_WAY_TREE, source: 'bg_batch' },
      // A phone with its clock set years back.
      { recordedAt: new Date('2019-03-01T00:00:00Z'), location: HALF_WAY_TREE, source: 'bg_batch' },
    ]);
    const { rows } = await db().execute<{ part: string }>(
      sql`select tableoid::regclass::text as part from trip_points where trip_id = ${trip.id} order by recorded_at`,
    );
    const thisMonth = new Date().toISOString().slice(0, 7).replace('-', '_');
    expect(rows.map((r) => r.part)).toEqual(['trip_points_default', `trip_points_${thisMonth}`]);
  });
});

describe('live driver positions', () => {
  it('returns online drivers within the radius, nearest first', async () => {
    await setDriverPosition(v, {
      driverId: 'far',
      countryCode: 'JM',
      location: offset(HALF_WAY_TREE, 1800),
    });
    await setDriverPosition(v, {
      driverId: 'near',
      countryCode: 'JM',
      location: offset(HALF_WAY_TREE, 300),
    });
    await setDriverPosition(v, {
      driverId: 'out',
      countryCode: 'JM',
      location: offset(HALF_WAY_TREE, 6000),
    });

    const found = await nearestDrivers(v, {
      countryCode: 'JM',
      location: HALF_WAY_TREE,
      radiusKm: 2,
    });
    expect(found.map((d) => d.driverId)).toEqual(['near', 'far']);
    expect(found[0]!.distanceKm).toBeCloseTo(0.3, 1);
  });

  it('keeps markets apart', async () => {
    await setDriverPosition(v, { driverId: 'jm', countryCode: 'JM', location: HALF_WAY_TREE });
    const found = await nearestDrivers(v, {
      countryCode: 'TT',
      location: HALF_WAY_TREE,
      radiusKm: 5,
    });
    expect(found).toEqual([]);
  });

  it('drops a driver whose online flag lapsed, and cleans up the position', async () => {
    await setDriverPosition(v, { driverId: 'live', countryCode: 'JM', location: HALF_WAY_TREE });
    await setDriverPosition(v, {
      driverId: 'gone',
      countryCode: 'JM',
      location: offset(HALF_WAY_TREE, 100),
    });
    await v.del('driver:online:gone'); // as if its TTL ran out

    const found = await nearestDrivers(v, {
      countryCode: 'JM',
      location: HALF_WAY_TREE,
      radiusKm: 1,
    });
    expect(found.map((d) => d.driverId)).toEqual(['live']);
    expect(await v.zscore('drivers:geo:JM', 'gone')).toBeNull();
  });

  it('removeDriver takes a driver out of matching at once', async () => {
    await setDriverPosition(v, { driverId: 'd1', countryCode: 'JM', location: HALF_WAY_TREE });
    await removeDriver(v, { driverId: 'd1', countryCode: 'JM' });
    expect(
      await nearestDrivers(v, { countryCode: 'JM', location: HALF_WAY_TREE, radiusKm: 1 }),
    ).toEqual([]);
  });

  it('expires the online flag on its own', async () => {
    await setDriverPosition(v, {
      driverId: 'd1',
      countryCode: 'JM',
      location: HALF_WAY_TREE,
      ttlSeconds: 30,
    });
    const ttl = await v.ttl('driver:online:d1');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(30);
  });
});
