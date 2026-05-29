// MCAPI
import { EchoRequest, EchoRequestBody } from "./grpc-web/MCAPI_Types_pb.js";
import { MCAPIClient } from "./grpc-web/MCAPI_grpc_web_pb.js";

// Get elements from HTML page
var submit_button = document.querySelector("#submit-button");
var response_container = document.querySelector("#response-container");

var mcapiclient = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);

let echo_submit = function () {
    let echo_input = document.querySelector("#echo-input");
    const echoMessage = echo_input.value;

    // Pass the echo message to the request.
    var echoRequest = new EchoRequest();
    var echoRequestBody = new EchoRequestBody();
    echoRequestBody.setMessage(echoMessage); // provide the message that will be sent to MC
    echoRequest.setBody(echoRequestBody);

    let md = {
        accessToken: mcapi.getAccessToken(),
    };

    // Calling echo API on the MCAPIClient object.
    // We also pass along echoRequest we constructed above
    mcapiclient.echo(echoRequest, md, (err, response) => {
        if (err) {
            console.log(
                `Unexpected error: code = ${err.code}` +
                    `, message = "${err.message}"`
            );
        } else {
            response_container.innerHTML = JSON.stringify(
                response.getBody().getMessage()
            );
        }
    });
};

let load_echo = function () {
    submit_button.onclick = null;
    submit_button.onclick = echo_submit;
};

document.addEventListener("DOMContentLoaded", load_echo);
