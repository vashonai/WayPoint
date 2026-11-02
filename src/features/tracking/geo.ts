/**
 * Just enough geometry for live tracking.
 *
 * The handful of operations the live map needs — distance, bearing, nearest
 * point on a line, split a line — written out rather than pulled from Turf.
 * Every one works on a local flat projection around the segment in question,
 * which is accurate to well under a metre at city scale. That is all a 40 m
 * snap tolerance needs; anything that must survive a dispute is computed by
 * the server's map matcher, never here.
 *
 * Coordinates are [lng, lat], GeoJSON order, so they drop straight into a
 * Mapbox ShapeSource when the real map lands.
 */

export type LngLat = [lng: number, lat: number];

const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Great-circle distance in metres. */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees clockwise from north, 0–360. */
export function bearingDeg(a: LngLat, b: LngLat): number {
  const φ1 = toRad(a[1]);
  const φ2 = toRad(b[1]);
  const Δλ = toRad(b[0] - a[0]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function lineLengthMeters(line: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += distanceMeters(line[i - 1]!, line[i]!);
  return total;
}

/** Metres east / north of `origin`. */
function toLocal(p: LngLat, origin: LngLat): [number, number] {
  return [
    toRad(p[0] - origin[0]) * EARTH_RADIUS_M * Math.cos(toRad(origin[1])),
    toRad(p[1] - origin[1]) * EARTH_RADIUS_M,
  ];
}

const lerp = (a: LngLat, b: LngLat, t: number): LngLat => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

export type NearestPoint = {
  point: LngLat;
  /** Index of the segment [segment, segment + 1] the point lies on. */
  segment: number;
  /** Distance from the query point to the line. */
  distanceMeters: number;
  /** Distance along the line from its start to `point`. */
  alongMeters: number;
};

/**
 * Closest point on a polyline to `p`.
 *
 * `fromSegment` skips segments behind the vehicle. A route that doubles back
 * on itself — common around Kingston's one-way grid — would otherwise let a
 * noisy fix snap to the wrong carriageway and send progress backwards.
 */
export function nearestPointOnLine(
  line: LngLat[],
  p: LngLat,
  fromSegment = 0,
): NearestPoint | null {
  const first = line[0];
  if (!first) return null;
  if (line.length === 1) {
    return { point: first, segment: 0, distanceMeters: distanceMeters(first, p), alongMeters: 0 };
  }

  let best: NearestPoint | null = null;
  let along = 0;

  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const segLen = distanceMeters(a, b);

    if (i >= fromSegment) {
      const [bx, by] = toLocal(b, a);
      const [px, py] = toLocal(p, a);
      const len2 = bx * bx + by * by;
      const t = len2 === 0 ? 0 : clamp((px * bx + py * by) / len2, 0, 1);
      const point = lerp(a, b, t);
      const d = distanceMeters(point, p);
      if (!best || d < best.distanceMeters) {
        best = { point, segment: i, distanceMeters: d, alongMeters: along + segLen * t };
      }
    }
    along += segLen;
  }

  return best;
}

/** The point `meters` along a line, and the bearing of the segment it is on. */
export function pointAlong(
  line: LngLat[],
  meters: number,
): { point: LngLat; segment: number; bearing: number } | null {
  const first = line[0];
  if (!first) return null;
  if (line.length === 1) return { point: first, segment: 0, bearing: 0 };

  let remaining = Math.max(0, meters);
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const segLen = distanceMeters(a, b);
    if (remaining <= segLen || i === line.length - 2) {
      const t = segLen === 0 ? 0 : clamp(remaining / segLen, 0, 1);
      return { point: lerp(a, b, t), segment: i, bearing: bearingDeg(a, b) };
    }
    remaining -= segLen;
  }
  return null;
}

/**
 * Splits a line at a point already found by `nearestPointOnLine`.
 * `taken` runs start → point; `remaining` runs point → end.
 */
export function splitLineAt(
  line: LngLat[],
  at: Pick<NearestPoint, 'point' | 'segment'>,
): { taken: LngLat[]; remaining: LngLat[] } {
  return {
    taken: [...line.slice(0, at.segment + 1), at.point],
    remaining: [at.point, ...line.slice(at.segment + 1)],
  };
}
