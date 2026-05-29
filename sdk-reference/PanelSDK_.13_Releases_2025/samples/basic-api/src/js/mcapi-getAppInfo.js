


import { GetAppInfoRequest, GetAppInfoRequestBody,  } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js';
import { parameters } from './dom-loader.js';
import { response_container } from './dom-loader.js';
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> \
<br /> \
<br /> \
</div>';


export var load_getAppInfo = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = getAppInfo_submit;
}

var getAppInfo_submit = function () {
 
    var request = new GetAppInfoRequest();

    var body = new GetAppInfoRequestBody;
    request.setBody(body);

    mcapiclient().getAppInfo(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            let res = response.toObject();
            let binInfo = JSON.stringify(res, null, 4);
            response_container.innerHTML = binInfo;
        }
    });
}

