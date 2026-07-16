# Mark

Mark is an Avid Media Composer Panel SDK plugin prototype that exports a dragged
clip proxy, sends it to TwelveLabs Pegasus 1.5 for time-based marker proposals,
and writes approved markers back to Avid.

This repo intentionally pins the panel to the Media Composer 2025.6-compatible
Panel SDK Drop 13 files in `sdk-reference/PanelSDK_.13_Releases_2025`.

## Layout

- `panel/` - Avid panel web app and `.avpi` packaging scripts.
- `premiere/` - Adobe Premiere Pro UXP panel source for the Mark Premiere host.
- `helper-service/` - Mark bridge service with filesystem and host access.
- `cloud-service/` - Hosted service for Supabase auth, Stripe credit packs, and metered TwelveLabs analysis.
- `shared/analysis/` - Shared TwelveLabs prompt/result normalization used by hosted analysis.
- `sdk-reference/` - Avid Panel SDK reference drops.

## Requirements

- Media Composer 2025.6.
- Node.js 18 or newer for local development of the helper service.
- A small H.264 export preset in Media Composer. The panel defaults to
  `Mark 12Labs Proxy`, but can use any installed export setting selected in
  the panel.
- A Mark account for hosted analysis and credit packs.

## Run Locally

Start the helper:

```sh
cd helper-service
npm install
npm start
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

Build the Premiere Pro UXP development bundle:

```sh
scripts/build-premiere-uxp.sh
```

Load `build-temp/premiere-uxp/mark-premiere` with Adobe's UXP Developer Tool.
The Premiere target reuses the Mark panel HTML/CSS and talks to the shared
helper at `http://localhost:4500`. In Premiere Pro 25.6 or newer, open a
project, select local source media in the Project panel or selected timeline
clips, then click `Use Selection` in Mark. Mark sends direct local media paths
or attached proxy paths to the helper and shows marker proposals in the shared
review UI. Project panel selections apply reviewed markers back to the source
ProjectItem; timeline selections apply reviewed markers to the active sequence
at the selected clip's sequence position.

If direct media is not usable, Mark Premiere v1 can export the active sequence
through Premiere UXP `EncoderManager`. Set an Adobe Media Encoder `.epr` proxy
preset path in Mark settings, then click `Export Active Sequence`. The export is
written into the helper export directory and the reviewed markers are applied to
the active sequence.

Premiere parity gaps in v1:

- Subclip proposal review can run through the helper, but Premiere subclip
  creation is disabled until a clean UXP equivalent is selected and smoke
  tested.
- Active-sequence proxy export requires a user-provided `.epr` preset path.
- Premiere verification must be manual in Premiere Pro 25.6+ via UXP Developer
  Tool; Avid AVPI rebuilds do not prove the Premiere plugin.

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
For dev-stage packages, the helper can read override values from the bundled
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

- `TWELVELABS_API_KEY` - Optional dev-only key for direct local TwelveLabs analysis when cloud analysis is disabled.
- `MARK_HELPER_PORT` - Helper port, default `4500`.
- `MARK_EXPORT_SETTING` - Avid export preset name, default `Mark 12Labs Proxy`.
- `MARK_EXPORT_DIR` - Local export directory, default OS temp `mark-exports`.
- `MARK_CLEANUP_EXPORTS` - Delete Mark proxy exports after analysis, default `true`. Set to `0` to keep them for debugging.
- `MARK_MAX_UPLOAD_BYTES` - Direct upload limit, default `209715200`.
- `TWELVELABS_API_BASE_URL` - Default `https://api.twelvelabs.io/v1.3`.
- `MARK_CLOUD_URL` - Hosted Mark API URL. Defaults to `https://mark-cloud-api.onrender.com`.
- `MARK_CLOUD_ANALYSIS_ENABLED` - Force cloud analysis on/off. Defaults to enabled.
- `MARK_SESSION_PATH` - Local path for the Mark session token, default OS app support/config location.
- `MARK_OPEN_BROWSER` - Open sign-in and checkout URLs from the helper, default `true` outside tests.

Cloud service environment variables:

- `SUPABASE_URL` and `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase access.
- `SUPABASE_PUBLISHABLE_KEY` - Browser account/device sign-in page key.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` - Checkout and webhook verification.
- `MARK_CLOUD_APP_URL` - Public cloud API URL, such as `https://mark-cloud-api.onrender.com`.
- `MARK_WEB_APP_URL` - Trusted customer web app origin used for device sign-in and Stripe return URLs.
- `MARK_CORS_ORIGINS` - Optional comma- or newline-separated additional customer web origins.
- `MARK_CREDIT_PACKS` - JSON array of `{ "id", "label", "minutes", "amountCents", "currency", "stripePriceId" }` credit packs.
- `MARK_SESSION_SECRET` - HMAC secret for Mark helper sessions.
- `TWELVELABS_API_KEY` - Required by the hosted service for production analysis.

## Verification

```sh
cd helper-service && npm test
cd cloud-service && npm test
cd panel && npm run build
node --test panel/test/*.test.mjs
scripts/check-helper-service.sh
```
