#!/usr/bin/env bash
set -euo pipefail

LABEL="com.mcdiva.mark.helper"
DEV_LABEL="com.mcdiva.mark.dev.helper"
PORT="${MARK_HELPER_PORT:-4500}"
PLIST_FILE="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/.mark-logs"
DEV_LOG_DIR="$HOME/.mark-dev"

log() {
  printf '[mark-check] %s\n' "$*"
}

warn() {
  printf '[mark-check] WARN: %s\n' "$*" >&2
}

log "Mark helper status"

if [ -f "$PLIST_FILE" ]; then
  log "Production LaunchAgent exists: $PLIST_FILE"
else
  warn "Production LaunchAgent not found: $PLIST_FILE"
fi

if command -v launchctl >/dev/null 2>&1; then
  if launchctl list 2>/dev/null | awk '{print $3}' | grep -qx "$LABEL"; then
    log "Production helper loaded: $(launchctl list | grep "$LABEL")"
  else
    warn "Production helper is not loaded"
  fi

  if launchctl list 2>/dev/null | awk '{print $3}' | grep -qx "$DEV_LABEL"; then
    log "Dev helper loaded: $(launchctl list | grep "$DEV_LABEL")"
  fi
else
  warn "launchctl is unavailable"
fi

if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  log "Port $PORT listener(s): $(lsof -tiTCP:"$PORT" -sTCP:LISTEN | tr '\n' ' ')"
else
  warn "No listener on port $PORT"
fi

if curl -sS --connect-timeout 5 "http://localhost:$PORT/health" >/tmp/mark-health.$$ 2>/dev/null; then
  log "Health OK: $(cat /tmp/mark-health.$$)"
else
  warn "Health endpoint failed: http://localhost:$PORT/health"
fi
rm -f /tmp/mark-health.$$

if curl -sS --connect-timeout 5 "http://localhost:$PORT/config" >/tmp/mark-config.$$ 2>/dev/null; then
  log "Config OK: $(cat /tmp/mark-config.$$)"
else
  warn "Config endpoint failed: http://localhost:$PORT/config"
fi
rm -f /tmp/mark-config.$$

log "Production logs: $LOG_DIR/helper.log and $LOG_DIR/helper-error.log"
log "Dev logs: $DEV_LOG_DIR/helper.log and $DEV_LOG_DIR/helper-error.log"

