


import { DuplicateBinItemsRequest, DuplicateBinItemsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="duplicateBinItems-sample"> \
<h1>DuplicateBinItems</h1> \
<input type="text" id="BinPath-input"  placeholder="Bin path"></input> \
<input type="text" id="mobId1-input"  placeholder="Mob Id"></input> \
<input type="text" id="mobId2-input"  placeholder="Mob Id"></input> \
<br /> \
<br /> \
</div>';


export var load_duplicateBinItems = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = duplicateBinItems_submit;
}

var duplicateBinItems_submit = function () {
    const sourceBinPath = document.querySelector("#BinPath-input").value;
    const mobID1 = document.querySelector("#mobId1-input").value;
    const mobID2 = document.querySelector("#mobId2-input").value;

    let request = new DuplicateBinItemsRequest();

    let duplicateBinItemsRequestBody = new DuplicateBinItemsRequestBody;
    duplicateBinItemsRequestBody.setBinPath(sourceBinPath);
    if (mobID1)
        duplicateBinItemsRequestBody.addMobId(mobID1);
    if (mobID2)
        duplicateBinItemsRequestBody.addMobId(mobID2);

    request.setBody(duplicateBinItemsRequestBody);

    mcapiclient().duplicateBinItems(request, getMetadata(), (err, response) => {
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

