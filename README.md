# Waypoint — Mobile Frontend

Smart mobility, road intelligence and safety platform. Launch market: Jamaica.

> **Know the way. Know you're safe.**

This is the **frontend scaffold**: UI components, navigation, design system, domain
logic and tests. There is no backend wired up — server data is represented by
fixtures in `src/mocks/`, shaped exactly like the real responses will be.

---

## Running it

```bash
pnpm install
pnpm start          # then press a / i / w
```

| Script | What it does |
| --- | --- |
| `pnpm start` | Expo dev server |
| `pnpm test` | Jest + React Native Testing Library (44 tests) |
| `pnpm typecheck` | `tsc --noEmit`, strict + `noUncheckedIndexedAccess` |
| `pnpm lint` | ESLint, including the architecture rules below |
| `pnpm format` | Prettier |

Runs in Expo Go today. A **custom dev client** becomes mandatory the moment the
real map lands — see *Known gaps* below.

---

## Structure

```
app/                      Expo Router — file-based routes, thin by design
├─ _layout.tsx            providers · splash hold · role-gated groups
├─ (auth)/                guard: no session
├─ (onboarding)/          guard: driver && !verified
│  └─ documents/[slug]    ONE screen for every document in every market
├─ (passenger)/           tabs: Ride · Activity · Safety · Account
├─ (driver)/              tabs: Drive · Earnings · Documents · Account
└─ (modals)/              report-hazard · share-ride · evidence

src/
├─ theme/                 tokens + typography — the single source of truth
├─ components/            the design system
├─ features/              domain logic, one folder per bounded concern
│  ├─ country/            the Country Configuration System
│  ├─ trip/machine/       the trip phase state chart
│  ├─ hazards/            the ten-condition taxonomy
│  ├─ fare/               fare PRESENTATION (never calculation)
│  └─ safety/             three-path panic escalation
├─ store/                 Zustand — ephemeral state only
└─ mocks/                 Kingston fixtures standing in for the server
```

Every feature exposes an `index.ts`. Reaching past it is a lint error, not a
style preference — that boundary is what lets a feature's internals change.

---

## The rules this scaffold encodes

These come from the proposal and the brand guide. They are enforced by tests
and lint rather than documented and hoped for.

**The client never computes money or trust.** `presentFare` formats a
server-computed fare and explains it; it never multiplies a rate by a distance.
Same for deviation verdicts, verification state and distance travelled. This is
the whole fairness claim — see `src/features/fare/presentFare.ts`.

**Enforcement reports have zero routing weight.** Proposal §2.2 frames them as
road awareness, never evasion guidance. `HAZARDS.enforcement.routingWeight` is
`0` and a test guards it. If that test fails, the regulatory position is broken.

**Share My Ride is off by default and never silently re-arms.** Each trip is a
fresh decision unless the passenger explicitly chose "until I stop it".
Revocation is optimistic and immediate.

**The panic button is a long-press, not a tap.** ~1.5s with a visible progress
fill: a pocket tap dispatches emergency services, and a confirmation dialog
costs seconds. It fires three independent paths and persists state *before* any
network work.

**Nothing hardcodes a market.** No `J$`, no `119`, no document list anywhere in
the tree. Onboarding forms render from `CountryConfig`. Two configs (JM + TT)
ship from day one so the test suite catches a hardcoded string now rather than
in Phase 4. Switch markets live in **Account → Market** to see it work.

**Colours come from tokens.** A hex literal in a component is a lint error.
Pin Gold has no text role at all — it fails WCAG AA at 2.3:1, so the mistake is
unavailable rather than merely discouraged.

---

## Design system

`src/theme/tokens.ts` is the single source, straight from the Brand & Style Guide.

| | |
| --- | --- |
| Waypoint Navy `#10233D` | Primary — buttons, app bar, headings |
| Route Green `#0E7C61` | Secondary — verified badges, success |
| Pin Gold `#E3A008` | Accent — fills and large bold display **only** |
| Alert Coral `#D64545` | Critical — panic and destructive **only**, never decorative |

Traffic colours (`#34A853` / `#F29900` / `#EA4335`) are **functional, not
brand**. They stay on the map so people can trust them at a glance; a verified
badge uses Route Green, never traffic green.

Type is Fraunces (display) + Inter (UI, tabular figures for money). IBM Plex
Mono is a **documented extension** for developer-facing surfaces — trip IDs,
plate numbers — and is not in the guide. Confirm before it reaches a passenger
screen.

---

## Styling: StyleSheet, not NativeWind

Your stack listed "NativeWind / StyleSheet". This uses **StyleSheet driven by
the token package**, because NativeWind 4.2.6 predates React Native 0.86 and
Expo SDK 57 and its jsx-runtime patching is not verified against them.

Nothing is lost by adding it later: components consume semantic tokens, not
literals, so NativeWind can be layered on for static chrome without touching
component logic. The boundary to keep when you do — animated paths and map
layer styles stay on plain style objects, because worklets cannot resolve
classes and Mapbox layers do not take React Native styles at all.

---

## Tests

44 tests, all pure logic and fast. What they protect:

- **Trip machine** — every transition including cancel-during-match, driver
  drops mid-trip, and the server disagreeing with local optimism.
- **Fare presenter** — an overage *always* produces an explanation; currency
  formats per market; a malformed response degrades rather than blocking.
- **Hazard taxonomy** — enforcement never routes; expiry windows hold.
- **Country config** — two markets, so a hardcoded `JM` string fails now.
- **Dynamic form** — validation derived from the spec, errors say how to fix.
- **Safety store** — sharing defaults off, expires at trip end, revokes instantly.

The map is deliberately not tested. You do not unit-test a map; the two-sided
ride flow needs Maestro across two simulators.

---

## Known gaps

Deliberate, in rough priority order.

1. **The map is a scaffold.** `MapCanvas` renders the real visual language —
   traffic-coloured segments, route above them, ring-and-badge pins — with
   plain views, so the app runs today without a Mapbox account. Production is
   `@rnmapbox/maps` with a data-driven `LineLayer` and a clustered
   `SymbolLayer`; the layer order is documented in the component. That swap
   requires a custom dev client.
2. **No backend.** Fixtures stand in for Supabase and tRPC. `firePanic` and the
   report submission have their real three-path / paused-mutation structure with
   placeholder transports.
3. **No persistence.** Zustand stores are in-memory. The panic and draft-report
   stores must be MMKV-backed before real use — a crash mid-incident that looks
   like nothing happened is this feature's worst failure.
4. **No offline outbox.** TanStack Query is configured but `onlineManager` is
   not yet wired to NetInfo and the cache is not persisted.
5. **Location is not streaming.** The 1 Hz shared-value pattern is specified in
   the architecture doc but not implemented; `expo-location` is installed and
   permission strings are in `app.json`.

---

## Next

- Custom dev client + Mapbox, replacing `MapCanvas`
- Supabase auth and the tRPC decision API
- MMKV persistence for panic, draft reports, and the query cache
- Offline outbox: NetInfo → `onlineManager`, `resumePausedMutations`
- Maestro E2E for the two-sided ride flow

---

## A note on this folder

The project sits in a OneDrive-synced directory. OneDrive will try to sync
`node_modules`, which is slow and occasionally locks files mid-install. If
installs start failing oddly, exclude `node_modules` from sync — or move the
repo outside OneDrive.

`.npmrc` sets `node-linker=hoisted`: Metro does not reliably resolve pnpm's
symlinked layout. Leave it in place.
