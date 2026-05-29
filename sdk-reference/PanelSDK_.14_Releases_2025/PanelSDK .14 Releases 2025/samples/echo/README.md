This sample code demonstrates how to call the echo API. The purpose of this code is to produce a file named "echo.js",  which will be placed in the "PanelSDK/samples/sample-server". For detailed instructions, please refer to the "Basic Tutorial.pdf" located in the "PanelSDK/doc" directory.

## Requirements: 
- nodejs v14 or above


&nbsp;
## Preparation: 
- copy PanelSDK/grpc-web and place it in this folder.

&nbsp;
## Build the bundle
1. cd to this directory
2. run 
```
    $npm ci
    $npm run build
```
The commands will produce a javascript file ./dist/echo.js

&nbsp;
## Copy echo.js to sample-server
Copy the output file echo.js to PanelSDK/samples/sample-server

&nbsp;
## What's next?
For further instructions, please refer to "PanelSDK/doc/Basic Tutorial.pdf".
