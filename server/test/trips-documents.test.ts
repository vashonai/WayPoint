import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createDriverDocument,
  DocumentError,
  expireDocuments,
  reviewDocument,
} from '../src/data/documents';
import {
  getTripForParticipant,
  saveRouteSnapshot,
  settleFare,
  transitionTrip,
  TripTransitionError,
} from '../src/data/trips';
import { closeDb } from '../src/db/client';
import { auditLog, routeSnapshots } from '../src/db/schema';
import {
  db,
  HALF_WAY_TREE,
  makeDriver,
  makeTrip,
  makeUser,
  offset,
  resetData,
  seedJamaica,
} from './helpers';

beforeEach(async () => {
  await resetData();
  await seedJamaica();
});
afterAll(closeDb);

describe('trips', () => {
  it('walks the happy path and stamps each step', async () => {
    const passenger = await makeUser();
    const { user: driverUser, driver } = await makeDriver();
    const trip = await makeTrip(passenger.id, HALF_WAY_TREE, offset(HALF_WAY_TREE, 1500));

    await transitionTrip(db(), {
      tripId: trip.id,
      to: 'matched',
      driverId: driver.id,
      actorId: null,
    });
    await transitionTrip(db(), { tripId: trip.id, to: 'en_route', actorId: driverUser.id });
    await transitionTrip(db(), { tripId: trip.id, to: 'in_progress', actorId: driverUser.id });
    const arrived = await transitionTrip(db(), {
      tripId: trip.id,
      to: 'arrived',
      actorId: driverUser.id,
    });
    expect(arrived.matchedAt && arrived.startedAt && arrived.endedAt).toBeTruthy();

    const done = await settleFare(db(), {
      tripId: trip.id,
      actorId: null,
      components: [
        { kind: 'base', label: 'Base fare', amountMinor: 30000 },
        { kind: 'distance', label: 'Distance — 1.5 km', amountMinor: 18000 },
      ],
    });
    expect(done.status).toBe('completed');
    expect(done.finalFareMinor).toBe(48000);

    const actions = (await db().select({ action: auditLog.action }).from(auditLog)).map(
      (a) => a.action,
    );
    expect(actions).toEqual([
      'trip.matched',
      'trip.en_route',
      'trip.in_progress',
      'trip.arrived',
      'trip.fare_settled',
    ]);
  });

  it('refuses a transition the current status does not allow', async () => {
    const passenger = await makeUser();
    const trip = await makeTrip(passenger.id, HALF_WAY_TREE, offset(HALF_WAY_TREE, 1500));
    await expect(
      transitionTrip(db(), { tripId: trip.id, to: 'in_progress', actorId: null }),
    ).rejects.toThrow(TripTransitionError);
  });

  it('cannot cancel a trip once it is in progress', async () => {
    const passenger = await makeUser();
    const { driver } = await makeDriver();
    const trip = await makeTrip(passenger.id, HALF_WAY_TREE, offset(HALF_WAY_TREE, 1500));
    await transitionTrip(db(), {
      tripId: trip.id,
      to: 'matched',
      driverId: driver.id,
      actorId: null,
    });
    await transitionTrip(db(), { tripId: trip.id, to: 'driver_arrived', actorId: null });
    await transitionTrip(db(), { tripId: trip.id, to: 'in_progress', actorId: null });
    await expect(
      transitionTrip(db(), { tripId: trip.id, to: 'cancelled', actorId: passenger.id }),
    ).rejects.toThrow(/can't go from in_progress to cancelled/);
  });

  it('only shows a trip to its passenger and its driver', async () => {
    const passenger = await makeUser();
    const stranger = await makeUser();
    const { user: driverUser, driver } = await makeDriver();
    const trip = await makeTrip(passenger.id, HALF_WAY_TREE, offset(HALF_WAY_TREE, 1500));
    await transitionTrip(db(), {
      tripId: trip.id,
      to: 'matched',
      driverId: driver.id,
      actorId: null,
    });

    expect((await getTripForParticipant(db(), trip.id, passenger.id))?.id).toBe(trip.id);
    expect((await getTripForParticipant(db(), trip.id, driverUser.id))?.id).toBe(trip.id);
    expect(await getTripForParticipant(db(), trip.id, stranger.id)).toBeNull();
  });

  it('keeps route snapshots immutable — they are fare evidence', async () => {
    const passenger = await makeUser();
    const trip = await makeTrip(passenger.id, HALF_WAY_TREE, offset(HALF_WAY_TREE, 1500));
    const snap = await saveRouteSnapshot(db(), {
      tripId: trip.id,
      kind: 'recommended',
      geometry: [HALF_WAY_TREE, offset(HALF_WAY_TREE, 1500)],
      distanceM: 1500,
      durationS: 300,
      provider: 'google-routes',
    });
    expect(snap.geometry).toEqual([HALF_WAY_TREE, offset(HALF_WAY_TREE, 1500)]);
    await expect(
      db().update(routeSnapshots).set({ distanceM: 1 }).where(eq(routeSnapshots.id, snap.id)),
    ).rejects.toThrow();
    await expect(
      db().delete(routeSnapshots).where(eq(routeSnapshots.id, snap.id)),
    ).rejects.toThrow();
  });
});

describe('driver documents', () => {
  it('accepts only documents the driver’s country requires, with files under their own prefix', async () => {
    const { driver } = await makeDriver();
    const key = `drivers/${driver.id}/police-record/a.jpg`;

    const doc = await createDriverDocument(db(), {
      driverId: driver.id,
      type: 'police-record',
      files: [{ field: 'document', r2Key: key }],
    });
    expect(doc.status).toBe('pending');

    // Trinidad's permit is not a Jamaican document.
    await expect(
      createDriverDocument(db(), {
        driverId: driver.id,
        type: 'drivers-permit',
        files: [{ field: 'f', r2Key: key }],
      }),
    ).rejects.toThrow(DocumentError);
    // Another driver's upload.
    await expect(
      createDriverDocument(db(), {
        driverId: driver.id,
        type: 'police-record',
        files: [{ field: 'document', r2Key: 'drivers/someone-else/police-record/a.jpg' }],
      }),
    ).rejects.toThrow(/outside/);
  });

  it('records reviews in the audit log and needs a reason to reject', async () => {
    const { driver } = await makeDriver();
    const reviewer = await makeUser({ role: 'admin' });
    const doc = await createDriverDocument(db(), {
      driverId: driver.id,
      type: 'insurance',
      files: [{ field: 'certificate', r2Key: `drivers/${driver.id}/insurance/c.jpg` }],
    });

    await expect(
      reviewDocument(db(), { documentId: doc.id, reviewerId: reviewer.id, decision: 'rejected' }),
    ).rejects.toThrow(/reason/);
    const approved = await reviewDocument(db(), {
      documentId: doc.id,
      reviewerId: reviewer.id,
      decision: 'approved',
    });
    expect(approved.reviewedBy).toBe(reviewer.id);
    const [entry] = await db().select().from(auditLog);
    expect(entry).toMatchObject({
      action: 'document.approved',
      entityId: doc.id,
      actorId: reviewer.id,
    });
  });

  it('expires documents past their date', async () => {
    const { driver } = await makeDriver();
    await createDriverDocument(db(), {
      driverId: driver.id,
      type: 'drivers-licence',
      files: [{ field: 'front', r2Key: `drivers/${driver.id}/drivers-licence/f.jpg` }],
      expiresAt: new Date('2026-01-01T00:00:00Z'),
    });
    expect(await expireDocuments(db())).toBe(1);
  });
});
