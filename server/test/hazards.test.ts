import { eq } from 'drizzle-orm';
import { cellToLatLng, gridDisk, gridRing } from 'h3-js';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  expireStale,
  findActiveNear,
  findAlongRoute,
  hazardCell,
  reportOrConfirm,
} from '../src/data/hazards';
import { closeDb } from '../src/db/client';
import { hazardReports, hazards } from '../src/db/schema';
import type { LngLat } from '../src/domain/geo';
import { db, HALF_WAY_TREE, makeUser, offset, resetData, seedJamaica } from './helpers';

const cellCentre = (cell: string): LngLat => {
  const [lat, lng] = cellToLatLng(cell);
  return [lng, lat];
};

const report = async (
  point: LngLat,
  type: Parameters<typeof reportOrConfirm>[1]['type'] = 'pothole',
  now?: Date,
) => {
  const reporter = await makeUser();
  return reportOrConfirm(db(), { type, point, reporterId: reporter.id, countryCode: 'JM', now });
};

beforeEach(async () => {
  await resetData();
  await seedJamaica();
});
afterAll(closeDb);

describe('reportOrConfirm — merging reports into hazards', () => {
  it('creates a hazard on the first report, with its H3 cell and expiry rule', async () => {
    const now = new Date('2026-11-27T12:00:00Z');
    const { hazard, outcome } = await report(HALF_WAY_TREE, 'pothole', now);
    expect(outcome).toBe('created');
    expect(hazard.h3Cell).toBe(hazardCell(HALF_WAY_TREE));
    expect(hazard.confirmations).toBe(1);
    // Potholes age out after 30 days (app taxonomy).
    expect(hazard.expiresAt?.toISOString()).toBe('2026-12-27T12:00:00.000Z');
  });

  it('merges a report of the same type in the same cell', async () => {
    const first = await report(HALF_WAY_TREE);
    const second = await report(offset(HALF_WAY_TREE, 20));
    expect(second.outcome).toBe('confirmed');
    expect(second.hazard.id).toBe(first.hazard.id);
    expect(second.hazard.confirmations).toBe(2);
  });

  it('merges a report from a neighbouring cell', async () => {
    const cell = hazardCell(HALF_WAY_TREE);
    const neighbour = gridRing(cell, 1)[0]!;
    const first = await report(cellCentre(cell));
    const second = await report(cellCentre(neighbour));
    expect(second.outcome).toBe('confirmed');
    expect(second.hazard.id).toBe(first.hazard.id);
  });

  it('does not merge across two cells', async () => {
    const cell = hazardCell(HALF_WAY_TREE);
    const twoAway = gridRing(cell, 2)[0]!;
    expect(gridDisk(cell, 1)).not.toContain(twoAway);
    await report(cellCentre(cell));
    const second = await report(cellCentre(twoAway));
    expect(second.outcome).toBe('created');
    expect(await db().select().from(hazards)).toHaveLength(2);
  });

  it('keeps different conditions at the same spot separate', async () => {
    await report(HALF_WAY_TREE, 'pothole');
    const flood = await report(HALF_WAY_TREE, 'flooding');
    expect(flood.outcome).toBe('created');
    expect(await db().select().from(hazards)).toHaveLength(2);
  });

  it('does not count the same reporter twice', async () => {
    const reporter = await makeUser();
    const args = {
      type: 'pothole' as const,
      point: HALF_WAY_TREE,
      reporterId: reporter.id,
      countryCode: 'JM',
    };
    await reportOrConfirm(db(), args);
    const again = await reportOrConfirm(db(), { ...args, point: offset(HALF_WAY_TREE, 10) });
    expect(again.outcome).toBe('already_reported');
    expect(again.hazard.confirmations).toBe(1);
    expect(await db().select().from(hazardReports)).toHaveLength(1);
  });

  it('starts a new hazard rather than reviving an expired one', async () => {
    const then = new Date('2026-01-01T00:00:00Z');
    const old = await report(HALF_WAY_TREE, 'broken_down_vehicle', then); // 45-minute window
    const later = await report(
      HALF_WAY_TREE,
      'broken_down_vehicle',
      new Date('2026-01-01T02:00:00Z'),
    );
    expect(later.outcome).toBe('created');
    expect(later.hazard.id).not.toBe(old.hazard.id);
  });

  it('produces ONE hazard when several drivers report the same spot at once', async () => {
    const reporters = await Promise.all(Array.from({ length: 6 }, () => makeUser()));
    const results = await Promise.all(
      reporters.map((r, i) =>
        reportOrConfirm(db(), {
          type: 'accident',
          point: offset(HALF_WAY_TREE, i * 5),
          reporterId: r.id,
          countryCode: 'JM',
        }),
      ),
    );
    expect(results.filter((r) => r.outcome === 'created')).toHaveLength(1);
    const rows = await db().select().from(hazards);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.confirmations).toBe(6);
  });

  it('extends the expiry window on confirmation, never shortens it', async () => {
    const t0 = new Date('2026-11-27T12:00:00Z');
    const first = await report(HALF_WAY_TREE, 'accident', t0); // 120 minutes
    const t1 = new Date('2026-11-27T13:00:00Z');
    const second = await report(HALF_WAY_TREE, 'accident', t1);
    expect(second.hazard.expiresAt!.getTime()).toBe(t1.getTime() + 120 * 60_000);
    expect(second.hazard.expiresAt!.getTime()).toBeGreaterThan(first.hazard.expiresAt!.getTime());
  });
});

describe('findActiveNear', () => {
  it('returns active hazards within the radius, nearest first', async () => {
    const far = await report(offset(HALF_WAY_TREE, 900), 'construction');
    const near = await report(offset(HALF_WAY_TREE, 200), 'flooding');
    await report(offset(HALF_WAY_TREE, 3000), 'pothole'); // outside 1 km

    const found = await findActiveNear(db(), HALF_WAY_TREE, 1000);
    expect(found.map((h) => h.id)).toEqual([near.hazard.id, far.hazard.id]);
    expect(found[0]!.distanceM).toBeGreaterThan(150);
    expect(found[0]!.distanceM).toBeLessThan(250);
  });

  it('leaves out expired and cleared hazards', async () => {
    const expired = await report(
      HALF_WAY_TREE,
      'broken_down_vehicle',
      new Date('2026-01-01T00:00:00Z'),
    );
    const cleared = await report(offset(HALF_WAY_TREE, 100), 'fallen_tree');
    await db().update(hazards).set({ status: 'cleared' }).where(eq(hazards.id, cleared.hazard.id));

    const found = await findActiveNear(db(), HALF_WAY_TREE, 1000);
    expect(found.map((h) => h.id)).not.toContain(expired.hazard.id);
    expect(found.map((h) => h.id)).not.toContain(cleared.hazard.id);
  });
});

describe('findAlongRoute', () => {
  // A 2 km route due east from Half Way Tree.
  const route: LngLat[] = [
    HALF_WAY_TREE,
    offset(HALF_WAY_TREE, 0, 1000),
    offset(HALF_WAY_TREE, 0, 2000),
  ];

  it('finds hazards within the buffer, in the order the vehicle meets them', async () => {
    const later = await report(offset(HALF_WAY_TREE, 30, 1500), 'construction');
    const sooner = await report(offset(HALF_WAY_TREE, -30, 400), 'flooding');
    await report(offset(HALF_WAY_TREE, 300, 1000), 'pothole'); // 300 m off the route

    const found = await findAlongRoute(db(), route, 100);
    expect(found.map((h) => h.id)).toEqual([sooner.hazard.id, later.hazard.id]);
    expect(found[0]!.fraction).toBeCloseTo(0.2, 1);
    expect(found[1]!.fraction).toBeCloseTo(0.75, 1);
  });

  it('never returns traffic enforcement unless asked to — it must not influence routing', async () => {
    const enforcement = await report(offset(HALF_WAY_TREE, 10, 800), 'traffic_enforcement');
    await report(offset(HALF_WAY_TREE, 10, 1200), 'accident');

    const forRouting = await findAlongRoute(db(), route, 100);
    expect(forRouting.map((h) => h.type)).toEqual(['accident']);

    const forDisplay = await findAlongRoute(db(), route, 100, { includeNonRoutable: true });
    expect(forDisplay.map((h) => h.id)).toContain(enforcement.hazard.id);
  });
});

describe('expireStale', () => {
  it('marks hazards past their window as expired, and leaves the rest', async () => {
    const stale = await report(
      HALF_WAY_TREE,
      'broken_down_vehicle',
      new Date('2026-01-01T00:00:00Z'),
    );
    const fresh = await report(offset(HALF_WAY_TREE, 2000), 'pothole');
    const untilCleared = await report(offset(HALF_WAY_TREE, 4000), 'road_closure');

    expect(await expireStale(db())).toBe(1);
    const statuses = Object.fromEntries(
      (await db().select({ id: hazards.id, status: hazards.status }).from(hazards)).map((h) => [
        h.id,
        h.status,
      ]),
    );
    expect(statuses[stale.hazard.id]).toBe('expired');
    expect(statuses[fresh.hazard.id]).toBe('active');
    expect(statuses[untilCleared.hazard.id]).toBe('active');
  });
});
