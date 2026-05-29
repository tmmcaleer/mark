import {
  AddMarkersRequest,
  AddMarkersRequestBody,
  CommandErrorType,
  ExportFileRequest,
  ExportFileRequestBody,
  GetBinFromMobRequest,
  GetBinFromMobRequestBody,
  GetListOfBinItemsRequest,
  GetListOfBinItemsRequestBody,
  GetListOfExportSettingsRequest,
  GetListOfExportSettingsRequestBody,
  GetMarkersRequest,
  GetMarkersRequestBody,
  GetMobInfoRequest,
  GetMobInfoRequestBody,
  GetOpenProjectInfoRequest,
  GetOpenProjectInfoRequestBody,
  MarkerColor,
  OpenBinRequest,
  OpenBinRequestBody,
  RequestMarkerInfo,
  TrackLabel,
  TrackType
} from "../grpc-web/MCAPI_Types_pb.js";
import { MCAPIClient } from "../grpc-web/MCAPI_grpc_web_pb.js";

import "../css/main.css";
import {
  MARKER_COLORS,
  clampMarker,
  createGuid,
  markerLengthFrames,
  secondsToFrames
} from "./marker-utils.js";
import { markerInTimecode } from "./timecode-utils.mjs";

const MCAPI_ASSETLIST_MIME_TYPE = "text/x.avid.mc-api-asset-list+json";
const DEFAULT_HELPER_URL = "http://localhost:4500";
const DEFAULT_EXPORT_SETTING_NAME = "Mark 12Labs Proxy";
const DEFAULT_MARKER_NAME_STYLE = "Short editor-facing marker names. No confidence, no reasoning, no full sentences.";
const DEFAULT_MARKER_COMMENT_STYLE = "Concise Avid marker notes. No confidence, no reasoning, no full sentences.";
const EXPORT_SETTING_STORAGE_KEY = "mark.exportSettingName";
const LEGACY_MARKER_STYLE_STORAGE_KEY = "mark.markerStyle";
const MARKER_NAME_STYLE_STORAGE_KEY = "mark.markerNameStyle";
const MARKER_COMMENT_STYLE_STORAGE_KEY = "mark.markerCommentStyle";
const FAVORITE_PROMPTS_STORAGE_KEY = "mark.favoritePrompts";
const MAX_FAVORITE_PROMPTS = 20;
const POLL_INTERVAL_MS = 2000;
const MARK_MARKER_USER = "Mark";
const MARKER_WRITE_TRACK_CANDIDATES = [
  {
    label: "V1 point",
    type: TrackType.TRACKTYPE_PICTURE,
    number: 1,
    span: false
  }
];

const COLOR_FLAGS = {
  Red: MarkerColor.RED,
  Green: MarkerColor.GREEN,
  Blue: MarkerColor.BLUE,
  Cyan: MarkerColor.CYAN,
  Magenta: MarkerColor.MAGENTA,
  Yellow: MarkerColor.YELLOW,
  Black: MarkerColor.BLACK,
  White: MarkerColor.WHITE,
  NearWhite: MarkerColor.NEARWHITE,
  Pink: MarkerColor.PINK,
  Forest: MarkerColor.FOREST,
  Denim: MarkerColor.DENIM,
  Violet: MarkerColor.VIOLET,
  Purple: MarkerColor.PURPLE,
  Orange: MarkerColor.ORANGE,
  Grey: MarkerColor.GREY,
  Gold: MarkerColor.GOLD
};

const MARKER_COLOR_HEX = {
  Red: "#e35d5b",
  Green: "#62b66f",
  Blue: "#5f8fd8",
  Cyan: "#53cbd7",
  Magenta: "#d978d7",
  Yellow: "#d7c556",
  Black: "#151515",
  White: "#f3f4f5",
  NearWhite: "#d8dde4",
  Pink: "#ed8eb2",
  Forest: "#427a4e",
  Denim: "#426fa8",
  Violet: "#8d76d8",
  Purple: "#ad6bd0",
  Orange: "#df9148",
  Grey: "#878b92",
  Gold: "#d6a84d"
};

let client;
let pollTimer = null;

const state = {
  selectedAssets: [],
  project: null,
  helperConfig: null,
  exportSettings: [],
  exportSettingsLoaded: false,
  selectedExportSettingsName: "",
  favoritePrompts: [],
  activeClipIndex: -1,
  currentJobClipIndex: -1,
  activeReviewClipIndex: -1,
  batchConfig: null,
  batchPrompt: "",
  lastPrompt: "",
  viewMode: "drop",
  previousViewMode: "drop",
  isBusy: false
};

const dom = {};

function initDom() {
  [
    "view-subtitle",
    "drop-view",
    "prompt-view",
    "busy-view",
    "review-view",
    "settings-view",
    "drop-area",
    "drop-empty",
    "select-bin-button",
    "clip-tray",
    "selected-clip-list",
    "clear-clips-button",
    "asset-name",
    "asset-details",
    "project-rate",
    "project-details",
    "marker-prompt",
    "prompt-favorites-toggle",
    "favorite-prompts-popover",
    "favorite-prompt-select",
    "save-favorite-prompt-button",
    "delete-favorite-prompt-button",
    "analyze-button",
    "apply-button",
    "status-message",
    "progress-stage",
    "progress-detail",
    "progress-bar",
    "review-content",
    "review-clip-tabs",
    "preview-count",
    "preview-empty",
    "suggestion-list",
    "helper-url",
    "check-helper-button",
    "connection-status",
    "helper-status-dot",
    "api-key-status",
    "api-key-status-dot",
    "export-setting-select",
    "refresh-export-settings-button",
    "export-setting-summary",
    "marker-name-style",
    "marker-comment-style",
    "settings-toggle",
    "export-setting-dialog",
    "export-setting-dialog-settings-button",
    "export-setting-dialog-close-button"
  ].forEach(function cache(id) {
    dom[id] = document.getElementById(id);
  });
  dom["app-shell"] = document.querySelector(".app-shell");
}

function setStatus(message, isError) {
  dom["status-message"].textContent = message;
  dom["status-message"].classList.toggle("error", Boolean(isError));
}

function avidErrorSummary(prefix, error) {
  const message = error && error.message ? error.message : String(error || "Unknown error");
  const details = parseAvidJsonError(message);
  if (details && details.ErrorMessage) {
    return `${prefix}: ${details.ErrorMessage} (Avid ErrorType ${details.ErrorType})`;
  }
  if (error && error.code !== undefined) {
    return `${prefix}: ${message} (code ${error.code})`;
  }
  return `${prefix}: ${message}`;
}

function setProgress(value) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  dom["progress-bar"].style.width = `${width}%`;
}

function subtitleForView(viewMode) {
  if (viewMode === "prompt") {
    return "Tell me what to find in these clips.";
  }
  if (viewMode === "busy") {
    return "Analyzing clips and building marker suggestions.";
  }
  if (viewMode === "review") {
    return "Review and edit markers before applying.";
  }
  if (viewMode === "settings") {
    return "Configure helper, export, and marker output.";
  }
  return "Drop clips in from an Avid bin.";
}

function setViewMode(viewMode) {
  if (viewMode !== "settings") {
    state.previousViewMode = viewMode;
  }

  state.viewMode = viewMode;
  dom["app-shell"].dataset.view = viewMode;
  ["drop", "prompt", "busy", "review", "settings"].forEach(function updateView(name) {
    const section = dom[`${name}-view`];
    if (section) {
      section.classList.toggle("hidden", name !== viewMode);
    }
  });

  const isSettings = viewMode === "settings";
  dom["settings-toggle"].setAttribute("aria-expanded", String(isSettings));
  dom["settings-toggle"].textContent = isSettings ? "×" : "⚙";
  dom["settings-toggle"].setAttribute("aria-label", isSettings ? "Close settings" : "Settings");
  dom["settings-toggle"].setAttribute("title", isSettings ? "Close settings" : "Settings");
  dom["view-subtitle"].textContent = subtitleForView(viewMode);
  setFavoritePromptPopoverOpen(false);
}

function openSettings() {
  state.previousViewMode = state.viewMode === "settings" ? state.previousViewMode : state.viewMode;
  setViewMode("settings");
}

function closeSettings() {
  setViewMode(state.previousViewMode || inferMainViewMode());
}

function inferMainViewMode() {
  if (state.isBusy) {
    return "busy";
  }
  if (totalMarkerCount() > 0 || state.selectedAssets.some(function hasFinished(asset) {
    return asset.status === "ready" || asset.status === "failed";
  })) {
    return "review";
  }
  if (state.selectedAssets.length > 0) {
    return "prompt";
  }
  return "drop";
}

function selectedUnappliedMarkerCount() {
  return state.selectedAssets.reduce(function countMarkers(total, asset) {
    if (asset.applied) {
      return total;
    }
    return total + (asset.markers || []).filter(function selectedOnly(marker) {
      return marker.use !== false;
    }).length;
  }, 0);
}

function totalMarkerCount() {
  return state.selectedAssets.reduce(function countMarkers(total, asset) {
    return total + (asset.markers || []).length;
  }, 0);
}

function updateApplyButtonLabel() {
  const count = selectedUnappliedMarkerCount();
  dom["apply-button"].textContent = count > 0
    ? `Apply ${count} Selected Marker${count === 1 ? "" : "s"}`
    : "Apply Selected Markers";
}

function setBusy(isBusy) {
  state.isBusy = Boolean(isBusy);
  const hasPrompt = Boolean(dom["marker-prompt"].value.trim());
  const canAnalyze = state.selectedAssets.length > 0 && hasPrompt;

  dom["analyze-button"].disabled = state.isBusy || !canAnalyze;
  dom["apply-button"].disabled = state.isBusy || selectedUnappliedMarkerCount() === 0;
  dom["select-bin-button"].disabled = state.isBusy;
  dom["clear-clips-button"].disabled = state.isBusy;
  dom["save-favorite-prompt-button"].disabled = !hasPrompt;
  dom["delete-favorite-prompt-button"].disabled = !dom["favorite-prompt-select"].value;
  updateApplyButtonLabel();
}

function helperBaseUrl() {
  return (dom["helper-url"].value || DEFAULT_HELPER_URL).replace(/\/+$/, "");
}

function savedExportSettingName() {
  try {
    return window.localStorage.getItem(EXPORT_SETTING_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function saveExportSettingName(settingName) {
  try {
    if (settingName) {
      window.localStorage.setItem(EXPORT_SETTING_STORAGE_KEY, settingName);
    } else {
      window.localStorage.removeItem(EXPORT_SETTING_STORAGE_KEY);
    }
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
  }
}

function localStorageItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function savedMarkerStyleText(key, fallback) {
  const saved = localStorageItem(key);
  if (saved !== null) {
    return saved || fallback;
  }

  return localStorageItem(LEGACY_MARKER_STYLE_STORAGE_KEY) || fallback;
}

function markerOutputStyle() {
  return {
    nameStyle: (dom["marker-name-style"].value || DEFAULT_MARKER_NAME_STYLE).trim(),
    commentStyle: (dom["marker-comment-style"].value || DEFAULT_MARKER_COMMENT_STYLE).trim()
  };
}

function saveMarkerOutputStyle() {
  const style = markerOutputStyle();
  try {
    window.localStorage.setItem(MARKER_NAME_STYLE_STORAGE_KEY, style.nameStyle);
    window.localStorage.setItem(MARKER_COMMENT_STYLE_STORAGE_KEY, style.commentStyle);
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
  }
}

function loadMarkerOutputStyle() {
  dom["marker-name-style"].value = savedMarkerStyleText(MARKER_NAME_STYLE_STORAGE_KEY, DEFAULT_MARKER_NAME_STYLE);
  dom["marker-comment-style"].value = savedMarkerStyleText(MARKER_COMMENT_STYLE_STORAGE_KEY, DEFAULT_MARKER_COMMENT_STYLE);
}

function loadFavoritePrompts() {
  try {
    const raw = window.localStorage.getItem(FAVORITE_PROMPTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(function normalize(prompt) {
        return String(prompt || "").trim();
      }).filter(Boolean).slice(0, MAX_FAVORITE_PROMPTS)
      : [];
  } catch (error) {
    return [];
  }
}

function saveFavoritePrompts(prompts) {
  state.favoritePrompts = prompts.slice(0, MAX_FAVORITE_PROMPTS);
  try {
    window.localStorage.setItem(FAVORITE_PROMPTS_STORAGE_KEY, JSON.stringify(state.favoritePrompts));
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
  }
  renderFavoritePrompts();
}

function renderFavoritePrompts() {
  const select = dom["favorite-prompt-select"];
  if (!select) {
    return;
  }

  const previous = select.value;
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = state.favoritePrompts.length > 0 ? "Favorite prompts" : "No favorites yet";
  select.appendChild(placeholder);

  state.favoritePrompts.forEach(function addPrompt(prompt) {
    const option = document.createElement("option");
    option.value = prompt;
    option.textContent = prompt;
    select.appendChild(option);
  });

  select.value = state.favoritePrompts.indexOf(previous) === -1 ? "" : previous;
  setBusy(state.isBusy);
}

function saveCurrentFavoritePrompt() {
  const prompt = dom["marker-prompt"].value.trim();
  if (!prompt) {
    setStatus("Write a prompt before saving it as a favorite.", true);
    return;
  }

  const lowerPrompt = prompt.toLowerCase();
  const nextPrompts = [prompt].concat(state.favoritePrompts.filter(function uniqueFavorite(existing) {
    return existing.toLowerCase() !== lowerPrompt;
  })).slice(0, MAX_FAVORITE_PROMPTS);

  saveFavoritePrompts(nextPrompts);
  dom["favorite-prompt-select"].value = prompt;
  setStatus("Favorite prompt saved.");
}

function deleteSelectedFavoritePrompt() {
  const prompt = dom["favorite-prompt-select"].value;
  if (!prompt) {
    return;
  }

  saveFavoritePrompts(state.favoritePrompts.filter(function keepFavorite(existing) {
    return existing !== prompt;
  }));
  setStatus("Favorite prompt removed.");
}

function setFavoritePromptPopoverOpen(isOpen) {
  dom["favorite-prompts-popover"].classList.toggle("hidden", !isOpen);
  dom["prompt-favorites-toggle"].setAttribute("aria-expanded", String(isOpen));
}

function toggleFavoritePromptPopover() {
  setFavoritePromptPopoverOpen(dom["favorite-prompts-popover"].classList.contains("hidden"));
}

function selectedExportSettingName() {
  if (dom["export-setting-select"] && dom["export-setting-select"].value) {
    return dom["export-setting-select"].value;
  }

  return state.selectedExportSettingsName || "";
}

function preferredExportSettingName(config) {
  return savedExportSettingName() || "";
}

function configuredExportSettingName(config) {
  return selectedExportSettingName() || preferredExportSettingName(config);
}

function getMetadata() {
  return {
    accessToken: mcapi.getAccessToken()
  };
}

function requestJson(method, path, body) {
  const xhr = new XMLHttpRequest();
  const url = `${helperBaseUrl()}${path}`;

  return new Promise(function request(resolve, reject) {
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.onload = function onload() {
      let payload = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch (error) {
        reject(new Error(`Invalid helper response from ${url}`));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        const message = payload && payload.error && payload.error.message
          ? payload.error.message
          : `Helper request failed with HTTP ${xhr.status}`;
        reject(new Error(message));
      }
    };
    xhr.onerror = function onerror() {
      reject(new Error(`Cannot reach helper at ${helperBaseUrl()}`));
    };
    xhr.send(body ? JSON.stringify(body) : undefined);
  });
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(function formatWord(word) {
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

function friendlyAssetType(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("sequence")) {
    return "Sequence";
  }
  if (normalized.includes("sub")) {
    return "Subclip";
  }
  if (normalized.includes("master") || normalized.includes("source")) {
    return "Source clip";
  }
  return titleCase(type) || "Source clip";
}

function candidateAssetName(asset) {
  if (!asset) {
    return "";
  }

  const directCandidates = [
    asset.name,
    asset.Name,
    asset.displayName,
    asset.mobName,
    asset.mob_name,
    asset.clipName,
    asset.clip_name,
    asset.title
  ];

  const columnCandidates = [
    asset.columns && asset.columns.Name,
    asset.columns && asset.columns.name,
    asset.columnValues && asset.columnValues.Name,
    asset.columnValues && asset.columnValues.name,
    asset.binColumns && asset.binColumns.Name,
    asset.binColumns && asset.binColumns.name
  ];

  return directCandidates.concat(columnCandidates).map(function cleanName(value) {
    return String(value || "").trim();
  }).find(Boolean) || "";
}

function fallbackAssetName(asset) {
  if (asset && asset.type) {
    return friendlyAssetType(asset.type);
  }
  return "Selected clip";
}

function friendlyAssetName(asset) {
  return candidateAssetName(asset) || fallbackAssetName(asset);
}

function renderAsset() {
  if (state.selectedAssets.length === 0) {
    dom["asset-name"].textContent = "No clips selected";
    dom["asset-details"].textContent = "";
    dom["selected-clip-list"].innerHTML = "";
    return;
  }

  const asset = state.selectedAssets[0];
  const names = state.selectedAssets.map(function assetName(item) {
    return item.displayName;
  });
  dom["asset-name"].textContent = state.selectedAssets.length === 1
    ? asset.displayName
    : `${state.selectedAssets.length} clips selected`;
  dom["asset-details"].textContent = state.selectedAssets.length === 1
    ? "Drop more clips here to add them."
    : `${names.length} clips selected. Drop more clips here to add them.`;

  dom["selected-clip-list"].innerHTML = "";
  state.selectedAssets.forEach(function renderSelectedClip(item) {
    const pill = document.createElement("span");
    pill.className = "selected-clip-pill";
    pill.textContent = item.displayName;
    dom["selected-clip-list"].appendChild(pill);
  });
}

function renderProject() {
  if (!state.project) {
    dom["project-rate"].textContent = "Unknown";
    dom["project-details"].textContent = "Project details appear after a clip is loaded.";
    return;
  }

  dom["project-rate"].textContent = `${state.project.fps.toFixed(3)} fps`;
  dom["project-details"].textContent = `${state.project.projectType || "project"}${state.project.dropFrame ? " | DF" : ""}`;
}

function formatMarkerIn(marker) {
  return markerInTimecode(marker, state.project);
}

function renderPreview() {
  const list = dom["suggestion-list"];
  const prompt = state.lastPrompt || dom["marker-prompt"].value.trim();
  const markerCount = totalMarkerCount();
  const hasRunResults = state.selectedAssets.some(function hasResult(asset) {
    return asset.status === "ready" || asset.status === "failed";
  });
  const tabs = dom["review-clip-tabs"];
  list.innerHTML = "";
  tabs.innerHTML = "";

  if (markerCount === 0 && !hasRunResults) {
    dom["preview-count"].textContent = state.selectedAssets.length > 0
      ? `${state.selectedAssets.length} clip${state.selectedAssets.length === 1 ? "" : "s"} ready for analysis.`
      : "No suggestions yet.";
    dom["preview-empty"].classList.remove("hidden");
    dom["review-content"].classList.add("hidden");
    updateApplyButtonLabel();
    setBusy(state.isBusy);
    return;
  }

  dom["preview-count"].textContent = markerCount > 0
    ? `I found ${markerCount} moment${markerCount === 1 ? "" : "s"} across ${state.selectedAssets.length} clip${state.selectedAssets.length === 1 ? "" : "s"}${prompt ? ` for "${prompt}"` : ""}.`
    : `No marker suggestions${prompt ? ` for "${prompt}"` : ""}.`;
  dom["preview-empty"].classList.add("hidden");
  dom["review-content"].classList.remove("hidden");
  const activeIndex = normalizedActiveReviewClipIndex();
  state.activeReviewClipIndex = activeIndex;

  state.selectedAssets.forEach(function renderTab(asset, assetIndex) {
    const button = document.createElement("button");
    button.className = "review-clip-tab";
    button.type = "button";
    button.dataset.assetIndex = String(assetIndex);
    button.classList.toggle("is-active", assetIndex === state.activeReviewClipIndex);
    button.addEventListener("click", function activateClip() {
      state.activeReviewClipIndex = assetIndex;
      renderPreview();
    });

    const label = document.createElement("span");
    label.textContent = asset.displayName || `Clip ${assetIndex + 1}`;
    const meta = document.createElement("small");
    meta.textContent = clipStatusLabel(asset);
    button.appendChild(label);
    button.appendChild(meta);
    tabs.appendChild(button);
  });
  const asset = state.selectedAssets[activeIndex];
  const markers = asset && asset.markers ? asset.markers : [];

  const clipGroup = document.createElement("section");
  clipGroup.className = "clip-result";
  clipGroup.dataset.assetIndex = String(activeIndex);

  const header = document.createElement("div");
  header.className = "clip-result-header";
  const title = document.createElement("h3");
  title.textContent = asset ? asset.displayName : "Clip";
  const count = document.createElement("span");
  count.textContent = `${markers.length} marker${markers.length === 1 ? "" : "s"}`;
  header.appendChild(title);
  header.appendChild(count);
  clipGroup.appendChild(header);

  const markerList = document.createElement("div");
  markerList.className = "clip-marker-list";

  if (markers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "clip-marker-empty";
    empty.textContent = asset && asset.error ? asset.error : "No marker suggestions for this clip.";
    markerList.appendChild(empty);
  } else {
    markers.forEach(function renderCard(marker, markerIndex) {
      const card = document.createElement("article");
      card.className = "suggestion-card";
      card.classList.toggle("is-muted", marker.use === false);
      card.dataset.assetIndex = String(activeIndex);
      card.dataset.markerId = marker.id || createGuid();

      const cardMeta = document.createElement("div");
      cardMeta.className = "suggestion-card-meta";

      const selectLabel = document.createElement("label");
      selectLabel.className = "suggestion-select";
      const use = document.createElement("input");
      use.className = "marker-use";
      use.type = "checkbox";
      use.checked = marker.use !== false;
      use.setAttribute("aria-label", `Use marker ${markerIndex + 1} for ${asset.displayName || "clip"}`);
      use.addEventListener("change", syncPreviewFromCards);
      selectLabel.appendChild(use);

      const timeRange = document.createElement("span");
      timeRange.className = "time-range";
      timeRange.dataset.role = "timecode";
      timeRange.textContent = formatMarkerIn(marker);

      const color = colorSelectField(marker.color);

      const nameField = document.createElement("label");
      nameField.className = "marker-field marker-field-name";
      const nameLabel = document.createElement("span");
      nameLabel.textContent = "Marker";
      const name = document.createElement("textarea");
      name.className = "marker-name-input";
      name.rows = 2;
      name.value = marker.name;
      name.setAttribute("aria-label", "Marker name");
      name.addEventListener("input", syncPreviewFromCards);
      nameField.appendChild(nameLabel);
      nameField.appendChild(name);

      const commentField = document.createElement("label");
      commentField.className = "marker-field marker-field-comment";
      const commentLabel = document.createElement("span");
      commentLabel.textContent = "Comment";
      const comment = document.createElement("textarea");
      comment.className = "marker-comment-input";
      comment.rows = 3;
      comment.value = marker.comment;
      comment.setAttribute("aria-label", "Marker comment");
      comment.addEventListener("input", syncPreviewFromCards);
      commentField.appendChild(commentLabel);
      commentField.appendChild(comment);

      const startInput = document.createElement("input");
      startInput.className = "marker-start-input";
      startInput.type = "hidden";
      startInput.value = marker.startTime.toFixed(3);

      const endInput = document.createElement("input");
      endInput.className = "marker-end-input";
      endInput.type = "hidden";
      endInput.value = marker.endTime.toFixed(3);

      cardMeta.appendChild(selectLabel);
      cardMeta.appendChild(timeRange);
      cardMeta.appendChild(color);
      card.appendChild(cardMeta);
      card.appendChild(nameField);
      card.appendChild(commentField);
      card.appendChild(startInput);
      card.appendChild(endInput);
      markerList.appendChild(card);

      if (!marker.id) {
        state.selectedAssets[activeIndex].markers[markerIndex].id = card.dataset.markerId;
      }
    });
  }

  clipGroup.appendChild(markerList);
  list.appendChild(clipGroup);

  updateApplyButtonLabel();
  setBusy(state.isBusy);
}

function clipStatusLabel(asset) {
  const markerCount = (asset.markers || []).length;
  if (asset.status === "failed") {
    return "Failed";
  }
  if (markerCount > 0) {
    return `${markerCount} marker${markerCount === 1 ? "" : "s"}`;
  }
  return asset.message || "No markers";
}

function normalizedActiveReviewClipIndex() {
  if (state.activeReviewClipIndex >= 0 && state.activeReviewClipIndex < state.selectedAssets.length) {
    return state.activeReviewClipIndex;
  }

  const firstWithMarkers = state.selectedAssets.findIndex(function hasMarkers(asset) {
    return (asset.markers || []).length > 0;
  });

  return firstWithMarkers === -1 ? 0 : firstWithMarkers;
}

function markerColorHex(color) {
  return MARKER_COLOR_HEX[color] || MARKER_COLOR_HEX.Yellow;
}

function colorSelectField(value) {
  const control = document.createElement("div");
  control.className = "marker-color-control";

  const chip = document.createElement("span");
  chip.className = "marker-color-chip";
  chip.setAttribute("aria-hidden", "true");

  const select = document.createElement("select");
  select.className = "marker-color-select";

  MARKER_COLORS.forEach(function addColor(color) {
    const option = document.createElement("option");
    option.value = color;
    option.textContent = color;
    select.appendChild(option);
  });

  select.value = value;
  chip.style.backgroundColor = markerColorHex(select.value);
  select.addEventListener("change", function onColorChange() {
    chip.style.backgroundColor = markerColorHex(select.value);
    syncPreviewFromCards();
  });

  control.appendChild(chip);
  control.appendChild(select);
  return control;
}

function renderExportSettings(settings, config) {
  const select = dom["export-setting-select"];
  if (!select) {
    return;
  }

  const previous = state.selectedExportSettingsName || select.value;
  const preferred = preferredExportSettingName(config);
  const nextSelection = [previous, savedExportSettingName(), preferred].find(function findInstalled(settingName) {
    return settingName && settings.indexOf(settingName) !== -1;
  }) || "";

  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = settings.length > 0 ? "Choose export setting..." : "No export settings found";
  select.appendChild(placeholder);

  settings.forEach(function addSetting(settingName) {
    const option = document.createElement("option");
    option.value = settingName;
    option.textContent = settingName;
    select.appendChild(option);
  });

  select.value = nextSelection;
  select.disabled = settings.length === 0;
  state.selectedExportSettingsName = nextSelection;

  if (dom["export-setting-summary"]) {
    if (nextSelection) {
      dom["export-setting-summary"].textContent = `Using "${nextSelection}" for temporary proxy exports.`;
    } else if (settings.length > 0) {
      dom["export-setting-summary"].textContent = `Choose a small MP4/H.264 setting, or create one named "${DEFAULT_EXPORT_SETTING_NAME}".`;
    } else {
      dom["export-setting-summary"].textContent = `Create a small MP4/H.264 export setting named "${DEFAULT_EXPORT_SETTING_NAME}".`;
    }
  }

  setBusy(state.isBusy);
}

function syncPreviewFromCards() {
  const cards = Array.from(dom["suggestion-list"].querySelectorAll(".suggestion-card"));
  const markersByAsset = new Map();

  cards.forEach(function readCard(card) {
    const assetIndex = Number(card.dataset.assetIndex);
    const marker = {
      id: card.dataset.markerId,
      use: card.querySelector(".marker-use").checked,
      name: card.querySelector(".marker-name-input").value,
      comment: card.querySelector(".marker-comment-input").value,
      color: card.querySelector(".marker-color-select").value,
      startTime: Number(card.querySelector(".marker-start-input").value),
      endTime: Number(card.querySelector(".marker-end-input").value)
    };
    const list = markersByAsset.get(assetIndex) || [];
    list.push(clampMarker(marker));
    markersByAsset.set(assetIndex, list);
  });

  state.selectedAssets.forEach(function updateAssetMarkers(asset, index) {
    asset.markers = markersByAsset.get(index) || asset.markers || [];
  });

  cards.forEach(function updateComputedFields(card) {
    const assetIndex = Number(card.dataset.assetIndex);
    const markers = markersByAsset.get(assetIndex) || [];
    const siblingCards = Array.from(card.parentNode.querySelectorAll(".suggestion-card"));
    const marker = markers[siblingCards.indexOf(card)];
    card.classList.toggle("is-muted", marker.use === false);
    card.querySelector("[data-role='timecode']").textContent = formatMarkerIn(marker);
  });

  setBusy(state.isBusy);
}

function parseDropEvent(event) {
  if (!event.dataTransfer || !event.dataTransfer.items) {
    return [];
  }

  for (const item of event.dataTransfer.items) {
    if (item.type === MCAPI_ASSETLIST_MIME_TYPE) {
      const mimeData = event.dataTransfer.getData(MCAPI_ASSETLIST_MIME_TYPE);
      return JSON.parse(mimeData);
    }
  }
  return [];
}

function handleDrop(event) {
  event.preventDefault();
  dom["drop-area"].classList.remove("is-over");

  let dragList = [];
  try {
    dragList = parseDropEvent(event);
  } catch (error) {
    setStatus("The dropped Avid data could not be read.", true);
    return;
  }

  if (dragList.length === 0) {
    setStatus("Drop one or more source clips.", true);
    return;
  }

  const sequences = dragList.filter(function isSequence(asset) {
    return String(asset.type || "").toLowerCase() === "sequence";
  });
  if (sequences.length > 0) {
    setStatus("Sequences are not supported in Mark v1. Drop source clips or subclips.", true);
    return;
  }

  selectAssets(dragList.map(function mapAsset(asset) {
    return {
      id: asset.id,
      name: asset.name,
      displayName: asset.displayName,
      mobName: asset.mobName,
      type: asset.type,
      head: asset.head,
      inMark: asset.in,
      outMark: asset.out,
      source: "drop"
    };
  }), {
    append: state.selectedAssets.length > 0 && state.viewMode === "prompt" && !state.isBusy
  });
}

function selectAsset(asset) {
  selectAssets([asset]);
}

function selectAssets(assets, options) {
  const append = Boolean(options && options.append);
  const normalizedAssets = (assets || []).filter(function hasId(asset) {
    return asset && asset.id;
  }).map(function normalizeAsset(asset, index) {
    const sourceName = candidateAssetName(asset);
    return {
      id: asset.id,
      name: asset.name || asset.displayName || asset.mobName || "",
      displayName: sourceName || fallbackAssetName(asset),
      needsNameHydration: !sourceName,
      type: asset.type || "clip",
      head: asset.head,
      inMark: asset.inMark,
      outMark: asset.outMark,
      source: asset.source || "unknown",
      status: "idle",
      message: "Ready",
      exportTaskId: null,
      helperJobId: null,
      markers: [],
      applied: false
    };
  });

  if (normalizedAssets.length === 0) {
    setStatus("Mark could not read clip IDs from that selection.", true);
    return;
  }

  if (append) {
    const existingIds = new Set(state.selectedAssets.map(function mapId(asset) {
      return asset.id;
    }));
    state.selectedAssets = state.selectedAssets.concat(normalizedAssets.filter(function newOnly(asset) {
      return !existingIds.has(asset.id);
    }));
  } else {
    resetForNewAsset();
    state.selectedAssets = normalizedAssets;
  }

  renderAsset();
  renderPreview();
  setViewMode("prompt");
  setStatus(`Reading ${normalizedAssets.length} clip${normalizedAssets.length === 1 ? "" : "s"}...`);
  setBusy(true);
  Promise.all([
    loadProjectInfo(),
    hydrateAssetNames(normalizedAssets)
  ]).then(function loaded() {
    renderAsset();
    renderPreview();
    renderProject();
    setStatus("Ready. Tell me what to find.");
    setBusy(false);
  }).catch(function failed(error) {
    setStatus(error.message, true);
    setBusy(false);
  });
}

function resetForNewAsset() {
  cleanupRetainedJobs();
  state.selectedAssets = [];
  state.activeClipIndex = -1;
  state.currentJobClipIndex = -1;
  state.activeReviewClipIndex = -1;
  state.batchConfig = null;
  state.batchPrompt = "";
  clearPoll();
  setProgress(0);
  renderPreview();
}

function loadProjectInfo() {
  return new Promise(function load(resolve, reject) {
    const request = new GetOpenProjectInfoRequest();
    request.setBody(new GetOpenProjectInfoRequestBody());

    client.getOpenProjectInfo(request, getMetadata(), function onProjectInfo(err, response) {
      if (err) {
        reject(new Error(`Project info failed: ${err.message}`));
        mcapi.reportError(err.code, err.message);
        return;
      }

      const body = response.getBody();
      const frameRate = body.getFrameRate();
      state.project = {
        fps: frameRate.getNum() / frameRate.getDen(),
        dropFrame: body.getDropFrame(),
        projectType: body.getProjectType(),
        path: body.getPath()
      };
      resolve(state.project);
    });
  });
}

function readSelectedBinItems() {
  return new Promise(function read(resolve, reject) {
    const request = new GetListOfBinItemsRequest();
    const body = new GetListOfBinItemsRequestBody();
    const flags = GetListOfBinItemsRequestBody.BinItemFlags;
    const items = [];

    body.setOnlyVisibleFlag(true);
    body.setOnlySelectedFlag(true);
    body.setBinFlagsList([
      flags.MASTERCLIPS,
      flags.LINKEDMASTERCLIPS,
      flags.SUBCLIPS,
      flags.SOURCES
    ]);
    request.setBody(body);

    let stream;
    try {
      stream = client.getListOfBinItems(request, getMetadata());
    } catch (error) {
      reject(error);
      return;
    }

    stream.on("data", function onData(response) {
      const responseBody = response.getBody();
      if (!responseBody || !responseBody.getMobId()) {
        return;
      }
      if (typeof responseBody.getMobSelected === "function" && !responseBody.getMobSelected()) {
        return;
      }

      items.push({
        id: responseBody.getMobId(),
        name: responseBody.getMobName() || "",
        type: "clip",
        source: "bin-selection"
      });
    });

    stream.on("error", function onError(error) {
      reject(new Error(`Could not read selected bin clip: ${error.message || error}`));
    });

    stream.on("end", function onEnd() {
      resolve(items);
    });
  });
}

function hydrateAssetNames(assets) {
  return Promise.all((assets || []).map(function hydrate(asset) {
    if (!asset || !asset.id || !asset.needsNameHydration) {
      return Promise.resolve();
    }

    return readMobNameColumn(asset.id).then(function named(name) {
      if (!name) {
        return;
      }
      asset.name = name;
      asset.displayName = name;
      asset.needsNameHydration = false;
    }).catch(function ignoreNameLookup() {});
  }));
}

function readMobNameColumn(mobId) {
  return new Promise(function read(resolve, reject) {
    const request = new GetMobInfoRequest();
    const body = new GetMobInfoRequestBody();
    let resolved = false;

    body.setMobId(mobId);
    body.setOnlyVisibleColumns(false);
    body.setIncludesEmptyColumns(false);
    request.setBody(body);

    let stream;
    try {
      stream = client.getMobInfo(request, getMetadata());
    } catch (error) {
      reject(error);
      return;
    }

    stream.on("data", function onData(response) {
      const responseBody = response.getBody();
      if (!responseBody) {
        return;
      }

      const columnName = String(responseBody.getColumnName() || "").trim().toLowerCase();
      const columnValue = String(responseBody.getColumnValue() || "").trim();
      if (columnName === "name" && columnValue) {
        resolved = true;
        resolve(columnValue);
      }
    });

    stream.on("error", function onError(error) {
      if (!resolved) {
        reject(error);
      }
    });

    stream.on("end", function onEnd() {
      if (!resolved) {
        resolve("");
      }
    });
  });
}

function getBinPathFromMob(mobId) {
  return new Promise(function getPath(resolve, reject) {
    const request = new GetBinFromMobRequest();
    const body = new GetBinFromMobRequestBody();
    body.setMobId(mobId);
    request.setBody(body);

    client.getBinFromMob(request, getMetadata(), function onBinPath(err, response) {
      if (err) {
        reject(new Error(`GetBinFromMob failed: ${err.message || err}`));
        return;
      }

      const responseBody = response && response.getBody ? response.getBody() : null;
      resolve(responseBody && responseBody.getAbsolutePath ? responseBody.getAbsolutePath() : "");
    });
  });
}

function openBinForWrite(binPath, requestLock) {
  return new Promise(function open(resolve, reject) {
    const request = new OpenBinRequest();
    const body = new OpenBinRequestBody();
    body.setBinPath(binPath);
    body.setLocked(Boolean(requestLock));
    request.setBody(body);

    client.openBin(request, getMetadata(), function onOpenBin(err, response) {
      if (err) {
        reject(new Error(`OpenBin failed: ${err.message || err}`));
        return;
      }
      resolve(response);
    });
  });
}

function ensureAssetBinOpenForWrite(asset) {
  return getBinPathFromMob(asset.id).then(function openOwningBin(binPath) {
    if (!binPath) {
      throw new Error(`No bin path found for ${asset.name || "clip"}`);
    }

    return openBinForWrite(binPath, true).then(function locked() {
      return {
        binPath,
        lockMode: "opened with write lock"
      };
    }).catch(function retryUnlocked(lockError) {
      return openBinForWrite(binPath, false).then(function unlocked() {
        return {
          binPath,
          lockMode: `opened without explicit lock after lock error: ${lockError.message || lockError}`
        };
      });
    });
  });
}

function selectFromBin() {
  setStatus("Reading selected bin clips...");
  setBusy(true);

  readSelectedBinItems().then(function loaded(items) {
    if (items.length === 0) {
      setStatus("Select one or more source clips in a visible Avid bin, then try again.", true);
      setBusy(false);
      return;
    }

    selectAssets(items, {
      append: state.selectedAssets.length > 0 && state.viewMode === "prompt" && !state.isBusy
    });
  }).catch(function failed(error) {
    setStatus(error.message, true);
    setBusy(false);
  });
}

function checkHelper(options) {
  const silent = options && options.silent;
  dom["connection-status"].textContent = "Checking";
  dom["helper-status-dot"].dataset.status = "checking";
  dom["api-key-status"].textContent = "Unknown";
  dom["api-key-status-dot"].dataset.status = "idle";

  return requestJson("GET", "/config").then(function ok(config) {
    state.helperConfig = config;
    dom["connection-status"].textContent = "Online";
    dom["helper-status-dot"].dataset.status = "ready";
    dom["api-key-status"].textContent = config.hasTwelveLabsApiKey ? "Ready" : "Missing";
    dom["api-key-status-dot"].dataset.status = config.hasTwelveLabsApiKey ? "ready" : "warning";
    if (state.exportSettingsLoaded) {
      renderExportSettings(state.exportSettings, config);
    }
    if (!silent) {
      setStatus(config.hasTwelveLabsApiKey ? "Helper connected." : "Helper connected, but TWELVELABS_API_KEY is missing.", !config.hasTwelveLabsApiKey);
    }
    return config;
  }).catch(function failed(error) {
    dom["connection-status"].textContent = "Offline";
    dom["helper-status-dot"].dataset.status = "error";
    dom["api-key-status"].textContent = "Unknown";
    dom["api-key-status-dot"].dataset.status = "idle";
    if (!silent) {
      setStatus(error.message, true);
    }
    throw error;
  });
}

function parseAvidJsonError(message) {
  try {
    return JSON.parse(message);
  } catch (error) {
    return null;
  }
}

function formatAvailableExportSettings(settings) {
  if (!settings || settings.length === 0) {
    return "";
  }

  const visible = settings.slice(0, 8).map(function quote(settingName) {
    return `"${settingName}"`;
  }).join(", ");
  return settings.length > 8 ? `${visible}, and ${settings.length - 8} more` : visible;
}

function exportSettingMissingMessage(settingName, settings) {
  const available = formatAvailableExportSettings(settings);

  if (!available) {
    return `Avid has no export settings available to the Panel SDK. Open Settings, then create a small H.264 MP4 export setting named "${settingName}".`;
  }

  return `Avid export setting "${settingName}" is not installed. Available export settings: ${available}. Open Settings and choose one, or create a small H.264 MP4 setting named "${DEFAULT_EXPORT_SETTING_NAME}".`;
}

function exportSettingRequiredError(message) {
  const error = new Error(message || "Choose an export setting before running Mark.");
  error.requiresExportSetting = true;
  return error;
}

function showExportSettingDialog(message) {
  if (message) {
    setStatus(message, true);
  }
  openSettings();
  dom["export-setting-dialog"].classList.remove("hidden");
}

function hideExportSettingDialog() {
  dom["export-setting-dialog"].classList.add("hidden");
}

function getExportSettings() {
  return new Promise(function load(resolve, reject) {
    const request = new GetListOfExportSettingsRequest();
    request.setBody(new GetListOfExportSettingsRequestBody());

    client.getListOfExportSettings(request, getMetadata(), function onExportSettings(err, response) {
      if (err) {
        const details = parseAvidJsonError(err.message);
        const error = new Error(`Could not read Avid export settings: ${err.message}`);
        if (details && Number(details.ErrorType) === CommandErrorType.MC_EXPORTSETTINGSNOTFOUND) {
          error.avidErrorType = CommandErrorType.MC_EXPORTSETTINGSNOTFOUND;
        }
        reject(error);
        mcapi.reportError(err.code, err.message);
        return;
      }

      const settings = response.getBody().getSettingNamesList();
      state.exportSettings = settings;
      state.exportSettingsLoaded = true;
      resolve(settings);
    });
  });
}

function ensureExportSetting(config) {
  const preferredName = configuredExportSettingName(config);
  setStatus("Checking the proxy export setup...");

  return getExportSettings().catch(function mapSettingsError(error) {
    state.exportSettings = [];
    state.exportSettingsLoaded = true;
    renderExportSettings([], config);
    if (error.avidErrorType === CommandErrorType.MC_EXPORTSETTINGSNOTFOUND) {
      throw exportSettingRequiredError(exportSettingMissingMessage(preferredName || DEFAULT_EXPORT_SETTING_NAME, []));
    }
    throw error;
  }).then(function validate(settings) {
    renderExportSettings(settings, config);
    const settingName = selectedExportSettingName();
    if (!settingName) {
      throw exportSettingRequiredError(`Choose an Avid export setting in Settings before running Mark. Use a small MP4/H.264 setting, or create one named "${DEFAULT_EXPORT_SETTING_NAME}".`);
    }

    if (settings.indexOf(settingName) === -1) {
      throw new Error(exportSettingMissingMessage(settingName, settings));
    }

    config.resolvedExportSettingsName = settingName;
    return config;
  });
}

function refreshExportSettings(showStatus) {
  if (dom["export-setting-summary"]) {
    dom["export-setting-summary"].textContent = "Reading Avid export settings...";
  }

  return getExportSettings().then(function loaded(settings) {
    renderExportSettings(settings, state.helperConfig);
    if (showStatus) {
      setStatus(settings.length > 0 ? "Avid export settings refreshed." : "No Avid export settings found.", settings.length === 0);
    }
    return settings;
  }).catch(function failed(error) {
    state.exportSettings = [];
    state.exportSettingsLoaded = true;
    renderExportSettings([], state.helperConfig);
    if (showStatus) {
      setStatus(error.message, true);
    }
    throw error;
  });
}

function startAnalyze() {
  const prompt = dom["marker-prompt"].value.trim();
  if (state.selectedAssets.length === 0) {
    setStatus("Drop one or more source clips first, or use selected bin clips.", true);
    return;
  }
  if (!prompt) {
    setStatus("Tell Mark what to look for first.", true);
    return;
  }
  if (!state.project || !state.project.fps) {
    setStatus("Project frame rate is not available yet. Drop the clip again or reopen the panel.", true);
    return;
  }

  cleanupRetainedJobs();
  setBusy(true);
  setViewMode("busy");
  setProgress(5);
  dom["progress-stage"].textContent = "Preparing analysis";
  dom["progress-detail"].textContent = "";
  state.selectedAssets.forEach(function resetClipRun(asset) {
    asset.status = "queued";
    asset.message = "Queued";
    asset.exportTaskId = null;
    asset.helperJobId = null;
    asset.markers = [];
    asset.applied = false;
    asset.error = null;
  });
  state.activeClipIndex = -1;
  state.currentJobClipIndex = -1;
  state.batchConfig = null;
  state.batchPrompt = prompt;
  state.lastPrompt = prompt;
  renderPreview();
  setStatus(`Getting ready to look for ${prompt} across ${state.selectedAssets.length} clip${state.selectedAssets.length === 1 ? "" : "s"}...`);

  checkHelper()
    .then(function helperReady(config) {
      if (!config.hasTwelveLabsApiKey) {
        throw new Error("TWELVELABS_API_KEY is not set in the helper service.");
      }
      return ensureExportSetting(config);
    })
    .then(function exportReady(config) {
      state.batchConfig = config;
      processNextClip();
    })
    .catch(function failed(error) {
      if (error.requiresExportSetting) {
        showExportSettingDialog(error.message);
      } else {
        setStatus(error.message, true);
      }
      setProgress(0);
      setBusy(false);
      setViewMode(inferMainViewMode());
    });
}

function updateBatchProgress(stagePercent) {
  const total = Math.max(1, state.selectedAssets.length);
  const activeIndex = Math.max(0, state.activeClipIndex);
  const base = (activeIndex / total) * 100;
  const span = 100 / total;
  setProgress(base + (Math.max(0, Math.min(100, stagePercent)) / 100) * span);
  dom["progress-detail"].textContent = `Clip ${Math.min(activeIndex + 1, total)} of ${total}`;
}

function processNextClip() {
  clearPoll();
  const nextIndex = state.selectedAssets.findIndex(function findQueued(asset) {
    return asset.status === "queued";
  });

  if (nextIndex === -1) {
    finishBatch();
    return;
  }

  state.activeClipIndex = nextIndex;
  exportProxyForClip(nextIndex);
}

function exportProxyForClip(assetIndex) {
  const config = state.batchConfig || state.helperConfig || {};
  const prompt = state.batchPrompt || state.lastPrompt;
  const asset = state.selectedAssets[assetIndex];
  asset.status = "exporting";
  asset.message = "Exporting proxy";
  dom["progress-stage"].textContent = "Exporting proxy";
  setStatus(`Exporting proxy ${assetIndex + 1} of ${state.selectedAssets.length}: ${asset.name || "clip"}...`);
  updateBatchProgress(15);

  const request = new ExportFileRequest();
  const body = new ExportFileRequestBody();
  const fileName = `mark_${Date.now()}_${assetIndex + 1}.mp4`;
  const exportSettingsName = config.resolvedExportSettingsName || configuredExportSettingName(config);
  body.setMobId(asset.id);
  body.setExportSettingsName(exportSettingsName);
  body.setDestinationPath(config.exportDestinationPath || "");
  body.setInDirectory("");
  body.setFileName(fileName);
  request.setBody(body);

  asset.pendingExport = {
    prompt,
    fileName,
    exportSettingsName
  };

  client.exportFile(request, getMetadata(), function onExportStarted(err, response) {
    if (err) {
      const message = formatExportStartError(err, exportSettingsName);
      markClipFailed(assetIndex, message);
      processNextClip();
      mcapi.reportError(err.code, err.message);
      return;
    }

    asset.exportTaskId = response.getHeader().getTaskId();
    asset.message = "Avid is making the proxy";
    dom["progress-stage"].textContent = "Making proxy";
    setStatus(`Avid is making proxy ${assetIndex + 1} of ${state.selectedAssets.length}...`);
    updateBatchProgress(25);
  });
}

function formatExportStartError(err, exportSettingsName) {
  const details = parseAvidJsonError(err.message);

  if (details && Number(details.ErrorType) === CommandErrorType.MC_EXPORTSETTINGSNOTFOUND) {
    return exportSettingMissingMessage(exportSettingsName, state.exportSettings);
  }

  if (details && details.ErrorMessage) {
    return `Export failed to start: ${details.ErrorMessage} (Avid ErrorType ${details.ErrorType})`;
  }

  return `Export failed to start: ${err.message}`;
}

function handleExportFinished(eventData) {
  let data = null;
  try {
    data = JSON.parse(eventData);
  } catch (error) {
    return;
  }

  const assetIndex = state.selectedAssets.findIndex(function findByTaskId(asset) {
    return asset.exportTaskId && data.taskId === asset.exportTaskId;
  });
  if (assetIndex === -1) {
    return;
  }

  const asset = state.selectedAssets[assetIndex];
  const noError = data.errorCode === CommandErrorType.NOERROR || data.errorCode === 0;
  if (!noError) {
    asset.exportTaskId = null;
    markClipFailed(assetIndex, `Export failed for ${asset.name || "clip"}: ${data.errorString || "Media Composer could not export this clip."}`);
    processNextClip();
    return;
  }

  const exportPath = data.exportPath || data.path;
  if (!exportPath) {
    asset.exportTaskId = null;
    markClipFailed(assetIndex, `Export finished for ${asset.name || "clip"}, but Media Composer did not return a proxy path.`);
    processNextClip();
    return;
  }

  asset.exportTaskId = null;
  startHelperJob(exportPath, asset.pendingExport ? asset.pendingExport.prompt : state.batchPrompt, assetIndex);
}

function startHelperJob(filePath, prompt, assetIndex) {
  const asset = state.selectedAssets[assetIndex];
  asset.status = "analyzing";
  asset.message = "Uploading and analyzing";
  dom["progress-stage"].textContent = "Uploading and analyzing";
  setStatus(`Looking for ${prompt} in ${asset.name || "clip"} (${assetIndex + 1} of ${state.selectedAssets.length})...`);
  updateBatchProgress(35);

  requestJson("POST", "/jobs", {
    filePath,
    prompt,
    markerOutputStyle: markerOutputStyle(),
    clip: {
      mobId: asset.id,
      type: asset.type,
      name: asset.name
    },
    project: state.project
  }).then(function started(job) {
    asset.helperJobId = job.id;
    state.currentJobClipIndex = assetIndex;
    setStatus(`Looking for ${prompt} in ${asset.name || "clip"}...`);
    updateBatchProgress(job.progress || 40);
    pollJob(assetIndex);
  }).catch(function failed(error) {
    markClipFailed(assetIndex, error.message);
    processNextClip();
  });
}

function pollJob(assetIndex) {
  clearPoll();
  const asset = state.selectedAssets[assetIndex];
  if (!asset || !asset.helperJobId) {
    return;
  }

  requestJson("GET", `/jobs/${asset.helperJobId}`).then(function update(job) {
    const prompt = state.batchPrompt || state.lastPrompt || "that";
    updateBatchProgress(job.progress || 40);
    setStatus(`Looking for ${prompt} in ${asset.name || "clip"} (${assetIndex + 1} of ${state.selectedAssets.length})...`);

    if (job.status === "ready") {
      clearPoll();
      asset.status = "ready";
      asset.message = "Analysis complete";
      asset.markers = (job.markers || []).map(function normalize(marker) {
        return clampMarker({
          id: marker.id || createGuid(),
          name: marker.name,
          comment: marker.comment,
          color: marker.color || "Yellow",
          startTime: marker.startTime,
          endTime: marker.endTime,
          use: true
        });
      });
      processNextClip();
      return;
    }

    if (job.status === "failed") {
      clearPoll();
      markClipFailed(assetIndex, job.error ? job.error.message : "TwelveLabs analysis failed.");
      processNextClip();
      return;
    }

    pollTimer = window.setTimeout(function pollAgain() {
      pollJob(assetIndex);
    }, POLL_INTERVAL_MS);
  }).catch(function failed(error) {
    clearPoll();
    markClipFailed(assetIndex, error.message);
    processNextClip();
  });
}

function markClipFailed(assetIndex, message) {
  const asset = state.selectedAssets[assetIndex];
  if (!asset) {
    return;
  }
  asset.status = "failed";
  asset.message = message;
  asset.error = message;
  asset.exportTaskId = null;
  asset.helperJobId = null;
  renderPreview();
  setStatus(message, true);
}

function finishBatch() {
  const markerCount = totalMarkerCount();
  const failedCount = state.selectedAssets.filter(function failed(asset) {
    return asset.status === "failed";
  }).length;
  state.activeClipIndex = -1;
  state.currentJobClipIndex = -1;
  state.activeReviewClipIndex = normalizedActiveReviewClipIndex();
  setProgress(100);
  renderPreview();
  setBusy(false);
  setViewMode(markerCount > 0 || failedCount > 0 ? "review" : "prompt");

  if (markerCount > 0) {
    setStatus(`Found ${markerCount} possible marker${markerCount === 1 ? "" : "s"} across ${state.selectedAssets.length - failedCount} clip${state.selectedAssets.length - failedCount === 1 ? "" : "s"}. Review before applying.${failedCount ? ` ${failedCount} clip${failedCount === 1 ? "" : "s"} failed.` : ""}`, failedCount > 0);
    return;
  }

  setStatus(failedCount > 0
    ? `No marker suggestions were created. ${failedCount} clip${failedCount === 1 ? "" : "s"} failed.`
    : "I did not find matching marker suggestions. Try a broader search.",
  failedCount > 0);
}

function clearPoll() {
  if (pollTimer) {
    window.clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function cleanupRetainedJobs() {
  state.selectedAssets.forEach(function cleanupAsset(asset) {
    if (!asset.helperJobId) {
      return;
    }

    requestJson("DELETE", `/jobs/${encodeURIComponent(asset.helperJobId)}`).catch(function noop() {});
    asset.helperJobId = null;
  });
}

function clearClips() {
  cleanupRetainedJobs();
  resetForNewAsset();
  renderAsset();
  renderPreview();
  setBusy(false);
  setStatus("Drop clips in from an Avid bin, or use selected bin clips.");
  setViewMode("drop");
}

function applyMarkers() {
  syncPreviewFromCards();
  const groups = state.selectedAssets.map(function selectedForAsset(asset, assetIndex) {
    return {
      asset,
      assetIndex,
      markers: asset.applied ? [] : (asset.markers || []).filter(function selectedOnly(marker) {
        return marker.use !== false;
      })
    };
  }).filter(function hasMarkers(group) {
    return group.markers.length > 0;
  });

  if (groups.length === 0) {
    setStatus("Select at least one marker to apply.", true);
    return;
  }

  setBusy(true);
  setStatus("Writing selected markers to Avid...");
  applyMarkerGroup(groups, 0, {
    applied: 0,
    failed: 0,
    debugMessages: []
  });
}

function applyMarkerGroup(groups, groupIndex, totals) {
  if (groupIndex >= groups.length) {
    renderPreview();
    setBusy(false);
    if (totals.failed === 0) {
      cleanupRetainedJobs();
    }
    const firstDebugMessage = totals.debugMessages && totals.debugMessages[0];
    setStatus(totals.failed === 0
      ? `Applied and verified ${totals.applied} marker${totals.applied === 1 ? "" : "s"}.`
      : firstDebugMessage || `Applied ${totals.applied} marker${totals.applied === 1 ? "" : "s"}; ${totals.failed} clip${totals.failed === 1 ? "" : "s"} failed.`,
    totals.failed > 0);
    return;
  }

  const group = groups[groupIndex];
  const asset = group.asset;
  setStatus(`Writing ${group.markers.length} marker${group.markers.length === 1 ? "" : "s"} to ${asset.name || "clip"} (${groupIndex + 1} of ${groups.length})...`);
  asset.debugMessage = [
    "DEBUG Apply Markers",
    `clip=${asset.name || asset.displayName || "clip"}`,
    `mobId=${asset.id}`,
    `selectedMarkers=${group.markers.length}`,
    `fps=${state.project.fps}`
  ].join("\n");
  renderPreview();

  ensureAssetBinOpenForWrite(asset).then(function writeAfterBinOpen(binInfo) {
    asset.debugMessage += `\nbinPath=${binInfo.binPath}`;
    asset.debugMessage += `\nbinOpen=${binInfo.lockMode}`;
    renderPreview();
    writeMarkerGroup(groups, groupIndex, totals);
  }).catch(function onBinOpenError(error) {
    const debugMessage = avidErrorSummary("Could not open bin for marker write", error);
    asset.applied = false;
    asset.message = debugMessage;
    asset.debugMessage += `\nERROR ${debugMessage}`;
    totals.debugMessages.push(debugMessage);
    totals.failed += 1;
    renderPreview();
    setStatus(debugMessage, true);
    applyMarkerGroup(groups, groupIndex + 1, totals);
  });
}

function writeMarkerGroup(groups, groupIndex, totals) {
  writeMarkerGroupAttempt(groups, groupIndex, totals, 0);
}

function markerLengthForTrackCandidate(marker, candidate) {
  return candidate.span
    ? markerLengthFrames(marker.startTime, marker.endTime, state.project.fps)
    : 1;
}

function markerWarningsIndicateTrackProblem(warnings) {
  return (warnings || []).some(function isTrackWarning(warning) {
    return /incorrect track|track number|track type/i.test(String(warning || ""));
  });
}

function buildAddMarkersRequest(asset, markers, candidate) {
  const request = new AddMarkersRequest();
  const body = new AddMarkersRequestBody();
  body.setMobId(asset.id);

  const trackLabel = new TrackLabel();
  trackLabel.setType(candidate.type);
  trackLabel.setNumber(candidate.number);

  markers.forEach(function addMarker(marker) {
    const offset = secondsToFrames(marker.startTime, state.project.fps);
    const length = markerLengthForTrackCandidate(marker, candidate);
    const info = new RequestMarkerInfo();
    info.setName(marker.name || "Mark marker");
    info.setComment(marker.comment || "");
    info.setColor(COLOR_FLAGS[marker.color] || MarkerColor.YELLOW);
    info.setGuid(marker.id || createGuid());
    info.setUser(MARK_MARKER_USER);
    info.setTrackLabel(trackLabel);
    info.setOffset(offset);
    info.setTimecode("00:00:00:00");
    info.setLength(length);
    body.addInfo(info);
  });

  request.setBody(body);
  return request;
}

function writeMarkerGroupAttempt(groups, groupIndex, totals, candidateIndex) {
  const group = groups[groupIndex];
  const asset = group.asset;
  const candidate = MARKER_WRITE_TRACK_CANDIDATES[candidateIndex];
  const request = buildAddMarkersRequest(asset, group.markers, candidate);
  const expectedWrites = group.markers.map(function expected(marker) {
    return expectedMarkerWrite(marker, candidate);
  });

  asset.debugMessage += `\n\nAttempt ${candidateIndex + 1}/${MARKER_WRITE_TRACK_CANDIDATES.length}: ${candidate.label}`;
  asset.debugMessage += `\nAddMarkers request=${JSON.stringify(expectedWrites, null, 2)}`;
  renderPreview();

  client.addMarkers(request, getMetadata(), function onAddMarkers(err, response) {
    if (err) {
      const debugMessage = avidErrorSummary("AddMarkers failed", err);
      const hasNextCandidate = candidateIndex + 1 < MARKER_WRITE_TRACK_CANDIDATES.length;
      asset.debugMessage += `\nERROR ${debugMessage}`;
      if (hasNextCandidate) {
        asset.debugMessage += "\nRetrying with next track candidate.";
        renderPreview();
        writeMarkerGroupAttempt(groups, groupIndex, totals, candidateIndex + 1);
        return;
      }

      asset.applied = false;
      asset.message = debugMessage;
      totals.debugMessages.push(debugMessage);
      totals.failed += 1;
      mcapi.reportError(err.code, err.message);
      renderPreview();
      setStatus(debugMessage, true);
      applyMarkerGroup(groups, groupIndex + 1, totals);
      return;
    }

    const warnings = markerResponseWarnings(response);
    if (warnings.length > 0) {
      asset.debugMessage += `\nAddMarkers warnings=${warnings.join(" | ")}`;
    } else {
      asset.debugMessage += "\nAddMarkers accepted without warnings.";
    }
    renderPreview();

    verifyAppliedMarkers(asset, group.markers, candidate, function verified(success, details) {
      const missingCount = details.missingCount;
      const shouldRetry = !success
        && markerWarningsIndicateTrackProblem(warnings)
        && candidateIndex + 1 < MARKER_WRITE_TRACK_CANDIDATES.length;

      asset.debugMessage += `\nGetMarkers returned=${details.returnedCount}`;
      if (details.error) {
        asset.debugMessage += `\nERROR ${details.error}`;
      }
      if (details.missing.length > 0) {
        asset.debugMessage += `\nMissing expected=${JSON.stringify(details.missing, null, 2)}`;
      }
      if (details.actual.length > 0) {
        asset.debugMessage += `\nActual relevant markers=${JSON.stringify(details.actual, null, 2)}`;
      }

      if (shouldRetry) {
        asset.debugMessage += "\nRetrying with next track candidate.";
        renderPreview();
        writeMarkerGroupAttempt(groups, groupIndex, totals, candidateIndex + 1);
        return;
      }

      asset.applied = success;
      asset.message = success
        ? (warnings.length > 0 ? `Markers applied with warning: ${warnings[0]}` : "Markers applied")
        : `Applied markers, but ${missingCount} did not verify`;
      if (success) {
        totals.applied += group.markers.length;
      } else {
        const debugMessage = `${asset.name || asset.displayName || "clip"}: ${asset.message}`;
        totals.debugMessages.push(debugMessage);
        totals.failed += 1;
        setStatus(debugMessage, true);
      }
      renderPreview();
      applyMarkerGroup(groups, groupIndex + 1, totals);
    });
  });
}

function markerResponseWarnings(response) {
  const header = response && response.getHeader ? response.getHeader() : null;
  return header && header.getWarningsList ? header.getWarningsList() || [] : [];
}

function expectedMarkerWrite(marker, candidate) {
  const trackCandidate = candidate || MARKER_WRITE_TRACK_CANDIDATES[0];
  return {
    guid: marker.id || "",
    name: marker.name || "Mark marker",
    comment: marker.comment || "",
    color: COLOR_FLAGS[marker.color] || MarkerColor.YELLOW,
    offset: secondsToFrames(marker.startTime, state.project.fps),
    length: markerLengthForTrackCandidate(marker, trackCandidate),
    user: MARK_MARKER_USER,
    trackType: trackCandidate.type,
    trackNumber: trackCandidate.number,
    trackCandidate: trackCandidate.label
  };
}

function responseMarkerSnapshot(info) {
  const trackLabel = info.getTrackLabel ? info.getTrackLabel() : null;
  return {
    guid: info.getGuid ? info.getGuid() : "",
    name: info.getName ? info.getName() : "",
    comment: info.getComment ? info.getComment() : "",
    color: info.getColor ? info.getColor() : null,
    offset: info.getOffset ? info.getOffset() : null,
    length: info.getLength ? info.getLength() : null,
    user: info.getUser ? info.getUser() : "",
    timecode: info.getTimecode ? info.getTimecode() : "",
    trackType: trackLabel && trackLabel.getType ? trackLabel.getType() : null,
    trackNumber: trackLabel && trackLabel.getNumber ? trackLabel.getNumber() : null
  };
}

function isRelevantDebugMarker(actual, expectedWrites) {
  if (actual.user === MARK_MARKER_USER) {
    return true;
  }
  return expectedWrites.some(function sameOffset(expected) {
    return actual.offset === expected.offset;
  });
}

function markerMatchesExpected(actual, expected) {
  if (expected.guid && actual.guid === expected.guid) {
    return true;
  }

  return actual.offset === expected.offset
    && actual.name === expected.name
    && actual.comment === expected.comment
    && actual.color === expected.color;
}

function verifyAppliedMarkers(asset, expectedMarkers, candidate, callback) {
  const request = new GetMarkersRequest();
  const body = new GetMarkersRequestBody();
  body.setMobId(asset.id);
  request.setBody(body);

  client.getMarkers(request, getMetadata(), function onGetMarkers(err, response) {
    if (err) {
      mcapi.reportError(err.code, err.message);
      callback(false, {
        missingCount: expectedMarkers.length,
        returnedCount: 0,
        missing: expectedMarkers.map(function expected(marker) {
          return expectedMarkerWrite(marker, candidate);
        }),
        actual: [],
        error: avidErrorSummary("GetMarkers failed", err)
      });
      return;
    }

    const responseBody = response && response.getBody ? response.getBody() : null;
    const returned = responseBody && responseBody.getInfoList ? responseBody.getInfoList() : [];
    const actualMarkers = returned.map(responseMarkerSnapshot);
    const expectedWrites = expectedMarkers.map(function expected(marker) {
      return expectedMarkerWrite(marker, candidate);
    });
    const missing = expectedMarkers.filter(function missingMarker(marker) {
      const expected = expectedMarkerWrite(marker, candidate);
      return !actualMarkers.some(function hasMarker(actual) {
        return markerMatchesExpected(actual, expected);
      });
    });

    callback(missing.length === 0, {
      missingCount: missing.length,
      returnedCount: returned.length,
      missing: missing.map(function expected(marker) {
        return expectedMarkerWrite(marker, candidate);
      }),
      actual: actualMarkers.filter(function relevant(actual) {
        return isRelevantDebugMarker(actual, expectedWrites);
      }),
      error: ""
    });
  });
}

function toggleSettings() {
  if (state.viewMode === "settings") {
    closeSettings();
  } else {
    openSettings();
  }
}

function registerEvents() {
  [dom["drop-area"], dom["clip-tray"]].forEach(function bindDropTarget(target) {
    target.addEventListener("dragover", function onDragOver(event) {
      event.preventDefault();
      target.classList.add("is-over");
    });
    target.addEventListener("dragleave", function onDragLeave() {
      target.classList.remove("is-over");
    });
    target.addEventListener("drop", function onDrop(event) {
      target.classList.remove("is-over");
      handleDrop(event);
    });
  });
  dom["select-bin-button"].addEventListener("click", selectFromBin);
  dom["clear-clips-button"].addEventListener("click", clearClips);
  dom["settings-toggle"].addEventListener("click", toggleSettings);
  dom["marker-prompt"].addEventListener("input", function onPromptInput() {
    setBusy(state.isBusy);
  });
  dom["prompt-favorites-toggle"].addEventListener("click", function onFavoriteToggle(event) {
    event.stopPropagation();
    toggleFavoritePromptPopover();
  });
  dom["favorite-prompt-select"].addEventListener("change", function onFavoritePromptChange() {
    if (dom["favorite-prompt-select"].value) {
      dom["marker-prompt"].value = dom["favorite-prompt-select"].value;
      dom["marker-prompt"].focus();
    }
    setBusy(state.isBusy);
  });
  dom["save-favorite-prompt-button"].addEventListener("click", saveCurrentFavoritePrompt);
  dom["delete-favorite-prompt-button"].addEventListener("click", deleteSelectedFavoritePrompt);
  dom["favorite-prompts-popover"].addEventListener("click", function onFavoritePopoverClick(event) {
    event.stopPropagation();
  });
  document.addEventListener("click", function onDocumentClick() {
    setFavoritePromptPopoverOpen(false);
  });
  Array.from(document.querySelectorAll(".example-chip")).forEach(function bindExample(button) {
    button.addEventListener("click", function useExample() {
      dom["marker-prompt"].value = button.dataset.prompt || button.textContent;
      dom["marker-prompt"].focus();
      setBusy(state.isBusy);
    });
  });
  dom["analyze-button"].addEventListener("click", startAnalyze);
  dom["apply-button"].addEventListener("click", applyMarkers);
  dom["check-helper-button"].addEventListener("click", function onCheckHelper() {
    checkHelper().catch(function noop() {});
  });
  dom["refresh-export-settings-button"].addEventListener("click", function onRefreshExportSettings() {
    refreshExportSettings(true).catch(function noop() {});
  });
  dom["export-setting-select"].addEventListener("change", function onExportSettingChange() {
    state.selectedExportSettingsName = dom["export-setting-select"].value;
    saveExportSettingName(state.selectedExportSettingsName);
    renderExportSettings(state.exportSettings, state.helperConfig);
    if (state.selectedExportSettingsName) {
      hideExportSettingDialog();
      setStatus(`Using "${state.selectedExportSettingsName}" for temporary proxy exports.`);
    }
  });
  [
    "marker-name-style",
    "marker-comment-style"
  ].forEach(function bindStyleField(id) {
    dom[id].addEventListener("change", saveMarkerOutputStyle);
    dom[id].addEventListener("blur", saveMarkerOutputStyle);
  });
  dom["export-setting-dialog-settings-button"].addEventListener("click", function onDialogSettings() {
    hideExportSettingDialog();
    openSettings();
    dom["export-setting-select"].focus();
  });
  dom["export-setting-dialog-close-button"].addEventListener("click", hideExportSettingDialog);
  dom["export-setting-dialog"].addEventListener("click", function onDialogBackdrop(event) {
    if (event.target === dom["export-setting-dialog"]) {
      hideExportSettingDialog();
    }
  });

  mcapi.onEvent.connect(function onEvent(eventName, eventData) {
    if (eventName === "ExportFileFinished") {
      handleExportFinished(eventData);
    }
  });
}

document.addEventListener("DOMContentLoaded", function main() {
  initDom();
  client = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);
  loadMarkerOutputStyle();
  state.favoritePrompts = loadFavoritePrompts();
  registerEvents();
  renderAsset();
  renderProject();
  renderPreview();
  renderFavoritePrompts();
  setViewMode("drop");
  checkHelper({ silent: true }).catch(function noop() {});
  refreshExportSettings(false).catch(function noop() {});
});
