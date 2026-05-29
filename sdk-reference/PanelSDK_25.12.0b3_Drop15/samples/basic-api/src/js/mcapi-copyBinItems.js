


import { CopyBinItemsRequest, CopyBinItemsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="copyBinItems-sample"> \
<h1>CopyBinItems</h1> \
<input type="text" id="SourceBinPath-input"  placeholder="Source bin path"></input> \
<input type="text" id="DestinationBinPath-input"  placeholder="Destination bin path"></input> \
<input type="text" id="mobId1-input"  placeholder="Mob Id"></input> \
<input type="text" id="mobId2-input"  placeholder="Mob Id"></input> \
<br /> \
<br /> \
</div>';


export var load_copyBinItems = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = copyBinItems_submit;
}


var copyBinItems_submit = function () {
    const sourceBinPath = document.querySelector("#SourceBinPath-input").value;
    const destinationBinPath = document.querySelector("#DestinationBinPath-input").value;
    const mobID1 = document.querySelector("#mobId1-input").value;
    const mobID2 = document.querySelector("#mobId2-input").value;

    let request = new CopyBinItemsRequest();

    let copyBinItemsRequestBody = new CopyBinItemsRequestBody;
    copyBinItemsRequestBody.setSourceBinPath(sourceBinPath);
    copyBinItemsRequestBody.setDestinationBinPath(destinationBinPath);
    if (mobID1)
        copyBinItemsRequestBody.addMobId(mobID1);
    if (mobID2)
        copyBinItemsRequestBody.addMobId(mobID2);

    request.setBody(copyBinItemsRequestBody);

    mcapiclient().copyBinItems(request, getMetadata(), (err, response) => {
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

