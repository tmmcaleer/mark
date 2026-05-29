// Copyright 2022 by Avid Technology, Inc.

// Sample to demonstrate ExportFile API for Media Composer.

import { ExportFileRequest, ExportFileRequestBody, CommandErrorType } from '../grpc-web/MCAPI_Types_pb.js';
import { GetListOfExportSettingsRequest, GetListOfExportSettingsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { MCAPIClient } from '../grpc-web/MCAPI_grpc_web_pb.js';

var mcapiclient = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);

const MCAPI_ASSETLIST_MIME_TYPE = 'text/x.avid.mc-api-asset-list+json';

var currentExportTaskId = null;


let registerDragAndDropEvents = function () {
    let dropArea = document.querySelector("#drop-area");
    dropArea.ondragenter = doDragEnter;
    dropArea.ondragover = doDragOver;
    dropArea.ondrop = doDrop;
    populateExportSettingsMenu();
};

let doDragOver = function () {
    event.preventDefault();
};

let doDragEnter = function () {
    event.preventDefault();
};

let displayText = function (key, value) {
    let droppedContent = document.querySelector("#dropped-content");
    let text = `${key} ${value}`;
    let node = document.createTextNode(text);
    droppedContent.appendChild(node);
    droppedContent.appendChild(document.createElement("br"));
}

let exportToFile = function(mob_id, exportSettingsName, destinationPath, inDirectory, fileName) {
    let request = new ExportFileRequest();
    let exportFileRequestBody = new ExportFileRequestBody();
    exportFileRequestBody.setMobId(mob_id);
    exportFileRequestBody.setExportSettingsName(exportSettingsName);
    exportFileRequestBody.setDestinationPath(destinationPath);
    exportFileRequestBody.setInDirectory(inDirectory);
    exportFileRequestBody.setFileName(fileName);

    request.setBody(exportFileRequestBody);

    let md = {
        accessToken: mcapi.getAccessToken()
    };
    // Export to file and display path (or error message in the case of failure).
    mcapiclient.exportFile(request, md, (err, response) => {
        if (err) {

            // If message can be converted to JSON we should use ErrorType from .proto
            try {
                const jsonData = JSON.parse(err.message);

                switch (jsonData.ErrorType) {
                    case CommandErrorType.MC_EXPORTSETTINGSNOTFOUND:
                        {
                            console.log(jsonData.ErrorMessage);

                            // try handle MC_EXPORTSETTINGSNOTFOUND
                            // ...

                            let errorMessage = `Unexpected error: ErrorType = ${jsonData.ErrorType}` + `, message = "${jsonData.ErrorMessage}"`;
                            console.log(errorMessage);
                            displayText("Export error:", errorMessage);
                        }
                        break;
                        
                    default:
                        break;
                }

            } catch (error) { // if message is not JSON we should use gRPC error codes
                let errorMessage = `Unexpected error: Code = ${err.code}` + `, message = "${err.message}"`;
                console.log(errorMessage);
                displayText("Export error:", errorMessage);

                // For err.code we should use gRPC status codes https://grpc.github.io/grpc/core/md_doc_statuscodes.html

                switch (err.code) {
                    case 3: // (DATA_LOSS)
                        {
                            console.log(jsonData.ErrorMessage);

                            // try handle DATA_LOSS
                            // ...

                            let errorMessage = `Unexpected error: ErrorType = ${jsonData.ErrorType}` + `, message = "${jsonData.ErrorMessage}"`;
                            console.log(errorMessage);
                            displayText("Export error:", errorMessage);
                        }
                        break;
                        
                    default:
                        break;
                }

                // Inform Media Composer of errors as Media Composer may not receive the request at all due to some components is offline
                mcapi.reportError(err.code, err.message);
            }            
        } else {
            let droppedContent = document.querySelector("#dropped-content");

            currentExportTaskId = response.getHeader().getTaskId();
            // Display path to file.
            displayText("Export file start successfully.", "");
        }
    });
};

// Populate the export Setting menu.
let populateExportSettingsMenu = function() {
    let request = new GetListOfExportSettingsRequest();
    
    let getListOfExportSettingsRequestBody = new GetListOfExportSettingsRequestBody;
    request.setBody(getListOfExportSettingsRequestBody);

    let md = {
        accessToken: mcapi.getAccessToken()
    };

    mcapiclient.getListOfExportSettings(request, md, (err, response) => {
        if (err) {
            let errorMessage = `Unexpected error: code = ${err.code}` + `, message = "${err.message}"`;
            console.log(errorMessage);
        } else {
            let warnings = response.getHeader().getWarningsList();

            for (let warning of warnings) {
                console.log(warning);
            }

            let getSettingNamesList = response.getBody().getSettingNamesList();
            let exportSettingsMenu = document.getElementById("select-export-setting");
            exportSettingsMenu.appendChild(document.createElement("br"));

            // If the list contains any entries, add these to the export Settings menu.        
            getSettingNamesList.forEach((settingName, index) => {
                let menuItem = document.createElement("option");
                menuItem.textContent = settingName;
                menuItem.value = settingName;

                exportSettingsMenu.appendChild(menuItem);
            });
        }
    });
};

let doDrop = function () {
    event.preventDefault();
    let droppedContent = document.querySelector("#dropped-content");
    droppedContent.innerHTML = "";

    // Use the export settings selected in the dropdown menu created for this purpose.
    let exportSettingsInput = document.querySelector("#select-export-setting");
    let exportSettingsName = exportSettingsInput.value;

    let exportPathInput = document.querySelector("#input-export-path");
    let exportPath = exportPathInput.value;

    let exportFileNameInput = document.querySelector("#input-file-name");
    let exportFileName = exportFileNameInput.value;

    droppedContent.appendChild(document.createElement("br"));
    displayText("Export settings used for this: ", exportSettingsName);
    droppedContent.appendChild(document.createElement("br"));


    for (const item of event.dataTransfer.items) {
        if (item.type === MCAPI_ASSETLIST_MIME_TYPE) {
            let mimeData = event.dataTransfer.getData(MCAPI_ASSETLIST_MIME_TYPE);
            let dragList = JSON.parse(mimeData);

            dragList.forEach(element => {
                let mob_id = element["id"];
                exportToFile(mob_id, exportSettingsName, exportPath, "", exportFileName);
            });
        }
    }
};

function onExportFileFinished(exportPath, errorString, errorCode) {

    if (errorCode == CommandErrorType.NOERROR) {
        displayText("Export file finished successfully. Path: ", exportPath);
        return;
    }
    else {      
        let errorMessage = `Unexpected error: ErrorType = ${errorCode}` + `, message = "${errorString}"`;
        console.log(errorMessage);
        displayText("Export error:", errorMessage);
    }
}

function registerNotifications() {
    mcapi.onEvent.connect(function (eventName, eventData) {
        switch (eventName) {
            case "ExportFileFinished":
                {
                    const jsonData = JSON.parse(eventData);

                    if (currentExportTaskId == jsonData.taskId) {
                        onExportFileFinished(jsonData.exportPath, jsonData.errorString, jsonData.errorCode);
                        currentExportTaskId = null;
                    }
                }
                break;
            default:
                break;
        }
    });
}

document.addEventListener('DOMContentLoaded', registerDragAndDropEvents);
window.addEventListener('load', registerNotifications);
