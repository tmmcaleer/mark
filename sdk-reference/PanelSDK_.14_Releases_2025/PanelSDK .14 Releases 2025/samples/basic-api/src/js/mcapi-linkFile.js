

import { LinkFileRequest, LinkFileRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { GetListOfLinkSettingsRequest, GetListOfLinkSettingsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="linkFile-sample"> \
<h1>LinkFile</h1><br/>  \
File path: <input type="text" id="linkFile-input"></input><br/>  \
Link setting: <select name="setting" id="select-link-setting"></select><br/>  \
Destination bin: <input type="text" id="bin-input"></input><br/>  \
<br/> \
<br/> \
</div>';

// Populate the link Setting menu.
let populateLinkSettingsMenu = function() {
    let request = new GetListOfLinkSettingsRequest();
    
    let getListOfLinkSettingsRequestBody = new GetListOfLinkSettingsRequestBody;
    request.setBody(getListOfLinkSettingsRequestBody);

    let md = {
        accessToken: mcapi.getAccessToken()
    };

    mcapiclient().getListOfLinkSettings(request, md, (err, response) => {
        if (err) {
            let errorMessage = `Unexpected error: code = ${err.code}` + `, message = "${err.message}"`;
            console.log(errorMessage);
        } else {
            let warnings = response.getHeader().getWarningsList();

            for (let warning of warnings) {
                console.log(warning);
            }

            let getSettingNamesList = response.getBody().getSettingNamesList();
            let linkSettingsMenu = document.getElementById("select-link-setting");
            linkSettingsMenu.appendChild(document.createElement("br"));

            // add empty to handle default active setting
            let menuItem = document.createElement("option");
            menuItem.textContent = "";
            menuItem.value = "";
            linkSettingsMenu.appendChild(menuItem);
     
            getSettingNamesList.forEach((settingName, index) => {
                let menuItem = document.createElement("option");
                menuItem.textContent = settingName;
                menuItem.value = settingName;

                linkSettingsMenu.appendChild(menuItem);
            });
        }
    });
};


export var load_linkFile = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = linkFile_submit;

    populateLinkSettingsMenu();
}

var linkFile_submit = function () {
    const inputText = document.querySelector("#linkFile-input").value;
    const linkSetting = document.querySelector("#select-link-setting").value;
    const destBin = document.querySelector("#bin-input").value;

    let request = new LinkFileRequest();

    let linkFileRequestBody = new LinkFileRequestBody;
    linkFileRequestBody.setFilePath(inputText);
    linkFileRequestBody.setLinkSettingsName(linkSetting);
    linkFileRequestBody.setDestinationBin(destBin);
    request.setBody(linkFileRequestBody);

    mcapiclient().linkFile(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {

            let res = response.toObject();
            let linkInfo = JSON.stringify(res, null, 4);
            response_container.innerHTML = linkInfo;
        }
    });

}