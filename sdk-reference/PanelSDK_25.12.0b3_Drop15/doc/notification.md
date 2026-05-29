

# Notification
As certain events occurs, Media Composer will send notifications which can be hooked 
up to javascript event handlers, allowing the plugin to react to important events. 
Please check out the "samples/notification" for a sample implementation of event handlers.
For a full list of supported notifications, please check out [here](#list-of-notifications). 

## How to register event handling
Each panel web page provides a global variable called "mcapi". The variable contains 
objects which you can use to communicate with Media Composer. To register 
your event handler, call connect() on mcapi.onEvent and provide your handler function.

The handler function takes two parameters: 
- eventName: the name of the event
- eventData: a string represetation of an JSON object to describe the detail of the event



```
mcapi.onEvent.connect(function (eventName, eventData) {
    if (eventName === "ProjectClosed")
        onProjectClosed(); 
});
```


Click [here](#list-of-notifications) for the full list of notifications.  


## Sample Code
```

function onProjectClosed() {
    addTextNode("The project was closed");
}

function onProjectOpened() {
    addTextNode("The project was opened");
}

function onSampleEvent(a, b, c) {
    addTextNode(`Sample Event: a: ${a}, b: ${b}, c: ${c} `);
}

function onBinRowSelectionChanged(path) {
    addTextNode(`Bin selection changed in: ${path}`);
}

function onMobAdded(mobId) {
    addTextNode("New media was added into bin, MobID: ${mobId}");
}

function onMobDeleted(mobId) {
    console.log(`An media was removed from bin, MobID: ${mobId}`);
}

function onPlayPositionChanged(mobId, viewerType, viewerList) {
    addTextNode(`Timeline position changed, MobID: ${mobId}, Viewer: ${viewerType}, Viewer list: ${viewerList}`);
}

function onAboutToPlay(mobID, pos, viewerType, startSpeed) {
    addTextNode(`About to start playback: Viewer: ${viewerType}, \t MobID: ${mobID}, \t Start Position: ${pos}, \t At speed: ${startSpeed}`);
}

function onDonePlaying(mobID, pos, viewerType) {
    addTextNode(`Done Playing: Viewer: ${viewerType}, MobID: ${mobID}, End Position: ${pos} `);
}

function onMobLoadedInViewer(mobId, viewerType, viewerList) {
    addTextNode(`Mob loaded in viewer, MobID: ${mobId}, Viewer: ${viewerType}, Viewer list: ${viewerList}`);
}

function registerNotifications() {
    mcapi.onEvent.connect(function (eventName, eventData) {
        switch (eventName) {
            case "ProjectClosed":
                onProjectClosed();
                break;
            case "ProjectOpened":
                onProjectOpened();
                break;
            case "SampleEvent":
                const {a, b, c} = JSON.parse(eventData);
                onSampleEvent(a, b, c);
                break;
            case "BinRowSelectionChanged":
                {
                    const jsonData = JSON.parse(eventData);
                    onBinRowSelectionChanged(jsonData.binAbsolutePath);
                }
                break;
			case "MobAdded":
                {
                    const jsonData = JSON.parse(eventData);
                    onMobAdded(jsonData.mobId);
                }
				break;
			case "MobDeleted":
                {
                    const jsonData = JSON.parse(eventData);
                    onMobDeleted(jsonData.mobId);
                }
				break;
			case "PlayPositionChangeEvent":
                {
                    const jsonData = JSON.parse(eventData);
                    onPlayPositionChanged(jsonData.mobId, jsonData.pos, jsonData.viewerType);
                }
                break;
            case "AboutToPlayEvent":
                {
                    const jsonData = JSON.parse(eventData);
                    onAboutToPlay(jsonData.mobId, jsonData.pos, jsonData.viewerType, jsonData.startSpeed);
                }
                break;
            case "DonePlayingEvent":
                {
                    const jsonData = JSON.parse(eventData);
                    onDonePlaying(jsonData.mobId, jsonData.pos, jsonData.viewerType);
                }
                break; 
            case "MobLoadedInViewer":
                {
                    const jsonData = JSON.parse(eventData);
                    onMobLoadedInViewer(jsonData.mobId, jsonData.viewerType, jsonData.viewerList);
                }
                break;
            default:
                break;
        }
    });
}

window.addEventListener('load', registerNotifications);
```

## List of notifications

<table>
    <tr>
        <td>Name</td>
        <td>Data</td>
        <td>When</td>
        <td>Remarks</td>
    </tr>
    <tr>
        <td>ProjectOpened</td>
        <td>{}</td>
        <td>Project was opened.</td>
    </tr>
    <tr>
        <td>ProjectClosed</td>
        <td>{}</td>
        <td>Current project is closed</td>
        <td>No MCAPI method can be called in the project close event handler</td>
    </tr>
        <tr>
        <td>BinRowSelectionChanged</td>
        <td>

```json
{
    "binAbsolutePath": "text data"
}
```
<br>
        </td>
        <td>Bin row selection change.</td>
        <td></td>
    </tr>
    <tr>
        <td>BinRowSelectionChanged</td>
        <td>

```json
{
    "binAbsolutePath": "text data"
}
```
<br>
        </td>
        <td>Bin row selection change.</td>
        <td></td>
    </tr>
    <tr>
        <td>MobAdded</td>
        <td>

```json
{
	"mobId": "mob ID string"
}
```
<br>
        </td>
        <td>New media was added into bin</td>
    </tr>
    <tr>
        <td>MobDeleted</td>
        <td>

```json
{
	"mobId": "mob ID string"
}
```
<br>
        </td>
        <td>New media was removed from bin</td>
    </tr>
    <tr>
        <td>DropFromPluginToBin</td>
        <td>

```json
{
    "binName" : "some bin  name",
	"eventData": "{"a": "value A", "b": "value B"}}"
}
```
<br>
        </td>
        <td>User drag and drop an object from the Panel to a Bin window. Media Composer will fire this notification to acknowledge that it received the drop. The notification includes the bin name and the eventData which is an optional data inserted by the plugin when initializing the drag event object.
        </td>
    </tr><tr>
        <td>DropFromPluginToComposer</td>
        <td>

```json
{
    eventData: {
        "action":"custom",
        "param1":"abc",
        "param2":123
    },
    viewerType: sourcemon
}

```
<br>
        </td>
        <td>User drag and drop an object from the Panel to the Composer window. Media Composer will fire this notification to acknowledge that it received the drop. The notification includes the viewer type and the eventData which is an optional data inserted by the plugin when initializing the drag event object.
        </td>
    </tr><tr>
        <td>DropFromPluginToTimeline</td>
        <td>

```json
{
    eventData: {
        "action":"custom",
        "param1":"abc",
        "param2":123
    }
}

```
<br>
        </td>
        <td>User drag and drop an object from the Panel to the Timeline window. Media Composer will fire this notification to acknowledge that it received the drop. The notification includes the eventData which is an optional data inserted by the plugin when initializing the drag event object.
        </td>
    </tr>
    <tr>
        <td>PlayPositionChange</td>
        <td>

```json
{
    "mobId" : "mob ID string",
    "pos": "the new play position",
	"viewerType": "viewer type string"
}
```
<br>
        </td>
        <td>Mob play postition was changed.
        </td>
    </tr>
    <tr>
        <td>AboutToPlay</td>
        <td>

```json
{
    "mobId" : "mob ID string",
    "pos": "start position",
	"viewerType": "viewer type string",
    "startSpeed": "speed of playback"
}
```
<br>
        </td>
        <td>About to Start Playback.
        </td>
    </tr>
    <tr>
        <td>DonePlaying</td>
        <td>

```json
{
    "mobId" : "mob ID string",
    "pos": "the playback end position",
	"viewerType": "viewer type string"
}
```
<br>
        </td>
        <td>Player stopped playing.
        </td>
    </tr>
    <tr>
        <td>MobLoadedInViewer</td>
        <td>

```json
{
    "mobId" : "mob ID string",
	"viewerType": "viewer type string",
    "viewerList": "all viewer type string list"
}
```
<br>
        </td>
        <td>Mob was loaded to viewer.
        </td>
    </tr>
    <tr>
        <td>ActiveMonitorChanged</td>
        <td>

```json
{
    "mobId" : "mob ID string",
    "pos": "current position",
	"viewerType": "viewer type string"
}
```
<br>
        </td>
        <td>The active monitor has changed.</td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>SampleEvent</td>
        <td>

```json
{
    "a": 3,
    "b": true,
    "c": "text data"
}
```
<br>
        </td>
        <td>This row is a template. Modify it when we have a "real event</td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
</table>
