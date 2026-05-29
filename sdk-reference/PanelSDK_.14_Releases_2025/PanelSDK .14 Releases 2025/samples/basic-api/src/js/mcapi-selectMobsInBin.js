


import { SelectMobsInBinRequest, SelectMobsInBinRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="selectMobsInBin-sample"> \
<h1>SelectMobsInBin</h1><br /> \
Bin Path: <input type="text" id="binPath-input"></input><br/> \
Mob Id: <input type="text" id="mobId-1-input"></input><br/> \
Mob Id: <input type="text" id="mobId-2-input"></input><br/> \
<input type="checkbox" id="extendSelection-input"></input> Extend Selection <br/> \
<br /> \
<br /> \
</div>';


export var load_selectMobsInBin = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = selectMobsInBin_submit;
}

var selectMobsInBin_submit = function () {
    const binPath = document.querySelector("#binPath-input").value;
    const mobId1 = document.querySelector("#mobId-1-input").value;
    const mobId2 = document.querySelector("#mobId-2-input").value;
    var checkbox = document.getElementById("extendSelection-input");


    let request = new SelectMobsInBinRequest();

    let selectMobsInBinRequestBody = new SelectMobsInBinRequestBody;
    selectMobsInBinRequestBody.setBinPath(binPath);
    selectMobsInBinRequestBody.addMobIds(mobId1);
    selectMobsInBinRequestBody.addMobIds(mobId2);
    selectMobsInBinRequestBody.setAddToSelection(checkbox.checked);

    request.setBody(selectMobsInBinRequestBody);

    mcapiclient().selectMobsInBin(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            
        }
    });

}

