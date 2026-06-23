# Contributing to LocalBoards

Thanks for your interest in improving LocalBoards! Contributions — bug reports,
fixes, features, and docs — are very welcome. This guide covers how to get a dev
environment running and what's expected of a pull request.

LocalBoards is a Nuxt 4 + Socket.IO, self-hosted Kanban app backed by MySQL.

## Prerequisites

- **Node.js 22** (the toolchain requires Node 20+; CI runs on 22).
- A reachable **MySQL 8+** database for local development. The required tables
  are created automatically on first start, so an empty database is enough.

## Getting started

```bash
git clone https://github.com/florian-strasser/LocalBoards
cd LocalBoards
npm install
```

Create a `.env.local` for local development (see the variables in the
[README](README.md#configure-environment-variables)), pointing
`NUXT_MYSQL_*` at your local database.

Run the dev server:

```bash
npx nuxt dev --dotenv .env.local
```

## Tests

There are two test suites:

- **Unit tests** — fast, no database required. This is what `npm test` runs and
  what gates every PR.

  ```bash
  npm test
  ```

- **Integration tests** — run the real code against a real MySQL. They live in
  `test/integration/` and use a **throwaway** database (they truncate tables, so
  never point them at real data). Create an empty database, then:

  ```bash
  TEST_MYSQL_HOST=127.0.0.1 \
  TEST_MYSQL_USER=root \
  TEST_MYSQL_PASSWORD=yourpassword \
  TEST_MYSQL_DATABASE=localboards_test \
  npm run test:integration
  ```

- **HTTP e2e tests** (`@nuxt/test-utils`) — build and run the real server and hit
  it over HTTP. Same `TEST_MYSQL_*` env as above, then `npm run test:e2e`.

- **Browser tests** (Playwright) — drive the real-time multiplayer UI in a real
  browser. One-time `npx playwright install chromium`, then build the app
  (`npm run build`) and run with the `TEST_MYSQL_*` env: `npm run test:browser`.

Please add or update tests for any behavior you change. Security-sensitive logic
(authorization, sessions, API keys) should keep its test coverage.

## Building

```bash
npm run build
```

## Database schema changes

The schema is managed by a small migration runner in
[`app/lib/databaseSetup.ts`](app/lib/databaseSetup.ts) and applied once at
startup. To change the schema, **append a new migration** to the `migrations`
array (e.g. `0002_add_x`) with an `up(db)` function — never edit or remove an
existing migration, as it may already be applied in the wild.

## Pull request checklist

- [ ] `npm test` passes (and `npm run test:integration` if you touched DB code).
- [ ] `npm run build` succeeds.
- [ ] Added a `CHANGELOG.md` entry under the current unreleased version,
      describing the change and the why.
- [ ] New/changed behavior is covered by tests where practical.
- [ ] Code matches the style of the surrounding files.

CI runs the unit suite, a production build, an integration suite (against a
MySQL service container), `npm audit`, and CodeQL on every push and PR.

## Reporting security issues

Please do **not** open a public issue for security vulnerabilities. Follow the
process in [SECURITY.md](SECURITY.md).
