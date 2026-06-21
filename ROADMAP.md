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
- [~] Integration tests for the authorization branches. Done: `authorizeBoard`
      is covered with a fake DB (invitation-lookup conditions + `publicWrite`
      strict mode). Still open: end-to-end tests of `resolveUserId` /
      `requireBoardAccess` and the `server/api/auth/*` endpoints against a
      throwaway MySQL (or after adding DI seams for `getSession`/`verifyApiKey`).
- [x] GitHub Actions workflow on PRs: build + test, plus a non-blocking
      `npm audit` (`.github/workflows/ci.yml`).
- [ ] Extend CI to also build the Docker image (and consider making `npm audit`
      blocking once it's consistently clean).

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
- _Inconsistencies surfaced & preserved (decide whether to reconcile):_
  - **Public boards are fully writable by anyone** for cards/areas(create)/
    comments, but **board-record update** and **area deletion** are stricter
    (`publicWrite: false` — owner or `edit` invite only). So on a public board a
    stranger can create/rename areas but not delete them. Likely an oversight.
  - **Owner-only** paths: board deletion and all invite operations.

### Security fixes
- [ ] **Hash API keys at rest.** `verifyApiKey` currently matches keys in
      plaintext (`WHERE \`key\` = ?` in `server/utils/auth.ts`); the surrounding
      bcrypt "constant-time" code does not protect a plaintext indexed lookup.
      Store a hash (or HMAC) of the key and compare against it. A DB leak
      currently exposes every live key.
- [ ] **Rate limiting** on `sign-in`, `request-password`, and `reset-password`
      (per-IP throttle via nitro middleware) to stop credential stuffing and
      reset-token brute-forcing.
- [ ] **Stop the self-HTTP session lookup.** `getSession` does
      `$fetch("/api/auth/get-session")` on every request — an HTTP round-trip to
      itself per API call. Query the session table directly.

### Stability
- [ ] Tidy `setupDatabase()` usage. It is **synchronous** (returns the pool
      directly), so the mix of `setupDatabase()` and `await setupDatabase()`
      across files is harmless but inconsistent. More importantly it fires all
      the `CREATE TABLE IF NOT EXISTS` DDL on *every* call (i.e. every request);
      run the schema setup once at startup and have request code just grab the
      pool.
- [ ] **Decide on a DB migration strategy** before 1.0. Schema is currently
      created at runtime in `app/lib/databaseSetup.ts`, which is fine for a fresh
      install but cannot evolve a populated database safely. A 1.0 implies
      upgrade-safety across schema changes (even a simple versioned-SQL runner).

---

## ✅ Should-have for 1.0.0

- [ ] **Versioning hygiene.** `package.json` is `"name": "nuxt-app"` with no
      `version` field, yet the README version badge is maintained by hand. Make
      `package.json` the source of truth and derive the badge/release from it.
- [ ] **`CONTRIBUTING.md`** — the README notes there is no contribution guide; a
      1.0 OSS project should have one.
- [ ] **Healthcheck endpoint** (`/api/health`) so Docker/compose/orchestrators
      can probe readiness.
- [ ] **Backup & restore docs** — how to back up the MySQL data and the
      `/app/public/uploads` volume, and how to restore.

---

## 💡 Nice-to-have — can follow 1.0.0

- [ ] Structured logging instead of scattered `console.error`.
- [ ] End-to-end smoke test (Playwright) covering the real-time multiplayer flow.
- [ ] Minor structure cleanup (e.g. `app/lib/socket.ts` is server-oriented but
      lives under `app/`).

---

_Last reviewed: 2026-06-21 (against v0.15.4)._
