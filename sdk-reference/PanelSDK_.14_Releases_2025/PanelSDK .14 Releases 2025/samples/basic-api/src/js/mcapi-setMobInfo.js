


import { SetMobInfoRequest, SetMobInfoRequestBody, ColumnInfo } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="setMobInfo-sample"> \
<h1>SetMobInfo</h1> \
Mob ID: <input type="text" id="mobId-input"></input> \
Column name: <input type="text" id="column-name-input"></input> \
New value: <input type="text" id="column-value-input"></input> \
<br /> \
<br /> \
</div>';


export var load_setMobInfo = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = setMobInfo_submit;
}

var setMobInfo_submit = function () {
    const mobId = document.querySelector("#mobId-input").value;
    const columnName = document.querySelector("#column-name-input").value;
    const columnValue = document.querySelector("#column-value-input").value;

    let request = new SetMobInfoRequest();

    let setMobInfoRequestBody = new SetMobInfoRequestBody;
    setMobInfoRequestBody.setMobId(mobId);

    var columnInfo = new ColumnInfo();
    columnInfo.setColumnName(columnName);
    columnInfo.setColumnValue(columnValue);

    setMobInfoRequestBody.setMobId(mobId);
    setMobInfoRequestBody.setColumn(columnInfo);
    request.setBody(setMobInfoRequestBody);

    mcapiclient().setMobInfo(request, getMetadata(), (err, response) => {
        if (err) {
            response_container.innerHTML = "";
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            response_container.innerHTML = "";
            response_container.appendChild(document.createTextNode("Success!"));
        }
    });

}

