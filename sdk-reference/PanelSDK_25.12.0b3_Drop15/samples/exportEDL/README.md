This sample code demonstrates how to call the exportEDL API.

## Requirements: 
- nodejs v14 or above

&nbsp;

## Pack the bundle into a .avpi file
```
    $npm run package
```
The .avpi file will be placed inside dist/avpi directory

&nbsp;
## Install plugin
- On Windows, copy the output .avpi file to  "C:\ProgramData\Avid\PanelSDKPlugins"
- On Mac, copy the output file to "/Library/Application Support/Avid/PanelSDKPlugins"

&nbsp;
## Clean all generated files
 
```
    $npm run clean-all
```
&nbsp;

## Clean everything except for node_modules directory

```
    $npm run clean-dev
```

