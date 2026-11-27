/**
 * `pnpm db:migrate` — applies pending migrations over the DIRECT connection
 * (DATABASE_URL_UNPOOLED, falling back to DATABASE_URL locally). Migrations
 * through Neon's pooler can fail in ways that never mention pooling.
 */
import { env } from '../env';
import { runMigrations } from './migrator';

const { migrationUrl } = env.db();
await runMigrations(migrationUrl);
const { host, pathname } = new URL(migrationUrl);
console.log(`Migrations applied to ${host}${pathname}`);
