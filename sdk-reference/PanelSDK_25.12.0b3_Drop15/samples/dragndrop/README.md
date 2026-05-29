## Requirements: 
- nodejs v14 or above

&nbsp;
## Build the bundle
1. cd to this directory
2. run 
```
    $npm ci
    $npm run build
```
All contents will be placed insid the dist/app directory 


&nbsp;

## Pack the bundle into a .avpi file
```
    $npm run package
```
The .avpi file will be placed inside dist/avpi directory

&nbsp;

## Install the plugin
Consult the documentation. 

&nbsp;

## Start the server 
cd to dist/app/src

Run this command to start a server which listens to port 3006. Note that 
localhost:3006 is specified in the avid-manifest.json file.
```
    $python3 -m http.server 3006
```

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
