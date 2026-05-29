


import { OpenBinRequest, OpenBinRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { OpenBinResponseBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js';
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> \
<label>Enter bin path:</label><br><br> \
<input type="text" id="openBin-input" placeholder="Bin path"></input> \
<br> \
<input type="checkbox" id="locked"> Lock bin<br>\
<br> \
<br> \
</div>';


export var load_openBin = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = openBin_submit;
}

var openBin_submit = function () {
    const inputText = document.querySelector("#openBin-input").value;
    const lockedCheckbox = document.querySelector("#locked");

    var request = new OpenBinRequest();

    var openBinRequestBody = new OpenBinRequestBody;
    openBinRequestBody.setBinPath(inputText);
    openBinRequestBody.setLocked(lockedCheckbox.check);
    request.setBody(openBinRequestBody);

    mcapiclient().openBin(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            response_container.innerHTML = "";

            // In case there is no response body in the reply, 
            // we need to use the dafault constructed one.
            let body = new OpenBinResponseBody; 
            if (response.getBody() !== undefined)
                body = response.getBody();
                
            const lockedByOther = body.getIsLockedByOther();
            const lockOwner = body.getLockOwner();
            let content = "";
            if (lockedByOther === true)
                content = `The bin is locked by ${lockOwner}`;
            else
                content = "The bin is not locked";

            const textNode = document.createTextNode(content);
            response_container.appendChild(textNode);
        }
    });
}

