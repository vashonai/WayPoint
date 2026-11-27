/**
 * `pnpm db:check` — read-only. Connects with the server's own configuration
 * (DATABASE_URL from server/.env or the environment) and reports what it found.
 * Writes nothing, so it is safe against production.
 */
import { sql } from 'drizzle-orm';

import { createDb } from '../src/db/client';
import { env } from '../src/env';

const { DATABASE_URL } = env.db();
const { db, pool } = createDb(DATABASE_URL);
try {
  const [r] = (
    await db.execute<{
      pg: string;
      db: string;
      postgis_available: string | null;
      postgis_installed: string | null;
      tables: number;
    }>(sql`
      select current_setting('server_version') as pg,
             current_database() as db,
             (select default_version from pg_available_extensions where name = 'postgis') as postgis_available,
             (select extversion from pg_extension where extname = 'postgis') as postgis_installed,
             (select count(*)::int from information_schema.tables where table_schema = 'public') as tables`)
  ).rows;
  console.log(`host               ${new URL(DATABASE_URL).host}`);
  console.log(`database           ${r?.db}`);
  console.log(`postgres           ${r?.pg}`);
  console.log(`postgis available  ${r?.postgis_available ?? 'no'}`);
  console.log(`postgis installed  ${r?.postgis_installed ?? 'no (applied by migration 0000)'}`);
  console.log(`public tables      ${r?.tables}`);
} finally {
  await pool.end();
}
