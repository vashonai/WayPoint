/**
 * `pnpm db:seed` — WIPES the database at DATABASE_URL and loads Kingston demo
 * data. Local only: server/.env points at Neon production, so this refuses
 * any non-local host unless you pass --allow-remote (for a throwaway Neon
 * branch — never production).
 */
import { closeDb, getDb } from '../src/db/client';
import { isLocalUrl, truncateAll } from '../src/db/reset';
import { env } from '../src/env';
import { createValkey } from '../src/live/valkey';
import { seed } from '../src/seed/seed';
import { ensureLocalBuckets } from '../src/storage/r2';

const { DATABASE_URL } = env.db();
const host = new URL(DATABASE_URL).host;
const allowRemote = process.argv.includes('--allow-remote');

if (!isLocalUrl(DATABASE_URL) && !allowRemote) {
  console.error(
    `Refusing to seed ${host}: seeding truncates every table.\n` +
      'Point DATABASE_URL at the local stack (server/.env.local), or pass --allow-remote for a Neon dev branch.',
  );
  process.exit(1);
}
if (!isLocalUrl(DATABASE_URL))
  console.warn(`⚠ Seeding REMOTE database ${host} — all tables will be truncated.`);

const db = getDb();
// Live driver positions only go into a LOCAL Valkey: flushing a shared,
// hosted instance would drop every real driver's position.
const { VALKEY_URL } = env.valkey();
const valkey = isLocalUrl(VALKEY_URL) ? createValkey(VALKEY_URL) : null;
try {
  if (isLocalUrl(DATABASE_URL)) await ensureLocalBuckets();
  await valkey?.flushdb();
  await truncateAll(db);
  const counts = await seed(db, valkey);
  console.log(`Seeded ${host}:`, counts);
  if (!valkey) console.log('Valkey is not local: driver positions were not seeded.');
} finally {
  await valkey?.quit();
  await closeDb();
}
