# Waypoint data layer

The backend's data layer lives in [`server/`](server/), a pnpm workspace package beside the Expo app. The app never talks to the database: every read and write goes through the backend, and authorization lives there (see `getTripForParticipant` in [`server/src/data/trips.ts`](server/src/data/trips.ts)). The design and its trade-offs are in [PLAN-DATA-LAYER.md](PLAN-DATA-LAYER.md).

| Concern                                                  | Hosted                                                                  | Local stand-in           |
| -------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------ |
| Postgres 18 + PostGIS 3.6                                | Neon, project `cool-salad-58620904`, branch `production`, aws-us-east-1 | `postgis/postgis:18-3.6` |
| Live state (driver positions, online status, trip rooms) | any Valkey/Redis                                                        | `valkey/valkey:8-alpine` |
| Files (evidence, driver documents)                       | Cloudflare R2                                                           | RustFS (S3 API)          |
| Auth                                                     | Better Auth, in the backend                                             | same                     |

## Run it locally

You need Node 22.13+, pnpm and Docker Desktop.

```bash
pnpm install
pnpm db:up                       # Postgres, Valkey, RustFS; waits until healthy
```

Server config lives in `server/.env`. On a machine linked to Neon, `neon env pull` writes `DATABASE_URL` and `DATABASE_URL_UNPOOLED` there, pointing at Neon. To work against Docker instead, put the local values in **`server/.env.local`**, which overrides `.env`:

```bash
# server/.env.local
DATABASE_URL=postgres://waypoint:waypoint@localhost:5432/waypoint
DATABASE_URL_UNPOOLED=postgres://waypoint:waypoint@localhost:5432/waypoint
```

On a machine that isn't linked to Neon, copy [`server/.env.example`](server/.env.example) to `server/.env`. It already points at Docker. Set `AUTH_SECRET` to the output of `openssl rand -base64 32`.

Then:

```bash
pnpm db:migrate                  # apply migrations (direct connection)
pnpm db:seed                     # WIPES the target, loads Kingston demo data
pnpm test:server                 # 34 tests against the Docker stack
```

Both `.env` and `.env.local` are git-ignored. Never commit either.

## Scripts

Run from the repo root (`pnpm db:…`) or inside `server/` (`pnpm …`).

| Script              | What it does                                                                                                  | Safe against production? |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `db:up` / `db:down` | Start or stop the Docker stack                                                                                | n/a                      |
| `db:migrate`        | Applies pending migrations over `DATABASE_URL_UNPOOLED`                                                       | Yes, that's its job      |
| `db:check`          | Read-only report: host, Postgres and PostGIS versions, table count                                            | Yes                      |
| `db:smoke`          | End-to-end checks (geography, partitions, dedupe, immutability) in one transaction that is always rolled back | Yes                      |
| `db:seed`           | Truncates every table and loads demo data. Refuses any non-local database unless `--allow-remote`             | **No**                   |
| `db:maintain`       | Creates the next months' `trip_points` partitions; expires stale hazards and documents                        | Yes, idempotent          |
| `db:generate`       | `drizzle-kit generate`, then unquotes PostGIS types in the new SQL (server only)                              | n/a                      |
| `test:server`       | vitest against `TEST_DATABASE_URL` (refuses non-local)                                                        | n/a                      |

## Changing the schema

1. Edit [`server/src/db/schema/`](server/src/db/schema/).
2. `pnpm --filter @waypoint/server db:generate`, then read the generated SQL in `server/src/db/migrations/`.
   - drizzle-kit can't express partitioning. If you touch `trip_points`, check the `PARTITION BY RANGE` line survives.
   - For SQL drizzle-kit can't generate (functions, triggers), use `drizzle-kit generate --custom --name=…`.
3. `pnpm db:migrate` locally, then `pnpm test:server`.
4. Test on a Neon branch before production, as Neon recommends:

   ```bash
   neon branches create --name try-migration --parent production --expires-at <ISO time>
   DATABASE_URL="$(neon connection-string try-migration --pooled)" \
   DATABASE_URL_UNPOOLED="$(neon connection-string try-migration)" \
     sh -c 'pnpm db:migrate && pnpm db:smoke'
   neon branches delete try-migration
   ```

5. Then `pnpm db:migrate` with `server/.env` pointing at production.

## Neon

- **Two connection strings.**
  - `DATABASE_URL` is pooled (the `-pooler` host, PgBouncer in transaction mode). The app uses it.
  - `DATABASE_URL_UNPOOLED` is direct. Migrations and drizzle-kit use it, because DDL through the pooler can fail in ways that never mention pooling.
- **Driver.** `pg` (node-postgres), the right choice for a long-running Node server per Neon's guidance. `sslmode=require` is upgraded to `verify-full` in code; Neon's certificates are publicly trusted.
- **Production is migrated** (migrations 0000–0002, 27 Nov 2026). `pnpm db:check` should report PostGIS 3.6.4 installed, and `pnpm db:smoke` should pass.
- **Policy file.** `server/neon.ts` declares Postgres only. `neon deploy` applies it and refreshes the env vars.
- **Scheduled jobs.** `pg_cron` stops whenever the compute scales to zero. Run `db:maintain` from outside the database: a scheduled job, a GitHub Action, or a Neon Function Trigger. Where it runs is open question 6 in the plan.

## Cloudflare R2 (staging and production)

1. Create two **private** buckets: `waypoint-evidence` and `waypoint-documents`.
2. Create an R2 API token with Object Read & Write, scoped to those two buckets.
3. Set:

   ```
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   R2_REGION=auto
   R2_FORCE_PATH_STYLE=false
   R2_ACCESS_KEY_ID=…  R2_SECRET_ACCESS_KEY=…
   ```

The app only ever receives short-lived signed URLs:

- Uploads are a presigned `PUT`, and the client must send the signed `Content-Type`.
- Document downloads are capped at 15 minutes, evidence at an hour.

The database stores object keys, never files. Locally, RustFS uses region `us-east-1`, since it rejects `auto`.

MinIO no longer publishes community Docker images, which is why RustFS is the local stand-in.

## Valkey

| Key                     | Holds                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| `drivers:geo:{country}` | GEO set of online drivers' latest positions                       |
| `driver:online:{id}`    | Online flag with a 30 s TTL. A dead phone drops out of matching.  |
| `trip:{id}`             | Pub/sub channel for the trip room (Socket.IO adapter, next phase) |

`db:seed` writes driver positions only to a local Valkey, and never flushes a remote one.

## Guard rails

- **Fare evidence can't be rewritten.** Triggers reject `UPDATE`/`DELETE` on `route_snapshots` and `audit_log`. `TRUNCATE` isn't blocked, so dev resets work; revoke it from the application role in staging and production.
- **Traffic enforcement never influences routing.** `findAlongRoute` excludes it unless asked, and a test fails if that ever changes.
- **Tests and the seed won't touch remote data.** The tests refuse any non-local database, and the seed refuses one unless `--allow-remote` is passed.

## Troubleshooting

- **Postgres won't start after the switch to 18.** The old 17 volume is incompatible. `docker compose down`, `docker volume rm waypoint_pgdata`, then `pnpm db:up`.
- **`InvalidLocationConstraint` from storage.** Locally, `R2_REGION` must be `us-east-1`.
- **Port already in use.** 5432, 6379, 9000 and 9001 are mapped. Stop the local service that holds the port, or change the mapping in `docker-compose.yml`.
- **OneDrive.** Data lives in Docker volumes, not in this folder, so syncing can't corrupt it. Keep `node_modules` out of sync.
