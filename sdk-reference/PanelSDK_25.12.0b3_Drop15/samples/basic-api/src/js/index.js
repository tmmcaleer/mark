
import { masterList } from "./dom-loader";
import { DATA } from "./api-list";

import "../css/main.css";
import "../css/input-elements.css";
import "../css/master-detail.css";

let init = function () {
    loadMaster(DATA.apis);
}

let loadMaster = function (apis) {
    let df = document.createDocumentFragment();
    apis.forEach(api => {
        let li = document.createElement('li');
        li.textContent = api.name;
        li.className = 'person';
        li.addEventListener('click', showDetails);
        df.appendChild(li);
    });
    masterList.appendChild(df);
}

let showDetails = function (ev) {
    const text = ev.target.innerHTML;

    let oldActive = document.querySelector('.active');
    (oldActive) ? oldActive.classList.remove('active') : null;
    ev.target.classList.add('active');

    let activeApi;
    DATA.apis.forEach(api => {
        if (api.name == text) {
            activeApi = api;
        }
    });

    activeApi.loadContent();
}

document.addEventListener('DOMContentLoaded', init);