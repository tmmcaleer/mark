// mcapi-transport-controls-sample.js

import { StartPlayRequest, StartPlayRequestBody, StopPlayRequest, StopPlayRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js';
import { parameters } from './dom-loader.js';
import { response_container } from './dom-loader.js';
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";

const page = `
<div id="mcapi-transport-controls-sample">
  <h1>Transport Controls</h1>
  <div>
    <table>
      <tr>
        <td>string&nbsp;<strong>mob_id</strong></td>
        <td>int32&nbsp;<strong>offset</strong></td>
        <td>string&nbsp;<strong>timecode</strong></td>
      </tr>
      <tr>
        <td style="padding-right: 20px;">
            <input type="text" id="mobIdInput" value="2">
        </td>
        <td style="padding-right: 20px;">
            <input type="number" id="offsetInput" value="-1">
        </td>
        <td>
            <input type="text" id="timecodeInput" value="00:00:00:04">
        </td>
      </tr>
      <tr><td></td></tr>
      <tr><td></td></tr>
      <tr>
        <td colspan="3" style="text-align: left; padding-right: 20px; background-color: #e4f0f5;">
          <label>
            <input type="radio" name="playback" id="startRadio" value="start" checked> Start Playback
          </label>
          &nbsp;&nbsp;
          <label>
            <input type="radio" name="playback" id="stopRadio" value="stop"> Stop Playback
          </label>
        </td>
      </tr>
      <tr><td></td></tr>
      <tr><td></td></tr>
    </table>
  </div>
  <div id="transportStatus" style="margin-top:12px;"></div>
</div>
`.trim();

export function load_mcapi_transport_controls() {
    parameters.innerHTML = ""; // clear old content
    const element = createElementFromHTML(page);
    parameters.appendChild(element);

    submitButton.onclick = () => {
        const startSelected = document.getElementById('startRadio').checked;
        if (startSelected) {
            startPlay_submit();
        } else {
            stopPlay_submit();
        }
    };
}

function showStatus(message, isError = false) {
  const statusDiv = document.getElementById('transportStatus');
  if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.style.color = isError ? 'red' : 'green';
  }
}

function startPlay_submit() {
    const mobId = document.getElementById('mobIdInput').value;
    const offsetStr = document.getElementById('offsetInput').value;
    const timecode = document.getElementById('timecodeInput').value;
    const offset = offsetStr !== "" ? parseInt(offsetStr, 10) : -1;

    if (!mobId) {
        showStatus('Mob ID is optional. Attempting to play whatever it loaded in the active monitor', false);
    }

    const request = new StartPlayRequest();
    const body = new StartPlayRequestBody();
    body.setMobId(mobId);
    body.setOffset(isNaN(offset) ? -1 : offset);
    body.setTimecode(timecode || "");
    request.setBody(body);

    mcapiclient().startPlay(request, getMetadata(), (err, response) => {
        if (err) {
            showStatus(`Request Failed: ${err.message}`, true);
        } else {
            showStatus('Playback Started !');
        }
    });
};

function stopPlay_submit() {
    const mobId = document.getElementById('mobIdInput').value;

    if (mobId) {
        showStatus('Mob ID is not required to signal stop play.', false);
    }

    const request = new StopPlayRequest();
    const body = new StopPlayRequestBody();
    request.setBody(body);

    mcapiclient().stopPlay(request, getMetadata(), (err, response) => {
        if (err) {
            showStatus(`Request Failed: ${err.message}`, true);
        } else {
            showStatus('Playback Stopped !');
        }
    });
};
