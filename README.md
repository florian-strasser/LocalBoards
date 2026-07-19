# LocalBoards
[![Nuxt](https://img.shields.io/badge/Nuxt-4.4.6-00DC82?style=flat&logo=nuxt)](https://nuxt.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.3-25C2A0?style=flat&logo=socketdotio)](https://socket.io)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/florian-strasser/LocalBoards/blob/master/LICENSE)
[![Version](https://img.shields.io/github/package-json/v/florian-strasser/LocalBoards?label=version&color=orange)](https://github.com/florian-strasser/LocalBoards/releases)

![LocalBoards Screen](https://raw.githubusercontent.com/florian-strasser/LocalBoards/refs/heads/master/docs/public/images/localboards-screen.webp)

LocalBoards is an open-source (MIT License), self-hosted Kanban board system. It allows users to create boards, invite collaborators, and manage Kanban cards. It also includes admin features for user management. All data is stored in your own database, with no reliance on external services.

We support real-time multiplayer updates. When you edit a card, area, or rename it, the changes are instantly reflected for all users viewing the board. Comments on cards are also updated in real-time across all browsers. This is powered by an internal Socket.IO integration.

LocalBoards is currently available in the following languages: English (EN), German (DE), French (FR), Spanish (ES), Italian (IT), Dutch (NL), and Polish (PL).

## AI agents (MCP)

LocalBoards isn't only for humans — it ships a built-in [Model Context Protocol](https://modelcontextprotocol.io) server (`/mcp`) so AI agents can read and manage boards on a user's behalf. An agent authenticates with an API key (create one under **Settings → API keys**, as **full-access** or **read-only**) and can search and filter cards, create/update/move/delete them, write comments, assign members and set due dates. Card descriptions and comments are stored as **Markdown** — the format agents work in natively — and are rendered safely.

Agents and people can share a board safely:

- **Give an agent its own account.** Admins can mark a user as an **AI agent**, so its actions are clearly attributed and it shows a bot badge on the board.
- **Claiming is atomic.** An agent claims a card before working on it, so two agents — or an agent and a person — never do the same task twice.
- **See who's around.** Live avatars on the board tiles — and in the card modal — show who currently has each card open, human or agent.
- **Webhooks wake automations.** An MCP agent can't be pushed to, so subscribe a webhook (**Settings → Webhooks**) and have your automation start a run when a board changes. Subscriptions are per user *and* per board, so on a shared instance everyone wires up their own without touching anyone else's.

See **[AGENTS.md](AGENTS.md)** for connection details, the agent work loop, the full tool list, and examples.

## Install

To install LocalBoards, follow these steps:

### Clone the Repository

```bash
git clone https://github.com/florian-strasser/LocalBoards
cd LocalBoards
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables
Create a `.env` file (and optionally a `.env.local` file for local development) with the following settings. Adjust the values to match your database and email configuration.

```dotenv
# App Name
NUXT_APP_NAME=LocalBoards
NUXT_BOARDS_URL=http://localhost:3000
NUXT_LANGUAGE=en
NUXT_PUBLIC_PRIVACY_URL=https://www.yourdomain.com/privacy-policy/

# DB
NUXT_MYSQL_HOST=localhost
NUXT_MYSQL_USER=root
NUXT_MYSQL_PASSWORD=root1234
NUXT_MYSQL_DATABASE=root
# Set NUXT_MYSQL_SSL=true if your database requires a TLS connection
# (common for managed/external MySQL). Optionally set
# NUXT_MYSQL_SSL_REJECT_UNAUTHORIZED=false if its certificate can't be
# verified against a public CA.

# Email Configuration
NUXT_EMAIL_HOST=mail.yourserver.de
NUXT_EMAIL_PORT=465
NUXT_EMAIL_SECURE=true
NUXT_EMAIL_USER=contact@yourdomain.com
NUXT_EMAIL_PASS=password1234
```

### Build the Application

```bash
npx nuxt build
```

Move the builded app from /.output to your favorite hosting solution, that is able to run a nodejs app.

### Run the Application

```bash
node ./server/index.mjs
```

## Run with Docker

Prebuilt images are published on Docker Hub:

**https://hub.docker.com/r/localboards/localboards**

The image contains only the LocalBoards app. You still need a reachable **MySQL**
database — the required tables are created automatically on first start, so an
empty database is enough. Configure the app through the same environment
variables described in [Configure Environment Variables](#configure-environment-variables).

### Pull the image

```bash
docker pull localboards/localboards:latest
```

### Run the container

Put your settings in a `.env` file (see the variables above) and start the
container. The app listens on port `3000`, and uploaded files are stored in
`/app/public/uploads`, so mount a volume there to persist them:

```bash
docker run -d \
  --name localboards \
  --env-file .env \
  -p 3000:3000 \
  -v localboards_uploads:/app/public/uploads \
  localboards/localboards:latest
```

Then open `http://localhost:3000` (or whatever you set as `NUXT_BOARDS_URL`).

#### Health check

The app exposes a public `GET /api/health` endpoint that returns `200` with
`{ "status": "ok", "database": "ok" }` when the app is running and can reach its
database, or `503` if the database is unreachable. The Docker image already
declares a `HEALTHCHECK` against it, so `docker ps` / orchestrators show the
container's health automatically — no extra configuration needed.

### Run with Docker Compose (app + database)

For a self-contained setup including MySQL, use a `compose.yaml` like this:

```yaml
services:
  app:
    image: localboards/localboards:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NUXT_APP_NAME: LocalBoards
      NUXT_BOARDS_URL: http://localhost:3000
      NUXT_LANGUAGE: en
      NUXT_PUBLIC_PRIVACY_URL: https://www.yourdomain.com/privacy-policy/
      NUXT_MYSQL_HOST: db
      NUXT_MYSQL_USER: localboards
      NUXT_MYSQL_PASSWORD: change-me
      NUXT_MYSQL_DATABASE: localboards
      NUXT_EMAIL_HOST: mail.yourserver.de
      NUXT_EMAIL_PORT: "465"
      NUXT_EMAIL_SECURE: "true"
      NUXT_EMAIL_USER: contact@yourdomain.com
      NUXT_EMAIL_PASS: password1234
    volumes:
      - uploads:/app/public/uploads
    depends_on:
      - db

  db:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: localboards
      MYSQL_USER: localboards
      MYSQL_PASSWORD: change-me
      MYSQL_ROOT_PASSWORD: change-me-too
    volumes:
      - db_data:/var/lib/mysql

volumes:
  uploads:
  db_data:
```

Start it with:

```bash
docker compose up -d
```

### How configuration is applied

LocalBoards reads its configuration from **environment variables at runtime** —
there is no need to rebuild the image to change settings. Provide them in any of
these ways:

- Real environment variables — `docker run --env-file .env …`, the compose
  `environment:` block above, or your hosting panel's env-var settings.
- A mounted `.env` file at `/app/.env` (e.g. `-v /path/to/.env:/app/.env:ro`).
  The container entrypoint loads it on start; real environment variables always
  take precedence over the file.

> Note: the production server does **not** auto-read a project `.env` the way the
> dev server does — that is why the entrypoint loads `/app/.env` explicitly. The
> `.env` used during development is excluded from the image (`.dockerignore`), so
> no secrets are baked into the build.

> Building and publishing the image is documented under
> [Build the Docker image and push to Docker Hub](#build-the-docker-image-and-push-to-docker-hub).

## Backup and Restore

LocalBoards keeps all its state in two places, so a complete backup is just
these two:

1. **The MySQL database** — boards, cards, comments, users, sessions, API keys,
   etc. (Attachment file contents are also stored in the database.)
2. **The uploads directory** — `/app/public/uploads`, where uploaded images are
   written.

### Back up

Database (adjust host/user/database to your config):

```bash
mysqldump -h "$NUXT_MYSQL_HOST" -u "$NUXT_MYSQL_USER" -p "$NUXT_MYSQL_DATABASE" \
  > localboards-backup.sql
```

For the Docker Compose setup, dump from the `db` service:

```bash
docker compose exec db \
  mysqldump -u localboards -p localboards > localboards-backup.sql
```

Uploads — copy the mounted directory or the named volume:

```bash
# Bind mount / host path:
cp -r /path/to/uploads localboards-uploads-backup

# Docker named volume (e.g. `localboards_uploads`):
docker run --rm -v localboards_uploads:/data -v "$PWD":/backup busybox \
  tar czf /backup/localboards-uploads-backup.tar.gz -C /data .
```

### Restore

```bash
# Database:
mysql -h "$NUXT_MYSQL_HOST" -u "$NUXT_MYSQL_USER" -p "$NUXT_MYSQL_DATABASE" \
  < localboards-backup.sql

# Uploads (named volume):
docker run --rm -v localboards_uploads:/data -v "$PWD":/backup busybox \
  sh -c "cd /data && tar xzf /backup/localboards-uploads-backup.tar.gz"
```

Restoring into an empty database is fine — on startup the app creates any
missing tables and applies migrations, then your dump fills in the data. Take
backups while the app is stopped (or use a consistent dump) to avoid capturing a
write mid-flight.

## Contribute

LocalBoards is maintained as a solo project without any monetary incentives. Contributions are highly encouraged! If you encounter any issues or have suggestions for improvements, feel free to open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up a dev environment, run the tests, and what's expected of a pull request.

### Running Locally for Development

To run the application locally for development:

```bash
npm run dev
```

Or, if you have a custom `.env.local` file:
```bash
npx nuxt dev --dotenv .env.local
```

### Building Locally

To build the application locally:

```bash
npx nuxt build --dotenv .env.local
```

### Build the Docker image and push to Docker Hub

> **Important: build for the architecture of your target server.**
> `docker build` only builds for your machine's architecture. If you build on
> an Apple Silicon Mac (`arm64`) and deploy to an `amd64`/`x86_64` server, the
> container fails to start with `exec ... : Exec format error`. Use
> `docker buildx` to build for the server's platform.

One-time setup of a builder that supports cross-platform builds:

```bash
docker buildx create --use --name multiarch
```

Build for the server architecture (`amd64` for most hosts) and push straight to
Docker Hub:

```bash
docker buildx build --platform linux/amd64 -t localboards/localboards:latest --push .
```

> The `Dockerfile` pins its build stage to your machine's native architecture
> (`--platform=$BUILDPLATFORM`) and only the final runtime image targets the
> platform you request. This keeps the build toolchain (esbuild/Vite) running
> natively instead of under QEMU emulation, which otherwise crashes with random
> segfaults when cross-building. Nuxt's `.output` is portable JavaScript, so the
> resulting image still runs on the target architecture.

To produce an image that also runs natively on Apple Silicon, build for both
architectures:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t localboards/localboards:latest --push .
```

> Use `--push` (not `--load`): multi-platform images can't be loaded into the
> local image store and are pushed to the registry directly.

Verify that the published image contains the expected architecture(s):

```bash
docker buildx imagetools inspect localboards/localboards:latest
```
