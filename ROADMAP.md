# LocalBoards Roadmap

This document tracks the work between the current `0.15.x` line and a stable
**1.0.0** release.

The feature set already feels 1.0 — real-time multiplayer, authentication,
per-board roles, API keys, an MCP integration, i18n, and Docker deployment. What
1.0 still needs is the engineering safety net (tests, CI) and a handful of real
security and stability fixes. **1.0 is a promise of upgrade-safety and
stability**, and that is what the items below are about.

Items are grouped by priority. Checkboxes track progress.

---

## 🚧 Blockers — must land before 1.0.0

These are the things that make a 1.0 promise credible.

### Testing & CI
- [x] Add a test runner (Vitest) and a `test` script to `package.json`.
- [x] Integration tests for the authorization branches. DB-backed tests run the
      real code against a real MySQL (`test/integration/`, `npm run
      test:integration`, CI MySQL service container): `verifyApiKey` (+ legacy
      plaintext → hash migration), `resolveSession`, and `authorizeBoard`.
  - [x] Extended to full `requireBoardAccess` end-to-end (API-key auth →
        board/invitation load → decision) via a fake h3 event helper
        (`test/integration/event.ts`).
  - [x] HTTP-level e2e tests via `@nuxt/test-utils` (`test/e2e/`, `npm run
        test:e2e`, also in CI): `sign-in` 405/400/401/429. Builds and runs the
        real server against the test DB.
  - [x] Extended e2e to sign-up happy path and a password-reset happy path
        (seed token → reset → sign in with the new password).
  - [x] e2e for the session-protected auth endpoints: `get-session`,
        `api-key/*` (create/list/delete), `admin/list` authorization, `sign-out`.
- [x] GitHub Actions workflow on PRs: build + test, plus a non-blocking
      `npm audit` (`.github/workflows/ci.yml`).
- [x] Extend CI to also build the Docker image (build-only validation job with
      layer caching).
- [x] CI `npm audit`: the production-dependency audit (`--omit=dev`) is now
      blocking; a full audit (incl. dev tooling) runs as a non-blocking
      informational step.

### Centralize authorization
- [x] Extract the pure access *decision* (owner / public / invitation →
      none/read/edit) into `resolveBoardAccess` in
      `server/utils/boardAccess.ts`, covered by exhaustive unit tests.
- [x] Build a `requireBoardAccess(event, boardId, 'read' | 'edit')` helper in
      `server/utils/auth.ts` (plus a shared `resolveUserId`) that wraps "verify
      API key → resolve session → resolve userId → load board + invitation →
      `resolveBoardAccess`".
- [x] Replace the copy-pasted blocks in the remaining endpoints with calls to
      the helper. **Done** — all data endpoints migrated (`board.ts`,
      `boards.ts`, `area.ts`, `areas.ts`, `card.ts`, `cards.ts`, `cardMove.ts`,
      `cardOrder.ts`, `comment.ts`, `invite.ts`, `notifications.ts`,
      `attachment.ts`).
- _Why:_ the same access check was re-implemented per endpoint (the
  `// CRITICAL FIX` / `// HIGH FIX` comments are remnants of a security audit
  patched file-by-file). Duplicated checks drift, and one endpoint will
  eventually miss a branch.
- _Access model (decided & implemented):_
  - **Public boards are read-only** to non-owner/non-invited users. Writing
    (cards, areas, comments — create/edit/move/delete) requires the owner or an
    `edit` invitation; public status never grants write. This fixed the earlier
    bug where any authenticated user could edit public boards, and removed the
    create-but-not-delete inconsistency. The `publicWrite` option was dropped —
    a plain `"edit"` check now enforces this everywhere.
  - **Owner-only** paths (unchanged, correct): board deletion and all invite
    operations.

### Security fixes
- [x] **Hash API keys at rest.** Keys are stored as a SHA-256 hash
      (`hashApiKey` in `server/utils/apiKey.ts`); `create.ts` stores the hash and
      `verifyApiKey` looks up by hash only (no plaintext fallback). A one-time
      migration (`0002_hash_legacy_api_keys`) hashes any pre-existing plaintext
      keys at startup (`SHA2(key,256)` for `LENGTH = 32` rows), so existing keys
      keep working.
- [x] **Rate limiting** on `sign-in`, `request-password`, and `reset-password`
      (in-memory per-IP throttle in `server/utils/rateLimit.ts`, returns 429 +
      `Retry-After`). _Caveat:_ per-instance state — a multi-replica deployment
      would need a shared store (DB/Redis).
- [x] **Stop the self-HTTP session lookup.** `getSession` now resolves the
      session directly from the DB via a shared `resolveSession` helper (used by
      both `getSession` and the `/api/auth/get-session` endpoint) instead of
      `$fetch`-ing itself on every request.

### Stability
- [x] Tidy `setupDatabase()` usage. It now just returns the pool; the
      `CREATE TABLE IF NOT EXISTS` DDL no longer runs on every request. Schema
      setup moved to a once-at-startup migration runner (see below).
- [x] **DB migration strategy.** Added a versioned migration system in
      `app/lib/databaseSetup.ts` (ordered migrations tracked in a `migrations`
      table, applied once at startup via `server/plugins/0.database-migrate.ts`).
      The existing schema is the `0001_baseline_schema` migration; future schema
      changes are appended as new entries. This gives upgrade-safety for
      populated databases instead of ad-hoc runtime `CREATE TABLE IF NOT EXISTS`.

---

## ✅ Should-have for 1.0.0

- [x] **Versioning hygiene.** `package.json` now has a real `name`
      (`localboards`) and `version` (`0.16.0`); the README badge is a dynamic
      shields `package-json/v` badge that reads the version from `package.json`,
      so it stays in sync automatically.
- [x] **`CONTRIBUTING.md`** — dev setup, unit + integration test instructions,
      schema-migration workflow, and a PR checklist; linked from the README.
- [x] **Healthcheck endpoint** (`/api/health`) — returns 200/503 based on DB
      reachability; the Docker image declares a `HEALTHCHECK` against it.
- [x] **Backup & restore docs** — README "Backup and Restore" section covering
      the database and the uploads volume, with backup/restore commands.

---

## 💡 Nice-to-have — can follow 1.0.0

- [x] Structured logging — `server/utils/logger.ts` (leveled JSON, controlled by
      `NUXT_LOG_LEVEL`); server `console.*` calls swept to it.
- [x] Browser E2E (Playwright) covering the real-time multiplayer flow — two
      authenticated contexts on one board; a card created by one appears live for
      the other via Socket.IO (`test/playwright/`, `npm run test:browser`, in CI).
- [x] Resolved the `getSession` name collision: the auth helper is now
      `getUserSession`, so it no longer shadows h3's auto-imported `getSession`
      (build warning gone).
- _Note:_ `app/lib/socket.ts` is the client (`socket.io-client`) socket and is
  correctly placed under `app/`; the server socket lives in
  `server/utils/socket.ts`. No relocation needed (earlier note was inaccurate).

---

_Last reviewed: 2026-06-23 (against v0.16.0). All roadmap items are complete._
