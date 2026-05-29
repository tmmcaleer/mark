import { LoadMobsIntoViewerRequest, LoadMobsIntoViewerRequestBody, ViewerType } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js';
import { parameters } from './dom-loader.js';
import { response_container } from './dom-loader.js';
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> \
<label>Enter mob Id:</label><br><br> \
<input type="text" id="LoadMobsIntoViewer_mob_id"></input> <br> \
<select id="LoadMobsIntoViewer_viewer_type"> \
<option value="Source">Source</option> \
<option value="Record">Record</option> \
<option value="Popup">Popup</option> \
</select> \
<br /> \
<br /> \
</div>';


const ViewerTypesFLAGS = {
    "Source": ViewerType.SOURCE,
    "Record": ViewerType.RECORD,
    "Popup": ViewerType.POPUP,
};


export var load_loadMobsIntoViewer = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = loadMobsIntoViewer_submit;
}

var loadMobsIntoViewer_submit = function () {
    const mob_id = document.querySelector("#LoadMobsIntoViewer_mob_id").value; 
    const type = document.querySelector("#LoadMobsIntoViewer_viewer_type").value;

    var request = new LoadMobsIntoViewerRequest();

    var loadMobsIntoViewerRequestBody = new LoadMobsIntoViewerRequestBody;
    loadMobsIntoViewerRequestBody.setMobIdsList([mob_id]);
    loadMobsIntoViewerRequestBody.setViewType(ViewerTypesFLAGS[type]);
    request.setBody(loadMobsIntoViewerRequestBody);

    mcapiclient().loadMobsIntoViewer(request, getMetadata(), (err, response) => {
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

