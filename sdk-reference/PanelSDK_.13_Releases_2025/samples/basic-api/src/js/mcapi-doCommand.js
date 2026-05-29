


import { DoCommandRequest, DoCommandRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="doCommand-sample"> \
<h1>DoCommand</h1> \
<input type="text" id="doCommand-input"></input> \
<br /> \
<br /> \
</div>';


export var load_doCommand = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = doCommand_submit;
}

var doCommand_submit = function () {
    const inputText = document.querySelector("#doCommand-input").value;

    let request = new DoCommandRequest();

    let doCommandRequestBody = new DoCommandRequestBody;
    doCommandRequestBody.setCommandid(inputText);
    request.setBody(doCommandRequestBody);

    mcapiclient().doCommand(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            //response_container.innerHTML = JSON.stringify(response.getBody().getMessage());
        }
    });

}

