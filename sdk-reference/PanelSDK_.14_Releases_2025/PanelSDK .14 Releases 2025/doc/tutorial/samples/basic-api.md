---
stoplight-id: ydii4tlpaguke
---

# The Basic API 

## Introduction 

The Basic API sample is “self-contained”, which means you don’t have to create a server to provide the contents for the web page.

## Steps

1. To build the plugin, cd to `PanelSDK/samples/basic-api`. Run the following commands:

```
$ npm ci
$ npm run package
```

1. Copy the avpi file inside `PanelSDK/samples/basic-api/dist/avpi` to %ProgramData%\Avid\PanelSDKPlugins` (for Mac, place the `avpi` file in /Library/Application Support/Avid/PanelSDKPlugins`)

1. Kill avid-api-gateway process using Task Manager or Activity Monitor. 
1. Relaunch Media Composer.
> NOTE: Instead of restarting Media Composer, you can open the Console Command window in Media Composer (or press Ctrl + 6) and enter `panelsdk reinit`. All plugins will be reloaded without restarting Media Composer. 

4. Go to the Tools menu and open `Avid Media Composer API Sample`
