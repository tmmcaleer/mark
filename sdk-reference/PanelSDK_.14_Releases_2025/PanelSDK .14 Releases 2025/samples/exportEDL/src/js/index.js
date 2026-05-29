// Copyright 2022 by Avid Technology, Inc.

// Sample to demonstrate ExportEDL API for Media Composer.

import { ExportEDLRequest, ExportEDLRequestBody, TrackType, TrackLabel, TrackList } from '../grpc-web/MCAPI_Types_pb.js';
import { GetListOfExportEDLSettingsRequest, GetListOfExportEDLSettingsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { MCAPIClient } from '../grpc-web/MCAPI_grpc_web_pb.js';

var mcapiclient = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);

const MCAPI_ASSETLIST_MIME_TYPE = 'text/x.avid.mc-api-asset-list+json';

const init = function () {
    let dropArea = document.querySelector("#drop-area");
    dropArea.ondragenter = doDragEnter;
    dropArea.ondragover = doDragOver;
    dropArea.ondrop = doDrop;
populateEDLSettingsMenu();
};

let doDragOver = function () {
    event.preventDefault();
};

let doDragEnter = function () {
    event.preventDefault();
};

let displayText = function (key, value) {
    let droppedContent = document.querySelector("#dropped-content");
    let text = `${key}: ${value}`;
    let node = document.createTextNode(text);
    droppedContent.appendChild(node);
    droppedContent.appendChild(document.createElement("br"));
};

let exportToEDL = function(mob_id, edlSettingsName, trackList) {
    let request = new ExportEDLRequest();
    
    let exportEDLRequestBody = new ExportEDLRequestBody;
    exportEDLRequestBody.setMobId(mob_id);
    exportEDLRequestBody.setEdlSettingsName(edlSettingsName);
    exportEDLRequestBody.setTrackList(trackList);
    request.setBody(exportEDLRequestBody);

    let md = {
        accessToken: mcapi.getAccessToken(),
    };

    // Generate EDL and display path to EDL file (or error message in the case of failure).
    mcapiclient.exportEDL(request, md, (err, response) => {
        if (err) {
            let errorMessage = `Unexpected error: code = ${err.code}` + `, message = "${err.message}"`;
            console.log(errorMessage);
            displayText("EDL path", errorMessage);
        } else {

            let warnings = response.getHeader().getWarningsList();

            for (let warning of warnings) {
                console.log(warning);
            }
            
            let droppedContent = document.querySelector("#dropped-content");

            // Display path to EDL file.
            displayText("EDL path", JSON.stringify(response.getBody().getPath()));

            // Display contents of dialogs suppressed during EDL generation, if any.
            let dlgContentsList = response.getBody().getDialogContentsList();

            // If the list contains any entries, display the contents of each suppressed dialog.
            dlgContentsList.forEach((dlgContents, index) => {
                displayText("Hidden dialog " + index, dlgContents);
            });

            // For readability, add a new line if dialog text has been displayed.
            if (dlgContentsList.length > 0) {
                droppedContent.appendChild(document.createElement("br"));
            }
        }
    });
};

// Populate the EDL Setting menu.
let populateEDLSettingsMenu = function() {
    let request = new GetListOfExportEDLSettingsRequest();
    
    let getListOfExportEDLSettingsRequestBody = new GetListOfExportEDLSettingsRequestBody;
    request.setBody(getListOfExportEDLSettingsRequestBody);

    let md = {
        accessToken: mcapi.getAccessToken()
    };
    // Request list of List Tool settings that have EDL output formats and populate the EDL Settings menu.
    mcapiclient.getListOfExportEDLSettings(request, md, (err, response) => {
        if (err) {
            let errorMessage = `Unexpected error: code = ${err.code}` + `, message = "${err.message}"`;
            console.log(errorMessage);
        } else {
            let warnings = response.getHeader().getWarningsList();

            for (let warning of warnings) {
                console.log(warning);
            }

            let getSettingNamesList = response.getBody().getSettingNamesList();
            let edlSettingsMenu = document.getElementById("select-edl-setting");
            edlSettingsMenu.appendChild(document.createElement("br"));

            // If the list contains any entries, add these to the EDL Settings menu.        
            getSettingNamesList.forEach((settingName, index) => {
                let menuItem = document.createElement("option");
                menuItem.textContent = settingName;
                menuItem.value = settingName;

                edlSettingsMenu.appendChild(menuItem);
            });
        }
    });
};

let doDrop = function () {
    event.preventDefault();
    let droppedContent = document.querySelector("#dropped-content");
    droppedContent.innerHTML = "";

    // Use the EDL settings selected in the dropdown menu created for this purpose.
    let edlSettingsMenu = document.querySelector("#select-edl-setting");
    let edlSettingsName = edlSettingsMenu.value;

    droppedContent.appendChild(document.createElement("br"));
    displayText("EDL settings used for this EDL", edlSettingsName);
    droppedContent.appendChild(document.createElement("br"));

/*  Commented out example code for creating tracks to be used in EDL generation.
    // ExportEDL only uses video, audio, and data tracks. Other types are ignored.
    let videoTrackType = TrackType.TRACKTYPE_PICTURE;
    let soundTrackType = TrackType.TRACKTYPE_SOUND;
    let dataTrackType = TrackType.TRACKTYPE_DATA;

    // Video track 1
    let trackV1 = new TrackLabel;
    trackV1.setType(videoTrackType);
    trackV1.setNumber(1);

    // Audio track 1
    let trackA1 = new TrackLabel;
    trackA1.setType(soundTrackType);
    trackA1.setNumber(1);

    // Audio track 2
    let trackA2 = new TrackLabel;
    trackA2.setType(soundTrackType);
    trackA2.setNumber(2);

    // Data track 1
    let trackD1 = new TrackLabel;
    trackD1.setType(dataTrackType);
    trackD1.setNumber(1);
*/
    // Create the track list. An empty or missing tracklist will result in the
    // use of all tracks in the sequence when generaitng the EDL.
    let trackList = new TrackList;

/*  Commented out example code to add requested track to track list.
    // Add specific tracks. If they exist in the sequence, they will be used.
    // If they are not audio, video, or data tracks and/or do not exist in the
    // sequence, they will be ignored when generating the EDL.
    trackList.addTrackLabels(trackV1);
    trackList.addTrackLabels(trackA1);
    trackList.addTrackLabels(trackA2);
    trackList.addTrackLabels(trackD1);
*/
    
    for (const item of event.dataTransfer.items) {
        if (item.type === MCAPI_ASSETLIST_MIME_TYPE) {
            let mimeData = event.dataTransfer.getData(MCAPI_ASSETLIST_MIME_TYPE);
            let dragList = JSON.parse(mimeData);

            dragList.forEach(element => {

                let mob_id = element["id"];
                let type = element["type"];

                if (type == "sequence") {
                    exportToEDL(mob_id, edlSettingsName, trackList);
                }
            });
        }
    }
};

document.addEventListener("DOMContentLoaded", init);
