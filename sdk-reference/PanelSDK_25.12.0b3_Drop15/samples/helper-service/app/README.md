This is the web application which the plugin directly connects to. It enables
users to export to EDL, then upload the EDL to a remote server. The application
runs at port 3006 as specified in the plugin's manifest.

## Build the application

```
npm ci
npm run build
```

Run the server
First cd to ./dist/app/src

```
cd ./dist/app/src
```

Then start a server at port 3006.

```
python3 -m http.server 3006
```

NOTE we start the server at port 3006 as specified in the plugin's manifest file.

## How to use

To export to EDL, drag a sequence from the bin to the pink box.

To upload the exported EDL, click the Upload button.

Under the hood, this application does not
make a request for upload directly to the remote server. Instead, it makes a request
to a helper server, then the helper server will handle the upload. (For more detail about the helper server, please see helper-server note).
