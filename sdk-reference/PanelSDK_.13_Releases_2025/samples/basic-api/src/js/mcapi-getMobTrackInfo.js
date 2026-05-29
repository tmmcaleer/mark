


import { GetMobTrackInfoRequest, GetMobTrackInfoRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="getMobTrackInfo-sample"> \
<h1>GetMobTrackInfo</h1> \
Mob ID: \
<br /> \
<input type="text" id="mobId-input"></input> \
<br /> \
<br /> \
</div>';


export var load_getMobTrackInfo = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick =  getMobTrackInfo_submit;
}

var getMobTrackInfo_submit = function () {
    response_container.innerHTML = ""; // reset

    const inputText = document.querySelector("#mobId-input").value;

    let request = new GetMobTrackInfoRequest();
    
    let getMobTrackInfoRequestBody = new GetMobTrackInfoRequestBody;
    getMobTrackInfoRequestBody.setMobId(inputText);
    request.setBody(getMobTrackInfoRequestBody);

    mcapiclient().getMobTrackInfo(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            let trackInfoList = response.getBody().getTrackInfoList().getTrackInfoList();

            for (let trackInfo of trackInfoList)
            {

                let dispString = "";
                let trackLabel = trackInfo.getLabel();

                switch (trackLabel.getType()) {
                    case proto.mcapi.TrackType.TRACKTYPE_PICTURE:
                        dispString = dispString + "V";
                        break;

                    case proto.mcapi.TrackType.TRACKTYPE_SOUND:
                        dispString = dispString + "A";
                        break;

                    case proto.mcapi.TrackType.TRACKTYPE_DATA:
                        dispString = dispString + "D";
                        break;

                    case proto.mcapi.TrackType.TRACKTYPE_EDGECODE:
                        dispString = dispString + "EC";
                        break;

                    case proto.mcapi.TrackType.TRACKTYPE_TIMECODE:
                        dispString = dispString + "TC";
                        break;

                    default:
                        break;
                } 

                dispString = dispString + trackLabel.getNumber() + " ";

                let customName = trackInfo.getCustomName();
                let numSegments = trackInfo.getNumSegments();

                dispString = dispString + customName + " " +  numSegments + " segments";
                
                const preElement = document.createElement("pre");
                preElement.innerHTML = dispString;
                response_container.appendChild(preElement);
            }

            
            let trackInfo = response.getBody().getTrackInfoList();
            
            const mobItem = JSON.stringify(trackInfo.toObject(), null, 4);
            const htmlFormattedJsonString = mobItem
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/\n/g, "<br>");

            const preElement = document.createElement("pre");
            preElement.innerHTML = htmlFormattedJsonString;
            response_container.appendChild(preElement);
        }
    });
}

