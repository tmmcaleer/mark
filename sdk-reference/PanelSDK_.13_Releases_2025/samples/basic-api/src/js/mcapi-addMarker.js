


import { AddMarkerRequest, AddMarkerRequestBody, TrackLabel, TrackType, MarkerColor } from '../grpc-web/MCAPI_Types_pb.js';
import { RequestHeader } from '../grpc-web/MCAPI_Types_pb.js';

import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="addMarker-sample"> \
		<h1>AddMarker</h1> \
		<div>\
			<table>\
				<tr>\
					<td><label for="mob-id-field"><strong>mob_id</strong><br>string</label></td>\
					<td><input type="text" id="mob-id-field"></td>\
				</tr>\
				<tr>\
					<td><label for="track-label-field"><strong>track_label</strong><br>mcapi.TrackLabel</label></td>\
					<td>\
                        <table>\
                            <tr>\
                                <td>\
                                    <label for="track-type-field"><strong>type</strong><br>\
                                    mcapi.TrackType</label>\
                                </td>\
                                <td>\
                                    <select id="track-type-field">\
                                        <option value="TRACKTYPE_PICTURE">Picture</option>\
                                        <option value="TRACKTYPE_SOUND">Sound</option>\
                                        <option value="TRACKTYPE_TIMECODE">Timecode</option>\
                                        <option value="TRACKTYPE_EDGECODE">Edgecode</option>\
                                        <option value="TRACKTYPE_DATA">Data</option>\
                                    </select>\
                                </td>\
                            </tr>\
                            <tr>\
                                <td>\
                                    <label for="track-number-field"><strong>number</strong><br>\
                                    uint32</label>\
                                </td>\
                                <td>\
                                    <input type="number" size="28" value="0" id="track-number-field">\
                                </td>\
                            </tr>\
                        </table>\
					</td>\
				</tr>\
				<tr>\
					<td><label for="Offset-field"><strong>Offset</strong><br>int32</label></td>\
					<td><input type="number" size="28" value="0" id="Offset-field"></td>\
				</tr>\
				<tr>\
					<td><label for="timecode-field"><strong>timecode</strong><br>string</label></td>\
					<td><input type="text" cols="40" rows="1" id="timecode-field"></td>\
				</tr>\
				<tr>\
					<td><label for="length-field"><strong>length</strong><br>int32</label></td>\
					<td><input type="number" size="28" value="1" id="length-field"></td>\
				</tr>\
				<tr>\
					<td><label for="comment-field"><strong>comment</strong><br>string</label></td>\
					<td><textarea cols="40" rows="1" id="comment-field"></textarea></td>\
				</tr>\
				<tr>\
					<td><label for="color-field"><strong>color</strong><br>mcapi.MarkerColor</label></td>\
					<td>\
						<select id="color-field">\
							<option value="Red">Red</option>\
							<option value="Green">Green</option>\
							<option value="Blue">Blue</option>\
							<option value="Cyan">Cyan</option>\
							<option value="Magenta">Magenta</option>\
							<option value="Yellow">Yellow</option>\
							<option value="Black">Black</option>\
							<option value="White">White</option>\
							<option value="NearWhite">NearWhite</option>\
							<option value="Pink">Pink</option>\
							<option value="Forest">Forest</option>\
							<option value="Denim">Denim</option>\
							<option value="Violet">Violet</option>\
							<option value="Purple">Purple</option>\
							<option value="Orange">Orange</option>\
							<option value="Grey">Grey</option>\
							<option value="Gold">Gold</option>\
						</select>\
					</td>\
				</tr>\
				<tr>\
					<td><label for="name-field"><strong>name</strong><br>string</label></td>\
					<td><textarea cols="40" rows="1" id="name-field"></textarea></td>\
				</tr>\
				<tr>\
					<td><label for="file-input"><strong>svg annotation</strong><br>Upload a file</label></td>\
					<td>\
						<button id="file-upload-btn" style="padding: 6px 12px; background-color: #007BFF; color: white; border: none; border-radius: 4px; cursor: pointer;">Upload SVG</button>\
						<input type="file" id="file-input" style="display: none;">\
						<span id="file-name" style="margin-left: 10px; font-style: italic; color: #333;"></span>\
					</td>\
				</tr>\
			</table>\
		</div>\
		<br /> \
		<br /> \
	</div>';

let cachedFile = null;

export var load_addMarker = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    const fileButton = document.getElementById("file-upload-btn");
    const fileInput = document.getElementById("file-input");
    const fileNameSpan = document.getElementById("file-name");
    fileInput.setAttribute("accept", ".svg"); // set .svg restriction

    fileButton.addEventListener("click", () => {
        fileInput.click();
    });

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) {
        cachedFile = file;
        fileNameSpan.textContent = file.name;
    }
});

    submitButton.onclick = null;
    submitButton.onclick =  addMarker_submit;
}

const TrackTypeFLAGS = {
    "TRACKTYPE_PICTURE": TrackType.TRACKTYPE_PICTURE,
    "TRACKTYPE_SOUND": TrackType.TRACKTYPE_SOUND,
    "TRACKTYPE_TIMECODE": TrackType.TRACKTYPE_TIMECODE,
    "TRACKTYPE_EDGECODE": TrackType.TRACKTYPE_EDGECODE,
    "TRACKTYPE_DATA": TrackType.TRACKTYPE_DATA,
};

const MarkerColorFLAGS = {
    "Red": MarkerColor.RED,
    "Green": MarkerColor.GREEN,
    "Blue": MarkerColor.BLUE,
    "Cyan": MarkerColor.CYAN,
    "Magenta": MarkerColor.MAGENTA,
    "Yellow": MarkerColor.YELLOW,
    "Black": MarkerColor.BLACK,
    "White": MarkerColor.WHITE,
    "NearWhite": MarkerColor.NEARWHITE,
    "Pink": MarkerColor.PINK,
    "Forest": MarkerColor.FOREST,
    "Denim": MarkerColor.DENIM,
    "Violet": MarkerColor.VIOLET,
    "Purple": MarkerColor.PURPLE,
    "Orange": MarkerColor.ORANGE,
    "Grey": MarkerColor.GREY,
    "Gold": MarkerColor.GOLD,
};

var addMarker_submit = function () {

    const name = document.querySelector("#name-field").value;
    const comment = document.querySelector("#comment-field").value;
    const length = document.querySelector("#length-field").value;
    const timecode = document.querySelector("#timecode-field").value;
    const Offset = document.querySelector("#Offset-field").value;
    const mob_id = document.querySelector("#mob-id-field").value;
    const track_label_number = document.querySelector("#track-number-field").value;
    const color = document.querySelector("#color-field").value;
    const type = document.querySelector("#track-type-field").value;
	const file = cachedFile;

    if (file) {
        const reader = new FileReader();

        reader.onload = function (event) {
            const svg_annotation = event.target.result;

            let request = new AddMarkerRequest();

            let markerRequestBody = new AddMarkerRequestBody();
            markerRequestBody.setName(name);
            markerRequestBody.setColor(MarkerColorFLAGS[color]);
            markerRequestBody.setComment(comment);
            markerRequestBody.setLength(Number(length));
            markerRequestBody.setTimecode(timecode);
            markerRequestBody.setOffset(Number(Offset));
            markerRequestBody.setMobId(mob_id);

            let trackLabel = new TrackLabel();
            trackLabel.setType(TrackTypeFLAGS[type]);
            trackLabel.setNumber(Number(track_label_number));
            markerRequestBody.setTrackLabel(trackLabel);

            markerRequestBody.setSVGAnnotation(svg_annotation);
            request.setBody(markerRequestBody);

            mcapiclient().addMarker(request, getMetadata(), (err, response) => {
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
        };

        reader.onerror = function (event) {
            console.error("Error reading svg file:", event.target.error);
        };

        reader.readAsText(file); // Start reading the file (async)
    } else {
        alert("Please upload an SVG file before submitting.");
    }
};

