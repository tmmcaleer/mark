
## MCAPI Configure SRT sample

1. Add the `grpc-web` folder inside the `src` folder.


2. On the root folder of this plugin, run the command below to create a folder `/dist` containing the file `configureSRTStream.js`
```
npm run build
```

3. Create a new folder and name it `server`. Add the `configureSRTStream.js` file, the `/src/index.html` file and the `/src/main.css` file.
```
server
└─── configureSRTStream.js
└─── index.html
└─── main.css
```

4. On the server folder start a new server using python.
```
python -m http.server 3000
```

5. Create the manifest file. Make sure to point the url to the localhost, and add it to allowed domains:
```
{
	...
	"uiItems": [
		{
			...
			"url": "http://localhost:3000"
		}
	],
	...
	"allowedDomains": [
		"localhost:3000"
	],
}
```

6. Rename the newly created zip file to `configure-srt-plugin.avpi`. Place this plugin at `/Applications/Avid Media Composer/SupportingFiles/MC Panels` or `/mc/twk_results_win/ViewLocal/x64/MC_out/Debug/SupportingFiles/MC Panels`, depending on how you are running MC.
