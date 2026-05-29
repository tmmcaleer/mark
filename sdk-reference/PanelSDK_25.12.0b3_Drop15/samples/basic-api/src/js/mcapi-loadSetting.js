


import { LoadSettingRequest, LoadSettingRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";



const settingPage = '<div id="loadSetting-sample"> \
<h1>LoadSetting</h1> \
<br /> \
static/testExportSetting.xml \
<br /> \
<br /> \
</div>';


export var load_loadSetting = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(settingPage);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick =  loadSetting_submit ;
}

var loadSetting_submit = function () {

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'static/testExportSetting.xml', false);
    xhr.onload = function() {
    if (xhr.status === 200) {
        console.log('Load complete');
    } else {
        console.log('Load error');
    }
    };
    xhr.send();

    let request = new LoadSettingRequest();
    
    let loadSettingRequestBody = new LoadSettingRequestBody;
    loadSettingRequestBody.setXmlSetting(xhr.responseText);
    request.setBody(loadSettingRequestBody);


    mcapiclient().loadSetting(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            response_container.innerHTML = 'Loaded';
        }
    });
}

