import { JM } from '../../../src/features/country/configs';
import { createDriverDocument, reviewDocument } from '../data/documents';
import { findAlongRoute, reportOrConfirm } from '../data/hazards';
import { insertPointsBatch, setDriverPosition } from '../data/tracking';
import { createTrip, saveRouteSnapshot, settleFare, transitionTrip } from '../data/trips';
import type { Db } from '../db/client';
import { countries, drivers, trustedContacts, users, vehicles } from '../db/schema';
import type { LngLat } from '../domain/geo';
import { DEFAULT_HAZARD_RULES, type HazardType } from '../domain/hazards';
import type { ValkeyClient } from '../live/valkey';
import { placeholderEmail } from '../auth/auth';

/**
 * Demo data for Kingston: Jamaica's config, two passengers, three verified
 * drivers with vehicles and approved documents, fifteen hazards, and one
 * completed trip with its route snapshot and GPS trace.
 *
 * Written through the data-access functions — hazards via reportOrConfirm,
 * the trip via transitionTrip/settleFare — so the seed exercises the real
 * paths and leaves a real audit trail. Phone numbers are 555 test numbers.
 */

/** Half Way Tree → New Kingston, as the app's fixture draws it (src/mocks/fixtures.ts). */
const DEMO_ROUTE: LngLat[] = [
  [-76.7967, 18.0124],
  [-76.7951, 18.0115],
  [-76.7934, 18.0105],
  [-76.7915, 18.0094],
  [-76.7897, 18.0083],
  [-76.7878, 18.0073],
  [-76.7866, 18.0068],
  [-76.7861, 18.0081],
  [-76.7857, 18.0097],
  [-76.7853, 18.0113],
  [-76.7849, 18.0126],
];

type SeedHazard = { type: HazardType; at: LngLat; where: string; confirmations?: number };

const HAZARDS: SeedHazard[] = [
  // Half Way Tree
  { type: 'pothole', at: [-76.7942, 18.0113], where: 'Half Way Tree Rd', confirmations: 3 },
  { type: 'construction', at: [-76.7905, 18.0092], where: 'Half Way Tree Rd at Eastwood Park Rd' },
  { type: 'congestion', at: [-76.7967, 18.0128], where: 'Half Way Tree clock tower' },
  { type: 'traffic_enforcement', at: [-76.7985, 18.014], where: 'Constant Spring Rd' },
  // New Kingston
  { type: 'accident', at: [-76.7858, 18.009], where: 'Knutsford Blvd', confirmations: 2 },
  { type: 'flooding', at: [-76.7879, 18.0061], where: 'Trafalgar Rd', confirmations: 2 },
  { type: 'broken_down_vehicle', at: [-76.7826, 18.0068], where: 'Oxford Rd' },
  { type: 'road_closure', at: [-76.7835, 18.0112], where: 'Emancipation Park, Hope Rd side' },
  // Downtown
  { type: 'pothole', at: [-76.7935, 17.97], where: 'King St' },
  { type: 'roadblock', at: [-76.7895, 17.9715], where: 'East Queen St' },
  { type: 'flooding', at: [-76.798, 17.9685], where: 'Harbour St' },
  { type: 'construction', at: [-76.792, 17.976], where: 'North Parade' },
  // Spanish Town Road
  {
    type: 'pothole',
    at: [-76.815, 17.99],
    where: 'Spanish Town Rd at Six Miles',
    confirmations: 2,
  },
  { type: 'fallen_tree', at: [-76.825, 17.995], where: 'Spanish Town Rd near Washington Blvd' },
  { type: 'accident', at: [-76.835, 17.999], where: 'Spanish Town Rd at Ferry' },
];

const PASSENGERS = [
  { name: 'Allekay T.', phone: '+18765550142' },
  { name: 'Dwayne R.', phone: '+18765550177' },
];

type SeedDriver = {
  name: string;
  phone: string;
  vehicle: [make: string, model: string, year: number, colour: string, plate: string];
  at: LngLat;
  rating: number;
};

const DRIVERS: SeedDriver[] = [
  {
    name: 'Marlon B.',
    phone: '+18765550201',
    vehicle: ['Toyota', 'Axio', 2019, 'Silver', '9134 KJ'],
    at: [-76.7975, 18.013],
    rating: 4.9,
  },
  {
    name: 'Shanice W.',
    phone: '+18765550202',
    vehicle: ['Nissan', 'Note', 2020, 'White', '4471 HM'],
    at: [-76.791, 18.0085],
    rating: 4.8,
  },
  {
    name: 'Kemar L.',
    phone: '+18765550203',
    vehicle: ['Honda', 'Fit', 2018, 'Blue', '7720 GT'],
    at: [-76.785, 18.012],
    rating: 4.7,
  },
];

export async function seed(db: Db, valkey: ValkeyClient | null): Promise<Record<string, number>> {
  const { code, name, ...config } = JM;
  await db.insert(countries).values({
    code,
    name,
    currency: JM.currency.code,
    timezone: 'America/Jamaica',
    config: { ...config, hazardRules: DEFAULT_HAZARD_RULES },
  });

  const person = async (p: { name: string; phone: string }) => {
    const [u] = await db
      .insert(users)
      .values({
        name: p.name,
        email: placeholderEmail(p.phone),
        phoneNumber: p.phone,
        phoneNumberVerified: true,
        countryCode: 'JM',
      })
      .returning();
    return u!;
  };

  const passengers = await Promise.all(PASSENGERS.map(person));
  const [reviewer] = await db
    .insert(users)
    .values({
      name: 'Waypoint Review',
      email: 'review@waypoint.example',
      role: 'admin',
      countryCode: 'JM',
    })
    .returning();

  await db.insert(trustedContacts).values({
    userId: passengers[0]!.id,
    name: 'Mikayla J.',
    phone: '+18765550311',
    relationship: 'Mother',
  });

  const verifiedAt = new Date(Date.now() - 90 * 86_400_000);
  const docExpiry = new Date(Date.now() + 365 * 86_400_000);
  const driverRows = [];
  for (const d of DRIVERS) {
    const user = await person(d);
    const [driver] = await db
      .insert(drivers)
      .values({
        userId: user.id,
        verificationStatus: 'verified',
        layer1Status: 'passed',
        layer2Status: 'passed',
        layer3Status: 'passed',
        layer4Status: 'passed',
        layer5Status: 'passed',
        layer6Status: 'passed',
        verifiedAt,
        rating: d.rating,
        ratingCount: 120,
      })
      .returning();
    const [make, model, year, colour, plate] = d.vehicle;
    await db.insert(vehicles).values({
      driverId: driver!.id,
      make,
      model,
      year,
      colour,
      plate,
      status: 'approved',
    });
    for (const doc of JM.driverDocuments) {
      const created = await createDriverDocument(db, {
        driverId: driver!.id,
        type: doc.slug,
        files: [{ field: 'document', r2Key: `drivers/${driver!.id}/${doc.slug}/seed.jpg` }],
        expiresAt: doc.expires ? docExpiry : null,
      });
      await reviewDocument(db, {
        documentId: created.id,
        reviewerId: reviewer!.id,
        decision: 'approved',
      });
    }
    driverRows.push({ user, driver: driver!, at: d.at });
  }

  // Hazards, reported and confirmed by different people.
  const reporters = [...passengers, ...driverRows.map((d) => d.user)];
  for (const [i, h] of HAZARDS.entries()) {
    for (let c = 0; c < (h.confirmations ?? 1); c++) {
      await reportOrConfirm(db, {
        type: h.type,
        point: h.at,
        reporterId: reporters[(i + c) % reporters.length]!.id,
        countryCode: 'JM',
      });
    }
  }

  // Yesterday afternoon: Allekay rides with Marlon from Half Way Tree to New Kingston.
  const passenger = passengers[0]!;
  const { user: driverUser, driver } = driverRows[0]!;
  const start = new Date(Date.now() - 86_400_000);
  start.setUTCHours(19, 5, 0, 0); // 14:05 in Kingston
  const at = (seconds: number) => new Date(start.getTime() + seconds * 1000);

  const routeMeters = Math.round(lineLength(DEMO_ROUTE));
  const trip = await createTrip(db, {
    passengerId: passenger.id,
    countryCode: 'JM',
    currency: 'JMD',
    pickup: DEMO_ROUTE[0]!,
    pickupAddress: 'Half Way Tree, Kingston',
    dropoff: DEMO_ROUTE.at(-1)!,
    dropoffAddress: 'Knutsford Blvd, Kingston',
    fareEstimateMinMinor: 55_000,
    fareEstimateMaxMinor: 70_000,
  });
  const considered = await findAlongRoute(db, DEMO_ROUTE, 50, { now: at(-240) });
  await saveRouteSnapshot(db, {
    tripId: trip.id,
    kind: 'recommended',
    geometry: DEMO_ROUTE,
    distanceM: routeMeters,
    durationS: 300,
    provider: 'google-routes',
    hazardsConsidered: considered.map((h) => h.id),
  });
  await transitionTrip(db, {
    tripId: trip.id,
    to: 'matched',
    driverId: driver.id,
    actorId: null,
    now: at(-240),
  });
  await transitionTrip(db, {
    tripId: trip.id,
    to: 'en_route',
    actorId: driverUser.id,
    now: at(-200),
  });
  await transitionTrip(db, {
    tripId: trip.id,
    to: 'driver_arrived',
    actorId: driverUser.id,
    now: at(-30),
  });
  await transitionTrip(db, {
    tripId: trip.id,
    to: 'in_progress',
    actorId: driverUser.id,
    now: at(0),
  });

  // A fix every 3 s at ~7 m/s — urban speed — along the route.
  const step = 7 * 3;
  const points = [];
  for (let m = 0, t = 0; m <= routeMeters; m += step, t += 3) {
    const [location, heading] = pointAlong(DEMO_ROUTE, m);
    points.push({
      recordedAt: at(t),
      location,
      speed: 7,
      heading,
      accuracy: 5,
      source: 'bg_batch' as const,
    });
  }
  const { inserted } = await insertPointsBatch(db, trip.id, points);
  const tripSeconds = (points.length - 1) * 3;

  await transitionTrip(db, {
    tripId: trip.id,
    to: 'arrived',
    actorId: driverUser.id,
    now: at(tripSeconds),
  });
  await settleFare(db, {
    tripId: trip.id,
    actorId: null,
    components: [
      { kind: 'base', label: 'Base fare', amountMinor: 30_000 },
      {
        kind: 'distance',
        label: `Distance — ${(routeMeters / 1000).toFixed(1)} km`,
        amountMinor: 19_000,
      },
      {
        kind: 'time',
        label: `Travel time — ${Math.round(tripSeconds / 60)} min`,
        amountMinor: 6_000,
      },
      {
        kind: 'traffic',
        label: 'Traffic delay',
        amountMinor: 14_000,
        reason: '4 minutes of heavy traffic on Half Way Tree Road',
        verified: true,
      },
    ],
  });

  // Drivers online near Half Way Tree. A long TTL so they're still there when
  // you go looking — the real app refreshes every few seconds instead.
  if (valkey) {
    for (const d of driverRows) {
      await setDriverPosition(valkey, {
        driverId: d.driver.id,
        countryCode: 'JM',
        location: d.at,
        ttlSeconds: 3600,
      });
    }
  }

  return {
    users: passengers.length + driverRows.length + 1,
    drivers: driverRows.length,
    hazardReports: HAZARDS.reduce((n, h) => n + (h.confirmations ?? 1), 0),
    hazards: HAZARDS.length,
    tripPoints: inserted,
    hazardsOnRoute: considered.length,
  };
}

const R = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

function distance([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function lineLength(line: LngLat[]): number {
  return line.slice(1).reduce((sum, p, i) => sum + distance(line[i]!, p), 0);
}

/** The point `metres` along a line, and the heading of that segment. */
function pointAlong(line: LngLat[], metres: number): [LngLat, number] {
  let left = metres;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const seg = distance(a, b);
    if (left <= seg || i === line.length - 1) {
      const t = seg === 0 ? 0 : Math.min(1, left / seg);
      const heading = (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI;
      return [[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], (heading + 360) % 360];
    }
    left -= seg;
  }
  return [line.at(-1)!, 0];
}
