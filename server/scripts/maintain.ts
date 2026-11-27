/** `pnpm db:maintain` — runs the housekeeping job once against DATABASE_URL. */
import { closeDb } from '../src/db/client';
import { maintain } from '../src/jobs/maintain';

const { hazardsExpired, documentsExpired } = await maintain();
console.log(
  `partitions ensured; ${hazardsExpired} hazards and ${documentsExpired} documents expired`,
);
await closeDb();
