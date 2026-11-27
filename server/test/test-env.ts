import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

/**
 * The test suite only ever runs against local Docker. TEST_DATABASE_URL must
 * point at localhost — never Neon — because every run wipes it.
 */
export function testUrls(): { databaseUrl: string; valkeyUrl: string } {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  const valkeyUrl = process.env.TEST_VALKEY_URL;
  if (!databaseUrl || !valkeyUrl) {
    throw new Error('Set TEST_DATABASE_URL and TEST_VALKEY_URL (see server/.env.example)');
  }
  for (const url of [databaseUrl, valkeyUrl]) {
    const host = new URL(url).hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      throw new Error(`Refusing to run tests against ${host}: the suite wipes its database`);
    }
  }
  return { databaseUrl, valkeyUrl };
}
