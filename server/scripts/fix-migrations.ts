/**
 * Post-processes drizzle-kit output. Runs after every `pnpm db:generate`.
 *
 * drizzle-kit quotes parameterised custom types — `"geography(Point,4326)"` —
 * which Postgres reads as a single type NAME and rejects. Unquote them.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/db/migrations', import.meta.url));

for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
  const path = join(dir, file);
  const before = readFileSync(path, 'utf8');
  const after = before.replace(/"(geography\((?:Point|LineString),4326\))"/g, '$1');
  if (after !== before) {
    writeFileSync(path, after);
    console.log(`unquoted geography types in ${file}`);
  }
}
