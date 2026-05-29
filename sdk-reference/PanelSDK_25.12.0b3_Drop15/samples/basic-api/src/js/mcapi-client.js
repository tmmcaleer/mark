

import { MCAPIClient } from '../grpc-web/MCAPI_grpc_web_pb.js';


var client;

export var mcapiclient = function(){
    return client;
};

export var getMetadata = function () {
    return {
        accessToken: mcapi.getAccessToken()
    };
};

function init(){
    client = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);
}
document.addEventListener('DOMContentLoaded', init);
