#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$REPO_ROOT/build-temp/premiere-uxp/mark-premiere"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/src" "$OUT_DIR/static"

cp "$REPO_ROOT/premiere/manifest.json" "$OUT_DIR/manifest.json"
cp "$REPO_ROOT"/premiere/src/* "$OUT_DIR/src/"
cp "$REPO_ROOT/panel/src/index.html" "$OUT_DIR/src/index.html"
perl -0pi -e 's#<title>Mark</title>#<title>Mark</title>\n    <link rel="stylesheet" href="main.css">\n    <link rel="stylesheet" href="premiere.css">#' "$OUT_DIR/src/index.html"
perl -0pi -e 's#<script src="main\.js"></script>#<script src="premiere-host-adapter.js"></script>\n    <script src="main.js"></script>#' "$OUT_DIR/src/index.html"
cp "$REPO_ROOT/panel/src/css/main.css" "$OUT_DIR/src/main.css"
cp "$REPO_ROOT/panel/resource/static/application.svg" "$OUT_DIR/static/application.svg"

echo "Built Premiere UXP development bundle:"
echo "$OUT_DIR"
