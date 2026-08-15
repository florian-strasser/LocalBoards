#!/bin/bash
set -euo pipefail

# Start LokalBoards, with or without a database of its own.
#
# The image carries a full MySQL server so that `docker run` on a fresh machine
# gives a working instance with nothing else to set up. But a real deployment
# usually already has a database — a managed one, or a separate container — and
# there, running a second unused MySQL inside this container would waste memory
# and, worse, create a second place data could accidentally land.
#
# So the rule is: an external database if one is configured, the built-in one
# otherwise. `NUXT_MYSQL_HOST` is what decides, because that is the variable a
# person setting up an external database sets first.

log() { printf '[lokalboards] %s\n' "$*"; }

# --- Configuration from a mounted file ------------------------------------
#
# Nitro reads real environment variables at runtime and, unlike `nuxt dev`, does
# not load a .env file. Deployments that supply configuration as a mounted file
# are common enough to support here. Real environment variables win, so
# `--env-file`, compose `environment:` and host panels all override the file.
ENV_FILE="${ENV_FILE:-/app/.env}"
if [ -f "$ENV_FILE" ]; then
  log "reading $ENV_FILE"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      '' | \#*) continue ;;
      *=*) ;;
      *) continue ;;
    esac
    key=${line%%=*}
    if [ -z "$(printenv "$key" 2>/dev/null)" ]; then
      export "${line?}"
    fi
  done <"$ENV_FILE"
fi

# --- Which database? -------------------------------------------------------

EXTERNAL_DB=0
case "${NUXT_MYSQL_HOST:-}" in
  '' | localhost | 127.0.0.1 | ::1) EXTERNAL_DB=0 ;;
  *) EXTERNAL_DB=1 ;;
esac

# The application never needs root. It runs as `mysql` — the unprivileged
# account the base image already provides, and the owner of both volumes — via
# the `gosu` that image ships. `su` would be wrong here: it leaves a parent
# process in between, which swallows the signals `docker stop` sends.
#
# Expands to nothing when the container was already started as another user
# (`docker run --user`), in which case there is nothing to drop.
DROP_PRIVILEGES=""
if [ "$(id -u)" = "0" ]; then
  DROP_PRIVILEGES="gosu mysql"
  # A freshly mounted volume belongs to root and the app could not write to it.
  # Harmless when the ownership is already right.
  chown -R mysql:mysql /app/public/uploads 2>/dev/null || true
fi

if [ "$EXTERNAL_DB" = "1" ]; then
  log "using the external database at ${NUXT_MYSQL_HOST}"
  exec $DROP_PRIVILEGES "$@"
fi

# --- The built-in database -------------------------------------------------

export NUXT_MYSQL_HOST=127.0.0.1
export NUXT_MYSQL_DATABASE="${NUXT_MYSQL_DATABASE:-lokalboards}"
export NUXT_MYSQL_USER="${NUXT_MYSQL_USER:-lokalboards}"

# A password is generated once and kept beside the data it protects. Baking a
# default into the image would mean every instance in the world shared it;
# asking the operator to invent one would make `docker run` fail on a bare
# machine, which is the case this whole path exists to serve.
#
# It only ever guards a loopback socket inside this container — nothing listens
# on 3306 outside it — so its job is to be unique, not memorable.
PASSWORD_FILE=/var/lib/mysql/.lokalboards-password
if [ -z "${NUXT_MYSQL_PASSWORD:-}" ]; then
  if [ -f "$PASSWORD_FILE" ]; then
    NUXT_MYSQL_PASSWORD="$(cat "$PASSWORD_FILE")"
  else
    NUXT_MYSQL_PASSWORD="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
fi
export NUXT_MYSQL_PASSWORD

# TLS off for the loopback connection. There is no network to intercept, and the
# server would be presenting a self-signed certificate to itself.
export NUXT_MYSQL_SSL="${NUXT_MYSQL_SSL:-false}"

# The official image's own entrypoint handles first-run initialisation — data
# directory, root account, the database and user named below — and it is driven
# entirely by these variables. Reusing it is what keeps this script from
# reimplementing `mysqld --initialize` badly.
export MYSQL_DATABASE="$NUXT_MYSQL_DATABASE"
export MYSQL_USER="$NUXT_MYSQL_USER"
export MYSQL_PASSWORD="$NUXT_MYSQL_PASSWORD"
export MYSQL_RANDOM_ROOT_PASSWORD=yes

log "starting the built-in MySQL server"
/usr/local/bin/docker-entrypoint.sh mysqld \
  --bind-address=127.0.0.1 \
  --skip-name-resolve \
  --max-allowed-packet=64M &
MYSQL_PID=$!

# Stop both halves together. Without this, `docker stop` would kill the shell
# and leave mysqld to be killed uncleanly a moment later, which costs a crash
# recovery on the next start.
shutdown() {
  log "shutting down"
  [ -n "${APP_PID:-}" ] && kill -TERM "$APP_PID" 2>/dev/null || true
  [ -n "${MYSQL_PID:-}" ] && kill -TERM "$MYSQL_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap shutdown TERM INT

log "waiting for the database"
for _ in $(seq 1 120); do
  if mysqladmin ping --host=127.0.0.1 --silent > /dev/null 2>&1; then
    break
  fi
  # A first run initialises the data directory, which takes appreciably longer
  # than a restart; if mysqld died during it, fail now rather than after two
  # minutes of silence.
  if ! kill -0 "$MYSQL_PID" 2>/dev/null; then
    log "the database failed to start"
    exit 1
  fi
  sleep 1
done

if ! mysqladmin ping --host=127.0.0.1 --silent > /dev/null 2>&1; then
  log "the database did not become ready in time"
  exit 1
fi

# Written only once the server is up, so a half-initialised data directory does
# not leave behind a password that no account actually has.
if [ ! -f "$PASSWORD_FILE" ]; then
  printf '%s' "$NUXT_MYSQL_PASSWORD" > "$PASSWORD_FILE"
  chmod 600 "$PASSWORD_FILE"
fi

log "database ready; starting the application"
$DROP_PRIVILEGES "$@" &
APP_PID=$!

# Exit as soon as *either* process does. A container whose application has died
# but whose database is still running looks alive to Docker's restart policy and
# would never be restarted.
wait -n "$APP_PID" "$MYSQL_PID"
EXIT_CODE=$?
log "a process exited (status $EXIT_CODE); stopping the container"
shutdown
exit "$EXIT_CODE"
