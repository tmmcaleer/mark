


import { GetMediaVolumeItemsRequest, GetMediaVolumeItemsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';
import { GetMediaVolumeListRequest } from '../grpc-web/MCAPI_Types_pb.js';


import "../css/main.css";
import "../css/input-elements.css";


const page = '<div>\
<label for="select-volume-menu">Volumes: </label>\
<span style="margin-right: 10px;">\
<select name="volumes" id="select-volume-menu"></select>\
<input id="refresh-volume-list-button" type="button" value="Refresh" />\
</span>\
<br>\
<label>Relative path:</label>\
<input type="text" id="relative-path-input" placeholder="Enter relative path"></input><br><br <label>Volume Item\
Filter</label><br>\
<input type="radio" id="ALL" name="filter" value="ALL" checked>\
<label for="ALL">All</label><br>\
<input type="radio" id="ONLYDIRS" name="filter" value="ONLYDIRS">\
<label for="ONLYDIRS">Only directories</label><br>\
<input type="radio" id="ONLYFILES" name="filter" value="ONLYFILES">\
<label for="ONLYFILES">Only files</label><br>\
<br>\
</div>';


export var load_getMediaVolumeItems = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    submitButton.onclick = null;
    submitButton.onclick = getMediaVolumeItems_submit;

    const refreshVolumesButton = document.querySelector('#refresh-volume-list-button');
    refreshVolumesButton.onclick = onRefreshVolumesClicked;
}

// Populate the volume list
const onRefreshVolumesClicked = function() {
    const request = new GetMediaVolumeListRequest();
    
    // const body = new GetMediaVolumeListRequestBody;
    // request.setBody(body);

    const md = {
        accessToken: mcapi.getAccessToken()
    };
    // Request list of List Tool settings that have EDL output formats and populate the EDL Settings menu.
    mcapiclient().getMediaVolumeList(request, md, (err, response) => {
        if (err) {
            const errorMessage = `Unexpected error: code = ${err.code}` + `, message = "${err.message}"`;
            console.log(errorMessage);
        } else {
            let warnings = response.getHeader().getWarningsList();

            for (let warning of warnings) {
                console.log(warning);
            }

            const volumeList = response.getBody().getVolumesList();
            let volumeMneu = document.getElementById("select-volume-menu");
            volumeMneu.innerHTML = '';
            volumeMneu.appendChild(document.createElement("br"));
       
            volumeList.forEach((volumePath, index) => {
                let menuItem = document.createElement("option");
                menuItem.textContent = volumePath.getName();
                menuItem.value = volumePath.getName();

                volumeMneu.appendChild(menuItem);
            });
        }
    });
};

const FLAGS = {
    "ALL": GetMediaVolumeItemsRequestBody.VolumeItemFilter.ALL,
    "ONLYDIRS": GetMediaVolumeItemsRequestBody.VolumeItemFilter.ONLYDIRECTORIES,
    "ONLYFILES": GetMediaVolumeItemsRequestBody.VolumeItemFilter.ONLYFILES,
};

function getVolumeFilter() {
    const radioButtons = document.querySelectorAll('input[name="filter"]');

    for (const rb of radioButtons) {
        if (rb.checked)
            return FLAGS[rb.id];
    }

    return GetMediaVolumeItemsRequestBody.VolumeItemFilter.ALL;
}

function getMediaVolumeItems_submit() {
    response_container.innerHTML = ""; // reset

    const selectElement = document.getElementById('select-volume-menu');
    const selectedIndex = selectElement.selectedIndex;
    const volumeName = selectElement.options[selectedIndex].value;

    const relativePath = document.querySelector("#relative-path-input").value;
    const voluemFilter = getVolumeFilter();

    let request = new GetMediaVolumeItemsRequest();
    let body = new GetMediaVolumeItemsRequestBody();
    body.setVolumeName(volumeName);
    body.setRelativePath(relativePath);
    body.setType(voluemFilter);
    request.setBody(body);

    mcapiclient().getMediaVolumeItems(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            const body = response.getBody();
            
            if (body === undefined) { // No error, but there is no content to display.
                const span = document.createElement('span');
                span.innerHTML = `Completed!`;
                response_container.appendChild(span);
                return;
            }
            
            const itemList = body.getItemList();
            let count = 1;
            itemList.forEach((element) => {
                const relativeVolumePath = element.getRelativeVolumePath();
                const isDirectory = element.getIsDirectory();
                const span = document.createElement('span');
                span.innerHTML = `${count++}. path: ${relativeVolumePath}<br>Is directory: ${isDirectory}<br><br>`;
                response_container.appendChild(span);
                response_container.appendChild(document.createElement("br"));
            });
        }
    });

}
