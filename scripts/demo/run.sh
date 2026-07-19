#!/usr/bin/env bash
#
# One-command demo screenshots. Builds the app, spins up a throwaway seeded
# database and a server on a spare port (never :3000), and captures every page
# and modal in each configured language into demo-screenshots/<lang>/, plus a
# browsable index.html.
#
#   bash scripts/demo/run.sh            # or: npm run demo:screenshots
#
# Override anything via env:
#   DEMO_DB_HOST/USER/PASS/NAME   MySQL connection (default 127.0.0.1/root/root1234/localboards_demo)
#   DEMO_PORT                     server port (default 3100)
#   DEMO_LANGS                    space-separated locales (default "en de")
#   DEMO_OUT                      output dir (default demo-screenshots)
#   SKIP_BUILD=1                  reuse the existing .output build
#   KEEP_DB=1                     don't drop the demo database at the end
set -euo pipefail
cd "$(dirname "$0")/../.."

# Match the project's Node (the shell may default to an older version).
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null 2>&1 || true

DEMO_DB_HOST="${DEMO_DB_HOST:-127.0.0.1}"
DEMO_DB_USER="${DEMO_DB_USER:-root}"
DEMO_DB_PASS="${DEMO_DB_PASS:-root1234}"
DEMO_DB_NAME="${DEMO_DB_NAME:-localboards_demo}"
DEMO_PORT="${DEMO_PORT:-3100}"
DEMO_LANGS="${DEMO_LANGS:-en de}"
DEMO_OUT="${DEMO_OUT:-demo-screenshots}"
DEMO_TOKEN="${DEMO_TOKEN:-demo-token-alex}"
export DEMO_DB_HOST DEMO_DB_USER DEMO_DB_PASS DEMO_DB_NAME DEMO_TOKEN
export DEMO_BASE_URL="http://127.0.0.1:${DEMO_PORT}"
export DEMO_LANGS

LOG="$(mktemp)"
SERVER_PID=""
mysql_do() { MYSQL_PWD="$DEMO_DB_PASS" mysql -h"$DEMO_DB_HOST" -u"$DEMO_DB_USER" "$@"; }

stop_server() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
  fi
}
cleanup() {
  stop_server
  if [ "${KEEP_DB:-0}" != "1" ]; then
    mysql_do -e "DROP DATABASE IF EXISTS \`${DEMO_DB_NAME}\`;" 2>/dev/null || true
  fi
  rm -f "$LOG"
}
trap cleanup EXIT

start_server() { # $1 = language
  NUXT_MYSQL_HOST="$DEMO_DB_HOST" NUXT_MYSQL_USER="$DEMO_DB_USER" NUXT_MYSQL_PASSWORD="$DEMO_DB_PASS" \
  NUXT_MYSQL_DATABASE="$DEMO_DB_NAME" NUXT_MYSQL_SSL=false \
  NUXT_LANGUAGE="$1" NUXT_PUBLIC_SIGNUP=true NUXT_LOG_LEVEL=error \
  PORT="$DEMO_PORT" NITRO_PORT="$DEMO_PORT" \
    node .output/server/index.mjs >"$LOG" 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 60); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$DEMO_BASE_URL/" || true)"
    case "$code" in 200|302) return 0 ;; esac
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then echo "server exited early:"; cat "$LOG"; exit 1; fi
    sleep 1
  done
  echo "server did not become ready on :$DEMO_PORT"; cat "$LOG"; exit 1
}

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "==> building app (SKIP_BUILD=1 to reuse the existing build)"
  npm run build
fi

echo "==> resetting demo database '$DEMO_DB_NAME'"
mysql_do -e "DROP DATABASE IF EXISTS \`${DEMO_DB_NAME}\`; CREATE DATABASE \`${DEMO_DB_NAME}\` CHARACTER SET utf8mb4;"

first=1
for lang in $DEMO_LANGS; do
  echo "==> starting server (NUXT_LANGUAGE=$lang) on :$DEMO_PORT"
  start_server "$lang"
  if [ "$first" = "1" ]; then
    echo "==> seeding demo data"
    node scripts/demo/seed.mjs
    first=0
  fi
  echo "==> capturing screenshots -> $DEMO_OUT/$lang"
  mkdir -p "$DEMO_OUT/$lang"
  node scripts/demo/screenshots.mjs "$DEMO_OUT/$lang"
  stop_server
done

node scripts/demo/gallery.mjs "$DEMO_OUT"
echo "==> done. open $DEMO_OUT/index.html"
