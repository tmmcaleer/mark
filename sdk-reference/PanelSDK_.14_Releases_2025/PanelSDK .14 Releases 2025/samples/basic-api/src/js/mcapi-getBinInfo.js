


import { GetBinInfoRequest, GetBinInfoRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js';
import { parameters } from './dom-loader.js';
import { response_container } from './dom-loader.js';
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> \
<label>Enter bin path:</label><br><br> \
<input type="text" id="getBinInfo-input" placeholder="Bin path"></input> \
<br /> \
<br /> \
</div>';


export var load_getBinInfo = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = getBinInfo_submit;
}

var getBinInfo_submit = function () {
    const inputText = document.querySelector("#getBinInfo-input").value;

    var request = new GetBinInfoRequest();

    var getBinInfoRequestBody = new GetBinInfoRequestBody;
    getBinInfoRequestBody.setRelativeBinPath(inputText);
    request.setBody(getBinInfoRequestBody);

    mcapiclient().getBinInfo(request, getMetadata(), (err, response) => {
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

