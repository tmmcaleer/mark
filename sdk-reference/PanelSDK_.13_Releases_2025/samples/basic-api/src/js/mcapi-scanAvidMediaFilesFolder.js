


import { ScanAvidMediaFilesFolderRequest, ScanAvidMediaFilesFolderRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { CreateClipsFromAvidMediaFilesFolderRequest, CreateClipsFromAvidMediaFilesFolderRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="scanAvidMediaFilesFolder-sample"> \
<h1>ScanAvidMediaFilesFolder and CreateClipsFromAvidMediaFilesFolder</h1> \
Avid media file folder to scan and create clips: <br />\
<input type="text" id="scanAvidMediaFilesFolder-input" placeholder="Media folder path" ></input> \
<br /> \
<input type="text" id="mediaFile1-input" placeholder="Media file path" ></input> \
<br /> \
<input type="text" id="mediaFile2-input" placeholder="Media file path" ></input> \
<br /> \
Bin path: <br />\
<input type="text" id="binPath-input" placeholder="Bin path" ></input> \
<br /> \
</div>';


export var load_scanAvidMediaFilesFolder = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = scanAvidMediaFilesFolder_submit;
}

var create_clip = function () {

    const binPath = document.querySelector("#binPath-input").value;
    const mediaFolder = document.querySelector("#scanAvidMediaFilesFolder-input").value;
    const mediaFile1 = document.querySelector("#mediaFile1-input").value;
    const mediaFile2 = document.querySelector("#mediaFile2-input").value;

    let createRequest = new CreateClipsFromAvidMediaFilesFolderRequest();

    let createClipsFromAvidMediaFilesFolderRequestBody = new CreateClipsFromAvidMediaFilesFolderRequestBody;
    createClipsFromAvidMediaFilesFolderRequestBody.setBinPath(binPath);
    createClipsFromAvidMediaFilesFolderRequestBody.setMediaFolderPath(mediaFolder);
    if (mediaFile1 != "")
        createClipsFromAvidMediaFilesFolderRequestBody.addMediaFilePath(mediaFile1);
    if (mediaFile2 != "")
        createClipsFromAvidMediaFilesFolderRequestBody.addMediaFilePath(mediaFile2);
    
    createRequest.setBody(createClipsFromAvidMediaFilesFolderRequestBody);

    mcapiclient().createClipsFromAvidMediaFilesFolder(createRequest, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } 
        else
        {

        }
    });

}


var scanAvidMediaFilesFolder_submit = function () {
    const mediaFolder = document.querySelector("#scanAvidMediaFilesFolder-input").value;

    let request = new ScanAvidMediaFilesFolderRequest();

    let scanAvidMediaFilesFolderRequestBody = new ScanAvidMediaFilesFolderRequestBody;
    scanAvidMediaFilesFolderRequestBody.setDestinationPath(mediaFolder);
    request.setBody(scanAvidMediaFilesFolderRequestBody);

    mcapiclient().scanAvidMediaFilesFolder(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            create_clip();
        }
    });




}

