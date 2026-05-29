
const MCAPI_ASSETLIST_MIME_TYPE = 'text/x.avid.mc-api-asset-list+json';
const AVID_ASSETLIST_MIME_TYPE = "text/x.avid.asset-list-extended+json";


function createAnchor(fileURL)
{
    const droppedFilesList = document.getElementById('dropped-files');

    const anchorTag = document.createElement('a');
    anchorTag.href = fileURL;
    anchorTag.textContent = fileURL;
    droppedFilesList.appendChild(anchorTag);

    anchorTag.draggable = true;
    anchorTag.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/uri-list', fileURL);
        event.dataTransfer.setData('text', fileURL);
    });
}

let registerDragAndDropEvents = function () {
    let dropArea = document.querySelector("#drop-area");
    dropArea.ondragenter = doDragEnter;
    dropArea.ondragover = doDragOver;
    dropArea.ondrop = doDrop;


    const droppedFilesList = document.getElementById('dropped-files');
    const dropzone = document.getElementById('dropzone');

    dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
    });
    dropzone.addEventListener('drop', (event) => {
        event.preventDefault();

        droppedFilesList.innerHTML ='';
        var urilistdata = event.dataTransfer.getData('text/uri-list');
        createAnchor(urilistdata);

    });

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
};

let doDragOver = function () {
    event.preventDefault();
    // console.log(event.dataTransfer);
};

let doDragEnter = function () {
    event.preventDefault();
    var files = event.dataTransfer.files;
    for (var i = 0, f; f = files[i]; i++) {
        console.log('f: ', f);
    }
};


let displayText = function (key, value) {
    let droppedContent = document.querySelector("#dropped-content");
    let text = `${key}: ${value}`
    let node = document.createTextNode(text);
    droppedContent.appendChild(node);
    droppedContent.appendChild(document.createElement("br"))

}

let doDrop = function () {
    event.preventDefault();
    let droppedContent = document.querySelector("#dropped-content");
    droppedContent.innerHTML = "";

    for (const item of event.dataTransfer.items) {
        if (item.type === MCAPI_ASSETLIST_MIME_TYPE) {
            let mimeData = event.dataTransfer.getData(MCAPI_ASSETLIST_MIME_TYPE)
            let dragList = JSON.parse(mimeData)

            dragList.forEach(element => {
                let id = element["id"];
                let head = element["head"];
                let inMark = element["in"];
                let outMark = element["out"];
                let systemID = element["systemID"];
                let systemType = element["systemType"];
                let type = element["type"];

                displayText("id", id)
                displayText("head", head)
                displayText("in", inMark)
                displayText("out", outMark)
                displayText("systemID", systemID)
                displayText("systemType", systemType)
                displayText("type", type)

                droppedContent.appendChild(document.createElement("br"))
                droppedContent.appendChild(document.createElement("br"))
            });

        } 
    }

};

function addTextNode(key, value) {
    let droppedContent = document.querySelector("#drop-data-display");
    let text = `${key}: ${value}`
    let node = document.createTextNode(text);
    droppedContent.appendChild(node);
    droppedContent.appendChild(document.createElement("br"))
}


function displayEventData(eventData){
    let divElement = document.querySelector("#drop-data-display");
    divElement.innerHTML = '';
    // Loop through the object and create text nodes for key-value pairs
    for (let key in eventData) {
        const keyValueText = document.createTextNode(key + ": " + eventData[key]);
        divElement.appendChild(keyValueText);
        divElement.appendChild(document.createElement("br"));
    }
    divElement.appendChild(document.createElement("br"));
    divElement.appendChild(document.createElement("br")); 
}

const onDropFromPluginToBin = function (eventData) {
    displayEventData(eventData);
};

const onDropFromPluginToComposer = function (eventData) {
    displayEventData(eventData);
};

const onDropFromPluginToTimeline = function (eventData) {
    displayEventData(eventData);
};

document.addEventListener('DOMContentLoaded', registerDragAndDropEvents);