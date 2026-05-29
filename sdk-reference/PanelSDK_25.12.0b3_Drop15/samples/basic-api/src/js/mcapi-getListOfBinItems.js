


import { GetListOfBinItemsRequest, GetListOfBinItemsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div>Bin relative path: <input type="text" id="bin-relative-path"> <br> \
<input type="checkbox" id="getListOfBinItems-only-visible-flag"> Only visible items<br>\
<input type="checkbox" id="getListOfBinItems-only-selected-flag"> Only selected items<br><br>\
Types:<br> \
<input type="checkbox" id="ALLTYPES"> All<br>\
<input type="checkbox" id="MASTERCLIPS"> Master clips<br>\
<input type="checkbox" id="LINKEDMASTERCLIPS"> Linked master clips<br>\
<input type="checkbox" id="SUBCLIPS"> Subclips<br>\
<input type="checkbox" id="SEQUENCES"> Sequences<br>\
<input type="checkbox" id="SOURCES"> Sources<br>\
<input type="checkbox" id="EFFECTS"> Effects<br>\
<input type="checkbox" id="MOTIONEFFECTS"> Motion effects<br>\
<input type="checkbox" id="PRECOMPSRE"> Precompute Clips - Rendered Effects<br>\
<input type="checkbox" id="PRECOMPSTMK"> Precompute Clips - Titles and Matte Keys<br>\
<input type="checkbox" id="GROUPS"> Groups<br>\
<input type="checkbox" id="STEREOSCOPICCLIPS"> Stereoscopic Clips<br>\
</div>';


export var load_getListOfBinItems = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    submitButton.onclick = null;
    submitButton.onclick =  getListOfBinItems_submit;
}

const FLAGS = [
    { key: "ALLTYPES", value: GetListOfBinItemsRequestBody.BinItemFlags.ALLTYPES },
    { key: "MASTERCLIPS", value: GetListOfBinItemsRequestBody.BinItemFlags.MASTERCLIPS },
    { key: "LINKEDMASTERCLIPS", value: GetListOfBinItemsRequestBody.BinItemFlags.LINKEDMASTERCLIPS },
    { key: "SUBCLIPS", value: GetListOfBinItemsRequestBody.BinItemFlags.SUBCLIPS },
    { key: "SEQUENCES", value: GetListOfBinItemsRequestBody.BinItemFlags.SEQUENCES },
    { key: "SOURCES", value: GetListOfBinItemsRequestBody.BinItemFlags.SOURCES },
    { key: "EFFECTS", value: GetListOfBinItemsRequestBody.BinItemFlags.EFFECTS },
    { key: "MOTIONEFFECTS", value: GetListOfBinItemsRequestBody.BinItemFlags.MOTIONEFFECTS },
    { key: "PRECOMPSRE", value: GetListOfBinItemsRequestBody.BinItemFlags.PRECOMPSRE },
    { key: "PRECOMPSTMK", value: GetListOfBinItemsRequestBody.BinItemFlags.PRECOMPSTMK },
    { key: "GROUPS", value: GetListOfBinItemsRequestBody.BinItemFlags.GROUPS },
    { key: "STEREOSCOPICCLIPS", value: GetListOfBinItemsRequestBody.BinItemFlags.STEREOSCOPICCLIPS },
];

function getbinFlags() {
    let flags = [];
    FLAGS.filter(function (item) {
        const node = document.querySelector("#" + item.key);
        return node.checked;
    }).forEach(function(item){
        flags.push(item.value);
    });

    // By default get all types
    if (flags.length === 0)
        flags = [GetListOfBinItemsRequestBody.BinItemFlags.ALLTYPES];

    return flags;
}

function getListOfBinItems_submit() {
    response_container.innerHTML = ""; // reset

    let getListOfBinItems_bin_path_input = document.querySelector("#bin-relative-path");
    let getListOfBinItems_only_visible = document.querySelector("#getListOfBinItems-only-visible-flag");
    let getListOfBinItems_only_selected = document.querySelector("#getListOfBinItems-only-selected-flag");


    const relativePath = getListOfBinItems_bin_path_input.value;
    const onlyVisibleFlag = getListOfBinItems_only_visible.checked;
    const onlySelectedFlag = getListOfBinItems_only_selected.checked;

    let request = new GetListOfBinItemsRequest();
    let body = new GetListOfBinItemsRequestBody();
    body.setBinRelativePath(relativePath);

    const binFlags = getbinFlags();
    body.setBinFlagsList(binFlags);

    body.setOnlyVisibleFlag(onlyVisibleFlag);
    body.setOnlySelectedFlag(onlySelectedFlag);

    request.setBody(body);

    let stream = mcapiclient().getListOfBinItems(request, getMetadata());
    stream.on('data', (response) => {
        const linebreak = document.createElement("br");
        const mobItem = JSON.stringify(response.toObject(), null, 4);
        const textNode = document.createTextNode(mobItem);
        response_container.appendChild(textNode);
        response_container.appendChild(linebreak);
    });
    stream.on('error', (err) => {
        const errMessage = `Unexpected stream error: code = ${err.code}` +
        `, message = "${err.message}"`;
        const textNode = document.createTextNode(errMessage);
        response_container.appendChild(textNode);
        console.log(errMessage);
        mcapi.reportError(err.code, err.message);
    });
    stream.on('status', (status) => {
        console.log(status);
    });
    stream.on('end', () => {
        console.log(`Completed`);
    });
}
