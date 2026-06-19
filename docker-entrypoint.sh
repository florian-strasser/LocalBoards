#!/bin/sh
set -e

# Nuxt's production server (Nitro) reads real environment variables at runtime;
# unlike `nuxt dev`, it does NOT auto-load a .env file. To support deployments
# that provide configuration through a mounted .env file, load it here.
#
# Variables already present in the container environment take precedence, so
# real env vars (e.g. `docker run --env-file`, compose `environment:`, or a host
# panel) always win over the file. Set ENV_FILE to use a different path.
ENV_FILE="${ENV_FILE:-/app/.env}"
if [ -f "$ENV_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip blank lines and comments
    case "$line" in
      '' | \#*) continue ;;
    esac
    # Only handle KEY=VALUE lines
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac
    key=${line%%=*}
    # Only set the variable if it isn't already defined in the environment
    if [ -z "$(printenv "$key" 2>/dev/null)" ]; then
      export "$line"
    fi
  done <"$ENV_FILE"
fi

exec "$@"
