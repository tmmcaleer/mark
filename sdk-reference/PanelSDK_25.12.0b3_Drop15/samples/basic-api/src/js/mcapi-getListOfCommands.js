


import { GetListOfCommandsRequest, GetListOfCommandsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';
import { GetMediaVolumeListRequest } from '../grpc-web/MCAPI_Types_pb.js';


import "../css/main.css";
import "../css/input-elements.css";


const page = '<div>\
</div>';


export var load_getListOfCommands = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    submitButton.onclick = null;
    submitButton.onclick = getListOfCommands_submit;
}

function getListOfCommands_submit() {
    response_container.innerHTML = ""; // reset

    let request = new GetListOfCommandsRequest();
    let body = new GetListOfCommandsRequestBody();

    request.setBody(body);

    mcapiclient().getListOfCommands(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            const body = response.getBody();
            
            if (body === undefined) { // No error, but there is no content to display.
                const span = document.createElement('span');
                span.innerHTML = `Completed!`;
                response_container.appendChild(span);
                return;
            }
            
            const itemList = body.getCommandsList();
            let count = 1;
            itemList.forEach((element) => {
                const name = element.getName();
                const commandId = element.getCommandid();
                const category = element.getCategory();
                const span = document.createElement('span');
                span.innerHTML = `${count++}. name: ${name}, commandId: ${commandId} category: ${category}<br>`;
                response_container.appendChild(span);
                response_container.appendChild(document.createElement("br"));
            });
        }
    });

}
