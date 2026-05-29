


import { GetMediaVolumeListRequest, GetMediaVolumeListRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = ' <br /> <br /> ';


export var load_getMediaVolumeList = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    submitButton.onclick = null;
    submitButton.onclick = GetMediaVolumeList_submit;
}

function GetMediaVolumeList_submit() {
    response_container.innerHTML = ""; // reset

    let request = new GetMediaVolumeListRequest();

    mcapiclient().getMediaVolumeList(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            response_container.innerHTML = JSON.stringify(response.getBody().getVolumesList());
        }
    });
}
