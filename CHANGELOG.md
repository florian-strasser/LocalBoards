## v0.18.0

### New Features
- **First-run onboarding tour.** New accounts are offered an optional guided walkthrough on first sign-in: it highlights the "new board" button, then on the fresh board walks through creating two areas, adding a card, dragging it to another area, and inviting a collaborator. Each step **auto-advances when you actually do it**, and you can end the tour at any time. Whether an account has been onboarded is tracked server-side (schema migration `0004`; existing users are marked as already onboarded so only brand-new accounts see it). Public self-signups get the tour by default; when an **admin creates** a user there's a checkbox to opt that account into the tour (off by default, since admin-created accounts are usually managed). Fully translated in all seven languages.
- **Account-deletion email with a reason.** When an admin deletes a user, they now must enter a reason, and the deleted user receives a translated email letting them know their account was removed and why — so a deletion is no longer silent. (The user's email/name are captured before deletion; the reason is required and HTML-escaped; email delivery is best-effort and never blocks the deletion.)
- **Welcome emails for new accounts.** Users now get a translated welcome email when their account is created. Public self-signups receive a simple welcome (no credentials). When an **admin** creates an account there's a new opt-in checkbox — *"Send the login details to the user by email"* — that emails the new user their credentials and states who created the account (e.g. *"Carol has created a LocalBoards account for you"*), so admins no longer have to copy/paste and share the password manually. The checkbox is off by default (unchanged copy-the-credentials behaviour); if sending fails the account is still created and the credentials are shown for manual sharing. Emails are translated in all seven languages, and user-supplied values are HTML-escaped.

### Improvements
- **Invite people by searching, instead of typing their full email.** The board-invite dialog now has a searchable user picker: start typing a name or email and pick the person from a list (name + avatar), mirroring the card-modal assignee picker. To respect the earlier anti-enumeration hardening, the search runs server-side and only a board's owner can search its invitable users; results return names/avatars plus a **masked** email (e.g. `fl••@exa••.com`) so same-name users can be told apart without exposing real addresses. Invites are sent by the picked user's id (typing a full email still works for API clients).

### Changes
- **Board invitations now send a dedicated email instead of an in-app notification.** When you invite someone to a board they receive a direct, translated email with a link straight to the board and their access level (read-only vs. read & write), rather than the previous in-app notification that was only delivered in the hourly notification digest. New invitations no longer create an `invitation` notification. (Best-effort delivery: the invite is still created if the email can't be sent; the invited user's board name is HTML-escaped.)

## v0.17.0

### New Features
- Cards can now have a **due date & time**, an **alert/reminder schedule**, and an **assignee**, all set in the card modal. Reminders are Apple-Calendar-style offsets — at due time, or 5 / 15 / 30 minutes, 1 hour, 1 day, or 1 week before — and multiple can be added per card. The board tile shows a due-date badge (red when overdue) and the assignee's avatar. To keep the modal uncluttered, the due date and assignee live behind Trello-style popover menus: a small button opens a menu to pick the value (date + reminders, or an assignee from the member list), and once set the button shows the value and reopens the menu when clicked. The "add attachment" button now sits below the attachment list when one exists.
- When a reminder comes due, everyone with access to the board is notified — **or, if the card is assigned, only the assignee**. Assigning a card also notifies the new assignee. Notifications appear in-app and in the existing hourly notification email, and are fully translated in all seven languages. This is backed by a new `card_reminders` table and a `due-reminders` scheduled task that runs every 5 minutes (schema migration `0003`, which also adds the `dueDate`/`assignee` columns and extends the notification-type enum).

### Bug Fixes
- The attachment upload area now also lets you **click to pick a file** (not just drag & drop), **highlights** while a file is dragged over it, and is taller so it's easier to hit.
- Dates in notifications (both the in-app bell and the reminder email) and on the card due-date chip now keep locale-correct leading zeros — e.g. German `03.07.2026, 02:09:00` instead of `3.7.2026, 02:09:00` — by formatting with explicit 2-digit day/month/hour/minute (and seconds for notifications).

### Improvements
- Unified the look of every input across the app: text inputs, textareas, selects and the rich-text editor now share one subtle style (a faint filled background that stands out from the card, a light border, and a primary-colour focus ring) in both light and dark mode. The appearance is defined once as a `.form-control` class in `app/assets/css/main.css` and reused by the shared `InputField.vue` component and the remaining controls, so future restyles only touch one place. Native `<select>` chrome is replaced with a custom chevron so selects match the text inputs' height and padding.

### Internal
- The notification email task now reads its strings from the shared i18n locale files (`i18n/locales/*.json`) instead of a duplicated inline translation table, so notification translations have a single source of truth (shared with the UI). The reminder-firing logic lives in a testable `runDueReminders` helper with DB-backed integration tests (unassigned → all board members, assigned → assignee only, not-yet-due, no double-fire).

### Security Fixes
- Fixed a stored XSS vulnerability. Card descriptions, comments, and notification messages are rendered as HTML (`v-html`) and were not sanitized, so a user with write access to a shared board could store markup like `<img src=x onerror=…>` that runs JavaScript in a collaborator's authenticated session (letting it call the API as that user and exfiltrate everything they can see). All three render sites now pass content through a new `sanitizeHtml` helper (`app/utils/sanitizeHtml.ts`, backed by isomorphic-dompurify, unit-tested) that allows only the markup TipTap emits — including task-list checkboxes and images — and strips `<script>`, inline event handlers, and dangerous URI schemes. Sanitizing at render protects existing content too, not just new posts
- Closed a write-access gap in the MCP tools. The v0.16.0 fix that made public boards read-only for non-collaborators was applied to the REST endpoints but not to the MCP tools, which kept their own inline access logic where `status === "public"` still granted write. Any user with a valid API key could therefore create/edit/move/delete cards & areas and post comments on **any** public board via MCP. All MCP write tools (`createArea`, `createCard`, `deleteArea`, `deleteCard`, `updateArea`, `updateCard`, `writeComment`, `moveAreas`, `moveCard`, `orderCard`) now use the shared, tested `authorizeBoard` helper, so public boards are read-only there too and the duplicated logic can no longer drift from the REST layer. `moveCard` additionally now requires write access to the **destination** board, not just the source
- Removed a board-existence oracle. `authorizeBoard` returned `403` for an existing board the user can't access but `404` for a missing one, so an authenticated user could tell which (sequential integer) board ids exist by probing. It now returns `404` in both cases; a `403` is only returned when the user already has read access but lacks the required write access (which reveals nothing new)
- Removed an email-enumeration vector in the board-invite endpoint. Inviting a non-existent email address previously returned a distinct `404 "User not found"`, letting a board owner probe which emails have accounts. It now returns the same generic success as a real invite (no invitation is created), matching how password-reset requests avoid enumeration

## v0.16.2

### Bug Fixes
- Long unbreakable strings (e.g. URLs) in card descriptions and comments no longer overflow the box — the rich-text content now wraps them (`overflow-wrap`/`word-break` on the `.wysiwyg-wrapper`/`.tiptap` containers)
- Timestamps (e.g. comment times) were shown shifted by the server's UTC offset — a comment posted at 00:56 displayed as 02:56 in CEST. The connection pool reads timestamps as UTC (`timezone: "Z"`), but the MySQL session used the server's local timezone, so `CURRENT_TIMESTAMP`/`NOW()` returned local time that was then reinterpreted as UTC. Each pooled connection now sets `time_zone = '+00:00'`, so writes and reads are consistently UTC. No data migration is needed (TIMESTAMP columns are stored as UTC internally; only the read path was affected), and existing comments now display with the correct time

## v0.16.1

### Internal
- Fixed the CI `npm ci` failure: pinned npm to 11 in the install jobs so it matches the npm major that generates `package-lock.json` (Node 22 bundles npm 10, which resolves `crossws` differently and rejected the lockfile with "Missing: crossws@0.4.6"). Also bumped the GitHub Actions to current Node 24 majors (`actions/checkout@v7`, `actions/setup-node@v6`, `docker/setup-buildx-action@v4`, `docker/build-push-action@v7`), clearing the Node 20 deprecation warnings
- Documented why `hashApiKey` uses SHA-256 in `server/utils/apiKey.ts`: CodeQL's `js/insufficient-password-hash` is a false positive here — API keys are high-entropy random tokens, not passwords, so a fast deterministic hash is correct and is required for the indexed key lookup. The alert is dismissed in code scanning

## v0.16.0

### New Features
- Added a public health-check endpoint `GET /api/health` that returns `200` (`{ status: "ok", database: "ok" }`) when the app is up and can reach its database, or `503` when the database is unreachable. The Docker image now declares a `HEALTHCHECK` against it (using Node's built-in `fetch`, so no extra tools are needed in the slim image), so Docker/compose/orchestrators report container health automatically

### Improvements
- Session resolution no longer makes an internal HTTP round-trip. `getSession` previously called `$fetch("/api/auth/get-session")` on every authenticated request; the session + user lookup is now done directly against the database via a shared `resolveSession` helper in `server/utils/auth.ts`, which both the internal `getSession` and the `/api/auth/get-session` endpoint use. This removes one self-request per API call and a layer of failure, with no change to behaviour or response shape
- The database schema is no longer (re)created on every request. `setupDatabase()` previously issued all `CREATE TABLE IF NOT EXISTS` statements on each call (i.e. every request); it now just returns the connection pool. Schema setup runs **once at startup**.

### Internal
- Added DB-backed integration tests that run the real code against a real MySQL: `verifyApiKey` (including the legacy-plaintext → hash migration), `resolveSession` (valid / expired / banned / unknown), `authorizeBoard` (owner, invitation read/edit, public, and strict `publicWrite:false`), and `requireBoardAccess` end-to-end via API-key auth (owner / invited / uninvited, missing & invalid board id, unauthenticated, invalid key) using a small fake-h3-event helper. They live in `test/integration/`, run via `npm run test:integration` against a throwaway database (configured with `TEST_MYSQL_*` env vars), and run in CI against a MySQL service container. The default `npm test` stays fast and dependency-free (integration tests are excluded). `databaseSetup.ts` now falls back to `process.env` when Nuxt's `useRuntimeConfig` isn't available, so it can be imported outside the Nuxt runtime by the tests
- Introduced a versioned database migration system in `app/lib/databaseSetup.ts`: an ordered list of migrations tracked in a new `migrations` table, applied once at startup by a `server/plugins/0.database-migrate.ts` Nitro plugin. The existing schema is the `0001_baseline_schema` migration (using `CREATE TABLE IF NOT EXISTS`, so it is a safe no-op on existing databases — it just records the baseline as applied). Future schema changes are added as new migration entries instead of relying on ad-hoc `CREATE TABLE IF NOT EXISTS` at runtime, which could not evolve an already-populated database
- Versioning hygiene: `package.json` now has a proper `name` (`localboards`) and a `version` (`0.16.0`), and the README version badge is now a dynamic shields `package-json/v` badge that reads the version straight from `package.json` — so it no longer has to be bumped by hand
- CI now also builds the production Docker image on every push/PR (build-only, no push, with layer caching) so Dockerfile regressions — like a broken `HEALTHCHECK` — are caught automatically
- CI `npm audit` is now blocking for production dependencies (`--omit=dev`, the deps that ship in the image), while a full audit including dev tooling runs as a non-blocking informational step
- Structured logging: added a small zero-dependency leveled logger (`server/utils/logger.ts`, unit-tested) that emits one JSON line per event (timestamp, level, message, serialized error/context) to stdout/stderr, with the minimum level controlled by `NUXT_LOG_LEVEL` (default `info`). Replaced the scattered `console.log/warn/error` calls across the server with it; noisy Socket.IO and trace logs are now `debug` level and silent by default in production
- Added end-to-end HTTP tests (`@nuxt/test-utils`) that build and start the real server against a throwaway MySQL and exercise the auth endpoints over HTTP: `sign-in` (405 / 400 / 401 / rate-limit 429), `sign-up` happy path, `request-password` generic-success for an unknown email, a `reset-password` happy path (reset via a seeded token, then sign in with the new password), `get-session` (401 unauthenticated / 200 authenticated), the API-key lifecycle (`create` → `list` → `delete`), `admin/list` authorization (403 for non-admins, 200 for admins), and `sign-out` (invalidates the session). Run via `npm run test:e2e`; also run in CI
- Added a Playwright browser test (`test/playwright/`) covering the real-time multiplayer flow: two authenticated browser contexts open the same board, one creates a card, and the other sees it appear live via Socket.IO. Run via `npm run test:browser` (needs a throwaway MySQL and a built app); also run in CI against a MySQL service container. Added `data-testid` hooks to the new-card form for stable, language-independent selectors

### Bug Fixes
- Removed a duplicate `changePassword` key that appeared twice in every i18n locale file (`i18n/locales/*.json`); the redundant entry is gone (values were identical), silencing the build-time "Duplicate key" warnings
- Renamed the internal `getSession` auth helper to `getUserSession` (`server/utils/auth.ts` and all call sites). Its old name shadowed h3's auto-imported `getSession`, producing a build warning and an ambiguous binding; the rename removes the collision

### Security Fixes
- **Public boards are now read-only for users who aren't the owner or explicitly invited with edit access.** Previously any authenticated user could create, edit, move, or delete cards/areas and post comments on any public board. Public boards are still viewable by anyone, but writing now requires ownership or an `edit` invitation — the same rule that already governed private boards. This also removed an inconsistency where a stranger could create/rename areas on a public board but not delete them. (As before, deleting a board and managing invitations remain owner-only.)
- Added rate limiting to the authentication endpoints to curb brute-force and abuse: `sign-in` (10 **failed** attempts / 15 min per IP — successful logins don't count, so teams behind a shared office IP aren't locked out), `request-password` (5 / 15 min — limits reset-email bombing and probing), and `reset-password` (10 / 15 min — limits reset-token brute-forcing). Over the limit returns `429` with a `Retry-After` header. The limiter (`server/utils/rateLimit.ts`, unit-tested) is in-memory and keyed by client IP (honouring `X-Forwarded-For`); limits are per-instance, which suits the single-container deployment (a multi-replica setup would need a shared store)
- API keys are now stored as a SHA-256 hash instead of plaintext, so a database leak no longer exposes usable keys (a hash can't be presented to authenticate). A new `hashApiKey` helper (`server/utils/apiKey.ts`, unit-tested) is used when creating keys and when verifying them. Any pre-existing plaintext keys are converted to hashes by a one-time database migration (`0002_hash_legacy_api_keys`) at startup, so no key needs to be regenerated and verification needs no plaintext fallback. The previous bcrypt "constant-time" code around the plaintext lookup (which protected nothing, since the lookup itself matched plaintext) was removed; a fast hash is the correct choice for high-entropy random tokens

### Documentation
- Added `CONTRIBUTING.md` covering dev setup (Node 22, `.env.local`), running the unit and integration test suites, the schema-migration workflow, and a PR checklist; linked from the README's Contribute section
- Added a "Backup and Restore" section to the README covering the two things to back up (the MySQL database and the `/app/public/uploads` directory), with `mysqldump`/restore and Docker volume examples
- Added "Health Check" and "Contributing" articles to the documentation site

## v0.15.5

### Internal
- Added a test runner (Vitest) with `npm test` / `npm run test:watch` scripts — the first automated tests in the project
- Added integration tests for `authorizeBoard` (10 cases) driving it with a fake DB connection, covering invitation-lookup conditions and the `publicWrite: false` strict-edit mode — including the assertion that strict mode looks up an invitation even on a public board, and that the owner/standard-public paths skip the lookup entirely
- Added a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that runs on pushes and PRs to `master`: installs with `npm ci` (Node 22), runs the test suite and the production build, and runs `npm audit` as a non-blocking step
- Committed `package-lock.json` (removed it from `.gitignore`) so installs are reproducible and `npm ci` works in CI — previously the lockfile was ignored, which made the CI install step fail
- Extracted the board access-control decision (owner / public / invitation → none/read/edit), previously re-implemented inline in every data endpoint, into a single pure `resolveBoardAccess` helper in `server/utils/boardAccess.ts`, covered by exhaustive unit tests
- Added `resolveUserId`, `authorizeBoard`, and `requireBoardAccess` helpers in `server/utils/auth.ts` that centralize the per-endpoint "verify API key / session → load board + invitation → decide access" boilerplate (`authorizeBoard` works on an already-loaded board for endpoints that reach it via a `card → area → board` join). Migrated **all** data endpoints to them: `board.ts`, `boards.ts`, `area.ts`, `areas.ts`, `card.ts`, `cards.ts`, `cardMove.ts`, `cardOrder.ts`, `comment.ts`, `invite.ts`, `notifications.ts`, `attachment.ts`. Access behaviour is unchanged, including the stricter paths that do **not** grant write via a `public` status (board-record update, area deletion) and the owner-only paths (board deletion, all invite operations), which now use an explicit `publicWrite: false` option or inline owner checks

### Bug Fixes
- Images in a card's description (in `CardModal`) now open enlarged in an image modal on click, matching the existing behaviour for images in comments. Previously only comment images were clickable
- Clicking the dimmed area of the image lightbox now closes it. The enlarged image uses `object-contain`, so its `<img>` element still covered the full box (including the visually empty letterbox margins) and sat on top of the background close handlers, swallowing the click. The `ImageWindow` content wrapper now closes on click, so clicking anywhere — the image or the surrounding space — dismisses the modal

## v0.15.4

### Improvements
- Responses are now compressed with brotli (falling back to gzip) based on the client's `Accept-Encoding`. A `beforeResponse` server plugin compresses dynamic responses — notably the large API JSON for populated boards (hundreds of areas/cards) — and `nitro.compressPublicAssets` pre-compresses static assets at build time (the ~1 MB client bundle drops to ~200 KB brotli). Socket.IO traffic and binary downloads are left untouched

### Bug Fixes
- Custom colors (`NUXT_PUBLIC_COLOR_*`) now apply in dark mode. The static dark-mode color tokens in `main.css` were unlayered and overrode the runtime colors injected in `app.vue`; they are now placed in a cascade layer (`@layer app-theme`) so the runtime (unlayered) values win. Light mode already worked, so custom colors were silently ignored only in dark mode — most visible in the Docker image, where colors come entirely from runtime env variables

## v0.15.3

### Bug Fixes
- The UI language (`NUXT_LANGUAGE`) is now applied at runtime instead of being baked at build time, so it works in the Docker image (where the env isn't set during the build) — previously the app was always English regardless of the variable. All locales are now bundled and the active one (plus the `<html lang>` attribute) is selected at startup from `NUXT_LANGUAGE` via `app/plugins/i18n-locale.ts`
- Removed the leftover build-time `site.defaultLocale` from `nuxt.config.ts`

## v0.15.2

### New Features
- Added optional TLS for the MySQL connection via `NUXT_MYSQL_SSL=true` (required by managed/external databases such as Mittwald). Certificate verification stays on by default; set `NUXT_MYSQL_SSL_REJECT_UNAUTHORIZED=false` for servers whose certificate can't be verified against a public CA

### Bug Fixes
- Fixed the page title showing `undefined` (e.g. "Board | undefined"): the `titleTemplate` in `nuxt.config.ts` was built from `process.env.NUXT_APP_NAME` at build time (when the env var isn't set) and had an operator-precedence bug that defeated its fallback. The title is now driven entirely by a runtime `titleTemplate` in `app.vue` sourced from `runtimeConfig` (`NUXT_APP_NAME`) — so a custom app name applies at runtime, pages render as "<page> | <appName>", and title-less pages fall back to just "<appName>". The duplicate `app.head` block was also removed
- Removed a duplicate `site` block in `nuxt.config.ts` that hardcoded a specific domain/locale and silently overrode the env-based one; the remaining `site` config now derives from `NUXT_BOARDS_URL` / `NUXT_APP_NAME` / `NUXT_LANGUAGE`
- The `Dockerfile` now declares `/app/public/uploads` as a volume and makes it writable by the non-root user, so uploaded files persist across container recreations and no longer hit a permission error when written by the `nodejs` user
- The Docker container now applies configuration from a mounted `/app/.env` file at runtime. Nuxt's production server only reads real environment variables (it does not auto-load `.env` like the dev server), so a mounted `.env` was previously ignored and the app fell back to the image's baked defaults. Real environment variables still take precedence over the file. Set `ENV_FILE` to use a different path

### Documentation
- Expanded the docs "Getting started" page with the `NUXT_MYSQL_SSL` env variable and a "Run with Docker" section covering the Docker Hub image, building from the `Dockerfile` with `docker buildx`, and how configuration is applied at runtime

## v0.15.1 - Security Hotfix

### Security Fixes
- Pinned `esbuild` to `0.28.1` via npm `overrides` (app and docs) to resolve [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) — arbitrary file read via the dev server on Windows, affecting `0.27.3`–`0.28.0`. Dependabot flagged the nested `esbuild@0.27.7` copies that older sub-dependencies pinned in `docs/package-lock.json`. (esbuild is a build/dev-time dependency and is not part of the production server output.)
- Pinned `ws` to `8.21.0` via npm `overrides` (app and docs) to resolve [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) — memory-exhaustion DoS, affecting the nested `ws@8.20.1` pulled in via `engine.io-client` in `docs/package-lock.json`. Both projects now report zero npm audit vulnerabilities.

## v0.15.0

### New Features
- Open images in comments or card description on click in the new `ImageWindow.vue` component
- Created a `Dockerfile` file
- Created a `.dockerignore` file
- Created a `docker-entrypoint.sh`

### Improvements
- Changed the `NotificationBell` unread indicator dot from `secondary` to `primary`
- Headlines no longer use the accent color (`text-primary`); they now render in a neutral near-black/white (`text-dark dark:text-white`). The accent `text-secondary` color is now used exclusively for hover states (required-field markers, error text, editor active-state, and inline links switched to `text-primary`)
- Replaced the default green color scheme with a neutral, Apple-style palette (blue accent, true-gray surfaces, light-gray `slate`) for both light and dark mode, with WCAG-checked contrast. Defaults updated in `nuxt.config.ts`, `app/assets/css/main.css`, and the `adjust-colors` docs; colors remain overridable via the `NUXT_PUBLIC_COLOR_*` environment variables
- Card descriptions now show a read-only view with an "edit description" button for write-access users instead of always showing the editor; the editor only opens immediately for a freshly created card opened for the first time (new `editDescription` translation added for all languages)
- Eliminated the layout shift when opening a card: `/api/data/cards` now prefetches each card's comments and attachment metadata, and `CardModal` renders instantly from the already-loaded board data instead of fetching on open
- Added a `/api/data/attachment` endpoint to fetch a single attachment's file payload on download, keeping the board response lean
- Removed the remaining modal shift by dropping the `await useFetch("/api/auth/get-session")` from `CommentSection` and `NewCommentForm` (which made them render a tick late); the current user id is now passed down from the board

### Bug Fixes
- Fixed duplicated cards/areas/comments from real-time updates: `Connection` and `CommentConnection` registered their socket listeners inside the `connect` handler, so every reconnect (and every card-modal open) stacked another set that was never removed. Listeners are now registered once and cleaned up on unmount
- Added an idempotency guard in the board's `card-created` handler so a card received more than once is updated in place instead of inserted again
- Code blocks in `CardEditor` now wrap long lines instead of overflowing the modal
- Code blocks (and inline code) are now visually highlighted with dedicated colors in both light and dark mode

### Improvements
- `Dockerfile` now pins its build stage to `$BUILDPLATFORM` so the build toolchain (esbuild/Vite) runs natively when cross-building, instead of under QEMU emulation (which crashed with random segfaults); only the final runtime image targets the requested platform

### Documentation
- Added a "Run with Docker" section to the README covering the Docker Hub image (`localboards/localboards`), a `docker run` example, and a Docker Compose setup that includes MySQL
- Updated the README Docker section to build images with `docker buildx --platform`, fixing the `Exec format error` that occurs when an `arm64` image (e.g. built on Apple Silicon) is deployed to an `amd64` server

### Dependencies
- Upgraded: nuxt, @tiptap/extension-emoji, @tiptap/extension-file-handler, @tiptap/extension-image, @tiptap/pm, @tiptap/starter-kit, @tiptap/vue-3, mysql2, nodemailer
- Droped: sass-embedded
- Upgraded docs: nuxt, @nuxtjs/seo

## v0.14.0

### New Features
- Added customizable colors via environment variables — see [color customization documentation](https://localboards.de/docs/adjust-colors)

### Dependencies
- Upgraded: mysql2, nodemailer

## v0.13.2

### Dependencies
- Docs dependencies upgraded: nuxt, @nuxt/content, better-sqlite3

## v0.13.1

### Bug Fixes
- Set scheduldedTask back to once an hour at minute "0". Was set to "12" in last version for testing reasons.

### Dependencies
- Upgraded: nuxt, @nuxtjs/i18n, @nuxtjs/mcp-toolkit, @tiptap/extension-emoji, @tiptap/extension-file-handler, @tiptap/extension-image, @tiptap/pm, @tiptap/starter-kit, @tiptap/vue-3

## v0.13.0

### New Features
- Added `card` URL parameter on board pages to directly open a specific card when the page loads
- Added direct links to boards and cards from notifications in `NotificationBell`

### Improvements
- Enhanced new card notifications to include the creator's username and the board name
- Increased spacing between individual notifications in notification emails

### Dependencies
- Upgraded: nuxt, @tiptap/extension-emoji, @tiptap/extension-file-handler, @tiptap/extension-image, @tiptap/pm @tiptap/starter-kit, @tiptap/vue-3

## v0.12.2 - Security Hotfix

### Security Fixes
- Fixed new ReDoS vulnerability in comment checklist validation by using a non-ambiguous regex pattern that prevents catastrophic backtracking (https://github.com/florian-strasser/LocalBoards/security/code-scanning/4)

## v0.12.1 - Security Hotfix

### Security Fixes
- Fixed ReDoS vulnerability in comment checklist validation by replacing ambiguous nested regex quantifiers with a safer pattern that prevents catastrophic backtracking (https://github.com/florian-strasser/LocalBoards/security/code-scanning/2, https://github.com/florian-strasser/LocalBoards/security/code-scanning/3)

## v0.12.0

### New Features
- Added support for toggling checklist item states in comments — users can now check/uncheck task items, with the API validating that only the checked state (`data-checked` and `checked` attributes) has changed

### Improvements
- Disabled scroll on body when `ModalWindow` is activated
- Added a hover state for links within card description or comments
- Removed footer with copyright information, since it steals space especially on the board pages

### Bug Fixes
- `/api/auth/api-key/create`: Returns now correctly the generated `key`

### Dependencies
- Upgraded: @nuxtjs/mcp-toolkit, tailwindcss, @tailwindcss/vite, @tiptap/extension-emoji, @tiptap/extension-file-handler, @tiptap/extension-image, @tiptap/pm, @tiptap/starter-kit, @tiptap/vue-3

### Docs
- Added PUT, PATCH and DELETE method documentation for comment API endpoint in `docs/content/api/comment.md`

## v0.11.3

### New Features
- Added inline confirmation dialog for comment deletion in `CommentSection.vue` — clicking the trash icon now shows "Are you sure?" with Delete/Cancel buttons, preventing accidental deletions
- Added inline comment editing in `CommentSection.vue` — comment creators can click the pen icon to edit using the `CardEditor` component, with Save/Cancel buttons
- Added PUT endpoint in `server/api/data/comment.ts` for updating comments, restricted to comment creators only
- Added real-time comment update synchronization via `CommentConnection` component and socket.io (`commentUpdated`/`updateComment` events)

### Improvements
- Changed all error messages in `server/api/auth/sign-in.ts` to return snake_case error codes (e.g., `method_not_allowed`, `invalid_credentials`) instead of descriptive messages, improving consistency and i18n support
- Added translations for all sign-in error codes (`error_method_not_allowed`, `error_required_fields_missing`, `error_invalid_credentials`, `error_invalid_email_or_password`, `error_authentication_failed`, `error_internal_server_error`) to all 7 locale files (en, de, es, fr, it, nl, pl)

### Bug Fixes
- Fixed duplicate comment entries in `CommentSection.vue` by adding existence check in `handleCommentCreated` before unshifting new comments to the array

### Dependencies
- Upgraded: nuxt, nodemailer, @tiptap/vue-3, @tiptap/starter-kit, @tiptap/pm, @tiptap/extension-image, @tiptap/extension-file-handler, @tiptap/extension-emoji

## v0.11.2

### Security Fixes
- **XSS Protection**: Strengthened URL scheme validation for user profile images in `server/api/auth/update-user.ts` to block `javascript:`, `vbscript:`, and non-image `data:` URIs (e.g., `data:text/html`). Only `http:`, `https:`, `data:image/*`, and relative paths are now permitted. Addresses Dependabot security advisory regarding executable URL schemes.

## v0.11.1

### Hotfix
- Fixed session creation failure for installations with numeric user IDs by removing strict UUID validation in `server/utils/auth.ts` createSession function

## v0.11.0

This release is all around security. I spent alot time to make every single API Endpoint more secure.

### New Features
- Added comment deletion capability in `server/api/data/comment.ts` with DELETE endpoint for comment creators
- Added delete button in `CommentSection.vue` with i18n translation key "deleteMessage" (added to all 7 language files)
- Added `handleCommentDeleted` in `CardModal.vue` to update comment count on deletion
- Real-time sync: comment deletion and count updates broadcast via socket events

### Authentication & Authorization (Applied to all data endpoints)
- Added early authentication checks blocking unauthenticated access to: `area.ts`, `areas.ts`, `board.ts`, `boards.ts`, `card.ts`, `cards.ts`, `cardMove.ts`, `cardOrder.ts`, `comment.ts`, `invite.ts`, `notifications.ts`
- Added userId null checks for defense in depth in all data endpoints before SQL queries
- Removed redundant inner authentication checks throughout all endpoints

### IDOR (Insecure Direct Object Reference) Fixes
- Fixed IDOR in `api/data/area` POST by adding board verification to area SELECT queries
- Hardened DELETE authorization in `api/data/area` to only allow board owners and edit-invited users
- Fixed IDOR in `api/data/board` GET and DELETE by removing query userId parameter and using authenticated userId
- Fixed IDOR in `api/data/boards` GET by using authenticated userId instead of client-provided userId from body
- Fixed IDOR in `api/data/card` POST by removing user parameter from body and using authenticated userId for notifications
- Fixed IDOR in `api/data/cardMove` by implementing access checks for both source AND destination boards
- Fixed IDOR in `api/data/comment` POST by removing user parameter from body and using authenticated userId
- Fixed IDOR in `api/data/invite` GET by removing client-provided userId from query and using authenticated userId
- Fixed IDOR in `api/data/invite` DELETE by validating invitation exists before deletion
- Fixed IDOR in `api/data/notifications` GET and PATCH by using authenticated userId instead of client-provided userId

### Input Validation (Applied across all data endpoints)
- Added boardId, areaId, cardId, card, content, notificationId parameter validation to ensure positive integers
- Added validation for shared parameter in `api/data/boards` to ensure proper boolean handling
- Added boardId input validation in `api/data/invite` to ensure positive integer
- Fixed undefined boardId variable in `api/data/cardOrder` socket event emit
- Updated `InviteModal.vue` to use boardId and userId (instead of deleteUser) in DELETE request URL
- Added Number() conversion for boardId prop in `InviteModal.vue`

### Information Leakage Prevention
- Changed all error messages from specific ("Board not found", "Card not found", "Area ID is required") to generic "Resource not found" or "Invalid request" in all data endpoints to prevent enumeration
- Fixed internal error details leakage in `api/data/cardOrder` inner catch handler
- Fixed typo in `api/data/cardOrder` error message from "Internal Server error" to "Internal server error"
- Fixed internal error details leakage in `api/data/comment` by removing details from error response
- Removed client-provided userId parameter from `api/data/notifications` GET endpoint

### Session Management Endpoints
- Fixed missing import in `api/auth/sign-in` by uncommenting createSession import
- Fixed HTTP status code in `api/auth/sign-in` and `api/auth/sign-up` from 403 to 405 Method Not Allowed for non-POST requests
- Added input validation in `api/auth/sign-in` for email format and minimum password length
- Fixed timing attack vulnerability in `api/auth/sign-in` by adding constant-time bcrypt comparisons for non-existent users and accounts
- Fixed CRITICAL session token leakage in `api/auth/get-session` by removing token from response data
- Fixed banned user information disclosure in `api/auth/get-session` by removing banReason and banExpires from response
- Fixed missing import in `api/auth/get-session` by adding getCookie and bcrypt imports
- Added session token format validation in `api/auth/get-session` to reject malformed tokens
- Added timing attack protection in `api/auth/get-session` with constant-time bcrypt comparisons for failed session and user lookups
- Fixed information leakage in `api/auth/sign-out` by using generic "Logout failed" error message
- Added session token format validation in `api/auth/sign-out` to reject malformed tokens
- Fixed session enumeration in `api/auth/sign-out` by checking affectedRows before returning success

### User Registration & Password Management
- Fixed timing attack vulnerability in `api/auth/sign-up` by adding constant-time bcrypt comparisons for existing email checks
- Added input validation in `api/auth/sign-up` for email format, password length (min 8 chars), and required fields
- Added database transaction in `api/auth/sign-up` for atomic user and account creation
- Fixed silent error swallowing in `api/auth/sign-up` session check to properly log errors
- Fixed timing attack vulnerability in `api/auth/request-password` by always generating token and using same code path regardless of user existence
- Added strong email validation regex in `api/auth/request-password` replacing weak `includes(@)` check
- Fixed inconsistent success messages in `api/auth/request-password` by always returning same message (prevents user enumeration)
- Fixed timing attack vulnerability in `api/auth/reset-password` by adding constant-time bcrypt comparisons for token and user existence checks
- Added token format validation (UUID v4 regex) in `api/auth/reset-password` to reject malformed tokens
- Changed error messages in `api/auth/reset-password` to generic INVALID_TOKEN, INVALID_PASSWORD, INTERNAL_SERVER_ERROR for consistent translation keys
- Changed success message in `api/auth/reset-password` to PASSWORD_RESET_SUCCESSFUL for translation consistency

### User Profile & Password Update
- Applied generic error messages in `api/auth/update-user` (maintaining raw format for translation keys)
- Added image field validation in `api/auth/update-user` to accept http/https URLs, base64 data URIs, relative paths (/, ./, ../), or null while blocking dangerous schemes like javascript:
- Added image size limit (1MB) in `api/auth/update-user` to prevent DoS attacks with huge base64 strings
- Fixed timing attack vulnerability in `api/auth/update-password` by adding constant-time bcrypt comparisons for account existence check
- Added password inequality check in `api/auth/update-password` by checking old !== new password and returning OLD_NEW_SAME error
- Fixed undefined SQL parameter error in `api/auth/update-password` by getting current session token directly from request (cookie/Authorization header) instead of from session object
- Updated error messages in `api/auth/update-password` to BOTH_PASSWORDS_REQUIRED, PASSWORD_TOO_SHORT, OLD_NEW_SAME for clearer translation keys
- Fixed ZodError handling in `PasswordForm.vue` by removing incorrect JSON.parse call and using `e.errors[0]?.code` directly

### Admin Endpoints
- Applied generic error codes and input validation across all admin endpoints (`create`, `list`, `update`, `delete`)
- Added UUID validation for userId in `admin/create`, `admin/update`, `admin/delete`
- Added strong email validation regex in `admin/create` and `admin/update`
- Added input length limits (255 chars) for name, email, password in `admin/create` and `admin/update`
- Added database transactions in `admin/create`, `admin/update`, `admin/delete` for atomic operations with proper rollback
- Added timing attack protection with constant-time bcrypt comparisons in `admin/create`, `admin/update`, `admin/delete`

### API Key Management
- Fixed CRITICAL security vulnerability in `api/auth/api-key/create` by removing full API key secret from response (now returns only id, name, start prefix, expiresAt)
- Fixed response ID issue in `api-key/create` by returning actual database ID
- Added input validation with name length limit (255 chars) in `api-key/create`
- Added expiresIn validation (positive number, max 365 days) in `api-key/create`
- Applied generic error codes in `api-key/create`, `api-key/list`, `api-key/delete`
- Added UUID validation for keyId in `api-key/delete` to reject malformed IDs
- Fixed information leakage in `api-key/delete` by removing ownership-revealing message
- Added timing attack protection with constant-time bcrypt comparisons in `api-key/delete`
- Fixed specific error message in `api/auth/api-key/delete` that revealed key ownership ("API key not found or doesn't belong to you" → "API_KEY_NOT_FOUND")

### Utility Functions (`server/utils/auth.ts`)
- Fixed timing attack vulnerability in verifyApiKey by adding constant-time bcrypt comparisons for both key existence and expiration checks
- Fixed information leakage in verifyApiKey by using generic error codes (INVALID_API_KEY, API_KEY_VERIFICATION_FAILED) instead of specific messages
- Added API key input validation in verifyApiKey with length limit (64 chars) to prevent abuse
- Added userId UUID validation in createSession to reject malformed user IDs
- Fixed information leakage in createSession by using generic error code SESSION_CREATION_FAILED instead of "Failed to create session"

### File Upload Security
- Fixed CRITICAL unauthenticated file upload in `server/api/upload/image.post.ts` by adding early authentication check (session or API key required)
- Fixed missing file validation in `server/api/upload/image.post.ts` by adding magic bytes verification to prevent MIME type spoofing
- Fixed insufficient file type validation in `server/api/upload/image.post.ts` by restricting to whitelisted types (png, jpg, jpeg, gif, webp)
- Fixed file extension spoofing in `server/api/upload/image.post.ts` by using validated MIME type for extension instead of user-provided filename
- Added file size limit (10MB) in `server/api/upload/image.post.ts` to prevent DoS via large uploads
- Fixed information leakage in `server/api/upload/image.post.ts` by removing original filename from response and using generic error messages
- Added user authentication context in `server/api/upload/image.post.ts` by importing and using getSession and getApiKeyUser for auth verification
- Fixed CRITICAL unauthenticated file upload in `server/api/upload.post.ts` by adding early authentication check (session or API key required)
- Fixed missing file validation in `server/api/upload/post.ts` by adding magic bytes verification for all allowed file types (PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, JPEG, PNG, ZIP) to prevent MIME type spoofing
- Fixed file extension spoofing in `server/api/upload/post.ts` by using validated file type for extension instead of user-provided filename
- Added file size limit (50MB) in `server/api/upload.post.ts` to prevent DoS via large uploads
- Fixed information leakage in `server/api/upload/post.ts` by removing original filename from response and using generic error messages
- Added user authentication context in `server/api/upload/post.ts` by importing and using getSession and getApiKeyUser for auth verification

### File Serving Security
- Fixed path traversal vulnerability in `server/api/uploads/[...path].ts` by using path.normalize and path.resolve with directory boundary check
- Fixed information leakage in `server/api/uploads/[...path].ts` by using generic error messages ("Invalid request", "Resource not found", "Download failed") instead of specific ones
- Fixed filename leakage in `server/api/uploads/[...path].ts` Content-Disposition header by using safe basename from resolved path instead of user-provided path

### Dependencies
- Updated @nuxtjs/mcp-toolkit
- Updated @nuxtjs/i18n
- Updated @tailwindcss/vite
- Updated tailwindcss
- Updated mysql2

## v0.10.1

### Webapp
- Fixed an issue with additional ":" characters in some notification mails
- Added missing paragraph elements in notification mails
- Removed unnecessary dependencies
- Updated dependencies

### Docs
- Updated migration docs
- Removed unnecessary dependencies
- Updated dependencies

## v0.10.0 - Complete Authentication System Overhaul

### 🚀 Major Architecture Change: Dropped better-auth
**Breaking Change**: Replaced entire `better-auth` dependency with custom authentication system for improved reliability, performance, and maintainability. Backup your database and merge it with the adjusted structure. User passwords need to be reseted.

### 🔄 Real-Time Event Enhancements
**Multi-Platform Real-Time Updates**: Extended existing Socket.IO event system to API and MCP tools, ensuring consistent real-time updates across all interaction methods.

### 📡 Real-Time Events Extended to API & MCP
- **Card Operations**: `addCard`, `updateCard`, `deleteCard`, `moveCard` events
- **Area Operations**: `addArea`, `updateArea`, `deleteArea`, `updateAreas` events  
- **Board Operations**: `updateBoard`, `deletedBoard` events
- **Comment Operations**: `addComment` events
- **Multiplayer Collaboration**: Real-time updates for opened cards (title, content, attachments)

### 🔧 Authentication Core (Replaced better-auth)
- **Session Management**: Custom session creation, validation, and destruction
- **Performance**: No external auth server dependency
- **Endpoints Created**:
  - `/api/auth/sign-in` - User login with session creation
  - `/api/auth/sign-up` - User registration with auto-login
  - `/api/auth/logout` - Session termination
  - `/api/auth/get-session` - Session validation middleware

### 👤 User Management
- **Profile Updates**: `/api/auth/update-user` endpoint
- **Password Changes**: `/api/auth/update-password` endpoint
- **Admin Functions**: Complete admin user CRUD operations
  - `/api/auth/admin/create` - Admin user creation
  - `/api/auth/admin/list` - User listing
  - `/api/auth/admin/update` - User updates
  - `/api/auth/admin/delete` - User deletion

### 🔑 API Key Management
- **Generation**: `/api/auth/api-key/create` endpoint
- **Listing**: `/api/auth/api-key/list` endpoint  
- **Deletion**: `/api/auth/api-key/delete` endpoint
- **Security**: Proper ownership validation and cleanup

### 🔒 Password Reset System
- **Request Reset**: `/api/auth/request-password` endpoint
- **Complete Reset**: `/api/auth/reset-password` endpoint
- **Email Integration**: Proper translated email sending
- **Token Security**: 24-hour expiration, one-time use

### 🌍 Internationalization
- **New Translation Keys**: Added to all 7 languages (en, de, es, fr, it, nl, pl)
- **Error Messages**: Comprehensive error translations for all endpoints
- **Email Translations**: Server-side translation utility for emails

### 📝 Component Updates
**Removed all `better-auth` dependencies and updated to use custom endpoints:**
- `SettingsForm.vue` - Profile updates
- `PasswordForm.vue` - Password changes
- `ApiForm.vue` - API key creation
- `ApiList.vue` - API key listing
- `ApiItem.vue` - API key deletion
- `UserList.vue` - User management
- `NewUserForm.vue` - User creation
- `EditUserForm.vue` - User profile editing
- `EditUserPassword.vue` - User password updates
- `lost-password.vue` - Password reset request
- `reset-password/[token].vue` - Password reset completion

### 🔧 Technical Improvements
- **Session Utility**: Created `server/utils/auth.ts` with reusable functions
- **Translation Utility**: Created `server/utils/translations.ts` for server-side emails
- **Middleware Updates**: Updated auth middleware for new session validation
- **Error Handling**: Consistent error responses across all endpoints
- **Security**: Proper input validation and sanitization

## v0.9.2

- Fixed issue with public registration, env variable was not checked correctly
- Board and user images are now also stored as physical files instead of Base64 decoded

## v0.9.1

- Fix: Required some changes to the creation of api keys
- Picked a better matching icon for commentCount

## v0.9.0

- /api/data/card.ts: Returns additionally commentCount and attachmentCount
- /api/data/cards.ts: Returns additionally commentCount and attachmentCount
- Multiplayer updates for title, content and attachments on opened cards
- Added comment and attachment count below the title on cards
- Update commentCount when a new comment is created
- Update attachmentCount when a new attachment is uploaded
- Updated all dependencies

## v0.8.1

### Bug Fixes

- Fixed an error with images in comments on the email notification. It was missing the baseURL.
- Resolved issue where notification messages were output as a by comma seperated string

## v0.8.0

### 🚀 Major Architecture Changes

**🔧 Storage System Overhaul**
- **Migrated from base64 to file-based storage**: Images and attachments are now uploaded to the server and stored as files rather than base64-encoded data in the database
- **Performance improvements**: Significantly reduces database size and improves API response times
- **Backward compatibility**: Existing base64-encoded attachments continue to function normally
- **Migration recommendation**: Consider recreating cards with new attachments to optimize database performance

### ✨ Enhancements

**📁 Expanded Attachment Support**
- Added support for **image files (JPG, PNG)** and **ZIP archives** as card attachments
- Images can now be attached directly to cards (previously only available in rich text content)

**🔄 Improved User Experience**
- Added **back button** to card delete confirmation dialog for easier navigation
- Added **back button** to attachments upload interface for better user flow

### 🐛 Bug Fixes

**🎨 Layout Improvements**
- **Fixed layout shift** in card modal caused by asynchronous comment section loading
- Comments now load before modal rendering to prevent visual jumping

**📧 Email Notifications**
- **Fixed notification email formatting**: Properly joins notification messages array into readable text
- Resolved issue where notification messages were output as raw array

## v0.7.3

Quick-Hotfix: Disabling the signup functionality with flag `NUXT_PUBLIC_SIGNUP` caused some issues

## v0.7.2

### Improvements
- Introduced an enviroment variable `NUXT_PUBLIC_SIGNUP` to enable or disable the signup functionality

### Fixes
- Solved problems with the comment notifications when they contained an image
- API Endpoint returned an error when trying to create a notification with too long text, especially in the case of comments with screenshots, since it was defined as `TEXT` column instead of `LONGTEXT`
- Fetching invites when opening a board, instead of when opening the inviteModal. Removes an unnecessary layout shift.

### Docs

- Introduced new page disable-signup

## v0.7.1

- Fix: Changing a cards description after uploading an attachment caused duplicates
- Fix: Set modal window background to position fixed
- Fix: Dark background of "adding an attachment" option on the card modal window was overlapping with the modal box rounded corners

## v0.7.0

- Introduced non image attachments to cards. You can now add PDF, DOCX, PPTX, CSV etc. to a card.
- Long titles have been cut off on card modal window, fixed by switch from input "text" to an editable div
- Updated  dependencies (better-auth)

## v0.6.1

- Added Emoji-Support (@tiptap/extension-emoji)
- Completed the documentation for API
- Slightly adjusted the featurelist on docs landingpage
- Updated dependencies (nuxt, better-auth, @nuxtjs/i18n)

## v0.6.0

- Installed MCP-Toolkit
- Introduced a `NUXT_MCP` flag to disable the MCP Server entirely
- Added a `createArea` tool for the MCP Server, to create a new area on an existing board
- Added a `createBoard` tool for the MCP Server, to create a new board
- Added a `createCard` tool for the MCP Server, to create a new card in an existing area
- Added a `deleteArea` tool for the MCP Server, to delete an area
- Added a `deleteBoard` tool for the MCP Server, to delete a board
- Added a `deleteCard` tool for the MCP Server, to delete a card
- Added a `getArea` tool for the MCP Server, to fetch a specific area
- Added a `getBoard` tool for the MCP Server, to fetch a specific board
- Added a `getCard` tool for the MCP Server, to fetch a specific card
- Added a `listAreas` tool for the MCP Server, to expose all available areas on an existing board
- Added a `listBoards` tool for the MCP Server, to expose all available boards of the user
- Added a `listCards` tool for the MCP Server, to expose all available cards in an area
- Added a `listComments` tool for the MCP Server, to expose all available comments on a card
- Added a `moveAreas` tool for the MCP Server, to update the order of areas in a board
- Added a `moveCard` tool for the MCP Server, to move a card from one area to another
- Added a `orderCard` tool for the MCP Server, to update the order of cards in an area
- Added a `updateArea` tool for the MCP Server, to update an existing area
- Added a `updateBoard` tool for the MCP Server, to update an existing board
- Added a `updateCard` tool for the MCP Server, to update an existing card
- Added a `writeComment` tool for the MCP Server, to create a new comment on a card
- Added a MCP-Server page to the docs
- Improved comment notification, includes the content and name of the content creator
- Switched to a HTML from plain text for mails
- Fixed an issue with the dark background of a card modal window. Users have not been able to close the card by clicking on this backgrond.

## v0.5.7

- Adjusted query keys for docs to prevent issues when built static
- Fixed mobile issues for docs
- Optimized accessibility for docs
- Optimized SEO for docs

## v0.5.6

- Fixed a issue that prevented to save a board when no image was
provided

## v0.5.5

- Allows the upload or selection of an thumbnail for a board
- Added 6 board placeholder images to the public folder
- Add a screenshot to the landingpage
- Add a screenshot to the README.md file

## v0.5.4

- Created a first version of documentation with nuxt/content in docs folder
- Removed `pointer-events-auto` class from ModalWindow Component due to mobile problems
- Adjusted minimum screen size to `min-h-svh` instead of `min-h-screen` due to mobile problems
- Adjusted slate color in bright theme

## v0.5.3

- Added an delete button for cards
- Changed the color of the status checkbox to primary color
- Minimal updates to the color schemes
- Removed relict api route: api/upload/image.ts
- Added a new touchicon
- Introduced a CHANGELOG.md file
- Updated dependencies

## 0.5.2

- Fixed a small issue with the invite system after the API Access was introduced.

## 0.5.1

- We introduced a dark mode. If the device prefers a dark scheme we show it to the user. Otherwise they will still see the bright layout.

## 0.5.0

- You can now generate API keys with the same permissions as your user account. This enables you to build custom tools and automate workflows, making your experience with LocalBoards even more powerful and efficient.
