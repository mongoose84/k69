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
      accept/reject/strip). 73 total at the time; 80 after the voting merge.
- [x] **Vote timer through the queue** (`5212ec3`). `afgoerPaaTid` (added
      with voting in `8cf2181`, after this audit started) loaded, applied
      and saved outside `iKoe`, so a timer firing mid-action could overwrite
      a player's move. Masked while `hentSpil` hits the cache; would have
      surfaced with Step 3's async repository. Now queued, skips votes that
      were settled or replaced ahead of it, and only clears its own timer.

## Step 2 — Session tokens (impersonation) ✅ done (not yet run end to end)

**Problem:** `spillerId` is the only credential, and every client receives all
players' ids (`spillere[].id`, `vaertId`) via `forSpiller`. Anyone can
reconnect with another player's id (`hub.ts` `hej`) and see their hidden Meier
dice, act on their turn, or start the game as host.

Voting (`8cf2181`) raises the stakes: a stolen id can also vote, and `smid`
votes remove players. Separately, only connected players count as voters and
anyone may `join` mid-game with a fresh id (up to the cap of 8), so one person
with several tabs can outvote the table and kick a real player — tokens alone
don't fix that.

- [x] Secret session token per game; the game state stores only
      `sha256(token) → spillerId` (`Spil.sessioner`), and `forSpiller` strips
      it. Logic in `apps/api/src/session.ts` (`genkend`, `medSession`).
      Deviation: the client generates the token (32 random bytes, format
      checked by the server) instead of the server issuing it, so two tabs or
      a double React mount share one token from the start. The server still
      decides which player a token belongs to; a malformed token is replaced.
- [x] Client stores the token per game (`k69:token:<KODE>`); `spillerId`
      stays public and is no longer stored.
- [x] `hej` with an unknown token → new player id; a raw `spillerId` is never
      enough. A token is bound on `join`, so spectators don't add entries.
- [x] Migration: one-time claim. A `spillerId` from the old `k69:spillerId`
      key gets its seat back only if that player exists and no token is bound
      to it yet. Trade-off: until the real owner reconnects, anyone can
      claim that seat with the public id. Old open tabs (no `token` in `hej`)
      get a fatal "reload" error, so they can't spend the claim and then lose
      the seat. Remove the claim and the old key once old games have expired.
- [x] Who may vote. `vaelgere` is frozen when a vote starts, and mid-game
      joins now need the host's approval: `join` while playing creates an
      `Anmodning` (`Spil.anmodninger`), the host answers with `godkend-join`.
      Pending requests count towards the 8 seats and taken names, and give no
      vote. Lobby joins are unchanged — everyone is visible before `start`.
- [x] Host hand-over (`sikrVaert`, runs after every `anvend`): if the host is
      offline or out, the role passes clockwise to the next active, connected
      player and stays there when the old host returns. With no one else
      online it stays put. Applies in the lobby too, so someone can start.
      Trade-off: a host whose phone briefly locks loses the role at once; add a
      grace period (timer in the hub, like the vote timer) if that annoys.
- [x] Tests: `apps/api/test/session.test.ts` (8): a known token gives its own
      player, a public id doesn't, one-time claim, hashes only, malformed tokens.
      Rules: `forSpiller` never sends `sessioner`. `npm test` now also runs
      the API tests.
- [ ] Not verified end to end against Postgres + WebSocket (needs Step 3's
      testable hub, or a manual run with `docker compose up`).

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
"last moment" UI projections (`fejring`, `udraab`, `meierResultat`, and the
settled `afstemning`) live on the
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

`engine.ts` is ~1,400 lines (voting added ~200). Split once events give each module a clear output:

- [ ] `tur/` (turn order, afgang), `pit/`, `taarn/`, `kort/` (deck, 7'er,
      finger, 10'er), `meier/`, `afstemning/`, `regnskab` (the `drik` sip ledger).
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
- [ ] Run tests on pull requests — today `npm test` only runs on push to
      `main` (`docker-publish.yml`), i.e. after merge.
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
