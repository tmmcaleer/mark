#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION=""
SKIP_SIGN=0
SKIP_TESTS=0
NO_BUMP=0
APP_SIGN_IDENTITY="${MARK_APP_SIGN_IDENTITY:-Developer ID Application: Timothy Michael Mc Aleer (58F7LG72RX)}"
PKG_SIGN_IDENTITY="${MARK_INSTALLER_SIGN_IDENTITY:-Developer ID Installer: Timothy Michael Mc Aleer (58F7LG72RX)}"
APP_BUNDLE_ID="com.mcdiva.mark.helper"
PKG_PREFIX="com.mcdiva.mark"
PACKAGE_NAME="Mark-Production"
APP_NAME="Mark-Helper.app"
NPM_CACHE="${NPM_CACHE:-$REPO_ROOT/.npm-cache}"

usage() {
  cat <<'USAGE'
Usage: create-production-signed-package.sh X.Y.Z [options]

Build the Mark AVPI, bundle the helper service into /Applications/Mark-Helper.app,
create a macOS installer package, and sign it unless --skip-sign is supplied.

Options:
  --skip-sign            Build an unsigned package for local testing
  --skip-tests           Do not run helper-service tests before packaging
  --no-bump              Do not update package/manifest versions
  --app-identity NAME    Developer ID Application identity
  --pkg-identity NAME    Developer ID Installer identity
  -h, --help             Show this help
USAGE
}

die() {
  printf '[mark-release] ERROR: %s\n' "$*" >&2
  exit 1
}

log() {
  printf '[mark-release] %s\n' "$*"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but is not on PATH"
}

if [ "$#" -eq 0 ]; then
  usage
  exit 1
fi

VERSION="$1"
shift

while [ "$#" -gt 0 ]; do
  case "$1" in
    --skip-sign)
      SKIP_SIGN=1
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=1
      shift
      ;;
    --no-bump)
      NO_BUMP=1
      shift
      ;;
    --app-identity)
      [ "$#" -ge 2 ] || die "--app-identity requires a value"
      APP_SIGN_IDENTITY="$2"
      shift 2
      ;;
    --pkg-identity)
      [ "$#" -ge 2 ] || die "--pkg-identity requires a value"
      PKG_SIGN_IDENTITY="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Version must be semantic X.Y.Z: $VERSION"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

require_command node
require_command npm
require_command rsync
require_command pkgbuild
require_command productbuild

if [ "$SKIP_SIGN" -eq 0 ]; then
  require_command codesign
  require_command productsign
fi

cd "$REPO_ROOT"

if [ "$NO_BUMP" -eq 0 ]; then
  log "Bumping package and manifest versions to $VERSION"
  node scripts/bump-version.js "$VERSION"
fi

log "Cleaning build artifacts"
rm -rf build-temp
mkdir -p build-temp signed-release

if [ "$SKIP_TESTS" -eq 0 ]; then
  log "Running helper tests"
  cd "$REPO_ROOT/helper-service"
  if [ ! -d node_modules ]; then
    npm install --cache "$NPM_CACHE"
  fi
  npm test
fi

log "Building AVPI"
cd "$REPO_ROOT/panel"
if [ ! -d node_modules ]; then
  npm install --cache "$NPM_CACHE"
fi
npm run package

AVPI_FILE="$(find "$REPO_ROOT/panel/dist/avpi" -maxdepth 1 -type f -name '*.avpi' -print | sort | tail -n 1)"
[ -n "$AVPI_FILE" ] || die "No AVPI found under panel/dist/avpi"
cp "$AVPI_FILE" "$REPO_ROOT/signed-release/"

cd "$REPO_ROOT"

APP_BUNDLE="$REPO_ROOT/build-temp/$APP_NAME"
RESOURCES_DIR="$APP_BUNDLE/Contents/Resources"
MACOS_DIR="$APP_BUNDLE/Contents/MacOS"

log "Creating helper app bundle"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

cat > "$APP_BUNDLE/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>mark-helper</string>
  <key>CFBundleIdentifier</key>
  <string>$APP_BUNDLE_ID</string>
  <key>CFBundleName</key>
  <string>Mark Helper</string>
  <key>CFBundleDisplayName</key>
  <string>Mark Helper</string>
  <key>CFBundleVersion</key>
  <string>$VERSION</string>
  <key>CFBundleShortVersionString</key>
  <string>$VERSION</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSUIElement</key>
  <true/>
  <key>LSBackgroundOnly</key>
  <true/>
</dict>
</plist>
PLIST

cp "$REPO_ROOT/scripts/mark-helper-launcher.sh" "$MACOS_DIR/mark-helper"
chmod +x "$MACOS_DIR/mark-helper"
rsync -a \
  --exclude node_modules \
  --exclude test \
  --exclude '*.log' \
  "$REPO_ROOT/helper-service/" "$RESOURCES_DIR/"

log "Installing production helper dependencies"
cd "$RESOURCES_DIR"
npm install --omit=dev --no-audit --no-fund --cache "$NPM_CACHE"
cd "$REPO_ROOT"

if [ "$SKIP_SIGN" -eq 0 ]; then
  log "Signing helper app bundle"
  if [ -d "$RESOURCES_DIR/node_modules" ]; then
    find "$RESOURCES_DIR/node_modules" -name '*.node' -type f -print0 | while IFS= read -r -d '' binary; do
      codesign --force --options runtime --timestamp --sign "$APP_SIGN_IDENTITY" "$binary" || true
    done
  fi
  codesign --force --deep --options runtime --timestamp --sign "$APP_SIGN_IDENTITY" "$APP_BUNDLE"
  codesign --verify --verbose "$APP_BUNDLE"
else
  log "Skipping app signing"
fi

PACKAGE_ROOT="$REPO_ROOT/build-temp/package-root"
SCRIPTS_DIR="$REPO_ROOT/build-temp/scripts"
mkdir -p "$PACKAGE_ROOT/Applications"
mkdir -p "$PACKAGE_ROOT/Library/Application Support/Avid/PanelSDKPlugins"
mkdir -p "$SCRIPTS_DIR"

cp -R "$APP_BUNDLE" "$PACKAGE_ROOT/Applications/"
cp "$AVPI_FILE" "$PACKAGE_ROOT/Library/Application Support/Avid/PanelSDKPlugins/"

cat > "$SCRIPTS_DIR/preinstall" <<'PREINSTALL'
#!/bin/bash
set -e

LABEL="com.mcdiva.mark.helper"

for user_home in /Users/*; do
  [ -d "$user_home" ] || continue
  [ "$user_home" != "/Users/Shared" ] || continue
  username="$(basename "$user_home")"
  plist="$user_home/Library/LaunchAgents/$LABEL.plist"
  if [ -f "$plist" ]; then
    sudo -u "$username" launchctl unload "$plist" 2>/dev/null || true
    rm -f "$plist"
  fi
done

rm -rf "/Applications/Mark-Helper.app"
mkdir -p "/Library/Application Support/Avid/PanelSDKPlugins"
find "/Library/Application Support/Avid/PanelSDKPlugins" -maxdepth 1 -type f \( -iname 'mark*.avpi' -o -iname '*mark-avid-panel*.avpi' \) -delete 2>/dev/null || true

exit 0
PREINSTALL

cat > "$SCRIPTS_DIR/postinstall" <<'POSTINSTALL'
#!/bin/bash
set -e

LABEL="com.mcdiva.mark.helper"
CONSOLE_USER="$(stat -f "%Su" /dev/console)"
USER_HOME="$(eval echo "~$CONSOLE_USER")"
USER_ID="$(id -u "$CONSOLE_USER")"
LAUNCH_AGENT_DIR="$USER_HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENT_DIR/$LABEL.plist"
LOG_DIR="$USER_HOME/.mark-logs"

mkdir -p "$LAUNCH_AGENT_DIR" "$LOG_DIR"

cat > "$PLIST_FILE" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Applications/Mark-Helper.app/Contents/MacOS/mark-helper</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/helper.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/helper-error.log</string>
  <key>WorkingDirectory</key>
  <string>/Applications/Mark-Helper.app/Contents/Resources</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
PLIST

chown "$CONSOLE_USER:staff" "$PLIST_FILE" "$ENV_FILE"
chmod 644 "$PLIST_FILE"
chmod 600 "$ENV_FILE"
chown -R "$CONSOLE_USER:staff" "$LOG_DIR"

launchctl bootout "gui/$USER_ID/$LABEL" 2>/dev/null || true
launchctl asuser "$USER_ID" launchctl load "$PLIST_FILE" 2>/dev/null || true
launchctl asuser "$USER_ID" launchctl start "$LABEL" 2>/dev/null || true

exit 0
POSTINSTALL

chmod +x "$SCRIPTS_DIR/preinstall" "$SCRIPTS_DIR/postinstall"

log "Building component packages"
pkgbuild \
  --root "$PACKAGE_ROOT/Library" \
  --identifier "$PKG_PREFIX.avpi" \
  --version "$VERSION" \
  --install-location "/Library" \
  --ownership preserve \
  "build-temp/avpi-component.pkg"

pkgbuild \
  --root "$PACKAGE_ROOT/Applications" \
  --scripts "$SCRIPTS_DIR" \
  --identifier "$PKG_PREFIX.helper" \
  --version "$VERSION" \
  --install-location "/Applications" \
  --ownership preserve \
  "build-temp/helper-component.pkg"

cat > "build-temp/distribution.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
  <title>Mark Installer</title>
  <organization>$PKG_PREFIX</organization>
  <domains enable_localSystem="true"/>
  <options customize="never" require-scripts="true" hostArchitectures="x86_64,arm64"/>
  <welcome file="welcome.html"/>
  <pkg-ref id="$PKG_PREFIX.avpi"/>
  <pkg-ref id="$PKG_PREFIX.helper"/>
  <choices-outline>
    <line choice="default">
      <line choice="$PKG_PREFIX.avpi"/>
      <line choice="$PKG_PREFIX.helper"/>
    </line>
  </choices-outline>
  <choice id="default"/>
  <choice id="$PKG_PREFIX.avpi" visible="false">
    <pkg-ref id="$PKG_PREFIX.avpi"/>
  </choice>
  <choice id="$PKG_PREFIX.helper" visible="false">
    <pkg-ref id="$PKG_PREFIX.helper"/>
  </choice>
  <pkg-ref id="$PKG_PREFIX.avpi" version="$VERSION" auth="root">build-temp/avpi-component.pkg</pkg-ref>
  <pkg-ref id="$PKG_PREFIX.helper" version="$VERSION" auth="root">build-temp/helper-component.pkg</pkg-ref>
</installer-gui-script>
XML

cat > "build-temp/welcome.html" <<'HTML'
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; line-height: 1.5; color: #24272c; }
    h1 { font-size: 22px; margin: 0 0 16px; }
    .box { border: 1px solid #d8dde5; border-radius: 6px; padding: 14px; background: #f7f9fc; }
    code { background: #eef1f5; padding: 1px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Mark for Avid Media Composer</h1>
  <p>This installer adds the Mark AVPI panel and the local Mark helper service.</p>
  <div class="box">
    <p>The helper needs Node.js and a bundled helper <code>.env</code> file containing <code>TWELVELABS_API_KEY</code> before real analysis jobs can run.</p>
    <p>The panel appears under the Media Composer Tools menu after Media Composer is restarted.</p>
  </div>
</body>
</html>
HTML

UNSIGNED_PKG="build-temp/$PACKAGE_NAME-v$VERSION-unsigned.pkg"
SIGNED_PKG="signed-release/$PACKAGE_NAME-v$VERSION.pkg"

log "Building product package"
productbuild \
  --distribution "build-temp/distribution.xml" \
  --package-path "build-temp" \
  --resources "build-temp" \
  --version "$VERSION" \
  "$UNSIGNED_PKG"

if [ "$SKIP_SIGN" -eq 0 ]; then
  log "Signing installer package"
  productsign --sign "$PKG_SIGN_IDENTITY" "$UNSIGNED_PKG" "$SIGNED_PKG"
  pkgutil --check-signature "$SIGNED_PKG"
  log "Created signed package: $SIGNED_PKG"
else
  cp "$UNSIGNED_PKG" "signed-release/$PACKAGE_NAME-v$VERSION-unsigned.pkg"
  log "Created unsigned package: signed-release/$PACKAGE_NAME-v$VERSION-unsigned.pkg"
fi

log "Next: scripts/notarize-package.sh signed-release/$PACKAGE_NAME-v$VERSION.pkg"
