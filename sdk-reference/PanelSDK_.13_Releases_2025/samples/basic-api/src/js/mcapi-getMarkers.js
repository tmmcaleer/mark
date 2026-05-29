


import { GetMarkersRequest, GetMarkersRequestBody, TrackLabel, TrackType } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = '<div id="getMarkers-sample"> \
<h1>GetMarkers</h1> \
<div><table>\
    <tr>\
      <td>string&nbsp;<strong>mob_id</strong></td>\
      <td>string&nbsp;<strong>guid</strong></td></tr>\
    <tr>\
      <td><input type="text" id="mob-id-field"></td>\
      <td><input type="text" id="guid-field"></td></tr>\
    <tr><td colspan="2" style="text-align: center; background-color: rgb(228 240 245);"><strong>offset</strong></td></tr>\
    <tr>\
      <td>int32&nbsp;<strong>frame</strong></td>\
      <td>int32&nbsp;<strong>length</strong></td></tr>\
    <tr>\
      <td><input type="number" id="offset-filter-in"></td>\
      <td><input type="number" id="offset-filter-out"></td></tr>\
    <tr><td colspan="2" style="text-align: center; background-color: rgb(228 240 245);"><strong>timecode</strong></td></tr>\
   <tr>\
     <td>string&nbsp;<strong>start</strong></td>\
     <td>string&nbsp;<strong>duration</strong></td></tr>\
    <tr>\
      <td><input type="text" id="timecode-filter-in" /></td>\
      <td><input type="text" id="timecode-filter-out" /></td></tr>\
    <tr><td colspan="2" style="text-align: center; background-color: rgb(228 240 245);"><strong>track</strong></td></tr>\
    <tr>\
      <td>TrackType&nbsp;<strong>type</strong></td>\
      <td>uint32&nbsp;<strong>number</strong></td></tr>\
     <tr><td>\
       <select id="track-type-field" style="font-size: 1.2;">\
       <option value=""></option>\
         <option value="TRACKTYPE_PICTURE">Picture</option>\
         <option value="TRACKTYPE_SOUND">Sound</option>\
         <option value="TRACKTYPE_TIMECODE">Timecode</option>\
         <option value="TRACKTYPE_EDGECODE">Edgecode</option>\
         <option value="TRACKTYPE_DATA">Data</option>\
       </select></td>\
       <td><input type="number" value="0" id="track-number-field"></td></tr>\
	<tr><td colspan="2" style="text-align: center; background-color: rgb(228 240 245);"><strong> </strong></td></tr>\
	<tr>\
		<td colspan="1" style="white-space: nowrap;">\
			<input type="checkbox" id="include-svg-annotation-flag" style="vertical-align: middle;">\
			<label for="include-svg-annotation-flag" style="vertical-align: middle;">include svg annotation</label>\
		</td>\
	</tr>\
</table></div>\
<br />\
</div>';


export var load_getMarkers = function () {
    parameters.innerHTML = ""; //clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);
    submitButton.onclick = null;
    submitButton.onclick = getMarkers_submit;
}

function dateToString(seconds) {
    let d = new Date(0);
    d.setUTCSeconds(seconds);
    return d.toUTCString();
}

const TrackTypeFLAGS = {
    "TRACKTYPE_PICTURE": TrackType.TRACKTYPE_PICTURE,
    "TRACKTYPE_SOUND": TrackType.TRACKTYPE_SOUND,
    "TRACKTYPE_TIMECODE": TrackType.TRACKTYPE_TIMECODE,
    "TRACKTYPE_EDGECODE": TrackType.TRACKTYPE_EDGECODE,
    "TRACKTYPE_DATA": TrackType.TRACKTYPE_DATA,
};

var getMarkers_submit = function () {

    const mobID = document.querySelector("#mob-id-field").value;
    const guid = document.querySelector("#guid-field").value;
    const offset_in = document.querySelector("#offset-filter-in").value;
    const offset_out = document.querySelector("#offset-filter-out").value;
    const timecode_in = document.querySelector("#timecode-filter-in").value;
    const timecode_out = document.querySelector("#timecode-filter-out").value;
    const track_type = document.querySelector("#track-type-field").value;
    const track_number = document.querySelector("#track-number-field").value;
    let include_svg_annotation = document.querySelector("#include-svg-annotation-flag").checked;

    let request = new GetMarkersRequest();

    let getMarkersRequestBody = new GetMarkersRequestBody;
    getMarkersRequestBody.setMobId(mobID);
    getMarkersRequestBody.setGuid(guid);

    if (offset_in.trim().length > 0) {
        let offsetFilter = new GetMarkersRequestBody.offsetFilter;
        offsetFilter.setFrame(Number(offset_in));
        offsetFilter.setLength(Number(offset_out));
        getMarkersRequestBody.setOffset(offsetFilter);
    }
     if (timecode_in.trim().length > 0) {
        let tcFilter = new GetMarkersRequestBody.tcFilter;
        tcFilter.setStart(timecode_in);
        tcFilter.setDuration(timecode_out);
        getMarkersRequestBody.setTimecode(tcFilter);
    }
    if (track_type.length > 0) {
        let track_filter = new TrackLabel;
        track_filter.setType(TrackTypeFLAGS[track_type]);
        track_filter.setNumber(Number(track_number));
        getMarkersRequestBody.setTrack(track_filter);
    }
	if(include_svg_annotation) {
		getMarkersRequestBody.setSVGAnnotation(include_svg_annotation);
	}
    request.setBody(getMarkersRequestBody);

    mcapiclient().getMarkers(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            response_container.innerHTML = "";
            
            let markerInfoList = response.getBody().getInfoList();

            for (let markerInfo of markerInfoList) {
                let dispString = "";

                let name = markerInfo.getName();
                dispString += name + " ";
                let track_label = markerInfo.getTrackLabel();

                switch (track_label.getType()) {
                    case proto.mcapi.TrackType.TRACKTYPE_PICTURE:
                        dispString += "V";
                        break;

                    case proto.mcapi.TrackType.TRACKTYPE_SOUND:
                        dispString += "A";
                        break;

                    case proto.mcapi.TrackType.TRACKTYPE_DATA:
                        dispString += "D";
                        break;

                    case proto.mcapi.TrackType.TRACKTYPE_EDGECODE:
                        dispString += "EC";
                        break;

                    case proto.mcapi.TrackType.TRACKTYPE_TIMECODE:
                        dispString += "TC";
                        break;

                    default:
                        break;
                } 

                dispString += track_label.getNumber() + " ";

                let offset = markerInfo.getOffset();
                dispString += offset + " ";
                let timecode = markerInfo.getTimecode();
                dispString += timecode + " ";
                let marker_length = markerInfo.getLength();
                dispString += marker_length + " ";

                let username = markerInfo.getUser();
                dispString += username + " ";
                let comment = markerInfo.getComment();
                dispString += comment + " ";
                
                switch (markerInfo.getColor()) {
                    case proto.mcapi.MarkerColor.RED:
                        dispString += "Red";
                        break;

                    case proto.mcapi.MarkerColor.GREEN:
                        dispString += "Green";
                        break;

                    case proto.mcapi.MarkerColor.BLUE:
                        dispString += "Blue";
                        break;

                    case proto.mcapi.MarkerColor.CYAN:
                        dispString += "Cyan";
                        break;

                    case proto.mcapi.MarkerColor.MAGENTA:
                        dispString += "Magenta";
                        break;

                    case proto.mcapi.MarkerColor.YELLOW:
                        dispString += "Yellow";
                        break;

                    case proto.mcapi.MarkerColor.BLACK:
                        dispString += "Black";
                        break;

                    case proto.mcapi.MarkerColor.WHITE:
                        dispString += "White";
                        break;

                    case proto.mcapi.MarkerColor.NEARWHITE:
                        dispString += "NearWhite";
                        break;

                    case proto.mcapi.MarkerColor.PINK:
                        dispString += "Pink";
                        break;
                        
                    case proto.mcapi.MarkerColor.FOREST:
                        dispString += "Forest";
                        break;

                    case proto.mcapi.MarkerColor.DENIM:
                        dispString += "Denim";
                        break;

                    case proto.mcapi.MarkerColor.VIOLET:
                        dispString += "Violet";
                        break;

                    case proto.mcapi.MarkerColor.PURPLE:
                        dispString += "Purple";
                        break;

                    case proto.mcapi.MarkerColor.ORANGE:
                        dispString += "Orange";
                        break;

                    case proto.mcapi.MarkerColor.GREY:
                        dispString += "Grey";
                        break;

                    case proto.mcapi.MarkerColor.GOLD:
                        dispString += "Gold";
                        break;

                    default:
                        break;
                } 
                dispString += " ";
                let creation_date = dateToString(markerInfo.getCreationDate());
                dispString += creation_date + " ";
                let GUID = markerInfo.getGuid();
                dispString += GUID + " ";

                let svg_annotation = markerInfo.getSVGAnnotation();
                dispString += svg_annotation + " ";


                const preElement = document.createElement("pre");
                preElement.innerHTML = dispString;
                response_container.appendChild(preElement);
            }
        }
    });

}

