import { GetViewerMobsRequest, GetViewerMobsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="getViewerMobs-sample"> \
<h1>GetViewerMobs</h1> \
<br /> \
<br /> \
</div>';


export var load_getViewerMobs = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = getViewerMobs_submit;
}

var getViewerMobs_submit = function () {
    let request = new GetViewerMobsRequest();

    let getViewerMobsRequestBody = new GetViewerMobsRequestBody;
    request.setBody(getViewerMobsRequestBody);

    mcapiclient().getViewerMobs(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {

            let mobInfoList = response.getBody().getMobsList();

            for (let mobInfo of mobInfoList) {
                let dispString = "";
                let mobId = mobInfo.getMobId()
                let frame = mobInfo.getCurrentFrame();
                let timecode = mobInfo.getCurrentTimecode();

                switch (mobInfo.getViewType()) {
                    case proto.mcapi.ViewerType.SOURCE:
                        dispString = "S";
                        break;

                    case proto.mcapi.ViewerType.RECORD:
                        dispString = "R";
                        break;

                    case proto.mcapi.ViewerType.POPUP:
                        dispString = "P";
                        break;

                    case proto.mcapi.ViewerType.CENTER:
                        dispString = "C";
                        break;

                    default:
                        break;
                }

                dispString += timecode + " " + frame + " " + mobId;

                const preElement = document.createElement("pre");
                preElement.innerHTML = dispString;
                response_container.appendChild(preElement);
                
            }

            
        }
    });

}

