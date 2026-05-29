---
stoplight-id: tsybntzayh482
---



# Drag-n-Drop Mimetypes
### Handle drag and drop of clips from Media Composer to plugin panel
Sequences and clips dragged from Media Composer will have the MIME type 
`text/x.avid.mc-api-asset-list+json`. Data associated with this MIME type contains various pieces of information about the clips and sequences, including their id, head, in/out mark position, system ID, system type, and the type of the dragged item. The following sample code parses the MIME data: 
```js
const MCAPI_ASSETLIST_MIME_TYPE = 'text/x.avid.mc-api-asset-list+json';

function doDrop() {
    event.preventDefault();
    for (const item of event.dataTransfer.items) {
        if (item.type === MCAPI_ASSETLIST_MIME_TYPE) {
            let mimeData = event.dataTransfer.getData(MCAPI_ASSETLIST_MIME_TYPE)
            let dragList = JSON.parse(mimeData)

            dragList.forEach(element => {
                const id = element["id"];
                const head = element["head"];
                const inMark = element["in"];
                const outMark = element["out"];
                const systemID = element["systemID"];
                const systemType = element["systemType"];
                const type = element["type"];

                // displayText functions 
                console.log("id", id);
                console.log("head", head);
                console.log("in", inMark);
                console.log("out", outMark);
                console.log("systemID", systemID);
                console.log("systemType", systemType);
                console.log("type", type);
            });

        }
    }
};

```

### Drag plugin's customized items from the panel to Media Composer
To drag an object from the panel to Media Composer:
1. Implement drag and drop interaction:
- On your webpage, use Javascript to implement drag-and-drop functionality. This allows users to initiate a drag and drop operation to transfer a Javascript object to Media Composer. 
2. Serialize the Javascript object: 
- Serialize the Javascript object, which includes the access token and plugins' customized data, into JSON format. 
- Use `text/x.avid.panel-sdk-plugin-asset-list+json` MIME type to indicate that the object being dragged is a customized object from the plugin. 

```js
var draggableObject = document.getElementById('draggable');
draggableObject.addEventListener('dragstart', function (event) {
    // Set the custom JSON data for the dragged object
    var data = {
        accessToken: mcapi.getAccessToken(), // required by MC
        eventData: { // optional, eventData will be included in the notification coming back from MC
            action: 'custom',
            param1: 'abc',
            param2: 123
        }
    };
    event.dataTransfer.setData('text/x.avid.panel-sdk-plugin-asset-list+json', JSON.stringify(data));

});
```
3. Connect to drag-and-drop notification: 
- Media Composer should send a notification back to the plugin after processing the dropped data. 
- In the plugin, establish connection event handlers to listen for specific events, such as 'DropFromPluginToBin', 'DropFromPluginToComposer', and 'DropFromPluginToTimeline'.
```js
mcapi.onEvent.connect(function (eventName, eventData) {
    if (eventName === 'DropFromPluginToBin') {
        const data = JSON.parse(eventData);
        onDropFromPluginToBin(data);
    } else if (eventName === 'DropFromPluginToComposer') {
        const data = JSON.parse(eventData);
        onDropFromPluginToComposer(data);
    } else if (eventName === 'DropFromPluginToTimeline') {
        const data = JSON.parse(eventData);
        onDropFromPluginToTimeline(data);
    }
});
```
- Handle these events in the plugin's code according to their respective content and purposes. 
```js
const onDropFromPluginToBin = function (eventData) {
    for (let key in eventData) {
        console.log(key, eventData[key]);
    }
};
```
