


import { CreateBinRequest, CreateBinRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> \
<label>Folder path</label> \
<input type="text" id="folder-input" placeholder="Folder path"></input> <br> \
<label>Bin Name</label> \
<input type="text" id="bin-name-input" placeholder="Bin name"></input> <br> \
<input type="radio" id="FLOATBIN" name="open-bin-option" value="FLOATBIN" checked> \
<label for="float-bin">Float bin</label><br> \
<input type="radio" id="LASTACTIVEBINCONTAINER" name="open-bin-option" value="LASTACTIVEBINCONTAINER"> \
<label for="css">Open bin in last active bin container</label><br> \
<input type="radio" id="FOLLOWBINSETTINGS" name="open-bin-option" value="FOLLOWBINSETTINGS"> \
<label for="javascript">Follow bin settings</label> \
<br> \
<br> \
</div>';


export var load_createBin = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = createBin_submit;
}

const FLAGS = {
    "FLOATBIN": CreateBinRequestBody.OpenBinOption.FLOATBIN,
    "LASTACTIVEBINCONTAINER": CreateBinRequestBody.OpenBinOption.LASTACTIVEBINCONTAINER,
    "FOLLOWBINSETTINGS": CreateBinRequestBody.OpenBinOption.FOLLOWBINSETTINGS,
};

function getOpenBinFlags() {
    let flags = [];
    const radioButtons = document.querySelectorAll('input[name="open-bin-option"]');

    for (const rb of radioButtons) {
        if (rb.checked)
            return FLAGS[rb.id];
    }

    return CreateBinRequestBody.OpenBinOption.FLOATBIN;
}


var createBin_submit = function () {
    const folder = document.querySelector("#folder-input").value;
    const binName = document.querySelector("#bin-name-input").value;
    const openBinOption = getOpenBinFlags();

    var request = new CreateBinRequest();

    var createBinRequestBody = new CreateBinRequestBody;
    createBinRequestBody.setFolderPath(folder);
    createBinRequestBody.setBinName(binName);
    createBinRequestBody.setOption(openBinOption);
    request.setBody(createBinRequestBody);

    mcapiclient().createBin(request, getMetadata(), (err, response) => {
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

