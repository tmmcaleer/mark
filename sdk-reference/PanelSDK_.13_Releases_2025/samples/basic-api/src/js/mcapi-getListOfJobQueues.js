


import { GetListOfJobQueuesRequest, GetListOfJobQueuesRequestBody } from '../grpc-web/MCAPI_Types_pb.js';

import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";



const settingPage = '<div id="getListOfJobQueues-sample"> \
<h1>GetListOfJobQueues</h1> \
<br /> \
<br /> \
</div>';


export var load_getListOfJobQueues = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(settingPage);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick =  getListOfJobQueues_submit ;
}

var getListOfJobQueues_submit = function () {

    let request = new GetListOfJobQueuesRequest();
    
    let getListOfJobQueuesRequestBody = new GetListOfJobQueuesRequestBody;
    request.setBody(getListOfJobQueuesRequestBody);

    mcapiclient().getListOfJobQueues(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
            `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            let res = response.toObject();
            let message = JSON.stringify(res, null, 4);
            response_container.innerHTML = message;
        }
    });
}

