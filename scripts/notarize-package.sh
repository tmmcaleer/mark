#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PKG_FILE="${1:-}"
PROFILE="${MARK_NOTARY_PROFILE:-notarytool-profile}"

if [ -z "$PKG_FILE" ]; then
  PKG_FILE="$(/bin/ls -t "$REPO_ROOT"/signed-release/Mark-Production-v*.pkg 2>/dev/null | /usr/bin/head -n 1 || true)"
fi

[ -n "$PKG_FILE" ] || {
  echo "Usage: notarize-package.sh [path-to-package.pkg]" >&2
  exit 1
}
[ -f "$PKG_FILE" ] || {
  echo "Package not found: $PKG_FILE" >&2
  exit 1
}

echo "[mark-notary] Submitting $PKG_FILE"
xcrun notarytool submit "$PKG_FILE" \
  --keychain-profile "$PROFILE" \
  --wait

echo "[mark-notary] Stapling $PKG_FILE"
xcrun stapler staple "$PKG_FILE"

echo "[mark-notary] Verifying package"
pkgutil --check-signature "$PKG_FILE"
spctl --assess --verbose --type install "$PKG_FILE"

ZIP_FILE="$PKG_FILE.zip"
echo "[mark-notary] Creating $ZIP_FILE"
ditto -c -k --sequesterRsrc "$PKG_FILE" "$ZIP_FILE"

echo "[mark-notary] Done: $ZIP_FILE"

