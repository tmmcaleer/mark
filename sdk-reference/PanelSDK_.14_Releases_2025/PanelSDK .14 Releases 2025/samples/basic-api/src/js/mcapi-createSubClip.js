


import { CreateSubClipRequest, CreateSubClipRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { CreateSubClipResponseBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js';
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> \
<label>Enter bin path:</label><br>\
<input type="text" id="binPath-input" placeholder="Bin path"></input><br> \
<input type="text" id="mobId-input" placeholder="Mob Id"></input><br> \
Use clip bounds: <input type="checkbox" id="useClipBounds"><br>\
Use marks bounds: <input type="checkbox" id="useMarksBounds"><br>\
<input type="number" id="headFrame-input" placeholder="Head frame"></input><br>\
<input type="text" id="headTimecode-input" placeholder="Head timecode"></input><br> \
<input type="number" id="endFrame-input" placeholder="End frame"></input><br>\
<input type="text" id="endTimecode-input" placeholder="End timecode"></input><br> \
<input type="number" id="addFramesAtHead-input" placeholder="Add frames at head"></input><br>\
<input type="number" id="addFramesAtEnd-input" placeholder="Add frames at end"></input><br>\
Retain marks: <input type="checkbox" id="retainMarks"><br>\
Retain markers: <input type="checkbox" id="retainMarkers"><br>\
Create new sequence: <input type="checkbox" id="createNewSequence"><br>\
Enabled tracks only: <input type="checkbox" id="enabledTracksOnly"><br>\
<br> \
</div>';

export var load_createSubClip = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = createSubClip_submit;
}

var createSubClip_submit = function () {
    const binPath = document.querySelector("#binPath-input").value;
    const mobId = document.querySelector("#mobId-input").value;
    const useClipBounds = document.querySelector("#useClipBounds").checked;
    const useMarksBounds = document.querySelector("#useMarksBounds").checked;
    const headFrame = document.querySelector("#headFrame-input").value;
    const headTimecode = document.querySelector("#headTimecode-input").value;
    const endFrame = document.querySelector("#endFrame-input").value;
    const endTimecode = document.querySelector("#endTimecode-input").value;
    const addFramesAtHead = document.querySelector("#addFramesAtHead-input").value;
    const addFramesAtEnd = document.querySelector("#addFramesAtEnd-input").value;
    const retainMarks = document.querySelector("#retainMarks").checked;
    const retainMarkers = document.querySelector("#retainMarkers").checked;
    const createNewSequence = document.querySelector("#createNewSequence").checked;
    const enabledTracksOnly = document.querySelector("#enabledTracksOnly").checked;


    var request = new CreateSubClipRequest();

    var createSubClipRequestBody = new CreateSubClipRequestBody;
    createSubClipRequestBody.setDestinationBinPath(binPath);
    createSubClipRequestBody.setMobId(mobId);
    createSubClipRequestBody.setUseClipBounds(useClipBounds);
    createSubClipRequestBody.setUseMarksBounds(useMarksBounds);
    createSubClipRequestBody.setHeadFrame(headFrame);
    createSubClipRequestBody.setHeadTimecode(headTimecode);
    createSubClipRequestBody.setEndFrame(endFrame);
    createSubClipRequestBody.setEndTimecode(endTimecode);
    createSubClipRequestBody.setAddFramesAtHead(addFramesAtHead);
    createSubClipRequestBody.setAddFramesAtEnd(addFramesAtEnd);
    createSubClipRequestBody.setRetainMarks(retainMarks);
    createSubClipRequestBody.setRetainMarkers(retainMarkers);
    createSubClipRequestBody.setCreateNewSequence(createNewSequence);
    createSubClipRequestBody.setEnabledTracksOnly(enabledTracksOnly);

    request.setBody(createSubClipRequestBody);

    mcapiclient().createSubClip(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            response_container.innerHTML = "";

        }
    });
}

