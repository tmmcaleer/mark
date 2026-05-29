#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AVPI_DIR="$ROOT_DIR/panel/dist/avpi"
TARGET_DIR="/Library/Application Support/Avid/PanelSDKPlugins"

if ! compgen -G "$AVPI_DIR/*.avpi" > /dev/null; then
  echo "No .avpi found in $AVPI_DIR. Run: cd panel && npm run package"
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$AVPI_DIR"/*.avpi "$TARGET_DIR/"
echo "Installed Mark panel to $TARGET_DIR"

