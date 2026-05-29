


import { GetOpenProjectInfoRequest, GetOpenProjectInfoRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = ' <br /> <br /> ';


export var load_getOpenProjectInfo = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    submitButton.onclick = null;
    submitButton.onclick = getOpenProjectInfo_submit;
}

function dateToString(seconds) {
    let d = new Date(0);
    d.setUTCSeconds(seconds);
    return d.toUTCString();
}

function frameRateToNumber(num, den) {
    return num.toFixed(2) / den.toFixed(2);
}

function stereoscopicToString(stereoCode) {
    const stereoNames =
        [
            "Undefined", // Undefined
            "Monoscopic", // Off
            "Left eye only", // Left eye only
            "Right eye only", // Right eye only
            "Leading eye", // Leading eye
            "Side by side", // Side by side
            "Over/Under", // Over/Under
            "Full", // Full
        ];

    return stereoNames[stereoCode];
}

function getOpenProjectInfo_submit() {
    response_container.innerHTML = ""; // reset
    var request = new GetOpenProjectInfoRequest();

    var gbqBody = new GetOpenProjectInfoRequestBody();
    request.setBody(gbqBody);

    mcapiclient().getOpenProjectInfo(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        }
        else {
            let data = {};

            data["project_path"] = response.getBody().getPath();
            data["project_type"] = response.getBody().getProjectType();

            const fr = response.getBody().getFrameRate();
            const num = fr.getNum();
            const den = fr.getDen();
            data["frame_rate"] = frameRateToNumber(num, den);
            data["color_space"] = response.getBody().getColorSpace();
            data["raster_width"] = response.getBody().getRasterWidth();
            data["raster_height"] = response.getBody().getRasterHeight();
            data["stereoscopic"] = stereoscopicToString(response.getBody().getStereoscopic());
            data["drop_frame"] = response.getBody().getDropFrame();
            data["creation_date"] = dateToString(response.getBody().getCreationDate());
            data["modify_date"] = dateToString(response.getBody().getModifyDate());
            data["film"] = response.getBody().getFilm();
            data["film_perf"] = response.getBody().getFilmPerf();


            Object.entries(data).forEach(([key, value]) => {
                let span = document.createElement('span');
                span.innerHTML = `<b>${key}</b>: ${value}`;
                response_container.appendChild(span);

                const linebreak = document.createElement("br");
                response_container.appendChild(linebreak);
            });
        }
    });
}
