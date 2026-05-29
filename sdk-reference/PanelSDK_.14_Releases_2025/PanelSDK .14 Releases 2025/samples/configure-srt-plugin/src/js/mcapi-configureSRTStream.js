// MCAPI
import { ConfigureSRTStreamRequest, ConfigureSRTStreamRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { MCAPIClient } from '../grpc-web/MCAPI_grpc_web_pb.js';

// Get elements from HTML page
var submit_button = document.querySelector('#submit-button');
var response_container = document.querySelector("#response-container");

var mcapiclient = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);

const QUALITY_OPTION = {
    LOW: ConfigureSRTStreamRequestBody.QualityOption.LOW,
    MEDIUM: ConfigureSRTStreamRequestBody.QualityOption.MEDIUM,
    HIGH: ConfigureSRTStreamRequestBody.QualityOption.HIGH,
};

const MODE_OPTION = {
    LISTENER: ConfigureSRTStreamRequestBody.ModeOption.LISTENER,
    CALLER: ConfigureSRTStreamRequestBody.ModeOption.CALLER,
};

let configure_srt_stream_submit = function () {
    // Get inputs
    let streamNameInput = document.querySelector('#streamNameInput');
    let ipAddressInput = document.querySelector('#ipAddressInput');
    let portInput = document.querySelector('#portInput');
    let passwordInput = document.querySelector('#passwordInput');
    let usePasswordInput = document.querySelector('#usePasswordInput');
    let secreteSuffixInput = document.querySelector('#secretSuffixInput');
    let latencyInput = document.querySelector('#latencyInput');
    let qualityOptionSelect = document.querySelector('#qualityOptionSelect');
    let modeOptionSelect = document.querySelector('#modeOptionSelect');

    // Create header and body
    const request = new ConfigureSRTStreamRequest();

    var requestBody = new ConfigureSRTStreamRequestBody();
    requestBody.setStreamName(streamNameInput.value);
    requestBody.setIpAddress(ipAddressInput.value);
    requestBody.setPort(portInput.value);
    requestBody.setPassword(passwordInput.value); // deprecated
    requestBody.setSecretSuffix(secreteSuffixInput.value); // password will be saved locally in secure OS storage using this string 
    requestBody.setLatency(latencyInput.value);
    requestBody.setQualityOption(qualityOptionSelect.value);
    requestBody.setModeOption(modeOptionSelect.value);

    // If usePasswordInput is a checkbox, then the password will be saved locally in secure OS storage, using the secretSuffix or
    // the old default suffix will be used as part of the unique key to store the password.
    // If usePasswordInput is not checked, then the password will not be saved and the SRT stream will not be protected unless
    // the password is entered manually in the SRT -> Configure dialog.
    if (usePasswordInput.checked) {
        requestBody.setUsePassword(true);
    }
 
    request.setBody(requestBody);


    let md = {
        accessToken: mcapi.getAccessToken()
    };

    const linebreak = document.createElement("br");

    // Call API on the MCAPIClient object
    mcapiclient.configureSRTStream(request, md, (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` + `, message = "${err.message}" `;
            console.log(errMessage);
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            response_container.appendChild(linebreak);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            const textNode = document.createTextNode("SRT Stream file updated succesfully");
            response_container.appendChild(textNode);
            response_container.appendChild(linebreak);
        }
    });
}

let load_configure_srt_stream = function () {
    submit_button.onclick = null;
    submit_button.onclick =  configure_srt_stream_submit;
}

document.addEventListener('DOMContentLoaded', load_configure_srt_stream);