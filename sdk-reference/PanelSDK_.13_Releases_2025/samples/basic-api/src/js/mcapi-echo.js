


import { EchoRequest, EchoRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="echo-sample"> \
<h1>Echo</h1> \
<input type="text" id="echo-input"></input> \
<br /> \
<br /> \
</div>';


export var load_echo = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = echo_submit;
}

var echo_submit = function () {
    const inputText = document.querySelector("#echo-input").value;

    let request = new EchoRequest();

    let echoRequestBody = new EchoRequestBody;
    echoRequestBody.setMessage(inputText);
    request.setBody(echoRequestBody);

    mcapiclient().echo(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            response_container.innerHTML = JSON.stringify(response.getBody().getMessage());
        }
    });

}

