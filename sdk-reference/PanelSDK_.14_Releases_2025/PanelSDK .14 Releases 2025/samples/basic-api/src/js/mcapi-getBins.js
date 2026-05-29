


import { GetBinsRequest, GetBinsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> <br /> <br /> \
<input type="checkbox" id="ALLTYPES"> ALLTYPES</input><br> \
<input type="checkbox" id="BINTYPE"> BINTYPE</input><br> \
<input type="checkbox" id="SCRIPTTYPE"> SCRIPTTYPE</input><br> \
<input type="checkbox" id="VOLUMETYPE"> VOLUMETYPE</input><br> \
<input type="checkbox" id="ONLYOPEN"> ONLYOPEN</input><br> \
</div>';


export var load_getBins = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    submitButton.onclick = null;
    submitButton.onclick = getBins_submit;
}

function getBins_submit() {
    response_container.innerHTML = ""; // reset

    const allTypes = document.querySelector("#ALLTYPES").checked;
    const binType = document.querySelector("#BINTYPE").checked;
    const scriptType = document.querySelector("#SCRIPTTYPE").checked;
    const volumeType = document.querySelector("#VOLUMETYPE").checked;
    const onlyOpen = document.querySelector("#ONLYOPEN").checked;
    
    var request = new GetBinsRequest();
    var gbqBody = new GetBinsRequestBody();

    if (allTypes) gbqBody.addRequestFlag(GetBinsRequestBody.GetBinsFlag.ALLTYPES);
    if (binType) gbqBody.addRequestFlag(GetBinsRequestBody.GetBinsFlag.BINTYPE);
    if (scriptType) gbqBody.addRequestFlag(GetBinsRequestBody.GetBinsFlag.SCRIPTTYPE);
    if (volumeType) gbqBody.addRequestFlag(GetBinsRequestBody.GetBinsFlag.VOLUMETYPE);
    if (onlyOpen) gbqBody.addRequestFlag(GetBinsRequestBody.GetBinsFlag.ONLYOPEN);

    request.setBody(gbqBody);

    var stream = mcapiclient().getBins(request, getMetadata());
    stream.on('data', (response) => {
        let path = document.createTextNode(response.getBody().getAbsolutePath());
        response_container.appendChild(path);
        let linebreak = document.createElement("br");
        response_container.appendChild(linebreak);

    });
    stream.on('error', (err) => {
        console.log(`Unexpected stream error: code = ${err.code}` +
            `, message = "${err.message}"`);
        mcapi.reportError(err.code, err.message);
    });
    stream.on('status', (status) => {
        console.log(status);
    });
    stream.on('end', () => {
        console.log(`Completed`);
    });



}
