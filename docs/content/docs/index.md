# Getting started

LokalBoards is an open-source (MIT License), self-hosted Kanban board system. It allows users to create boards, invite collaborators, and manage Kanban cards. It also includes admin features for user management. All data is stored in your own database, with no reliance on external services.

We support real-time multiplayer updates. When you edit a card, area, or rename it, the changes are instantly reflected for all users viewing the board. Comments on cards are also updated in real-time across all browsers. This is powered by an internal Socket.IO integration.

LokalBoards is currently available in the following languages: English (EN), German (DE), French (FR), Spanish (ES), Italian (IT), Dutch (NL), Polish (PL), Ukrainian (UK), Portuguese (PT), and Czech (CS).

## Install

To install LokalBoards, follow these steps:

### Clone the Repository

```bash
git clone https://github.com/florian-strasser/LokalBoards
cd LokalBoards
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables
Create a `.env` file (and optionally a `.env.local` file for local development) with the following settings. Adjust the values to match your database and email configuration. Additionally you can define the used language with `NUXT_LANGUAGE` and one of these properties: `en, de, fr, es, it, nl, pl`

```dotenv
# App Name
NUXT_APP_NAME=LokalBoards
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
NUXT_MYSQL_SSL=false

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

LokalBoards ships with a `Dockerfile` and is also published as a prebuilt image
on Docker Hub. The image contains only the app — you still need a reachable
**MySQL** database. The required tables are created automatically on first
start, so an empty database is enough.

### Using the prebuilt image (Docker Hub)

The image is available at
[hub.docker.com/r/florianstrasser/lokalboards](https://hub.docker.com/r/florianstrasser/lokalboards).

Put your settings in a `.env` file (see [Configure Environment Variables](#configure-environment-variables)) and start the container. It listens on
port `3000`, and uploaded files are stored in `/app/public/uploads`, so mount a
volume there to keep them across updates:

```bash
docker pull florianstrasser/lokalboards:latest

docker run -d \
  --name lokalboards \
  --env-file .env \
  -p 3000:3000 \
  -v lokalboards_uploads:/app/public/uploads \
  florianstrasser/lokalboards:latest
```

For a self-contained setup including MySQL, a Docker Compose example is provided
in the [project README](https://github.com/florian-strasser/LokalBoards#run-with-docker).

### Building the image yourself

You can build the image from the `Dockerfile` in the repository. Because the
build toolchain runs on your machine's architecture while the final image can
target another, use `docker buildx` and pick the platform of your **target
server** (`linux/amd64` for most hosts) — otherwise the container fails to start
with an `Exec format error`:

```bash
# one-time: a builder that supports cross-platform builds
docker buildx create --use --name multiarch

# build for the server architecture and push to your registry
docker buildx build --platform linux/amd64 -t <your-registry>/lokalboards:latest --push .
```

The build stage is pinned to your machine's native architecture, so the heavy
build runs natively (no slow/unstable emulation) while the runtime image targets
the platform you requested.

### How configuration is applied

LokalBoards reads its configuration from **environment variables at runtime** —
you never need to rebuild the image to change settings. Provide them either as
real environment variables (`docker run --env-file`, Compose `environment:`, or
your host panel's env settings) or as a `.env` file mounted at `/app/.env`
(`-v /path/to/.env:/app/.env:ro`). Real environment variables take precedence
over the mounted file.
