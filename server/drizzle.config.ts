import { defineConfig } from 'drizzle-kit';

import { env } from './src/env';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  casing: 'snake_case',
  // Ignore PostGIS's own tables (spatial_ref_sys) when introspecting or pushing.
  extensionsFilters: ['postgis'],
  // Direct connection: drizzle-kit runs DDL, which Neon's pooler can break.
  dbCredentials: { url: env.db().migrationUrl },
});
