


import { CreateCustomColumnRequest, CreateCustomColumnRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> \
<label>Bin path</label> \
<input type="text" id="folder-input" placeholder="file name"></input> <br> \
<label>Column name</label> \
<input type="text" id="name-input" placeholder="column name"></input> <br> \
<label>Insert after</label> \
<input type="text" id="place-input" placeholder="column name"></input> <br> \
<input type="checkbox" id="hidden"> Hidden<br>\<br> \
<br> \
</div>';


export var load_createCustomColumn = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = createCustomColumn_submit;
}


var createCustomColumn_submit = function () {
    const folder = document.querySelector("#folder-input").value;
    const columnName = document.querySelector("#name-input").value;
    const afterColumnName = document.querySelector("#place-input").value;
    const hidden = document.querySelector("#hidden").check;

    var request = new CreateCustomColumnRequest();

    var requestBody = new CreateCustomColumnRequestBody;
    requestBody.setAbsoluteBinPath(folder);
    requestBody.setNewColumnName(columnName);
    requestBody.setAfterColumnName(afterColumnName);
    requestBody.setColumnHidden(hidden);
    request.setBody(requestBody);

    mcapiclient().createCustomColumn(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            response_container.innerHTML = "";
            const linebreak = document.createElement("br");
            const content = JSON.stringify(response.toObject(), null, 4);
            const textNode = document.createTextNode(content);
            response_container.appendChild(textNode);
            response_container.appendChild(linebreak);
        }
    });
}

