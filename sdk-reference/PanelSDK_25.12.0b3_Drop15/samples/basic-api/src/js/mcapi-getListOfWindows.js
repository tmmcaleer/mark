import { GetListOfWindowsRequest, GetListOfWindowsRequestBody } from '../grpc-web/MCAPI_Types_pb.js';
import { getMetadata, mcapiclient } from './mcapi-client.js'
import { parameters } from './dom-loader.js'
import { response_container } from './dom-loader.js'
import { submitButton } from './dom-loader.js';
import { createElementFromHTML } from './utils.js';

import "../css/main.css";
import "../css/input-elements.css";


const page = ' <br /> <br /> ';

const ALL = 0;
const VISIBLE = 1;
const ACTIVE = 2;
const TYPE = 3;

export var load_getListOfWindows = function () {
    parameters.innerHTML = "";

    const radiosHTML = `
      <div id="window-filter" style="display: flex; flex-direction: column; gap: 12px;">
        <label style="white-space: nowrap;"><input type="radio" name="windowFilter" value="all" checked> All Windows</label>
        <label style="white-space: nowrap;"><input type="radio" name="windowFilter" value="visible"> Only Visible Windows</label>
		<label style="white-space: nowrap;"><input type="radio" name="windowFilter" value="active"> Only Active Windows</label>	
        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="margin: 0; white-space: nowrap;">
		  <input type="radio" name="windowFilter" value="type"> Search Window Type</label>
          <input type="text" id="search-window-type" placeholder=" " disabled style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; width: 200px;"/>
        </div>
		<label></<label>
      </div>
      <br />
    `;

    const element = createElementFromHTML(radiosHTML + page);
    parameters.appendChild(element);

    const windowFilterDiv = document.getElementById('window-filter');
    const searchWindowType = document.getElementById('search-window-type');

	// Disable submit by default
	submitButton.disabled = true;

	function updateSubmitButtonState() {
		const selectedFilter = document.querySelector('input[name="windowFilter"]:checked').value;
		const inputValue = searchWindowType.value.trim();

		if (selectedFilter === 'type') {
			// If "Search Window Type" selected
			submitButton.disabled = inputValue === '';
		} else {
			// For all other options, enable submit
			submitButton.disabled = false;
		}
	}

    submitButton.disabled = false;

	const radioButtons = document.querySelectorAll('input[name="windowFilter"]');
	radioButtons.forEach(radio => {
		radio.addEventListener('change', () => {
			const selected = document.querySelector('input[name="windowFilter"]:checked').value;

			if (selected === 'type') {
				searchWindowType.disabled = false;
				updateSubmitButtonState(); // immediately check input value
			} else {
				searchWindowType.disabled = true;
				searchWindowType.value = '';
				submitButton.disabled = false;
			}
		});
	});

	searchWindowType.addEventListener('input', updateSubmitButtonState);

    submitButton.onclick = null;
    submitButton.onclick = GetListOfWindows_submit;
};


function GetListOfWindows_submit() {
    response_container.innerHTML = ""; // reset

    // Get the selected radio value
    const selectedFilter = document.querySelector('input[name="windowFilter"]:checked').value;
	const selectedType = document.querySelector("#search-window-type").value;

    let request = new GetListOfWindowsRequest();
    let body = new GetListOfWindowsRequestBody();

    switch (selectedFilter) {
		case 'all':
			body.setWindowsFilter(ALL);
            break;
        case 'visible':
            body.setWindowsFilter(VISIBLE);
            break;
        case 'active':
            body.setWindowsFilter(ACTIVE);
            break;			
        case 'type':
            body.setWindowsFilter(TYPE);
			body.setWindowsType(selectedType);
            break;
        default:
            break;
    }

    request.setBody(body);

    mcapiclient().getListOfWindows(request, getMetadata(), (err, response) => {
        if (err) {
            const errMessage = `Unexpected error: code = ${err.code}` +
                `, message = "${err.message}"`;
            const textNode = document.createTextNode(errMessage);
            response_container.appendChild(textNode);
            console.log(errMessage);
            mcapi.reportError(err.code, err.message);
        } else {
            const windowsList = response.getBody().getWindowsList();
			if (!windowsList || windowsList.length === 0) {
				response_container.innerHTML = "No windows found.";
				return;
			}

			// Display the data in table
			const table = document.createElement("table");
			
			if(windowsList.length === 1 && windowsList[0].getType() ==="InvalidWindowType") {
				const row = document.createElement("tr");
				const cell = document.createElement("td");
				cell.textContent = "Window Type is invalid. Please provide a valid window type";
				row.appendChild(cell);
				table.appendChild(row);
			} else {
				table.style.borderCollapse = "collapse";
				table.style.width = "100%";
				table.style.marginTop = "1em";

				// Table headers
				const allHeaders = ["Id", "Name", "Type", "Visibility", "InstanceType", "Active/Inactive"];
				let visibleIndexes = [0, 1, 2, 3, 4, 5]; // By default, show all

				// Exclude columns based on selected filter
				if (selectedFilter === 'visible') {
					visibleIndexes = visibleIndexes.filter(index => index !== 3); // exclude 'Visibility'
				} else if (selectedFilter === 'type') {
					visibleIndexes = visibleIndexes.filter(index => index !== 2); // optionally exclude 'Type'
				} else if (selectedFilter === 'active') {
					visibleIndexes = visibleIndexes.filter(index => index !== 5); // exclude 'Active/Inactive'
				}

				const headerRow = document.createElement("tr");
				visibleIndexes.forEach(index => {
					const th = document.createElement("th");
					th.textContent = allHeaders[index];
					th.style.border = "1px solid #ccc";
					th.style.padding = "8px";
					th.style.backgroundColor = "#f2f2f2";
					th.style.textAlign = "left";
					headerRow.appendChild(th);
				});
				table.appendChild(headerRow);

				// Sort by Id
				const sortedWindows = windowsList.slice().sort((a, b) => {
					const aId = a.getId() || '';
					const bId = b.getId() || '';
					return aId.localeCompare(bId);
				});

				// Create rows
				sortedWindows.forEach(win => {
					const row = document.createElement("tr");

					const id = win.getId();
					const name = win.getName();
					const type = win.getType();
					const visibility = win.getVisibility() ? "Visible" : "Hidden";
					const instanceType = win.getInstancetype() ? "Multi-Instance" : "Single Instance";
					const active = win.getActive() ? "Active" : "Inactive";

					const cells = [id, name, type, visibility, instanceType, active];

					visibleIndexes.forEach(index => {
						const td = document.createElement("td");
						td.textContent = cells[index];
						td.style.border = "1px solid #ccc";
						td.style.padding = "8px";
						td.style.whiteSpace = "nowrap";
						row.appendChild(td);
					});

					table.appendChild(row);
				});
			}
			// Replace previous content with new table
			response_container.innerHTML = "";
			response_container.appendChild(table);
        }
    });
}