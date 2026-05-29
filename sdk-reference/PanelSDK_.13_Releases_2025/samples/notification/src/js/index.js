

function addTextNode(text) {
    const newtext = document.createTextNode(text);
    let display = document.querySelector("#event-display");

    display.appendChild(newtext);
    display.appendChild(document.createElement("br"));
}

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
    addTextNode(`An media was removed from bin, MobID: ${mobId}`);
}

function onPlayPositionChanged(mobId, pos, viewerType, viewerList) {
    addTextNode(`Timeline position changed, MobID: ${mobId}, Pos: ${pos} Viewer: ${viewerType}, Viewer list: ${viewerList}`);
}

function onMobLoadedInViewer(mobId, viewerType, viewerList) {
    addTextNode(`Mob loaded in viewer, MobID: ${mobId}, Viewer: ${viewerType}, Viewer list: ${viewerList}`);
}

function onBinOpened(path) {
    addTextNode(`Bin/Script opened: ${path}`);
}

function onBinClosed(path) {
    addTextNode(`Bin/Script closed: ${path}`);
}

function onExportFileFinished(exportPath, errorString, errorCode, taskId) {
    addTextNode(`Export file finished, export task id: ${taskId}`);
    addTextNode(`Path to a local file or subfolder containing mulitiple files: ${exportPath}, Error message: ${errorString}, Error code: ${errorCode}`);
}

function onImportFileFinished(mobId, errorString, errorCode, taskId) {
    addTextNode(`Import file finished, import task id: ${taskId}`);
    addTextNode(`Mob ID: ${mobId}, Error message: ${errorString}, Error code: ${errorCode}`);
}

function onImportFileStarted(taskId) {
    addTextNode(`Import file started, import task id: ${taskId}`);
}

function onExportFileStarted(taskId) {
    addTextNode(`Export file started, export task id: ${taskId}`);
    
function onDoCommandFinished(taskId, handled) {
    addTextNode(`Do command finished, task id: ${taskId}, Handled: ${handled}`);
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
                const { a, b, c } = JSON.parse(eventData);
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
                    onPlayPositionChanged(jsonData.mobId, jsonData.pos, jsonData.viewerType, jsonData.viewerList);
                }
                break;
            case "MobLoadedInViewer":
                {
                    const jsonData = JSON.parse(eventData);
                    onMobLoadedInViewer(jsonData.mobId, jsonData.viewerType, jsonData.viewerList);
                }
                break;
            case "BinOpened":
                {
                    const jsonData = JSON.parse(eventData);
                    onBinOpened(jsonData.binAbsolutePath);
                }
                break;
            case "BinClosed":
                {
                    const jsonData = JSON.parse(eventData);
                    onBinClosed(jsonData.binAbsolutePath);
                }
                break;
            case "ExportFileFinished":
                {
                    const jsonData = JSON.parse(eventData);
                    onExportFileFinished(jsonData.exportPath, jsonData.errorString, jsonData.errorCode, jsonData.taskId);
                }
                break;
            case "ImportFileFinished":
                {
                    const jsonData = JSON.parse(eventData);
                    onImportFileFinished(jsonData.mobId, jsonData.errorString, jsonData.errorCode, jsonData.taskId);
                }
                break;
            case "ImportFileStarted":
                {
                    const jsonData = JSON.parse(eventData);
                    onImportFileStarted(jsonData.taskId);
                }
                break;
            case "ExportFileStarted":
                {
                    const jsonData = JSON.parse(eventData);
                    onExportFileStarted(jsonData.taskId);
                }
                break;
            case "DoCommandFinished":
                {
                    const jsonData = JSON.parse(eventData);
                    onDoCommandFinished(jsonData.taskId, jsonData.handled);
                }
                break;

            default:
                break;
        }
    });
}

window.addEventListener('load', registerNotifications);
