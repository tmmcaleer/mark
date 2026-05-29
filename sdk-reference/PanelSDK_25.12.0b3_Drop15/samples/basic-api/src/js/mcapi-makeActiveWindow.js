import { MakeActiveWindowRequest, MakeActiveWindowRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";

const page = '<div>Window Id  <input type="text" id="window-id"> <br> \
<br></div>';


export var load_makeActiveWindow = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    submitButton.onclick = null;
    submitButton.onclick =  makeActiveWindow_submit;
}

function makeActiveWindow_submit() {
    response_container.innerHTML = ""; // reset

    const windowId = document.querySelector("#window-id").value;
	if (!windowId || windowId.trim() === "") {
        response_container.innerHTML = "Please enter a non-empty Window Id.";
        return;
    }

    let request = new MakeActiveWindowRequest();
    let body = new MakeActiveWindowRequestBody();
    body.setWindowId(windowId);

    request.setBody(body);

    mcapiclient().makeActiveWindow(request, getMetadata(), (err, response) => {
		if (err) {
			const errMessage = `Unexpected error: code = ${err.code}` +
				`, message = "${err.message}"`;
			const textNode = document.createTextNode(errMessage);
			response_container.appendChild(textNode);
			console.log(errMessage);
			mcapi.reportError(err.code, err.message);
		} else {
				let res = response.toObject();
				let message = JSON.stringify(res, null, 4);
				response_container.innerHTML = message;
		}
	});
}