# Contributing

LokalBoards is open source (MIT) and contributions are very welcome — bug reports, fixes, features, and documentation. This page explains how to set up a development environment and what's expected of a pull request. The same information lives in [`CONTRIBUTING.md`](https://github.com/florian-strasser/LokalBoards/blob/master/CONTRIBUTING.md) in the repository.

## Prerequisites

- **Node.js 22** (the toolchain requires Node 20+; CI runs on 22).
- A reachable **MySQL 8+** database for local development. The required tables are created automatically on first start, so an empty database is enough.

## Getting started

```bash
git clone https://github.com/florian-strasser/LokalBoards
cd LokalBoards
npm install
```

Create a `.env.local` for local development (see [Getting started](/docs) for the available environment variables) pointing `NUXT_MYSQL_*` at your local database, then run the dev server:

```bash
npx nuxt dev --dotenv .env.local
```

## Tests

There are two test suites.

**Unit tests** are fast and need no database. This is what `npm test` runs and what gates every pull request:

```bash
npm test
```

**Integration tests** run the real code against a real MySQL. They use a throwaway database (they truncate tables, so never point them at real data). Create an empty database, then:

```bash
TEST_MYSQL_HOST=127.0.0.1 \
TEST_MYSQL_USER=root \
TEST_MYSQL_PASSWORD=yourpassword \
TEST_MYSQL_DATABASE=lokalboards_test \
npm run test:integration
```

Please add or update tests for any behaviour you change. Security-sensitive logic (authorization, sessions, API keys) should keep its test coverage.

## Building

```bash
npm run build
```

## Database schema changes

The schema is managed by a small migration runner in `app/lib/databaseSetup.ts` and applied once at startup. To change the schema, **append a new migration** to the `migrations` array (for example `0002_add_x`) with an `up(db)` function — never edit or remove an existing migration, as it may already be applied on other installations.

## Pull request checklist

- `npm test` passes (and `npm run test:integration` if you touched database code).
- `npm run build` succeeds.
- A `CHANGELOG.md` entry is added under the current unreleased version, describing the change and the why.
- New or changed behaviour is covered by tests where practical.
- Code matches the style of the surrounding files.

Continuous integration runs the unit suite, a production build, the integration suite (against a MySQL service container), `npm audit`, and CodeQL on every push and pull request.

## Reporting security issues

Please do **not** open a public issue for security vulnerabilities. Follow the process described in the project's [security policy](https://github.com/florian-strasser/LokalBoards/blob/master/SECURITY.md).
