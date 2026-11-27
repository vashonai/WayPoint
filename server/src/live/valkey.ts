import Valkey from 'iovalkey';

import type { LngLat } from '../domain/geo';
import { env } from '../env';

/**
 * Live state in Valkey — never in Postgres, which keeps only the trace.
 *
 *   drivers:geo:{country}   GEO set of online drivers' latest positions
 *   driver:online:{id}      online flag; expires unless refreshed, so a phone
 *                           that dies or loses signal drops out of matching
 *   trip:{id}               pub/sub channel for the trip room (Socket.IO)
 */

export type ValkeyClient = Valkey;

export function createValkey(url = env.valkey().VALKEY_URL): Valkey {
  return new Valkey(url, { maxRetriesPerRequest: 3 });
}

const geoKey = (countryCode: string) => `drivers:geo:${countryCode}`;
const onlineKey = (driverId: string) => `driver:online:${driverId}`;
export const tripChannel = (tripId: string) => `trip:${tripId}`;

/** How long a position counts as live without a refresh. Phones send every 1–3 s. */
export const ONLINE_TTL_SECONDS = 30;

export async function setDriverPosition(
  v: Valkey,
  {
    driverId,
    countryCode,
    location: [lng, lat],
    ttlSeconds = ONLINE_TTL_SECONDS,
  }: { driverId: string; countryCode: string; location: LngLat; ttlSeconds?: number },
): Promise<void> {
  await v
    .multi()
    .geoadd(geoKey(countryCode), lng, lat, driverId)
    .set(onlineKey(driverId), countryCode, 'EX', ttlSeconds)
    .exec();
}

export type NearbyDriver = { driverId: string; distanceKm: number; location: LngLat };

/**
 * Online drivers within `radiusKm`, nearest first. Positions whose online flag
 * has lapsed are skipped and removed from the GEO set on the way.
 */
export async function nearestDrivers(
  v: Valkey,
  {
    countryCode,
    location: [lng, lat],
    radiusKm,
    limit = 10,
  }: { countryCode: string; location: LngLat; radiusKm: number; limit?: number },
): Promise<NearbyDriver[]> {
  // No COUNT here: lapsed drivers are filtered afterwards, and a COUNT could
  // cut the list short before the live ones are reached.
  const raw = (await v.geosearch(
    geoKey(countryCode),
    'FROMLONLAT',
    lng,
    lat,
    'BYRADIUS',
    radiusKm,
    'km',
    'ASC',
    'WITHDIST',
    'WITHCOORD',
  )) as [string, string, [string, string]][];
  if (raw.length === 0) return [];

  const online = await v.mget(raw.map(([id]) => onlineKey(id)));
  const lapsed = raw.filter((_, i) => online[i] === null).map(([id]) => id);
  if (lapsed.length > 0) await v.zrem(geoKey(countryCode), ...lapsed);

  return raw
    .filter((_, i) => online[i] !== null)
    .slice(0, limit)
    .map(([driverId, dist, [x, y]]) => ({
      driverId,
      distanceKm: Number(dist),
      location: [Number(x), Number(y)] as LngLat,
    }));
}

/** Takes a driver out of matching immediately (going offline, starting a trip). */
export async function removeDriver(
  v: Valkey,
  { driverId, countryCode }: { driverId: string; countryCode: string },
): Promise<void> {
  await v.multi().zrem(geoKey(countryCode), driverId).del(onlineKey(driverId)).exec();
}

/**
 * Publishes to a trip room. The Socket.IO Valkey adapter fans this out to
 * every server holding a viewer of the trip; viewers are removed from the
 * room when the trip ends, which is what expires their access.
 */
export async function publishTripEvent(
  v: Valkey,
  tripId: string,
  event: { type: string } & Record<string, unknown>,
): Promise<number> {
  return v.publish(tripChannel(tripId), JSON.stringify(event));
}
