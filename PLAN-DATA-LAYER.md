# Plan: Waypoint data layer

Status: **approved and implemented** (branch `feat/data-layer`). How to run it: [README-DATA.md](README-DATA.md).

### How it landed

- Conflicts C1–C13: implemented as recommended.
- C14: Neon turned out to be on **Postgres 18**, so local runs `postgis/postgis:18-3.6`, which has the same PostGIS 3.6.4 as Neon.
- MinIO no longer publishes community images, so **RustFS** is the local S3 stand-in.
- Money is **ISO 4217 minor units (cents)**. The country config's `decimals` is display precision only.
- `congestion` is in the database with an assumed 60-minute expiry and routing weight 4 (question 3); the app doesn't show it yet.
- `driver_documents.fields` exists, but nothing stores ID or licence numbers until question 5 is decided.
- Neon production is migrated. Questions 6, 8 and 9 (job scheduling, API framework, API style) are still open.

## 1. What exists today

**There is no backend.** The repo is only the Expo app:

- Expo SDK 58, React Native 0.88, TypeScript (strict, `noUncheckedIndexedAccess`), pnpm with `node-linker=hoisted`, no workspace. Jest (`jest-expo`), ESLint (expo flat config), Prettier.
- No database, API client, auth, Socket.IO or object storage code. Server data comes from `src/mocks/fixtures.ts`.
- Placeholders that will call the backend later:
  - `src/features/tracking/traceOutbox.ts` → `uploadTraceBatch` (`POST /trips/:id/points`)
  - `src/features/tracking/tripTrace.ts` → `publishLiveFix` (the trip-room broadcast)
  - `src/features/safety/firePanic.ts` → `sendPanicToServer`, `queuePanicEvent`
  - `src/features/maps/routes.ts` → `computeDrivingRoute`. It calls Google from the phone for now, until the server owns route snapshots.
- Root `.env` exists and is git-ignored (`.env`, `.env*.local`). It holds the **app's** Google Maps keys, which `app.config.js` reads.
- Docker 29.5 and Compose v5 are installed. The Docker Desktop engine was not running when I checked.

**Supabase: no client code exists.** It appears only in comments and docs:

| Location | Text | Proposal |
|---|---|---|
| `README.md:179` | "Fixtures stand in for Supabase and tRPC" | Reword to "the backend API" in the docs commit |
| `README.md:204` | "Supabase auth and the tRPC decision API" | Replace with the new stack |
| `app/_layout.tsx:38` | "Real implementation reads Supabase auth state here" | Reword to "Better Auth session" when the client is wired; comment only |
| `src/features/safety/firePanic.ts:29,62` | "Wired to tRPC in production" | Leave until the API style is decided (question 9) |

Nothing will be deleted.

## 2. What I'll add

A backend package at `server/`, written in TypeScript. TypeScript matches the repo, so Drizzle is the ORM, as you specified.

```
docker-compose.yml          Postgres + PostGIS, Valkey, MinIO (+ one-shot bucket creation)
README-DATA.md              Run locally, migrate, seed, test, point at Neon / R2
pnpm-workspace.yaml         packages: ['.', 'server']
server/
  package.json              @waypoint/server: Node 22, ESM, tsx, vitest
  tsconfig.json
  drizzle.config.ts
  .env.example              every server variable, placeholders only
  src/
    env.ts                  zod-validated environment; fails fast on a missing variable
    db/
      client.ts             node-postgres Pool + drizzle (snake_case casing)
      postgis.ts            Drizzle custom types: geography(Point|LineString,4326) ↔ [lng, lat]
      schema/               one file per area: countries, users-auth, drivers, trips,
                            tracking, hazards, safety, disputes, audit
      migrations/           drizzle-kit output + hand-written SQL: extension,
                            partitions, immutability triggers
    data/                   typed data-access functions, one module per area
      trips.ts  hazards.ts  tracking.ts  documents.ts  safety.ts
    live/valkey.ts          driver positions (GEO), online status (TTL keys), trip-room pub/sub
    storage/r2.ts           S3 client; signed upload/download URLs for R2 or MinIO
    auth/
      auth.ts               Better Auth: drizzle adapter, phone-number plugin, email, expo plugin
      sms.ts                SmsProvider interface + console stub for local dev
    seed/seed.ts
  test/                     vitest against the Docker database
```

### Library choices

| Need | Choice | Why |
|---|---|---|
| Postgres driver | `pg` (node-postgres) | Plain TCP. It works against Neon's connection string without Neon's serverless driver, which keeps it portable. |
| Valkey | `iovalkey` | An ioredis-compatible client with GEO commands. Works with `@socket.io/redis-adapter` later. |
| H3 | `h3-js` in application code | Neon has the `h3` extension, but app-side H3 keeps the database plain Postgres + PostGIS. |
| Partitioning | Native `PARTITION BY RANGE` + a SQL helper function | Neon supports `pg_partman`, but native partitions are portable to any Postgres. |
| R2 | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | R2 and MinIO both speak S3. Uploads use presigned PUT, which R2 supports; R2 doesn't support presigned POST policies. |
| Server tests | vitest | Kept separate from the app's `jest-expo` setup. |

## 3. Changes to existing files

- `pnpm-workspace.yaml` (new): makes `server/` a workspace package. The app stays at the repo root, so nothing in the app moves.
- `package.json`:
  - Add Jest `testPathIgnorePatterns: ['/server/']`, so the app's Jest doesn't pick up server tests.
  - Add scripts: `db:up`, `db:migrate`, `db:seed`, `test:server`.
- `tsconfig.json`: exclude `server/`, which has its own config.
- `eslint.config.js`: add a Node override for `server/**`. The Expo config assumes React Native.
- `.gitignore`: add `server/.env`. Server secrets stay out of the root `.env`, because Expo CLI loads the root `.env` when it evaluates `app.config.js`.
- No changes to the app's runtime code in this phase.

## 4. Conflicts with the current architecture

These need a decision before I write the schema. Each has a recommendation.

| # | Spec says | Current app says | Recommendation |
|---|---|---|---|
| C1 | `users.role`: passenger / driver / admin | `session.store.ts`: "`mode` is a MODE, not an account type — drivers take rides too" | `users.role` = `user` / `admin` only. A user is a driver if a `drivers` row exists. Passenger vs driver stays a per-session mode. |
| C2 | Custom `users` table | Better Auth requires `user`, `session`, `account`, `verification` tables with its own columns | Make `users` Better Auth's user model (`modelName: 'users'`). Add `sessions`, `accounts` and `verifications`. Ids are database-generated UUIDs (`generateId: false`). Your columns (`country_code`, `status`, `role`, `deleted_at`) go in as `additionalFields`, with `input: false` on `role`. |
| C3 | Phone OTP sign-up | Better Auth's `user.email` is required and unique | Phone-only users get a placeholder email (`<e164>@phone.waypoint.invalid`, via the plugin's `getTempEmail`). It is replaced when the user adds a real email. |
| C4 | Trip status: requested / matched / en_route / in_progress / completed / cancelled | The client trip machine also has `driver_waiting` (at pickup) and `arrived` (at destination, fare settling) | Add `driver_arrived` and `arrived`. Without them, the server can't represent states the passenger UI already shows. |
| C5 | 10 hazard types, including `congestion`, in snake_case | The client taxonomy has **9** types and no congestion, although its comment says "ten". Names differ: `fallenTree`, `brokenDown`, `closure`, `enforcement`. | The database uses the spec's names; the API maps them to client keys. `congestion` needs client colour, icon, expiry and routing weight before the app can show it (question 3). |
| C6 | (not mentioned) | `traffic_enforcement` has **routing weight 0**, guarded by a test: "if this is ever true, the regulatory position is broken" | `findAlongRoute` excludes enforcement by default, because it feeds routing and deviation excusal. Only an explicit `includeNonRoutable` flag returns it. A test guards this. |
| C7 | `driver_documents.type` is a fixed enum: gov_id, licence, police_record, transport_auth, insurance, registration | Documents come from per-market `CountryConfig` (JM: `government-id`, `drivers-licence`, `police-record`, `insurance`; TT: `drivers-permit`, no police record). The README says "nothing hardcodes a market". | `type` is text: the country config's document slug, validated in the backend against the driver's country. A fixed enum breaks the next market. |
| C8 | One `r2_key` per document | An ID has front and back photos plus form fields (ID number, expiry) | Store `files jsonb` as `[{ field, r2_key }]`, plus `fields jsonb` for the form values. ID numbers are sensitive personal data (question 5). |
| C9 | `fare_breakdown` with keys base / distance / time / traffic_delay | The client receipt (`presentFare`) expects `components[]` with `kind`, `label`, `amount`, `reason`, `verified`; kinds also include `wait` and `adjustment` | Store the client's `components[]` shape. Store money as **integer minor units**: JMD has 0 decimals, TTD has 2. |
| C10 | `share_sessions.trip_id` | Share durations are `this_trip`, `until_i_stop`, `time_limit` | Make `trip_id` nullable, add `user_id` and `duration`. "Until I stop it" outlives the trip. |
| C11 | `trusted_contacts`: name, phone | The client contact also has `relationship` | Add `relationship`. |
| C12 | `evidence.server_timestamp` | The evidence modal: client GPS and time are "attestations, not proof" | Add `client_timestamp` and `client_location` next to the server-stamped values, so the backend can cross-check them against `trip_points`. |
| C13 | Hazard expiry rules in `countries.config` | Expiry minutes live in the client taxonomy, for all markets | Seed Jamaica's config from the current client values, keeping one source of truth (question 7). |
| C14 | Postgres 16 locally | Neon offers 14–18. PostGIS on Neon PG16 is 3.3.10, on PG17 it is 3.5.7. | Run the same major version locally as the Neon project. I suggest **17**: PostGIS 3.5 matches the local `postgis/postgis:17-3.5` image (question 1). |

Design points that need no decision:

- **Immutability is enforced in the database.** `route_snapshots` (fare evidence) and `audit_log` get triggers that reject `UPDATE` and `DELETE`, so no code path can rewrite them.
- **`trip_points` partitions** are monthly, plus a `DEFAULT` partition so a late batch never fails.
  - A `create_trip_points_partitions(months_ahead)` function creates future months. Migrations call it, and a scheduled job should too (question 6).
  - The unique key `(trip_id, recorded_at)` includes the partition key, as Postgres requires. It does the socket-vs-batch dedupe with `ON CONFLICT DO NOTHING`.
- **Geography type:** all geometry is `geography(…,4326)` with GiST indexes. `ST_DWithin` on geography works in metres, which is what `findActiveNear` and `findAlongRoute` need.
- **Hazard merge:** same type, within the reporter's H3 cell or its ring-1 neighbours (`gridDisk(cell, 1)`, at resolution 9). It runs in a transaction with a row lock, so two drivers reporting the same pothole at once create one hazard.
- **Live state keys in Valkey:**
  - `drivers:geo:{country}`: a GEO set of driver positions.
  - `driver:online:{id}`: online status, with a TTL so a dead phone drops off.
  - `trip:{id}`: a pub/sub channel for the trip room.
- **Soft deletes** (`deleted_at`) apply to users, vehicles, trusted contacts and driver documents. Trips, points, evidence, panic events and the audit log are never deleted.
- **Docker on Windows:** volumes are Docker-named, not bind mounts into this OneDrive folder.

## 5. Out of scope for this phase

These come next once the data layer is approved:

- The HTTP API and its routes (framework choice, question 8; REST or tRPC, question 9).
- The Socket.IO server.
- Map matching (Valhalla).
- Wiring the app's placeholders to the API.

Better Auth gets its configuration and tables now. Its HTTP handler needs the API server, so it's mounted in that next phase.

## 6. Commits

I'll work on a branch, `feat/data-layer`, since `master` is the default branch, and not push. Commits, one per area:

1. infra: workspace, docker-compose, env, config ignores
2. schema: Drizzle schema, PostGIS types, migrations
3. data access: per-area modules, Valkey, storage, auth configuration
4. seed
5. tests
6. docs: `README-DATA.md` and README wording

## 7. Open questions

1. **Postgres version:** which major version is your Neon project on? I'll use 17 unless you say otherwise (C14).
2. **Roles (C1):** OK to make `users.role` `user`/`admin`, with drivers identified by a `drivers` row?
3. **Hazard taxonomy (C5):** add `congestion` to the database now, and to the client later? If so, what expiry and routing weight should it have?
4. **Document types (C7, C8):** OK to use per-country slugs (text) and multi-file documents, instead of a fixed enum and a single key?
5. **Sensitive personal data:** may the backend store ID and licence numbers? If yes, should they be encrypted at the column level? If not, keep only the photos.
6. **Partition and hazard-expiry jobs:** where should scheduled work run (an in-process timer, a GitHub Action, or a Neon scheduled trigger)? Neon's `pg_cron` stops whenever the compute scales to zero.
7. **Shared domain code (C13):** country configs and the hazard taxonomy live in the app. Should the server import them from the app's source for now, or should I extract a `shared/` package?
8. **API framework, for the next phase:** Hono or Fastify? Both work with Better Auth and Socket.IO.
9. **API style:** the README planned tRPC. Keep tRPC, or switch to REST?
10. **Money (C9):** OK to store integer minor units?
