#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="$HOME/.mark-logs"

mkdir -p "$LOG_DIR"

log_message() {
  printf '%s [Launcher] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_DIR/launcher.log"
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOURCES_DIR="$(cd "$SCRIPT_DIR/../Resources" && pwd)"
ENV_FILE="$RESOURCES_DIR/.env"

if [ -f "$ENV_FILE" ]; then
  log_message "Loading environment from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
else
  log_message "No bundled $ENV_FILE found; TWELVELABS_API_KEY may be missing"
fi

cd "$RESOURCES_DIR"

find_node() {
  local node_path
  for node_path in \
    "/opt/homebrew/bin/node" \
    "/usr/local/bin/node" \
    "/usr/bin/node" \
    "$(command -v node 2>/dev/null || true)"
  do
    if [ -n "$node_path" ] && [ -x "$node_path" ]; then
      printf '%s\n' "$node_path"
      return 0
    fi
  done

  if [ -d "/opt/homebrew/Cellar/node" ]; then
    node_path="$(find /opt/homebrew/Cellar/node -path '*/bin/node' -type f | sort -V | tail -n 1)"
    if [ -n "$node_path" ] && [ -x "$node_path" ]; then
      printf '%s\n' "$node_path"
      return 0
    fi
  fi

  if [ -d "/usr/local/Cellar/node" ]; then
    node_path="$(find /usr/local/Cellar/node -path '*/bin/node' -type f | sort -V | tail -n 1)"
    if [ -n "$node_path" ] && [ -x "$node_path" ]; then
      printf '%s\n' "$node_path"
      return 0
    fi
  fi

  return 1
}

NODE_PATH="$(find_node || true)"
if [ -z "$NODE_PATH" ]; then
  log_message "FATAL: Node.js not found"
  printf 'Mark helper could not start: Node.js not found\n' >&2
  exit 127
fi

if [ ! -f "src/server.js" ]; then
  log_message "FATAL: src/server.js not found in $RESOURCES_DIR"
  exit 1
fi

export MARK_HELPER_PORT="${MARK_HELPER_PORT:-4500}"
export NODE_ENV="${NODE_ENV:-production}"

log_message "Starting Mark helper with $NODE_PATH on port $MARK_HELPER_PORT"
exec "$NODE_PATH" src/server.js
