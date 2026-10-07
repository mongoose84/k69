# Architecture audit — status and plan

Started 2026-10-07 on branch `goer_siden_mere_robust`. This file tracks the
findings from the architecture audit, what has been fixed, and what is left.
Tick items off as they land and note the commit.

## Summary

The core is sound: `packages/rules` is a pure, dependency-free domain model;
`Afventer` is a clean state machine; chance and time are injected via
`Kontekst`; tests read as the rules of the game. The weak points are at the
edges — the trust boundary between network and domain, persistence, and the
lack of layering in `apps/api`.

## Step 1 — Low-hanging fixes ✅ done (`25be33f`)

- [x] **Atomic commands.** `anvend` works on a `structuredClone` and never
      mutates its input. A `RegelFejl` mid-action leaves the stored state
      untouched (was: `giv-slurke` failing halfway had already charged sips).
- [x] **Boundary validation.** `tolkHandling` (`packages/rules/src/handling.ts`)
      checks shape/types of every client command and strips unknown fields.
      Hand-written to keep `@k69/rules` dependency-free; a mapped type forces a
      parser for every `KlientHandling` type.
- [x] **Client commands vs. system events.** `Handling = KlientHandling |
      SystemHandling`. `forbindelse` can no longer be sent by a client.
- [x] **Domain range checks.** Meier bids must be an integer on the ladder;
      tower fill must be finite; piece colour must be one of `BRIKFARVER`.
- [x] **Per-game serialisation in the hub.** `iKoe` runs one action at a time
      per game. Required by the cloning: verified live that a 30-action burst
      lost 27 updates without it, 0 with it.
- [x] **Client fatal-error reconnect loop.** `useSpil` read a stale `fatal`
      from the effect closure; now uses a ref.
- [x] Tests: 13 new (atomicity, ranges, colour fallback, `tolkHandling`
      accept/reject/strip). 73 total.

## Step 2 — Session tokens (impersonation) ⬜

**Problem:** `spillerId` is the only credential, and every client receives all
players' ids (`spillere[].id`, `vaertId`) via `forSpiller`. Anyone can
reconnect with another player's id (`hub.ts` `hej`) and see their hidden Meier
dice, act on their turn, or start the game as host.

- [ ] Server issues a secret `sessionToken` on first `hej`; store
      `token → spillerId` server-side (in the game state or a separate table).
- [ ] Client stores only the token in `localStorage`; `spillerId` stays public.
- [ ] `hej` with an unknown token → new player; never accept a raw `spillerId`.
- [ ] Migration path for existing clients holding a `spillerId` in
      `localStorage` (one-time claim, or accept loss of seat).
- [ ] Tests: cannot act as another player; cannot see another player's Meier roll.

## Step 3 — API layering ⬜

**Problem:** `hub.ts` mixes protocol, rate limiting, room membership and the
application flow. `store.ts` is repository + cache + write-batching on a
module-level `pool` singleton. Nothing in `apps/api` is testable without
Postgres and a WebSocket.

Target:

```
transport/ws.ts        parse + validate envelope, rate limit, sockets ↔ rooms
app/SpilService.ts     udfoer(kode, session, handling): load → apply → save → publish
domain (@k69/rules)    pure
infra/PgSpilRepo.ts    implements SpilRepository { hent, gem } with version check
```

- [ ] Introduce `SpilRepository` interface + Postgres implementation; inject
      it (no module-level `pool` imports outside infra).
- [ ] Move the per-game queue (`iKoe`) into `SpilService`.
- [ ] **Load race** (`store.ts` `hentSpil`): dedupe concurrent cache-miss loads
      of the same game (in-flight `Map<kode, Promise>`).
- [ ] **Out-of-order writes** (`store.ts` `skriv`): serialise writes per game
      and/or add `where version < $new` so an older snapshot can never
      overwrite a newer one. The `version` column exists but is unused.
- [ ] **`hej` lifecycle** (`hub.ts`): if the socket closes before `hej`
      resolves, don't add it to the room; a second `hej` on the same socket
      replaces the first; reject/queue actions sent before `velkommen`.
- [ ] Rate-limit `hej` too (each cache miss is a DB query).
- [ ] Tests: `SpilService` with an in-memory repo (ordering, rate limit,
      hej/close edge cases); one integration test against Postgres in CI
      (service container) covering migrations and the version guard.

## Step 4 — Domain events instead of prose ⬜

**Problem:** the engine produces Danish UI text (`skriv`, `raab`, `fejr`), and
"last moment" UI projections (`fejring`, `udraab`, `meierResultat`) live on the
aggregate. `haendelser.data jsonb` is never written, so a game cannot be
rebuilt from the log despite the migration comment promising it.

- [ ] `anvend` returns `{ spil, haendelser: DomaeneHaendelse[] }` with
      structured events (`Landet`, `SlurkeGivet`, `MeierLoeftet`, …).
- [ ] Render text in `packages/ui/tekst.ts`; derive celebrations/shouts from
      events on the client.
- [ ] Persist events in `haendelser.data`; text column becomes optional.
- [ ] Inject shuffling too (`ctx.tilfaeldig`) — `start` and `tagFraBunken`
      still call `Math.random` directly — so games are fully replayable.
- [ ] Add `skemaVersion` to saved state with an upgrade chain, replacing the
      ad-hoc `opgraderGemt` and the "missing in old saved games" optional fields.

## Step 5 — Split `engine.ts` by subdomain ⬜

`engine.ts` is ~1,200 lines. Split once events give each module a clear output:

- [ ] `tur/` (turn order, afgang), `pit/`, `taarn/`, `kort/` (deck, 7'er,
      finger, 10'er), `meier/`, `regnskab` (the `drik` sip ledger).
- [ ] Each module exports its command handlers; `anvend` becomes a handler
      table lookup (Command pattern) instead of two switch statements.

## Smaller items (any time)

**REST / protocol**
- [ ] `POST /api/spil` → `201 Created` + `Location: /api/spil/{kode}`.
- [ ] Fastify route schemas for params and responses; validate `:kode`.
- [ ] One error format (consider `application/problem+json`); today `{fejl}`
      and Fastify's default are mixed.
- [ ] Rate-limit game creation; job to delete stale games from the DB.
- [ ] Split `/api/sundhed` into liveness and readiness.
- [ ] Shared, typed WS message union (`{t:'hej'|'handling'|'velkommen'|…}`)
      used by both `hub.ts` and `useSpil.ts`.
- [ ] Correlation id per action so errors map to the action that caused them.
- [ ] Client sends the state version it acted on; server rejects stale
      replays from the offline queue (`useSpil` `koe`).
- [ ] Name the view type once (`SpilUdsyn` = `Spil & { bunkeTilbage }`) in a
      shared module.

**Tests**
- [ ] Coverage in CI (`node --test --experimental-test-coverage`).
- [ ] Rules gaps: deck exhaustion/reshuffle, game end when last player
      leaves, `forSpiller` after a blind Meier roll, wrap-around past field 38,
      all `krone-resultat` branches, `terning-paa-gulvet`.
- [ ] Property-based tests (`fast-check`): random command sequences hold
      invariants (`afventer` non-null while playing, sips never NaN,
      `slurkeIAlt` monotonic).
- [ ] UI test setup; first targets `useSpil` (fatal/reconnect),
      `useForsinketSpil`, `tekst.ts`.

**Front-end duplication**
- [ ] `api.ts` and `main.tsx` are identical in web and mobile — move to
      `packages/ui`.
- [ ] Extract shared form logic (e.g. `useTilmeldForm` from the duplicated
      `Tilmeld` state) into headless hooks; keep only layouts per app.
