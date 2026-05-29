import { DeleteMarkersRequest, DeleteMarkersRequestBody, TrackLabel, TrackType, MarkerColor } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="deleteMarkers-sample"> \
<h1>DeleteMarkers</h1> \
<input type="text" id="MobId-input"  placeholder="Mob Id"></input><br> \
<input type="text" id="Guid-1-input"  placeholder="Guid"></input><br> \
<input type="text" id="Guid-2-input"  placeholder="Guid"></input><br> \
<input type="text" id="StartTimecode-input"  placeholder="Start Timecode"></input><br> \
<input type="text" id="EndTimecode-input"  placeholder="End Timecode"></input><br> \
<select id="color-field">\
    <option value=""></option>\
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
</select><br>\
<label for="track-number-field">Track number:<br>\
<input type="number" size="28" value="0" id="track-number-field"><br>\
<select id="track-type-field">\
    <option value=""></option>\
    <option value="TRACKTYPE_PICTURE">Picture</option>\
    <option value="TRACKTYPE_SOUND">Sound</option>\
    <option value="TRACKTYPE_TIMECODE">Timecode</option>\
    <option value="TRACKTYPE_EDGECODE">Edgecode</option>\
    <option value="TRACKTYPE_DATA">Data</option>\
</select>\
<br /> \
<br /> \
</div>';

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

const TrackTypeFLAGS = {
    "TRACKTYPE_PICTURE": TrackType.TRACKTYPE_PICTURE,
    "TRACKTYPE_SOUND": TrackType.TRACKTYPE_SOUND,
    "TRACKTYPE_TIMECODE": TrackType.TRACKTYPE_TIMECODE,
    "TRACKTYPE_EDGECODE": TrackType.TRACKTYPE_EDGECODE,
    "TRACKTYPE_DATA": TrackType.TRACKTYPE_DATA,
};

export var load_deleteMarkers = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = deleteMarkers_submit;
}

var deleteMarkers_submit = function () {
    const type = document.querySelector("#track-type-field").value;
    const track_label_number = document.querySelector("#track-number-field").value;
    const mob_id = document.querySelector("#MobId-input").value;
    const Guid_1 = document.querySelector("#Guid-1-input").value;
    const Guid_2 = document.querySelector("#Guid-2-input").value;
    const startTimecode = document.querySelector("#StartTimecode-input").value;
    const endTimecode = document.querySelector("#EndTimecode-input").value;
    const color = document.querySelector("#color-field").value;

    let request = new DeleteMarkersRequest();

    let deleteMarkersRequestBody = new DeleteMarkersRequestBody;
    
    if (type != "" && track_label_number != "")
    {
        let trackLabel = new TrackLabel;
        trackLabel.setType(TrackTypeFLAGS[type]);
        trackLabel.setNumber(Number(track_label_number));
    
        deleteMarkersRequestBody.setTrackLabel(trackLabel);
    }

    deleteMarkersRequestBody.setMobId(mob_id);
    if (Guid_1)
        deleteMarkersRequestBody.addGuid(Guid_1);
    if (Guid_2)
        deleteMarkersRequestBody.addGuid(Guid_2);
    if (startTimecode)
        deleteMarkersRequestBody.setTimecodeRangeStart(startTimecode);
    if (endTimecode)
        deleteMarkersRequestBody.setTimecodeRangeEnd(endTimecode);
    if (color)
        deleteMarkersRequestBody.setColor(MarkerColorFLAGS[color]);

    request.setBody(deleteMarkersRequestBody);

    mcapiclient().deleteMarkers(request, getMetadata(), (err, response) => {
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

