# Mark

Mark is an Avid Media Composer Panel SDK plugin prototype that exports a dragged
clip proxy, sends it to TwelveLabs Pegasus 1.5 for time-based marker proposals,
and writes approved markers back to Avid.

This repo intentionally pins the panel to the Media Composer 2025.6-compatible
Panel SDK Drop 13 files in `sdk-reference/PanelSDK_.13_Releases_2025`.

## Layout

- `panel/` - Avid panel web app and `.avpi` packaging scripts.
- `helper-service/` - Local service with filesystem access and the TwelveLabs API key.
- `sdk-reference/` - Avid Panel SDK reference drops.

## Requirements

- Media Composer 2025.6.
- Node.js 18 or newer for the helper service.
- A small H.264 export preset in Media Composer. The panel defaults to
  `Mark 12Labs Proxy`, but can use any installed export setting selected in
  the panel.
- `TWELVELABS_API_KEY` set in the helper service environment.

## Run Locally

Start the helper:

```sh
cd helper-service
npm install
TWELVELABS_API_KEY=... npm start
```

Build and package the panel:

```sh
cd panel
npm install
npm run package
```

Install the generated plugin:

```sh
cp panel/dist/avpi/*.avpi "/Library/Application Support/Avid/PanelSDKPlugins/"
```

Relaunch Media Composer, open `Tools > Mark`, drag one source clip into the drop
zone, choose a lightweight export setting if Mark asks, enter a marker
instruction, analyze, review the proposed markers, and apply.

## Dev Rebuild Practice

The mcDIVA-style one-command local refresh is:

```sh
scripts/install-dev-avpi-and-helper.sh /Users/admin/Github/mark
```

Useful variants:

```sh
scripts/install-dev-avpi-and-helper.sh /Users/admin/Github/mark --skip-helper
scripts/install-dev-avpi-and-helper.sh /Users/admin/Github/mark --skip-build --foreground
scripts/install-dev-avpi-and-helper.sh /Users/admin/Github/mark --dry-run
```

This builds and installs the AVPI, stops the packaged helper LaunchAgent
`com.mcdiva.mark.helper`, clears port `4500`, starts the dev helper, and checks
`http://localhost:4500/health`.

## Production Release Practice

Build a signed production installer:

```sh
scripts/create-production-signed-package.sh 0.1.0
```

For an unsigned packaging smoke test:

```sh
scripts/create-production-signed-package.sh 0.1.0 --skip-sign
```

Then notarize and zip:

```sh
scripts/notarize-package.sh signed-release/Mark-Production-v0.1.0.pkg
```

The installer places the AVPI in Avid's Panel SDK folder and installs
`/Applications/Mark-Helper.app` with LaunchAgent `com.mcdiva.mark.helper`.
For dev-stage packages, the helper reads `TWELVELABS_API_KEY` from the bundled
`/Applications/Mark-Helper.app/Contents/Resources/.env` file.

## Distribution

After notarization creates `signed-release/Mark-Production-vX.Y.Z.pkg.zip`, dry
run distribution first:

```sh
scripts/distribute-mark-zip.sh --dry-run
```

Live copy to the verified editor Desktop SMB targets:

```sh
MARK_DISTRIBUTE_PASSWORD='...' scripts/distribute-mark-zip.sh --execute
```

## Configuration

Helper environment variables:

- `TWELVELABS_API_KEY` - Required TwelveLabs API key.
- `MARK_HELPER_PORT` - Helper port, default `4500`.
- `MARK_EXPORT_SETTING` - Avid export preset name, default `Mark 12Labs Proxy`.
- `MARK_EXPORT_DIR` - Local export directory, default OS temp `mark-exports`.
- `MARK_CLEANUP_EXPORTS` - Delete Mark proxy exports after analysis, default `true`. Set to `0` to keep them for debugging.
- `MARK_MAX_UPLOAD_BYTES` - Direct upload limit, default `209715200`.
- `TWELVELABS_API_BASE_URL` - Default `https://api.twelvelabs.io/v1.3`.

## Verification

```sh
cd helper-service && npm test
cd panel && npm run build
scripts/check-helper-service.sh
```
