---
stoplight-id: zib2e3ok01glx
---

# Implement Echo Functionality

## Introduction

This tutorial adds futher functionality to the UI that you created in a previous tutorial.

## Prerequisites

- Tutorial - [Create the UI](7-create-ui.md)

## Steps

1. Compare the API declarations in MCAPI.proto file.

This file is located at `PanelSDK/proto`.

```
service MCAPI
{
    rpc Echo (EchoRequest) returns (EchoResponse);
    rpc GetBinInfo(GetBinInfoRequest) returns (GetBinInfoResponse);
}

```

> PanelSDK/proto directory contains the two protobuf files: MCAPI.proto and MCAPI_Types.proto. These files declare all the APIs and the structures that are used by Media Composer service. For more information about Protobuf (Protocol Buffer), please visit [Proto Buffers at protobuf.dev](https://protobuf.dev).

In a nutshell, to make an API call, we need an instance of MCAPIClient. Then we get the access token from the sessionStorage, set it to the request header, and call the API on the client object. 

1. Create a client object

MCAPI is a global object which provides useful utilities such as handling 
events, retrieving the server address, etc. Here we create the client with the address retrieved from mcapi.getGatewayserverAddress()

The client needs the address where it will send the requests to. We can get it by calling `getGatewayServerAddress()` from the mcapi object.

```

var mcapiclient = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);

```

1. Create a request variable

```
var echoRequest = new EchoRequest();

```

1. Get access token from mcapi object

Media Composer assigns a unique access token for every loaded plugin. The access token must be included in the metadata object passed to the API, otherwise the request will be ignored. To create the medatadata object with the token
```
let md = {
        accessToken: mcapi.getAccessToken(),
};
``` 

1. Create a request and call the API

```
var echoRequest = new EchoRequest();
// ... code to set up getBinInfoRequest
mcapiclient.getBinInfo(echoRequest, md, ...);

```

When you are finished, your code will look like this, including comments:

```

// Create a client object.
// mcapi is a global object which provides useful utilities such as handling 
// events, retrieving the server address, etc. 
// Here we create the client with the address retrieved 
// from mcapi.getGatewayserverAddress()
var mcapiclient = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);

// create a request
var echoRequest = new EchoRequest();

// create metadata object
let md = {
        accessToken: mcapi.getAccessToken(),
};

// ... other code to set up echoRequest
// ...

// call the API
mcapiclient.echo(echoRequest, md, ...);

// create a request
var getBinInfoRequest = new GetBinInfoRequest();
// ... code to set up getBinInfoRequest

// call the API
mcapiclient.getBinInfo(getBinInfoRequest, md, ...);

```

## Configure the echo.js file.

`echo.js` will be loaded when the Plugin Panel opens the index.html file. As it is loaded, the submit button will be set up so that `echo_submit()` will be called when the button is pressed. `echo_submit()` configures the request object with the message typed in the text box, then send it to Media Composer. When Media Composer returns the response, we display it under the `response-container` element. 

Copy this code into the echo.js file.

```

// MCAPI
import { EchoRequest, EchoRequestBody } from './grpc-web/MCAPI_Types_pb.js';
import { MCAPIClient } from './grpc-web/MCAPI_grpc_web_pb.js';

// Get elements from HTML page
var submit_button = document.querySelector('#submit-button');
var response_container = document.querySelector("#response-container");

var mcapiclient = new MCAPIClient('http://localhost:8080', null, null);

let echo_submit = function () {
    let echo_input = document.querySelector('#echo-input');
    const echoMessage = echo_input.value;

    // Pass the echo message to the request.
    var echoRequest = new EchoRequest();

    // Get access token from mcapi object
    // and create medatadata object with the token
    let md = {
        accessToken: mcapi.getAccessToken(),
    };
    
    var echoRequestBody = new EchoRequestBody;
    echoRequestBody.setMessage(echoMessage); // provide the message that will be sent to MC
    echoRequest.setBody(echoRequestBody);

    // Calling echo API on the MCAPIClient object. 
    // We also pass along echoRequest we constructed above
    mcapiclient.echo(echoRequest, md, (err, response) => {
        if (err) {
            console.log(`Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`);
        } else {
            response_container.innerHTML = JSON.stringify(response.getBody().getMessage());
        }
    });
}

let load_echo = function () {
    submit_button.onclick = null;
    submit_button.onclick =  echo_submit;
}

document.addEventListener('DOMContentLoaded', load_echo);

```

### Next Steps

Learn how to add echo functionality to the application

- [Build the App](9-build-the-app.md)

