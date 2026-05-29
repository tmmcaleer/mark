


import { CloseBinRequest, CloseBinRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { CloseBinResponseBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js';
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> \
<label>Enter bin path:</label><br><br> \
<input type="text" id="closeBin-input" placeholder="Bin path"></input> \
<br> \
<br> \
</div>';


export var load_closeBin = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = closeBin_submit;
}

var closeBin_submit = function () {
    const inputText = document.querySelector("#closeBin-input").value;

    var request = new CloseBinRequest();

    var closeBinRequestBody = new CloseBinRequestBody;
    closeBinRequestBody.setBinPath(inputText);

    request.setBody(closeBinRequestBody);

    mcapiclient().closeBin(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {

        }
    });
}

