
import { GetMobInfoRequest, GetMobInfoRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div>Mob ID: <input type="text" id="getMobInfo_mob_id"></input> <br> \
<input type="checkbox" id="getMobInfo_only_visible_columns"> Only visible columns</input><br> \
<input type="checkbox" id="getMobInfo_includes_empty_columns"> Include empty columns</input><br><br> \
</div>';

export var load_getMobInfo = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    submitButton.onclick = null;
    submitButton.onclick = getMobInfo_submit;
}

let displayText = function (key, value, container) {
    let text = `${key}: ${value}`
    let node = document.createTextNode(text);
    container.appendChild(node);
    container.appendChild(document.createElement("br"))
}


function getMobInfo_submit() {
    response_container.innerHTML = ""; // reset
    var request = new GetMobInfoRequest();

    let requestBody = new GetMobInfoRequestBody();
	const mob_id = document.querySelector("#getMobInfo_mob_id").value; 
	const only_visible_columns = document.querySelector("#getMobInfo_only_visible_columns").checked;
	const includes_empty_columns = document.querySelector("#getMobInfo_includes_empty_columns").checked; 
    requestBody.setMobId(mob_id);
    requestBody.setOnlyVisibleColumns(only_visible_columns);
    requestBody.setIncludesEmptyColumns(includes_empty_columns);

    request.setBody(requestBody);

    let stream = mcapiclient().getMobInfo(request, getMetadata());
    stream.on('data', (response) => {
        let columnName      = response.getBody().getColumnName();
        let columnValue     = response.getBody().getColumnValue();
        let columnValueType = response.getBody().getColumnValueType();
        let columnHidden    = response.getBody().getColumnHidden();
        let columnIsCustom  = response.getBody().getColumnIsCustom();

        displayText("columnName", columnName, response_container);
        displayText("columnValue", columnValue, response_container);
        displayText("columnValueType", columnValueType, response_container);
        displayText("columnHidden", columnHidden, response_container);
        displayText("columnIsCustom", columnIsCustom, response_container);

        let linebreak = document.createElement("br");
        response_container.appendChild(linebreak);
    });

    stream.on('error', (err) => {
        const errMessage = `Unexpected stream error: code = ${err.code}` +
        `, message = "${err.message}"`;
        const textNode = document.createTextNode(errMessage);
        response_container.appendChild(textNode);
        console.log(errMessage);
        mcapi.reportError(err.code, err.message);
    });
    stream.on('status', (status) => {
        console.log(status);
    });
    stream.on('end', () => {
        console.log(`Completed`);
    });
}

