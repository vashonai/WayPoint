import { Client } from 'pg';

import { runMigrations } from '../src/db/migrator';
import { testUrls } from './test-env';

/** Drops everything in the test database and rebuilds it from the migrations. */
export default async function setup(): Promise<void> {
  const { databaseUrl } = testUrls();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
  } finally {
    await client.end();
  }
  await runMigrations(databaseUrl);
}
