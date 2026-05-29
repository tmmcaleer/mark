import { GetListOfLinkSettingsRequest, GetListOfLinkSettingsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';

import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";



const settingPage = '<div id="getListOfLinkSettings-sample"> \
<h1>GetListOfLinkSettings</h1> \
<br /> \
<br /> \
</div>';


export var load_getListOfLinkSettings = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(settingPage);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick =  getListOfLinkSettings_submit ;
}

var getListOfLinkSettings_submit = function () {

    let request = new GetListOfLinkSettingsRequest();
    
    let getListOfLinkSettingsRequestBody = new GetListOfLinkSettingsRequestBody;
    request.setBody(getListOfLinkSettingsRequestBody);

    mcapiclient().getListOfLinkSettings(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            let getSettingNamesList = response.getBody().getSettingNamesList();
            response_container.innerHTML = getSettingNamesList;
        }
    });
}

