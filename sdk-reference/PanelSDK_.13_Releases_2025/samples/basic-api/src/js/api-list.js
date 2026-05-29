
import { load_echo } from "./mcapi-echo.js";
import { load_getBins } from "./mcapi-getBins.js";
import { load_getBinInfo } from "./mcapi-getBinInfo.js";
import { load_getBinColumnInfo } from "./mcapi-getBinColumnInfo.js";
import { load_getAppInfo } from "./mcapi-getAppInfo.js";
import { load_getHostInfo } from "./mcapi-getHostInfo.js";
import { load_getListOfBinItems } from "./mcapi-getListOfBinItems.js";
import { load_getMediaVolumeItems } from "./mcapi-getMediaVolumeItems.js";
import { load_getMediaVolumeList } from "./mcapi-getMediaVolumeList.js";
import { load_openBin } from "./mcapi-openBin.js";
import { load_createBin } from "./mcapi-createBin.js";
import { load_createCustomColumn } from "./mcapi-createCustomColumn.js";
import { load_getOpenProjectInfo } from "./mcapi-getOpenProjectInfo.js";
import { load_getMobInfo } from "./mcapi-getMobInfo.js";
import { load_loadSetting } from "./mcapi-loadSetting.js";
import { load_getListOfImportSettings } from "./mcapi-getListOfImportSettings.js";
import { load_getListOfExportSettings } from "./mcapi-getListOfExportSettings.js";
import { load_getMobTrackInfo } from "./mcapi-getMobTrackInfo.js";
import { load_addMarker } from "./mcapi-addMarker.js";
import { load_changeMarker } from "./mcapi-changeMarker.js";
import { load_loadMobsIntoViewer } from "./mcapi-LoadMobsIntoViewer.js";
import { load_selectMobsInBin } from "./mcapi-selectMobsInBin.js";
import { load_getViewerMobs } from "./mcapi-getViewerMobs.js";
import { load_getBinFromMob } from "./mcapi-getBinFromMob.js";
import { load_getMarkers } from "./mcapi-getMarkers.js";
import { load_scanAvidMediaFilesFolder } from "./mcapi-scanAvidMediaFilesFolder.js";
import { load_importFile } from "./mcapi-importFile.js";
import { load_createSubClip} from "./mcapi-createSubClip.js";
import { load_closeBin } from "./mcapi-closeBin.js";
import { load_setMobInfo } from "./mcapi-setMobInfo.js";
import { load_moveBinItems } from "./mcapi-moveBinItems.js";
import { load_copyBinItems } from "./mcapi-copyBinItems.js";
import { load_duplicateBinItems } from "./mcapi-duplicateBinItems.js";
import { load_getListOfLinkSettings } from "./mcapi-getListOfLinkSettings.js";
import { load_linkFile } from "./mcapi-linkFile.js";
import { load_getListOfJobQueues } from "./mcapi-getListOfJobQueues.js";
import { load_deleteMarkers } from "./mcapi-deleteMarkers.js";
import { load_getListOfCommands } from "./mcapi-getListOfCommands.js";
import { load_doCommand } from "./mcapi-doCommand.js";
import { load_isCommandsEnabled } from "./mcapi-isCommandsEnabled.js";
import { load_mcapi_transport_controls } from "./mcapi-transport-controls-sample.js";


export const DATA = {
    apis: [
        {
            name: "echo",
            loadContent: function () { return load_echo(); }
        },
        {
            name: "loadSetting",
            loadContent: function () { return load_loadSetting(); }
        },
        {
            name: "getAppInfo",
            loadContent: function () { return load_getAppInfo(); }
        },
        {
            name: "getHostInfo",
            loadContent: function () { return load_getHostInfo(); }
        },
        {
            name: "getListOfCommands",
            loadContent: function () { return load_getListOfCommands(); }
        },
        {
            name: "isCommandsEnabled",
            loadContent: function () { return load_isCommandsEnabled(); }
        },
        {
            name: "doCommand",
            loadContent: function () { return load_doCommand(); }
        },
        {
            name: "getListOfImportSettings",
            loadContent: function () { return load_getListOfImportSettings(); }
        },
        {
            name: "getListOfExportSettings",
            loadContent: function () { return load_getListOfExportSettings(); }
        },
        {
            name: "getListOfLinkSettings",
            loadContent: function () { return load_getListOfLinkSettings(); }
        },
        {
            name: "getListOfJobQueues",
            loadContent: function () { return load_getListOfJobQueues(); }
        },
        {
            name: "importFile",
            loadContent: function () { return load_importFile(); }
        },
        {
            name: "linkFile",
            loadContent: function () { return load_linkFile(); }
        },
        {
            name: "scanAvidMediaFilesFolder",
            loadContent: function () { return load_scanAvidMediaFilesFolder(); }
        },
        {
            name: "createSubClip",
            loadContent: function () { return load_createSubClip(); }
        },
        {
            name: "addMarker",
            loadContent: function () { return load_addMarker(); }
        },
        {
            name: "deleteMarkers",
            loadContent: function () { return load_deleteMarkers(); }
        },
        {
            name: "getMarkers",
            loadContent: function () { return load_getMarkers(); }
        },
        {
            name: "changeMarker",
            loadContent: function () { return load_changeMarker(); }
        },
        {
            name: "getViewerMobs",
            loadContent: function () { return load_getViewerMobs(); }
        },
        {
            name: "selectMobsInBin",
            loadContent: function () { return load_selectMobsInBin(); }
        },
        {
            name: "moveBinItems",
            loadContent: function () { return load_moveBinItems(); }
        },
        {
            name: "copyBinItems",
            loadContent: function () { return load_copyBinItems(); }
        },
        {
            name: "duplicateBinItems",
            loadContent: function () { return load_duplicateBinItems(); }
        },
        {
            name: "getBins",
            loadContent: function () { return load_getBins(); }
        },
        {
            name: "getBinInfo",
            loadContent: function () { return load_getBinInfo(); }
        },
        {
            name: "getBinColumnInfo",
            loadContent: function () { return load_getBinColumnInfo(); }
        },
        {
            name: "getListOfBinItems",
            loadContent: function () { return load_getListOfBinItems(); }
        },
        {
            name: "getBinFromMob",
            loadContent: function () { return load_getBinFromMob(); }
        },
        {
            name: "loadMobsIntoViewer",
            loadContent: function () { return load_loadMobsIntoViewer(); }
        },
        {
            name: "openBin",
            loadContent: function () { return load_openBin(); }
        },
        {
            name: "closeBin",
            loadContent: function () { return load_closeBin(); }
        },
        {
            name: "createBin",
            loadContent: function () { return load_createBin(); }
        },
        {
            name: "createCustomColumn",
            loadContent: function () { return load_createCustomColumn(); }
        },
        {
            name: "getOpenProjectInfo",
            loadContent: function () { return load_getOpenProjectInfo(); }
        },
        {
            name: "setMobInfo",
            loadContent: function () { return load_setMobInfo(); }
        },
        {
            name: "getMobInfo",
            loadContent: function () { return load_getMobInfo(); }
        },
        {
            name: "getMobTrackInfo",
            loadContent: function () { return load_getMobTrackInfo(); }
        },
        {
            name: "getMediaVolumeItems",
            loadContent: function () { return load_getMediaVolumeItems(); }
        },
        {
            name: "getMediaVolumeList",
            loadContent: function () { return load_getMediaVolumeList(); }
        },
        {
            name: "transportControls",
            loadContent: function () { return load_mcapi_transport_controls(); }
        },
    ]
};
