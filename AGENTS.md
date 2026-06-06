# Agent Notes

This repository is the multi-host panel project for `Mark`, currently shipping
as an Avid Media Composer Panel SDK plugin and intended to also ship as an Adobe
Premiere Pro plugin. Mark creates marker and subclip proposals with TwelveLabs.

Treat Avid and Premiere as first-class distribution targets. When changing
shared panel UI, helper-service behavior, prompt shaping, queue/job logic,
marker output, subclip behavior, packaging metadata, release notes, or version
state, consider how the change will work on both platforms. Keep host-specific
APIs behind adapters instead of mixing Avid or Premiere calls into shared UI and
workflow code.

The Premiere target is currently a UXP scaffold. Do not claim a change has been
verified in Premiere unless a Premiere plugin build and manual Premiere smoke
test were actually run.

Whenever making changes to panel code, rebuild the AVPI and copy it to:

```sh
/Library/Application Support/Avid/PanelSDKPlugins
```

Preferred local rebuild command:

```sh
scripts/install-dev-avpi-and-helper.sh /Users/admin/Github/mark --skip-helper
```

Premiere UXP development bundle command:

```sh
scripts/build-premiere-uxp.sh
```

Load the generated `build-temp/premiere-uxp/mark-premiere` folder with Adobe's
UXP Developer Tool for Premiere Pro testing.

For a full local demo refresh, use:

```sh
scripts/install-dev-avpi-and-helper.sh /Users/admin/Github/mark
```

The helper listens on `http://localhost:4500` by default and needs
`TWELVELABS_API_KEY` in its environment for real analysis.
