

import { ImportFileRequest, ImportFileRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { GetListOfImportSettingsRequest, GetListOfImportSettingsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { GetMediaVolumeListRequest, GetMediaVolumeListRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="importFile-sample"> \
<h1>ImportFile</h1><br/>  \
File path: <input type="text" id="importFile-input"></input><br/>  \
Import setting: <select name="setting" id="select-import-setting"></select><br/>  \
Video drive <select name="video-drive" id="video-drive-select"></select><br/>   \
Audio drive: <select name="audio-drive" id="audio-drive-select"></select><br/>  \
Video Resolution: <input type="text" id="compresion-input"></input><br/>  \
Video wrapper format: <input type="text" id="video-format-input"></input><br/>  \
Audio wrapper format: <input type="text" id="audio-format-input"></input><br/>  \
Destination bin: <input type="text" id="bin-input"></input><br/>  \
<br/> \
<br/> \
</div>';

var currentImportTaskId = null;

// Populate the import Setting menu.
let populateImportSettingsMenu = function() {
    let request = new GetListOfImportSettingsRequest();
    
    let getListOfImportSettingsRequestBody = new GetListOfImportSettingsRequestBody;
    request.setBody(getListOfImportSettingsRequestBody);

    let md = {
        accessToken: mcapi.getAccessToken()
    };

    mcapiclient().getListOfImportSettings(request, md, (err, response) => {
        if (err) {
            let errorMessage = `Unexpected error: code = ${err.code}` + `, message = "${err.message}"`;
            console.log(errorMessage);
        } else {
            let warnings = response.getHeader().getWarningsList();

            for (let warning of warnings) {
                console.log(warning);
            }

            let getSettingNamesList = response.getBody().getSettingNamesList();
            let importSettingsMenu = document.getElementById("select-import-setting");
            importSettingsMenu.appendChild(document.createElement("br"));

            // add empty to handle default active setting
            let menuItem = document.createElement("option");
            menuItem.textContent = "";
            menuItem.value = "";
            importSettingsMenu.appendChild(menuItem);
     
            getSettingNamesList.forEach((settingName, index) => {
                let menuItem = document.createElement("option");
                menuItem.textContent = settingName;
                menuItem.value = settingName;

                importSettingsMenu.appendChild(menuItem);
            });
        }
    });
};


let populatedriveMenu = function(menu) {
    let request = new  GetMediaVolumeListRequest();
    
    let getMediaVolumeListRequestBody = new  GetMediaVolumeListRequestBody;
    request.setBody(getMediaVolumeListRequestBody);

    let md = {
        accessToken: mcapi.getAccessToken()
    };

    mcapiclient().getMediaVolumeList(request, md, (err, response) => {
        if (err) {
            let errorMessage = `Unexpected error: code = ${err.code}` + `, message = "${err.message}"`;
            console.log(errorMessage);
        } else {
            let warnings = response.getHeader().getWarningsList();

            for (let warning of warnings) {
                console.log(warning);
            }

            let volumeList = response.getBody().getVolumesList();
            menu.appendChild(document.createElement("br"));

            let menuItem = document.createElement("option");
            menuItem.textContent = "";
            menuItem.value = "";
            menu.appendChild(menuItem);

            volumeList.forEach((volume, index) => {
                let menuItem = document.createElement("option");
                menuItem.textContent = volume.getName();
                menuItem.value = volume.getName();

                menu.appendChild(menuItem);
            });
        }
    });
};

export var load_importFile = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = importFile_submit;

    populateImportSettingsMenu();
    populatedriveMenu(document.getElementById("video-drive-select"));
    populatedriveMenu(document.getElementById("audio-drive-select"));
}

var importFile_submit = function () {
    const inputText = document.querySelector("#importFile-input").value;
    const importSetting = document.querySelector("#select-import-setting").value;
    const videoDrive = document.querySelector("#video-drive-select").value;
    const audioDrive = document.querySelector("#audio-drive-select").value;
    const compresion = document.querySelector("#compresion-input").value;
    const videoFormat = document.querySelector("#video-format-input").value;
    const audioFormat = document.querySelector("#audio-format-input").value;
    const destBin = document.querySelector("#bin-input").value;

    let request = new ImportFileRequest();

    let importFileRequestBody = new ImportFileRequestBody;
    importFileRequestBody.setFilePath(inputText);
    importFileRequestBody.setImportSettingsName(importSetting);
    importFileRequestBody.setDestinationVideoDrive(videoDrive);
    importFileRequestBody.setDestinationAudioDrive(audioDrive);
    importFileRequestBody.setCompression(compresion);
    importFileRequestBody.setVideoWrapperFormat(videoFormat);
    importFileRequestBody.setAudioWrapperFormat(audioFormat);
    importFileRequestBody.setDestinationBin(destBin);
    request.setBody(importFileRequestBody);

    mcapiclient().importFile(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            currentImportTaskId = response.getHeader().getTaskId();
            response_container.innerHTML = "Import file start successfully.";
        }
    });

}

function registerNotifications() {
    mcapi.onEvent.connect(function (eventName, eventData) {
        switch (eventName) {
            case "ImportFileFinished":
                {
                    const jsonData = JSON.parse(eventData);

                    if (currentImportTaskId == jsonData.taskId) {
                        response_container.appendChild(document.createElement("br"));
                        response_container.appendChild(document.createTextNode(`Import file finished. Import mobId: ${jsonData.mobId}, errorString: ${jsonData.errorString}, errorCode: ${jsonData.errorCode}`));
                        currentImportTaskId = null;
                    }
                }
                break;
            default:
                break;
        }
    });
}

window.addEventListener('load', registerNotifications);
