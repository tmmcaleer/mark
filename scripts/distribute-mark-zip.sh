#!/usr/bin/env bash
set -u

REPO="/Users/admin/Github/mark"
ZIP_PATH=""
MODE="dry-run"
PROBE=0
CHECKSUM=0
ONLY_NAMES=""
PASSWORD="${MARK_DISTRIBUTE_PASSWORD:-}"

TARGETS='Kim|10.0.222.173|admin|admin|Desktop
Woody|10.0.222.177|Woody|admin|Desktop
Franny|10.0.222.141|Franny|franny|Desktop
Brian|BrianL%20Studio._smb._tcp.local|admin|admin|Desktop
Lynne|10.0.222.171|Lynne|lynne|Desktop
Caroline|10.0.222.176|Caroline|caroline|Desktop
Giancarlo|10.0.222.180|Giancarlo|admin|Desktop
Niya|10.0.222.178|Niya|admin|Desktop
Nia|Nia%E2%80%99s%20Mac%20Studio._smb._tcp.local|Nia|nia|Desktop'

usage() {
  cat <<'USAGE'
Usage: distribute-mark-zip.sh [--dry-run|--execute] [options]

Copy the latest Mark production zip to verified editor Desktop SMB shares.

Options:
  --dry-run       Preview targets without mounting or copying (default)
  --execute       Mount/copy/verify/eject
  --probe         Mount and test hidden Desktop write/delete without copying
  --checksum      Verify copied zips with SHA-256 after size verification
  --only NAME     Limit to one target; repeat for multiple users
  --zip PATH      Use a specific zip
  --repo PATH     Use a specific Mark repo checkout
  -h, --help      Show this help

Set MARK_DISTRIBUTE_PASSWORD for unattended execution, or omit it to get a
secure prompt in --execute mode.
USAGE
}

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      MODE="dry-run"
      shift
      ;;
    --execute)
      MODE="execute"
      shift
      ;;
    --probe)
      PROBE=1
      shift
      ;;
    --checksum)
      CHECKSUM=1
      shift
      ;;
    --only)
      [ "$#" -ge 2 ] || die "--only requires a name"
      ONLY_NAMES="${ONLY_NAMES}${ONLY_NAMES:+ }$2"
      shift 2
      ;;
    --zip)
      [ "$#" -ge 2 ] || die "--zip requires a path"
      ZIP_PATH="$2"
      shift 2
      ;;
    --repo)
      [ "$#" -ge 2 ] || die "--repo requires a path"
      REPO="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1"
      ;;
  esac
done

name_selected() {
  local name="$1"
  if [ -z "$ONLY_NAMES" ]; then
    return 0
  fi
  case " $ONLY_NAMES " in
    *" $name "*) return 0 ;;
    *) return 1 ;;
  esac
}

find_latest_zip() {
  local release_dir="$REPO/signed-release"
  [ -d "$release_dir" ] || die "missing signed-release folder: $release_dir"
  /bin/ls -t "$release_dir"/Mark-Production-v*.pkg.zip 2>/dev/null | /usr/bin/head -n 1
}

remote_mount_line() {
  local server="$1"
  local share="$2"
  mount | /usr/bin/awk -v server="$server" -v share="$share" '
    $0 ~ /smbfs/ {
      split($0, parts, " on ")
      remote = parts[1]
      if (remote ~ ("@" server "/" share "$")) {
        print $0
      }
    }'
}

mountpoint_from_line() {
  /usr/bin/sed -E 's#.* on (/Volumes/.*) \(smbfs.*#\1#'
}

mount_target() {
  local name="$1"
  local server="$2"
  local login="$3"
  local share="$4"
  local url="smb://$server/$share"
  local existing=""
  local created=""
  local output=""

  existing="$(remote_mount_line "$server" "$share" | mountpoint_from_line | /usr/bin/head -n 1)"
  if [ -n "$existing" ] && [ -d "$existing" ]; then
    printf '%s|existing|%s\n' "$existing" "$url"
    return 0
  fi

  output="$(/usr/bin/perl -e 'alarm 30; exec @ARGV' /usr/bin/osascript \
    -e 'on run argv' \
    -e 'try' \
    -e 'mount volume (item 1 of argv) as user name (item 2 of argv) with password (item 3 of argv)' \
    -e 'return "mount OK"' \
    -e 'on error errMsg number errNum' \
    -e 'return "mount failed " & errNum & ": " & errMsg' \
    -e 'end try' \
    -e 'end run' \
    "$url" "$login" "$PASSWORD" 2>&1)"

  created="$(remote_mount_line "$server" "$share" | mountpoint_from_line | /usr/bin/head -n 1)"

  if [ -n "$created" ] && [ -d "$created" ]; then
    printf '%s|created|%s\n' "$created" "$url"
    return 0
  fi

  printf 'mount failed for %s (%s): %s\n' "$name" "$url" "$output" >&2
  return 1
}

eject_if_created() {
  local mountpoint="$1"
  local state="$2"
  if [ "$state" = "created" ] && [ -d "$mountpoint" ]; then
    /usr/sbin/diskutil unmount "$mountpoint" >/dev/null 2>&1 || /sbin/umount "$mountpoint" >/dev/null 2>&1 || true
  fi
}

copy_and_verify() {
  local zip="$1"
  local desktop="$2"
  local base=""
  local dest=""
  local tmp=""
  local src_size=""
  local dest_size=""
  local src_hash=""
  local dest_hash=""

  base="$(/usr/bin/basename "$zip")"
  dest="$desktop/$base"
  tmp="$desktop/.$base.tmp.$$"
  src_size="$(/usr/bin/stat -f '%z' "$zip")"

  /bin/cp -p "$zip" "$tmp" || return 1
  /bin/mv -f "$tmp" "$dest" || return 1

  dest_size="$(/usr/bin/stat -f '%z' "$dest" 2>/dev/null || true)"
  if [ "$src_size" != "$dest_size" ]; then
    printf 'size mismatch: source=%s dest=%s\n' "$src_size" "$dest_size" >&2
    return 1
  fi

  if [ "$CHECKSUM" -eq 1 ]; then
    src_hash="$(/usr/bin/shasum -a 256 "$zip" | /usr/bin/awk '{print $1}')"
    dest_hash="$(/usr/bin/shasum -a 256 "$dest" | /usr/bin/awk '{print $1}')"
    if [ "$src_hash" != "$dest_hash" ]; then
      printf 'checksum mismatch: source=%s dest=%s\n' "$src_hash" "$dest_hash" >&2
      return 1
    fi
  fi

  return 0
}

probe_desktop() {
  local desktop="$1"
  local probe="$desktop/.mark-distribute-write-test-$$"
  /usr/bin/touch "$probe" || return 1
  [ -f "$probe" ] || return 1
  /bin/rm -f "$probe" || return 1
  [ ! -e "$probe" ] || return 1
  return 0
}

if [ "$PROBE" -eq 0 ]; then
  if [ -n "$ZIP_PATH" ]; then
    [ -f "$ZIP_PATH" ] || die "zip not found: $ZIP_PATH"
  else
    ZIP_PATH="$(find_latest_zip)"
    [ -n "$ZIP_PATH" ] || die "no Mark-Production-v*.pkg.zip files found in $REPO/signed-release"
  fi
fi

if [ "$MODE" = "execute" ] && [ -z "$PASSWORD" ]; then
  printf 'SMB password: ' >&2
  stty -echo
  IFS= read -r PASSWORD
  stty echo
  printf '\n' >&2
fi

if [ "$PROBE" -eq 1 ]; then
  log "Mode: $MODE probe"
else
  log "Mode: $MODE"
  log "Zip: $ZIP_PATH"
fi

if [ "$CHECKSUM" -eq 1 ]; then
  log "Verification: size + SHA-256"
else
  log "Verification: size"
fi
log ""

success=0
failed=0
skipped=0
selected=0

while IFS='|' read -r name server login share desktop_rel; do
  [ -n "$name" ] || continue
  if ! name_selected "$name"; then
    continue
  fi
  selected=$((selected + 1))

  url="smb://$server/$share/$desktop_rel"
  log "== $name =="
  log "target: $url as $login"

  if [ "$MODE" != "execute" ]; then
    if [ "$PROBE" -eq 1 ]; then
      log "DRY RUN: would mount, verify Desktop, probe write/delete, and eject if created"
    else
      log "DRY RUN: would mount, verify Desktop, copy zip, verify copy, and eject if created"
    fi
    log ""
    skipped=$((skipped + 1))
    continue
  fi

  mount_result="$(mount_target "$name" "$server" "$login" "$share")"
  if [ "$?" -ne 0 ]; then
    log "FAIL: mount failed"
    log ""
    failed=$((failed + 1))
    continue
  fi

  mountpoint="${mount_result%%|*}"
  rest="${mount_result#*|}"
  mount_state="${rest%%|*}"
  desktop="$mountpoint/$desktop_rel"

  if [ ! -d "$desktop" ]; then
    log "FAIL: Desktop path missing: $desktop"
    eject_if_created "$mountpoint" "$mount_state"
    log ""
    failed=$((failed + 1))
    continue
  fi

  if [ "$PROBE" -eq 1 ]; then
    if probe_desktop "$desktop"; then
      log "OK: probe write/delete verified at $desktop"
      success=$((success + 1))
    else
      log "FAIL: probe write/delete failed at $desktop"
      failed=$((failed + 1))
    fi
  else
    if copy_and_verify "$ZIP_PATH" "$desktop"; then
      log "OK: copied and verified at $desktop"
      success=$((success + 1))
    else
      log "FAIL: copy or verification failed at $desktop"
      failed=$((failed + 1))
    fi
  fi

  eject_if_created "$mountpoint" "$mount_state"
  log ""
done <<EOF
$TARGETS
EOF

if [ "$selected" -eq 0 ]; then
  die "no targets matched --only selection: $ONLY_NAMES"
fi

log "Summary: success=$success failed=$failed skipped=$skipped"
[ "$failed" -eq 0 ] || exit 1

