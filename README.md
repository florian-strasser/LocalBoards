# LocalBoards
[![Nuxt](https://img.shields.io/badge/Nuxt-4.4.6-00DC82?style=flat&logo=nuxt)](https://nuxt.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.3-25C2A0?style=flat&logo=socketdotio)](https://socket.io)
[![License](https://img.shields.io/badge/license-MIT-blue)](https://github.com/florian-strasser/LocalBoards/blob/master/LICENSE)
[![Version](https://img.shields.io/badge/version-0.15.0-orange)](https://github.com/florian-strasser/LocalBoards/releases)

![LocalBoards Screen](https://raw.githubusercontent.com/florian-strasser/LocalBoards/refs/heads/master/docs/public/images/localboards-screen.webp)

LocalBoards is an open-source (MIT License), self-hosted Kanban board system. It allows users to create boards, invite collaborators, and manage Kanban cards. It also includes admin features for user management. All data is stored in your own database, with no reliance on external services.

We support real-time multiplayer updates. When you edit a card, area, or rename it, the changes are instantly reflected for all users viewing the board. Comments on cards are also updated in real-time across all browsers. This is powered by an internal Socket.IO integration.

LocalBoards is currently available in the following languages: English (EN), German (DE), French (FR), Spanish (ES), Italian (IT), Dutch (NL), and Polish (PL).

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

## Contribute

LocalBoards is maintained as a solo project without any monetary incentives. Contributions are highly encouraged! If you encounter any issues or have suggestions for improvements, feel free to open a pull request. There is currently no formal contribution guide, but your help is always welcome.

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
