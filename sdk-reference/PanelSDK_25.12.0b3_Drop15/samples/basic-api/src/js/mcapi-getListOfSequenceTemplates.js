import { GetListOfSequenceTemplatesRequest, GetListOfSequenceTemplatesRequestBody} from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js';
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";

const settingPage = 
'<div id = "GetListOfSequenceTemplates-sample">\
<h1>getListOfSequenceTemplates</h1>\
<br />\
<br />\
</div>';

export var load_getListOfSequenceTemplates = function () {
    parameters.innerHTML = ""; // it will clear old content
    const element = createElementFromHTML(settingPage);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = getListOfSequenceTemplates_submit;
}

var getListOfSequenceTemplates_submit = function() { 
    let request = new GetListOfSequenceTemplatesRequest();
    let requestBody = new GetListOfSequenceTemplatesRequestBody();
    request.setBody(requestBody);

    mcapiclient().getListOfSequenceTemplates(request, getMetadata(), (err, response) => {
        if (err) {
            `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            let settingNamesList = response.getBody().getSettingNamesList();
            let formattedNamesList = settingNamesList.join("<br />");
            let activeSetting = response.getBody().getActiveSetting();
            response_container.innerHTML = "<b>Templates:</b> <br />";
            response_container.innerHTML += formattedNamesList;
            response_container.innerHTML += "<br /> <b>Active setting: </b>";
            response_container.innerHTML += activeSetting;
        }
    });
}
