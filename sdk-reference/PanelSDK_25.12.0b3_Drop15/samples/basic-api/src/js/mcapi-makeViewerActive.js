import { MakeViewerActiveRequest, MakeViewerActiveRequestBody, ViewerType} from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js';
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div> \
<select id="MakeViewerActive_viewer_type"> \
<option value="Source">Source</option> \
<option value="Record">Record</option> \
<option value="Popup">Popup</option> \
<option value="Center">Center</option> \
</select> \
<br /> \
<br /> \
<label>(Optional) Enter mob ID:</label><br><br> \
<input type="text" id="mobId-input" placeholder="Mob Id"></input> \
</div>';


const ViewerTypesFLAGS = {
    "Source": ViewerType.SOURCE,
    "Record": ViewerType.RECORD,
    "Popup": ViewerType.POPUP,
    "Center": ViewerType.CENTER,
};

export var load_makeViewerActive = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = makeViewerActive_submit;
}

var makeViewerActive_submit = function () {
    const inputText = document.querySelector("#mobId-input").value;
    const type = document.querySelector("#MakeViewerActive_viewer_type").value;

    var request = new MakeViewerActiveRequest();

    var makeViewerActiveRequestBody = new MakeViewerActiveRequestBody;
    makeViewerActiveRequestBody.setType(ViewerTypesFLAGS[type]);
    makeViewerActiveRequestBody.setMobId(inputText);
    request.setBody(makeViewerActiveRequestBody);

    mcapiclient().makeViewerActive(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            response_container.innerHTML = "";
            const textNode = document.createTextNode(`Viewer: ` + type + ` activated.`);
            response_container.appendChild(textNode);
        }
    });
}