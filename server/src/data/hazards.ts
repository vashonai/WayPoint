import {
  and,
  asc,
  eq,
  getTableColumns,
  inArray,
  isNull,
  lte,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import { gridDisk, latLngToCell } from 'h3-js';

import type { Db, Executor } from '../db/client';
import { lineSql, pointSql } from '../db/postgis';
import { hazardReports, hazards } from '../db/schema';
import type { LngLat } from '../domain/geo';
import { HAZARD_H3_RESOLUTION, NON_ROUTABLE_HAZARDS, type HazardType } from '../domain/hazards';
import { getCountry, hazardRule } from './countries';

export type Hazard = typeof hazards.$inferSelect;

/** Active now: not expired, not cleared, and inside its expiry window. */
const isActive = (now: Date) =>
  and(
    eq(hazards.status, 'active'),
    or(isNull(hazards.expiresAt), sql`${hazards.expiresAt} > ${now}`),
  );

export const hazardCell = ([lng, lat]: LngLat) => latLngToCell(lat, lng, HAZARD_H3_RESOLUTION);

/** Active hazards within `radiusM` metres of `point`, nearest first. */
export async function findActiveNear(
  exec: Executor,
  point: LngLat,
  radiusM: number,
  {
    countryCode,
    types,
    now = new Date(),
  }: { countryCode?: string; types?: HazardType[]; now?: Date } = {},
): Promise<(Hazard & { distanceM: number })[]> {
  const p = pointSql(point);
  return exec
    .select({
      ...getTableColumns(hazards),
      distanceM: sql<number>`ST_Distance(${hazards.location}, ${p})`.mapWith(Number),
    })
    .from(hazards)
    .where(
      and(
        isActive(now),
        sql`ST_DWithin(${hazards.location}, ${p}, ${radiusM})`,
        countryCode ? eq(hazards.countryCode, countryCode) : undefined,
        types?.length ? inArray(hazards.type, types) : undefined,
      ),
    )
    .orderBy(sql`ST_Distance(${hazards.location}, ${p})`);
}

/**
 * Active hazards within `bufferM` metres of a route, in the order a vehicle
 * meets them (`fraction` 0 = start, 1 = end).
 *
 * Feeds routing and deviation excusal, so it EXCLUDES traffic enforcement by
 * default — those reports are road awareness only and must never influence a
 * route (Proposal §2.2). Pass `includeNonRoutable` only for display.
 */
export async function findAlongRoute(
  exec: Executor,
  route: LngLat[],
  bufferM: number,
  {
    countryCode,
    includeNonRoutable = false,
    now = new Date(),
  }: { countryCode?: string; includeNonRoutable?: boolean; now?: Date } = {},
): Promise<(Hazard & { fraction: number })[]> {
  if (route.length < 2) throw new Error('A route needs at least two points');
  const line = lineSql(route);
  const fraction = sql<number>`ST_LineLocatePoint(${line}::geometry, ${hazards.location}::geometry)`;
  return exec
    .select({ ...getTableColumns(hazards), fraction: fraction.mapWith(Number) })
    .from(hazards)
    .where(
      and(
        isActive(now),
        sql`ST_DWithin(${hazards.location}, ${line}, ${bufferM})`,
        countryCode ? eq(hazards.countryCode, countryCode) : undefined,
        includeNonRoutable ? undefined : notInArray(hazards.type, [...NON_ROUTABLE_HAZARDS]),
      ),
    )
    .orderBy(asc(fraction));
}

export type ReportOutcome = 'created' | 'confirmed' | 'already_reported';

/**
 * Records a report, merging it into an existing hazard of the same type in
 * the same or a neighbouring H3 cell, or creating a new one.
 *
 * Concurrency: two drivers reporting the same pothole at once must produce
 * ONE hazard. Each report takes transaction-scoped advisory locks on its cell
 * and the six neighbours, in sorted order — overlapping reports serialise,
 * the fixed order rules out deadlock, and the locks release on commit. This
 * works through Neon's transaction-mode pooler, which session locks would not.
 */
export async function reportOrConfirm(
  db: Db,
  {
    type,
    point,
    reporterId,
    countryCode,
    photoR2Key = null,
    now = new Date(),
  }: {
    type: HazardType;
    point: LngLat;
    reporterId: string;
    countryCode: string;
    photoR2Key?: string | null;
    now?: Date;
  },
): Promise<{ hazard: Hazard; outcome: ReportOutcome }> {
  const country = await getCountry(db, countryCode);
  if (!country) throw new Error(`Unknown country ${countryCode}`);
  const { expiryMinutes } = hazardRule(country, type);
  const expiresAt =
    expiryMinutes === null ? null : new Date(now.getTime() + expiryMinutes * 60_000);

  const cell = hazardCell(point);
  const disk = gridDisk(cell, 1).sort();

  return db.transaction(async (tx) => {
    for (const c of disk) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`hazard:${type}:${c}`}, 0))`,
      );
    }

    const [existing] = await tx
      .select()
      .from(hazards)
      .where(
        and(
          eq(hazards.type, type),
          eq(hazards.countryCode, countryCode),
          inArray(hazards.h3Cell, disk),
          isActive(now),
        ),
      )
      .orderBy(sql`ST_Distance(${hazards.location}, ${pointSql(point)})`)
      .limit(1)
      .for('update');

    if (!existing) {
      const [hazard] = await tx
        .insert(hazards)
        .values({
          type,
          location: point,
          h3Cell: cell,
          countryCode,
          expiresAt,
          firstReportedAt: now,
          lastConfirmedAt: now,
        })
        .returning();
      if (!hazard) throw new Error('hazard insert returned nothing');
      await tx.insert(hazardReports).values({
        hazardId: hazard.id,
        reporterId,
        location: point,
        photoR2Key,
        reportedAt: now,
      });
      return { hazard, outcome: 'created' as const };
    }

    const inserted = await tx
      .insert(hazardReports)
      .values({ hazardId: existing.id, reporterId, location: point, photoR2Key, reportedAt: now })
      .onConflictDoNothing({ target: [hazardReports.hazardId, hazardReports.reporterId] })
      .returning({ id: hazardReports.id });
    if (inserted.length === 0) return { hazard: existing, outcome: 'already_reported' as const };

    const [hazard] = await tx
      .update(hazards)
      .set({
        confirmations: sql`${hazards.confirmations} + 1`,
        lastConfirmedAt: now,
        // A confirmation extends the window, never shortens it.
        expiresAt: expiresAt === null ? null : sql`greatest(${hazards.expiresAt}, ${expiresAt})`,
      })
      .where(eq(hazards.id, existing.id))
      .returning();
    if (!hazard) throw new Error('hazard update returned nothing');
    return { hazard, outcome: 'confirmed' as const };
  });
}

/** Marks hazards past their expiry window as expired. Returns how many. */
export async function expireStale(exec: Executor, now = new Date()): Promise<number> {
  const rows = await exec
    .update(hazards)
    .set({ status: 'expired' })
    .where(and(eq(hazards.status, 'active'), lte(hazards.expiresAt, now)))
    .returning({ id: hazards.id });
  return rows.length;
}
