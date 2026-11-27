import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

import type { LngLat } from '../domain/geo';

/**
 * PostGIS columns as Drizzle custom types.
 *
 * Coordinates are [lng, lat] — GeoJSON order, the same as the app — and the
 * database type is geography(…, 4326), so distances are in metres.
 *
 * Writes go as EWKT text, which Postgres casts to geography itself. Reads come
 * back as hex EWKB, parsed below; no ST_AsGeoJSON wrapper needed in queries.
 */
export const geographyPoint = customType<{ data: LngLat; driverData: string }>({
  dataType: () => 'geography(Point,4326)',
  toDriver: (coord) => pointEwkt(coord),
  fromDriver: (value) => {
    const g = parseEwkb(value);
    if (g.type !== 'Point') throw new Error(`Expected a Point, got ${g.type}`);
    return g.coords;
  },
});

export const geographyLine = customType<{ data: LngLat[]; driverData: string }>({
  dataType: () => 'geography(LineString,4326)',
  toDriver: (coords) => lineEwkt(coords),
  fromDriver: (value) => {
    const g = parseEwkb(value);
    if (g.type !== 'LineString') throw new Error(`Expected a LineString, got ${g.type}`);
    return g.coords;
  },
});

export const pointEwkt = ([lng, lat]: LngLat) => `SRID=4326;POINT(${lng} ${lat})`;

export const lineEwkt = (coords: LngLat[]) =>
  `SRID=4326;LINESTRING(${coords.map(([lng, lat]) => `${lng} ${lat}`).join(',')})`;

/** A point as a SQL geography value, for raw query fragments. */
export const pointSql = (coord: LngLat) => sql`${pointEwkt(coord)}::geography`;

/** A line as a SQL geography value, for raw query fragments. */
export const lineSql = (coords: LngLat[]) => sql`${lineEwkt(coords)}::geography`;

type Parsed = { type: 'Point'; coords: LngLat } | { type: 'LineString'; coords: LngLat[] };

const WKB_POINT = 1;
const WKB_LINESTRING = 2;
const EWKB_SRID = 0x20000000;
const EWKB_M = 0x40000000;
const EWKB_Z = 0x80000000;

/**
 * Parses hex (E)WKB for the two geometry types this schema stores. Extra Z/M
 * ordinates are read past; only lng/lat are kept.
 */
export function parseEwkb(hex: string): Parsed {
  const buf = Buffer.from(hex, 'hex');
  const le = buf.readUInt8(0) === 1;
  const u32 = (o: number) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const f64 = (o: number) => (le ? buf.readDoubleLE(o) : buf.readDoubleBE(o));

  const rawType = u32(1);
  // ISO WKB encodes Z/M as +1000/+2000/+3000 on the type code; EWKB uses flags.
  const iso = rawType & 0xffff;
  const kind = iso % 1000;
  const hasZ = (rawType & EWKB_Z) !== 0 || Math.floor(iso / 1000) === 1 || iso >= 3000;
  const hasM = (rawType & EWKB_M) !== 0 || Math.floor(iso / 1000) === 2 || iso >= 3000;
  const dims = 2 + (hasZ ? 1 : 0) + (hasM ? 1 : 0);

  let offset = 5;
  if ((rawType & EWKB_SRID) !== 0) offset += 4;

  const readCoord = (): LngLat => {
    const coord: LngLat = [f64(offset), f64(offset + 8)];
    offset += dims * 8;
    return coord;
  };

  if (kind === WKB_POINT) return { type: 'Point', coords: readCoord() };
  if (kind === WKB_LINESTRING) {
    const n = u32(offset);
    offset += 4;
    return { type: 'LineString', coords: Array.from({ length: n }, readCoord) };
  }
  throw new Error(`Unsupported WKB geometry type ${kind}`);
}
