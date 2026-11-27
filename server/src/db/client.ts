import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '../env';
import * as schema from './schema';

/**
 * Plain node-postgres over TCP. Works unchanged against local Docker and
 * Neon's connection string (Neon's pooled endpoint is PgBouncer in
 * transaction mode; node-postgres's unnamed prepared statements are fine there).
 */
export function createDb(url: string) {
  const pool = new Pool({ connectionString: withExplicitSslMode(url), max: 10 });
  const db = drizzle({ client: pool, schema, casing: 'snake_case' });
  return { db, pool };
}

/**
 * Neon's connection strings say `sslmode=require`, which node-postgres treats
 * as `verify-full` (certificate and hostname checked) and warns about. Neon's
 * certificates are publicly trusted, so state verify-full outright: same
 * behaviour, no warning, and no silent downgrade if pg changes its default.
 */
function withExplicitSslMode(url: string): string {
  const u = new URL(url);
  if (u.searchParams.get('sslmode') === 'require') u.searchParams.set('sslmode', 'verify-full');
  return u.toString();
}

export type Db = ReturnType<typeof createDb>['db'];

/** A transaction handle — data-access functions accept either. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type Executor = Db | Tx;

let shared: ReturnType<typeof createDb> | null = null;

/** The process-wide database, from DATABASE_URL. */
export function getDb(): Db {
  shared ??= createDb(env.db().DATABASE_URL);
  return shared.db;
}

export async function closeDb(): Promise<void> {
  await shared?.pool.end();
  shared = null;
}
