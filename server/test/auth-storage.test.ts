import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createAuth, placeholderEmail } from '../src/auth/auth';
import { ConsoleEmailProvider } from '../src/auth/email';
import { ConsoleSmsProvider } from '../src/auth/sms';
import { closeDb } from '../src/db/client';
import { lineEwkt, parseEwkb, pointEwkt } from '../src/db/postgis';
import { users } from '../src/db/schema';
import {
  documentKey,
  ensureLocalBuckets,
  getSignedDownloadUrl,
  getSignedUploadUrl,
} from '../src/storage/r2';
import { db, resetData, seedJamaica } from './helpers';

beforeEach(async () => {
  await resetData();
  await seedJamaica();
});
afterAll(closeDb);

describe('Better Auth on Waypoint’s tables', () => {
  it('signs up by phone OTP, with a placeholder email and a database UUID', async () => {
    const sms = new ConsoleSmsProvider();
    const auth = createAuth({ db: db(), sms, email: new ConsoleEmailProvider() });
    const phone = '+18765550142';

    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: phone } });
    const code = sms.sent.at(-1)?.body.match(/\d{6}/)?.[0];
    expect(code).toBeDefined();

    const result = await auth.api.verifyPhoneNumber({ body: { phoneNumber: phone, code: code! } });
    expect(result.status).toBe(true);

    const [user] = await db().select().from(users).where(eq(users.phoneNumber, phone));
    expect(user).toMatchObject({
      email: placeholderEmail(phone),
      phoneNumberVerified: true,
      role: 'user',
      status: 'active',
    });
    expect(user!.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects a wrong code', async () => {
    const auth = createAuth({
      db: db(),
      sms: new ConsoleSmsProvider(),
      email: new ConsoleEmailProvider(),
    });
    const phone = '+18765550143';
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: phone } });
    await expect(
      auth.api.verifyPhoneNumber({ body: { phoneNumber: phone, code: '000000' } }),
    ).rejects.toThrow();
  });
});

describe('signed storage URLs (RustFS locally, R2 in staging)', () => {
  it('uploads with a signed PUT and reads back with a signed GET', async () => {
    await ensureLocalBuckets();
    const key = documentKey('driver-123', 'police-record', 'image/jpeg');
    expect(key).toMatch(/^drivers\/driver-123\/police-record\/[0-9a-f-]+\.jpg$/);

    const upload = await getSignedUploadUrl('documents', key, 'image/jpeg');
    const put = await fetch(upload.url, {
      method: 'PUT',
      headers: upload.headers,
      body: 'fake-jpeg',
    });
    expect(put.status).toBe(200);

    const get = await fetch(await getSignedDownloadUrl('documents', key));
    expect(await get.text()).toBe('fake-jpeg');

    // Unsigned access is refused: the bucket is private.
    const anonymous = await fetch(upload.url.split('?')[0]!);
    expect(anonymous.status).toBe(403);
  });

  it('refuses file types a bucket does not accept, before signing anything', async () => {
    await expect(
      getSignedUploadUrl('evidence', 'trips/t/x.exe', 'application/x-msdownload'),
    ).rejects.toThrow(/not accepted/);
  });
});

describe('PostGIS EWKB parsing', () => {
  it('recovers exactly what Postgres stored, for points and lines', async () => {
    const point: [number, number] = [-76.7967, 18.0124];
    const line: [number, number][] = [point, [-76.7849, 18.0126], [-76.7826, 18.0068]];
    const { rows } = await db().execute<{ p: string; l: string }>(
      sql`select ${pointEwkt(point)}::geography as p, ${lineEwkt(line)}::geography as l`,
    );
    expect(parseEwkb(rows[0]!.p)).toEqual({ type: 'Point', coords: point });
    expect(parseEwkb(rows[0]!.l)).toEqual({ type: 'LineString', coords: line });
  });
});
