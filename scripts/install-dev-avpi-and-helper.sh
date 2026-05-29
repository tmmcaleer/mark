#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="background"
SKIP_BUILD=0
SKIP_HELPER=0
DRY_RUN=0
PORT="${MARK_HELPER_PORT:-4500}"
PLUGIN_DIR="/Library/Application Support/Avid/PanelSDKPlugins"
LOG_DIR="$HOME/.mark-dev"
PID_FILE="$LOG_DIR/helper.pid"
OUT_LOG="$LOG_DIR/helper.log"
ERR_LOG="$LOG_DIR/helper-error.log"
PROD_LABEL="com.mcdiva.mark.helper"
DEV_LABEL="com.mcdiva.mark.dev.helper"
NPM_CACHE="${NPM_CACHE:-}"

usage() {
  cat <<'USAGE'
Usage: install-dev-avpi-and-helper.sh [repo-root] [options]

Build and install the current Mark dev AVPI, stop any installed Mark helper
LaunchAgent, clear port 4500, and start helper-service from source.

Options:
  --repo PATH       Explicit Mark repo root
  --foreground     Start the dev helper attached to this terminal
  --background     Start the dev helper in the background (default)
  --skip-build     Do not build or install the AVPI
  --skip-helper    Do not stop/restart the helper service
  --port PORT      Helper port, default 4500
  --dry-run        Print planned actions without changing the machine
  -h, --help       Show this help
USAGE
}

log() {
  printf '[mark-dev] %s\n' "$*"
}

warn() {
  printf '[mark-dev] WARN: %s\n' "$*" >&2
}

die() {
  printf '[mark-dev] ERROR: %s\n' "$*" >&2
  exit 1
}

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '[mark-dev] dry-run:'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but is not on PATH"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --repo)
      [ "$#" -ge 2 ] || die "--repo requires a path"
      REPO_ROOT="$2"
      shift 2
      ;;
    --foreground)
      MODE="foreground"
      shift
      ;;
    --background)
      MODE="background"
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --skip-helper)
      SKIP_HELPER=1
      shift
      ;;
    --port)
      [ "$#" -ge 2 ] || die "--port requires a value"
      PORT="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --*)
      die "Unknown option: $1"
      ;;
    *)
      REPO_ROOT="$1"
      shift
      ;;
  esac
done

[ -d "$REPO_ROOT" ] || die "Repo root does not exist: $REPO_ROOT"
REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"
PANEL_DIR="$REPO_ROOT/panel"
HELPER_DIR="$REPO_ROOT/helper-service"
NPM_CACHE="${NPM_CACHE:-$REPO_ROOT/.npm-cache}"

[ -f "$PANEL_DIR/package.json" ] || die "Missing panel package.json: $PANEL_DIR/package.json"
[ -f "$HELPER_DIR/package.json" ] || die "Missing helper package.json: $HELPER_DIR/package.json"

require_command node
require_command npm

install_avpi() {
  [ "$SKIP_BUILD" -eq 0 ] || {
    log "Skipping AVPI build/install"
    return
  }

  log "Building dev AVPI from $PANEL_DIR"
  cd "$PANEL_DIR"

  if [ ! -d node_modules ]; then
    log "Installing panel dependencies"
    run npm install --cache "$NPM_CACHE"
  fi

  run npm run package

  local avpi_file
  avpi_file="$(find "$PANEL_DIR/dist/avpi" -maxdepth 1 -type f -name '*.avpi' -print 2>/dev/null | sort | tail -n 1)"
  if [ -z "$avpi_file" ] && [ "$DRY_RUN" -eq 1 ]; then
    avpi_file="$PANEL_DIR/dist/avpi/<fresh-build>.avpi"
  fi
  [ -n "$avpi_file" ] || die "No .avpi file found under $PANEL_DIR/dist/avpi"

  log "Installing $(basename "$avpi_file") into $PLUGIN_DIR"
  if [ "$DRY_RUN" -eq 1 ]; then
    log "dry-run: would remove stale Mark AVPIs from $PLUGIN_DIR"
    find "$PLUGIN_DIR" -maxdepth 1 -type f \( -iname 'mark*.avpi' -o -iname '*mark-avid-panel*.avpi' \) -print 2>/dev/null || true
    run cp "$avpi_file" "$PLUGIN_DIR/"
    return
  fi

  mkdir -p "$PLUGIN_DIR"
  find "$PLUGIN_DIR" -maxdepth 1 -type f \( -iname 'mark*.avpi' -o -iname '*mark-avid-panel*.avpi' \) -delete
  cp "$avpi_file" "$PLUGIN_DIR/"
  log "Installed: $PLUGIN_DIR/$(basename "$avpi_file")"
}

stop_launch_agent() {
  local label="$1"
  local plist="$HOME/Library/LaunchAgents/$label.plist"
  local uid
  uid="$(id -u)"

  command -v launchctl >/dev/null 2>&1 || {
    warn "launchctl is unavailable; skipping LaunchAgent stop for $label"
    return
  }

  if launchctl print "gui/$uid/$label" >/dev/null 2>&1 || launchctl list 2>/dev/null | grep -q "$label"; then
    log "Stopping LaunchAgent: $label"
    if [ "$DRY_RUN" -eq 1 ]; then
      run launchctl bootout "gui/$uid/$label"
      [ ! -f "$plist" ] || run launchctl unload "$plist"
      return
    fi

    launchctl stop "$label" 2>/dev/null || true
    launchctl bootout "gui/$uid/$label" 2>/dev/null || true
    [ ! -f "$plist" ] || launchctl unload "$plist" 2>/dev/null || true
  else
    log "No loaded LaunchAgent found for $label"
  fi
}

kill_pid() {
  local pid="$1"
  [ -n "$pid" ] || return
  kill -0 "$pid" 2>/dev/null || return

  if [ "$DRY_RUN" -eq 1 ]; then
    run kill "$pid"
    return
  fi

  kill "$pid" 2>/dev/null || true
  sleep 1
  kill -0 "$pid" 2>/dev/null || return 0
  kill -9 "$pid" 2>/dev/null || true
}

clear_previous_dev_helper() {
  if command -v launchctl >/dev/null 2>&1; then
    if launchctl list 2>/dev/null | awk '{print $3}' | grep -qx "$DEV_LABEL"; then
      log "Stopping previous submitted dev helper job: $DEV_LABEL"
      if [ "$DRY_RUN" -eq 1 ]; then
        run launchctl remove "$DEV_LABEL"
      else
        launchctl remove "$DEV_LABEL" 2>/dev/null || true
      fi
    fi
  fi

  if [ -r "$PID_FILE" ]; then
    local pid
    pid="$(sed -n '1p' "$PID_FILE" | tr -cd '0-9')"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      log "Stopping previous dev helper from $PID_FILE: $pid"
      kill_pid "$pid"
    fi
    [ "$DRY_RUN" -eq 1 ] || rm -f "$PID_FILE"
  fi
}

clear_helper_port() {
  local pids
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"

  if [ -z "$pids" ]; then
    log "Port $PORT is available"
    return
  fi

  log "Clearing process(es) listening on port $PORT: $pids"
  for pid in $pids; do
    kill_pid "$pid"
  done
}

wait_for_health() {
  command -v curl >/dev/null 2>&1 || return

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl -sS -o /dev/null --connect-timeout 2 "http://localhost:$PORT/health"; then
      log "Dev helper is responding on port $PORT"
      return
    fi
    sleep 1
  done

  warn "Dev helper started, but /health did not answer within 10 seconds"
}

start_dev_helper() {
  [ "$SKIP_HELPER" -eq 0 ] || {
    log "Skipping helper restart"
    return
  }

  stop_launch_agent "$PROD_LABEL"
  clear_previous_dev_helper
  clear_helper_port

  cd "$HELPER_DIR"
  if [ ! -d node_modules ]; then
    log "Installing helper dependencies"
    run npm install --cache "$NPM_CACHE"
  fi

  if [ -f "$HELPER_DIR/.env" ]; then
    log "Loading helper environment from $HELPER_DIR/.env"
    set -a
    # shellcheck disable=SC1091
    . "$HELPER_DIR/.env"
    set +a
  fi

  if [ -z "${TWELVELABS_API_KEY:-}" ]; then
    warn "TWELVELABS_API_KEY is not set; helper will start but analysis jobs will fail"
  fi

  log "Starting dev helper from $HELPER_DIR"
  log "Health: http://localhost:$PORT/health"
  log "Config: http://localhost:$PORT/config"

  if [ "$MODE" = "foreground" ]; then
    log "Running in foreground. Press Ctrl+C to stop the dev helper."
    if [ "$DRY_RUN" -eq 1 ]; then
      run env MARK_HELPER_PORT="$PORT" npm run dev
      return
    fi
    exec env MARK_HELPER_PORT="$PORT" npm run dev
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    run mkdir -p "$LOG_DIR"
    run env MARK_HELPER_PORT="$PORT" npm run dev
    return
  fi

  mkdir -p "$LOG_DIR"

  if command -v launchctl >/dev/null 2>&1; then
    local helper_cmd
    local helper_pid

    printf -v helper_cmd 'cd %q && exec env MARK_HELPER_PORT=%q npm run dev </dev/null >%q 2>%q' "$HELPER_DIR" "$PORT" "$OUT_LOG" "$ERR_LOG"
    launchctl submit -l "$DEV_LABEL" -- /bin/zsh -lc "$helper_cmd"

    sleep 2
    helper_pid="$(launchctl list 2>/dev/null | awk -v label="$DEV_LABEL" '$3 == label { print $1 }')"
    if [ -z "$helper_pid" ] || [ "$helper_pid" = "-" ]; then
      warn "Dev helper launchctl job exited immediately. Error log follows:"
      tail -n 80 "$ERR_LOG" >&2 || true
      exit 1
    fi

    printf '%s\n' "$helper_pid" > "$PID_FILE"
    log "Dev helper background PID: $helper_pid"
    log "Launch label: $DEV_LABEL"
    log "Logs: $OUT_LOG"
    log "Errors: $ERR_LOG"
    wait_for_health
    return
  fi

  nohup env MARK_HELPER_PORT="$PORT" npm run dev </dev/null >"$OUT_LOG" 2>"$ERR_LOG" &
  local helper_pid=$!
  printf '%s\n' "$helper_pid" > "$PID_FILE"

  sleep 2
  if ! kill -0 "$helper_pid" 2>/dev/null; then
    warn "Dev helper exited immediately. Error log follows:"
    tail -n 80 "$ERR_LOG" >&2 || true
    exit 1
  fi

  log "Dev helper background PID: $helper_pid"
  log "Logs: $OUT_LOG"
  log "Errors: $ERR_LOG"
  wait_for_health
}

log "Repo root: $REPO_ROOT"
install_avpi
start_dev_helper
log "Done. Restart Media Composer or reopen the Mark panel to pick up the new AVPI."
