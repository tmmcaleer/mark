import {
  AddMarkersRequest,
  AddMarkersRequestBody,
  ColumnInfo,
  CommandErrorType,
  CreateSubClipRequest,
  CreateSubClipRequestBody,
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
  SelectMobsInBinRequest,
  SelectMobsInBinRequestBody,
  SetMobInfoRequest,
  SetMobInfoRequestBody,
  TrackLabel,
  TrackType
} from "../grpc-web/MCAPI_Types_pb.js";
import { MCAPIClient } from "../grpc-web/MCAPI_grpc_web_pb.js";

import "../css/main.css";
import { createAvidHost } from "./hosts/avid-host.mjs";
import { createHelperClient } from "./shared/helper-client.mjs";
import {
  MARKER_COLORS,
  clampMarker,
  createGuid,
  markerLengthFrames,
  secondsToFrames
} from "./marker-utils.js";
import {
  markerInTimecode,
  secondsToTimecode
} from "./timecode-utils.mjs";
import {
  availableAvidMetadataColumns,
  buildPromptContextFromAsset,
  buildClipProxyMetadata,
  DEFAULT_AVID_METADATA_COLUMNS,
  normalizeMobColumns,
  normalizeMetadataColumnSelection,
  normalizeProxyMatchMethods,
  normalizeProxyRoots,
  PROXY_MATCH_METHODS
} from "./proxy-utils.mjs";
import {
  buildSubclipBatchName,
  granularityPreset,
  mergeSubclipAt,
  normalizeGranularity,
  normalizeSubclipNamingOptions,
  normalizeSubclipOptionValues,
  sanitizeSubclipName,
  subclipRenameVerificationWarning,
  selectedSubclipsForApply,
  selectedCountLabel
} from "./subclip-utils.mjs";
import {
  activeQueueItemCount,
  createQueueItem,
  isActiveQueueStatus,
  queueStatusKind,
  queueStatusLabel
} from "./queue-utils.mjs";

const MCAPI_ASSETLIST_MIME_TYPE = "text/x.avid.mc-api-asset-list+json";
const DEFAULT_HELPER_URL = "http://localhost:4500";
const DEFAULT_EXPORT_SETTING_NAME = "Mark 12Labs Proxy";
const DEFAULT_MARKER_NAME_STYLE = "Short marker names. No confidence or reasoning.";
const DEFAULT_MARKER_COMMENT_STYLE = "Short marker notes. No confidence or reasoning.";
const DEFAULT_SUBCLIP_SUMMARY_STYLE = "Short summaries of why the section is useful. No confidence or reasoning.";
const EXPORT_SETTING_STORAGE_KEY = "mark.exportSettingName";
const LEGACY_MARKER_STYLE_STORAGE_KEY = "mark.markerStyle";
const MARKER_NAME_STYLE_STORAGE_KEY = "mark.markerNameStyle";
const MARKER_COMMENT_STYLE_STORAGE_KEY = "mark.markerCommentStyle";
const SUBCLIP_SUMMARY_STYLE_STORAGE_KEY = "mark.subclipSummaryStyle";
const FAVORITE_PROMPTS_STORAGE_KEY = "mark.favoritePrompts";
const SUBCLIP_GRANULARITY_STORAGE_KEY = "mark.subclipGranularity";
const SUBCLIP_MIN_DURATION_STORAGE_KEY = "mark.subclipMinDuration";
const SUBCLIP_MAX_DURATION_STORAGE_KEY = "mark.subclipMaxDuration";
const SUBCLIP_NAME_DELIMITER_STORAGE_KEY = "mark.subclipNameDelimiter";
const SUBCLIP_NAME_SUFFIX_STORAGE_KEY = "mark.subclipNameSuffix";
const SUBCLIP_NAME_START_STORAGE_KEY = "mark.subclipNameStart";
const SUBCLIP_NAME_PADDING_STORAGE_KEY = "mark.subclipNamePadding";
const REVIEW_THUMBNAIL_SIZE_STORAGE_KEY = "mark.reviewThumbnailSize";
const AVID_METADATA_COLUMNS_STORAGE_KEY = "mark.avidMetadataContextColumns";
const PROXY_REPOSITORY_ENABLED_STORAGE_KEY = "mark.proxyRepositoryEnabled";
const PROXY_REPOSITORY_ROOTS_STORAGE_KEY = "mark.proxyRepositoryRoots";
const PROXY_REPOSITORY_METHODS_STORAGE_KEY = "mark.proxyRepositoryMethods";
const DEBUG_PANEL_ENABLED_STORAGE_KEY = "mark.debugPanelEnabled";
const DEFAULT_REVIEW_THUMBNAIL_SIZE = "comfortable";
const REVIEW_THUMBNAIL_SIZES = {
  compact: 76,
  comfortable: 108,
  large: 136
};
const MAX_DEBUG_EVENTS = 200;
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
let host;
let helperClient;
let pollTimer = null;
let authPollTimer = null;

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
  queueItems: [],
  activeQueueItemId: null,
  activeExportQueueItemId: null,
  batchPhase: "idle",
  batchConfig: null,
  batchPrompt: "",
  batchOptions: null,
  hasShownIncrementalReview: false,
  reviewCompletionSequence: 0,
  debugPanelEnabled: false,
  debugEvents: [],
  subclipNamingOptions: normalizeSubclipNamingOptions({}),
  lastPrompt: "",
  workflowMode: "markers",
  viewMode: "drop",
  previousViewMode: "drop",
  isBusy: false,
  isApplying: false,
  isSigningIn: false,
  isSigningOut: false,
  isBuyingCredits: false,
  account: null,
  authDeviceCode: ""
};

const dom = {};

function initDom() {
  [
    "view-title",
    "drop-view",
    "prompt-view",
    "busy-view",
    "queue-view",
    "review-view",
    "settings-view",
    "queue-toggle",
    "queue-badge",
    "account-button",
    "account-summary",
    "buy-credits-button",
    "queue-summary",
    "queue-empty",
    "queue-list",
    "toast",
    "drop-area",
    "drop-empty",
    "clip-tray",
    "selected-clip-list",
    "clear-clips-button",
    "workflow-mode-markers",
    "workflow-mode-subclips",
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
    "subclip-options",
    "subclip-options-toggle",
    "subclip-options-popover",
    "subclip-duration-toggle",
    "custom-duration-toggle",
    "subclip-duration-fields",
    "subclip-granularity",
    "subclip-min-duration",
    "subclip-max-duration",
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
    "discard-suggestions-button",
    "helper-url",
    "check-helper-button",
    "connection-status",
    "helper-status-dot",
    "api-key-status",
    "api-key-status-dot",
    "account-detail",
    "account-credit-balance",
    "account-email",
    "credit-pack-select",
    "sign-in-button",
    "refresh-account-button",
    "sign-out-button",
    "settings-buy-credits-button",
    "export-setting-select",
    "refresh-export-settings-button",
    "export-setting-summary",
    "marker-name-style",
    "marker-comment-style",
    "avid-metadata-columns",
    "avid-metadata-summary",
    "subclip-summary-style",
    "settings-subclip-granularity",
    "settings-subclip-min-duration",
    "settings-subclip-max-duration",
    "subclip-name-delimiter",
    "subclip-name-suffix",
    "subclip-name-start",
    "subclip-name-padding",
    "subclip-name-preview",
    "review-thumbnail-size",
    "proxy-repository-enabled",
    "proxy-repository-fields",
    "proxy-repository-roots-field",
    "proxy-repository-roots",
    "proxy-match-source-file",
    "proxy-match-source-path",
    "proxy-match-clip-name",
    "proxy-repository-summary",
    "debug-panel-enabled",
    "debug-panel-fields",
    "debug-panel-output",
    "debug-panel-clear",
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

function showToast(message, kind) {
  if (!dom["toast"]) {
    return;
  }
  const item = document.createElement("div");
  item.className = "toast-message";
  item.dataset.kind = kind || "default";
  item.textContent = message;
  dom["toast"].appendChild(item);
  dom["toast"].classList.remove("hidden");

  window.setTimeout(function hideToast() {
    item.remove();
    if (dom["toast"].children.length === 0) {
      dom["toast"].classList.add("hidden");
    }
  }, 2600);
}

function tryOpenReturnedUrl(url) {
  if (!url || typeof window.open !== "function") {
    return false;
  }
  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    return Boolean(opened);
  } catch (error) {
    return false;
  }
}

function debugJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function appendDebugEvent(label, details) {
  const event = {
    at: new Date().toISOString(),
    label,
    details
  };
  state.debugEvents.push(event);
  if (state.debugEvents.length > MAX_DEBUG_EVENTS) {
    state.debugEvents.splice(0, state.debugEvents.length - MAX_DEBUG_EVENTS);
  }
  renderDebugPanel();
}

function renderDebugPanel() {
  if (!dom["debug-panel-fields"] || !dom["debug-panel-output"]) {
    return;
  }
  dom["debug-panel-fields"].classList.toggle("hidden", !state.debugPanelEnabled);
  dom["debug-panel-enabled"].checked = state.debugPanelEnabled;
  dom["debug-panel-output"].textContent = state.debugEvents.length > 0
    ? state.debugEvents.map(function formatEvent(event) {
      return `[${event.at}] ${event.label}\n${debugJson(event.details)}`;
    }).join("\n\n")
    : "No debug events yet.";
}

function setDebugPanelEnabled(isEnabled) {
  state.debugPanelEnabled = Boolean(isEnabled);
  try {
    window.localStorage.setItem(DEBUG_PANEL_ENABLED_STORAGE_KEY, state.debugPanelEnabled ? "1" : "0");
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
  }
  renderDebugPanel();
}

function loadDebugPanelSetting() {
  state.debugPanelEnabled = localStorageItem(DEBUG_PANEL_ENABLED_STORAGE_KEY) === "1";
  renderDebugPanel();
}

function appendAssetDebug(asset, label, details) {
  if (!asset) {
    return;
  }

  const lines = asset.debugMessage ? [asset.debugMessage] : [];
  lines.push(`\n[${new Date().toLocaleTimeString()}] ${label}`);
  if (details !== undefined) {
    lines.push(typeof details === "string" ? details : debugJson(details));
  }
  asset.debugMessage = lines.join("\n");

  if (/CreateSubClip|SetMobInfo|SelectMobsInBin|subclip|Destination bin/i.test(label)) {
    appendDebugEvent(`Avid subclip: ${label}`, {
      clip: asset.name || asset.displayName || "clip",
      mobId: asset.id || "",
      details
    });
  }
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

function setProgressIndeterminate(isIndeterminate) {
  dom["progress-bar"].classList.toggle("is-indeterminate", Boolean(isIndeterminate));
}

function activeAnalysisLabel() {
  return isSubclipMode() ? "Finding sections" : "Analyzing";
}

function conciseJobMessage(job, fallback) {
  if (job && job.stage === "preparing") {
    return "Preparing media";
  }
  if (job && job.stage === "uploading") {
    return "Analyzing";
  }
  if (job && job.stage === "thumbnailing") {
    return "Creating thumbnails";
  }
  return job && job.message ? job.message : fallback;
}

function titleForView(viewMode) {
  if (viewMode === "settings") {
    return "Settings";
  }
  if (viewMode === "queue") {
    return "Render Queue";
  }
  return "Hi, I'm Mark.";
}

function updateTopbarForView(viewMode) {
  dom["view-title"].textContent = titleForView(viewMode);
}

function setViewMode(viewMode) {
  if (viewMode !== "settings" && viewMode !== "queue") {
    state.previousViewMode = viewMode;
  }

  state.viewMode = viewMode;
  dom["app-shell"].dataset.view = viewMode;
  ["drop", "prompt", "busy", "queue", "review", "settings"].forEach(function updateView(name) {
    const section = dom[`${name}-view`];
    if (section) {
      section.classList.toggle("hidden", name !== viewMode);
    }
  });

  const isSettings = viewMode === "settings";
  const isQueue = viewMode === "queue";
  dom["settings-toggle"].setAttribute("aria-expanded", String(isSettings));
  dom["settings-toggle"].textContent = isSettings ? "×" : "⚙";
  dom["settings-toggle"].setAttribute("aria-label", isSettings ? "Close settings" : "Settings");
  dom["settings-toggle"].setAttribute("title", isSettings ? "Close settings" : "Settings");
  dom["queue-toggle"].setAttribute("aria-expanded", String(isQueue));
  dom["queue-toggle"].classList.toggle("is-active", isQueue);
  updateTopbarForView(viewMode);
  setFavoritePromptPopoverOpen(false);
}

function openSettings() {
  state.previousViewMode = state.viewMode === "settings" ? state.previousViewMode : state.viewMode;
  renderAvidMetadataColumnOptions();
  setViewMode("settings");
}

function closeSettings() {
  setViewMode(state.previousViewMode || inferMainViewMode());
}

function inferMainViewMode() {
  if (state.isBusy && !hasReviewableResults()) {
    return "busy";
  }
  if (totalSuggestionCount() > 0 || state.selectedAssets.some(function hasFinished(asset) {
    return asset.status === "ready" || asset.status === "failed";
  })) {
    return "review";
  }
  if (state.selectedAssets.length > 0) {
    return "prompt";
  }
  return "drop";
}

function isBatchActive() {
  return ["preparing", "exporting", "postingJobs", "analyzing"].indexOf(state.batchPhase) !== -1;
}

function hasReviewableResults() {
  return state.selectedAssets.some(function hasResult(asset) {
    return asset.status === "ready" || asset.status === "failed" || currentSuggestions(asset).length > 0;
  });
}

function isSubclipMode() {
  return state.workflowMode === "subclips";
}

function currentSuggestions(asset) {
  if (!asset) {
    return [];
  }
  return isSubclipMode() ? asset.subclips || [] : asset.markers || [];
}

function currentSuggestionName(count) {
  if (isSubclipMode()) {
    return count === 1 ? "subclip" : "subclips";
  }
  return count === 1 ? "marker" : "markers";
}

function effectiveSubclipsForAsset(asset) {
  return selectedSubclipsForApply(asset && asset.subclips || []);
}

function selectedUnappliedMarkerCount() {
  return state.selectedAssets.reduce(function countMarkers(total, asset) {
    if (asset.applied) {
      return total;
    }
    if (isSubclipMode()) {
      return total + effectiveSubclipsForAsset(asset).length;
    }
    return total + currentSuggestions(asset).filter(function selectedOnly(item) {
      return item.use !== false;
    }).length;
  }, 0);
}

function totalSuggestionCount() {
  return state.selectedAssets.reduce(function countMarkers(total, asset) {
    return total + currentSuggestions(asset).length;
  }, 0);
}

function totalMarkerCount() {
  return totalSuggestionCount();
}

function accountRequiresSignIn() {
  return Boolean(state.helperConfig && state.helperConfig.cloudAnalysisEnabled)
    && !(state.account && state.account.authenticated);
}

function accountCreditText(account) {
  if (!state.helperConfig || !state.helperConfig.cloudAnalysisEnabled) {
    return "Unavailable";
  }
  const minutes = account && account.credits ? Number(account.credits.balanceMinutes) : 0;
  return `${Number.isFinite(minutes) ? minutes : 0} min`;
}

function renderAccount() {
  const cloudEnabled = Boolean(state.helperConfig && state.helperConfig.cloudAnalysisEnabled);
  const account = state.account || {
    authenticated: false,
    credits: {
      balanceMinutes: 0
    },
    creditPacks: []
  };
  const authenticated = cloudEnabled && account.authenticated;
  const creditPacks = Array.isArray(account.creditPacks) ? account.creditPacks : [];
  const accountActionBusy = state.isSigningIn || state.isSigningOut || state.isBuyingCredits;

  if (dom["account-summary"]) {
    dom["account-summary"].textContent = cloudEnabled
      ? state.isSigningIn
        ? "Signing in..."
        : state.isBuyingCredits
          ? "Checkout..."
          : authenticated
        ? accountCreditText(account)
        : "Sign in"
      : "Unavailable";
  }
  if (dom["account-button"]) {
    dom["account-button"].disabled = !cloudEnabled || state.isSigningIn || state.isSigningOut;
    dom["account-button"].classList.toggle("is-authenticated", authenticated);
    dom["account-button"].classList.toggle("is-working", accountActionBusy);
    dom["account-button"].title = cloudEnabled
      ? authenticated
        ? "Mark account"
        : "Sign in to Mark"
      : "Mark account service unavailable";
  }
  if (dom["buy-credits-button"]) {
    dom["buy-credits-button"].textContent = state.isBuyingCredits ? "Opening..." : "Buy credits";
    dom["buy-credits-button"].classList.toggle("hidden", !authenticated);
    dom["buy-credits-button"].disabled = !authenticated || creditPacks.length === 0 || accountActionBusy;
  }
  if (dom["account-detail"]) {
    dom["account-detail"].textContent = cloudEnabled
      ? state.isSigningIn
        ? "Finish sign-in in your browser. Mark will update automatically."
        : state.isBuyingCredits
          ? "Secure checkout is opening in your browser."
          : authenticated
        ? "Signed in for hosted analysis."
        : "Sign in or create an account to use Mark analysis."
      : "Mark account service unavailable.";
  }
  if (dom["account-credit-balance"]) {
    dom["account-credit-balance"].textContent = accountCreditText(account);
  }
  if (dom["account-email"]) {
    dom["account-email"].textContent = authenticated && account.user
      ? account.user.email || "Signed in"
      : "Not signed in";
  }
  if (dom["credit-pack-select"]) {
    dom["credit-pack-select"].innerHTML = "";
    if (creditPacks.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No packs available";
      dom["credit-pack-select"].appendChild(option);
    } else {
      creditPacks.forEach(function addPack(pack) {
        const option = document.createElement("option");
        option.value = pack.id;
        option.textContent = `${pack.label} - ${pack.minutes} min`;
        dom["credit-pack-select"].appendChild(option);
      });
    }
    dom["credit-pack-select"].disabled = !authenticated || creditPacks.length === 0;
  }
  if (dom["sign-in-button"]) {
    dom["sign-in-button"].textContent = state.isSigningIn ? "Waiting for browser..." : "Sign in";
    dom["sign-in-button"].disabled = !cloudEnabled || authenticated || state.isBusy || accountActionBusy;
  }
  if (dom["refresh-account-button"]) {
    dom["refresh-account-button"].disabled = !cloudEnabled || state.isBusy || accountActionBusy;
  }
  if (dom["sign-out-button"]) {
    dom["sign-out-button"].textContent = state.isSigningOut ? "Signing out..." : "Sign out";
    dom["sign-out-button"].disabled = !authenticated || state.isBusy || accountActionBusy;
  }
  if (dom["settings-buy-credits-button"]) {
    dom["settings-buy-credits-button"].textContent = state.isBuyingCredits ? "Opening checkout..." : "Buy credits";
    dom["settings-buy-credits-button"].disabled = !authenticated || creditPacks.length === 0 || state.isBusy || accountActionBusy;
  }
  setBusy(state.isBusy);
}

function updateApplyButtonLabel() {
  const count = selectedUnappliedMarkerCount();
  dom["apply-button"].textContent = selectedCountLabel(state.workflowMode, count);
}

function setBusy(isBusy) {
  state.isBusy = Boolean(isBusy);
  const hasPrompt = Boolean(dom["marker-prompt"].value.trim());
  const canAnalyze = state.selectedAssets.length > 0 && hasPrompt && !accountRequiresSignIn();

  dom["analyze-button"].disabled = state.isBusy || !canAnalyze;
  dom["apply-button"].disabled = state.isApplying || selectedUnappliedMarkerCount() === 0;
  dom["clear-clips-button"].disabled = state.isBusy;
  dom["discard-suggestions-button"].disabled = state.isBusy;
  dom["workflow-mode-markers"].disabled = state.isBusy;
  dom["workflow-mode-subclips"].disabled = state.isBusy;
  Array.from(dom["selected-clip-list"].querySelectorAll(".selected-clip-remove")).forEach(function updateRemoveButton(button) {
    button.disabled = state.isBusy;
  });
  dom["save-favorite-prompt-button"].disabled = !hasPrompt;
  dom["delete-favorite-prompt-button"].disabled = !dom["favorite-prompt-select"].value;
  updateApplyButtonLabel();
}

function findQueueItem(itemId) {
  return state.queueItems.find(function sameItem(item) {
    return item && item.id === itemId;
  }) || null;
}

function activeQueueItem() {
  return state.activeQueueItemId ? findQueueItem(state.activeQueueItemId) : null;
}

function isQueueAsset(asset) {
  return state.queueItems.some(function hasAsset(item) {
    return item && item.asset === asset;
  });
}

function queueItemName(item) {
  const asset = item && item.asset || {};
  return asset.displayName || asset.name || asset.mobName || "Clip";
}

function queueItemSuggestionCount(item) {
  const asset = item && item.asset || {};
  return item && item.workflowMode === "subclips"
    ? (asset.subclips || []).length
    : (asset.markers || []).length;
}

function queueItemSuggestionName(item, count) {
  if (item && item.workflowMode === "subclips") {
    return count === 1 ? "subclip" : "subclips";
  }
  return count === 1 ? "marker" : "markers";
}

function queueItemStatusText(item) {
  if (!item) {
    return "Idle";
  }
  if (item.status === "ready") {
    const count = queueItemSuggestionCount(item);
    return count > 0 ? `${count} ${queueItemSuggestionName(item, count)}` : `No ${queueItemSuggestionName(item, 2)}`;
  }
  if (item.status === "failed") {
    return "Failed";
  }
  return item.message || queueStatusLabel(item.status);
}

function updateQueueControls() {
  if (!dom["queue-badge"]) {
    return;
  }
  const activeCount = activeQueueItemCount(state.queueItems);
  const readyCount = state.queueItems.filter(function ready(item) {
    return item.status === "ready";
  }).length;
  const failedCount = state.queueItems.filter(function failed(item) {
    return item.status === "failed";
  }).length;
  const title = activeCount > 0
    ? `Render queue, ${activeCount} running`
    : readyCount > 0
      ? `Render queue, ${readyCount} ready`
      : failedCount > 0
        ? `Render queue, ${failedCount} failed`
        : "Render queue";

  dom["queue-badge"].textContent = activeCount > 99 ? "99+" : String(activeCount);
  dom["queue-badge"].classList.toggle("hidden", activeCount === 0);
  dom["queue-toggle"].setAttribute("aria-label", title);
  dom["queue-toggle"].setAttribute("title", title);
}

function queueSummaryText() {
  if (state.queueItems.length === 0) {
    return "No active renders.";
  }
  const activeCount = activeQueueItemCount(state.queueItems);
  const readyCount = state.queueItems.filter(function ready(item) {
    return item.status === "ready";
  }).length;
  const failedCount = state.queueItems.filter(function failed(item) {
    return item.status === "failed";
  }).length;
  const parts = [];
  if (activeCount > 0) {
    parts.push(`${activeCount} running`);
  }
  if (readyCount > 0) {
    parts.push(`${readyCount} ready`);
  }
  if (failedCount > 0) {
    parts.push(`${failedCount} failed`);
  }
  return parts.length > 0 ? parts.join(" · ") : `${state.queueItems.length} queued`;
}

function renderQueue() {
  updateQueueControls();
  if (!dom["queue-list"]) {
    return;
  }

  dom["queue-summary"].textContent = queueSummaryText();
  dom["queue-empty"].classList.toggle("hidden", state.queueItems.length > 0);
  dom["queue-list"].innerHTML = "";

  state.queueItems.forEach(function renderItem(item) {
    const statusKind = queueStatusKind(item.status);
    const row = document.createElement("article");
    row.className = "queue-row";
    row.dataset.status = statusKind;
    row.dataset.queueItemId = item.id;

    const status = document.createElement("span");
    status.className = "queue-status-dot";
    status.dataset.status = statusKind;
    status.setAttribute("aria-hidden", "true");

    const body = document.createElement("div");
    body.className = "queue-row-body";
    const title = document.createElement("h3");
    title.textContent = queueItemName(item);
    const meta = document.createElement("p");
    meta.className = "queue-row-meta";
    meta.textContent = `${item.workflowMode === "subclips" ? "Subclips" : "Markers"} · ${item.prompt || "No prompt"}`;
    const message = document.createElement("p");
    message.className = "queue-row-message";
    message.textContent = item.error || queueItemStatusText(item);
    body.appendChild(title);
    body.appendChild(meta);
    if (!isActiveQueueStatus(item.status)) {
      body.appendChild(message);
    }

    const actions = document.createElement("div");
    actions.className = "queue-row-actions";
    if (isActiveQueueStatus(item.status)) {
      const stage = document.createElement("span");
      stage.className = "queue-stage-label";
      stage.textContent = queueItemStatusText(item);
      const spinner = document.createElement("span");
      spinner.className = "queue-spinner";
      spinner.setAttribute("aria-label", "In progress");
      actions.appendChild(stage);
      actions.appendChild(spinner);
    } else if (item.status === "ready") {
      const review = document.createElement("button");
      review.className = "queue-action-button primary-button";
      review.type = "button";
      review.textContent = state.activeQueueItemId === item.id ? "Reviewing" : "Review";
      review.disabled = state.activeQueueItemId === item.id && state.viewMode === "review";
      review.addEventListener("click", function reviewItem() {
        openQueueItemReview(item.id);
      });
      actions.appendChild(review);
    } else if (item.status === "failed") {
      const dismiss = document.createElement("button");
      dismiss.className = "queue-action-button secondary-button";
      dismiss.type = "button";
      dismiss.textContent = "Dismiss";
      dismiss.addEventListener("click", function dismissItem() {
        dismissQueueItem(item.id);
      });
      actions.appendChild(dismiss);
    }

    row.appendChild(status);
    row.appendChild(body);
    row.appendChild(actions);
    dom["queue-list"].appendChild(row);
  });
}

function updateQueueItem(item, patch) {
  if (!item) {
    return;
  }
  Object.assign(item, patch, {
    updatedAt: new Date().toISOString()
  });
  if (item.asset) {
    ["status", "message", "exportTaskId", "helperJobId", "exportPath", "proxySource", "proxyCandidates", "proxyLookupMessage", "error"].forEach(function mirror(key) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        item.asset[key] = patch[key];
      }
    });
    if (Object.prototype.hasOwnProperty.call(patch, "progress")) {
      item.asset.jobProgress = patch.progress;
    }
  }
  renderQueue();
}

function openQueue() {
  if (state.viewMode !== "queue" && state.viewMode !== "settings") {
    state.previousViewMode = state.viewMode;
  }
  renderQueue();
  setViewMode("queue");
}

function closeQueue() {
  setViewMode(state.previousViewMode && state.previousViewMode !== "queue"
    ? state.previousViewMode
    : inferMainViewMode());
}

function toggleQueue() {
  if (state.viewMode === "queue") {
    closeQueue();
  } else {
    openQueue();
  }
}

function openQueueItemReview(itemId) {
  const item = findQueueItem(itemId);
  if (!item || item.status !== "ready") {
    return;
  }

  state.activeQueueItemId = item.id;
  state.selectedAssets = [item.asset];
  state.project = item.project || state.project;
  state.workflowMode = item.workflowMode;
  state.lastPrompt = item.prompt;
  state.activeReviewClipIndex = 0;
  state.reviewCompletionSequence = 1;
  item.asset.reviewCompletionOrder = item.asset.reviewCompletionOrder || 1;
  updateWorkflowControls();
  renderAsset();
  renderPreview();
  renderQueue();
  setBusy(false);
  setStatus(`Review ${queueItemName(item)}.`);
  setViewMode("review");
}

function cleanupQueueItemResources(item) {
  if (!item || !item.helperJobId) {
    return;
  }
  requestJson("DELETE", `/jobs/${encodeURIComponent(item.helperJobId)}`).catch(function noop() {});
}

function clearActiveQueueReview(itemId) {
  if (state.activeQueueItemId !== itemId) {
    return;
  }
  state.activeQueueItemId = null;
  state.selectedAssets = [];
  state.activeReviewClipIndex = -1;
  renderAsset();
  renderPreview();
}

function removeQueueItem(itemId) {
  const index = state.queueItems.findIndex(function sameItem(item) {
    return item && item.id === itemId;
  });
  if (index === -1) {
    return null;
  }
  const item = state.queueItems[index];
  cleanupQueueItemResources(item);
  state.queueItems.splice(index, 1);
  clearActiveQueueReview(itemId);
  renderQueue();
  return item;
}

function dismissQueueItem(itemId) {
  const item = findQueueItem(itemId);
  if (!item || item.status !== "failed") {
    return;
  }
  removeQueueItem(itemId);
  setStatus(`${queueItemName(item)} dismissed.`);
  if (state.viewMode === "queue" && state.queueItems.length === 0) {
    renderQueue();
  }
}

function completeActiveQueueItemAfterApply() {
  const item = activeQueueItem();
  if (!item) {
    return false;
  }
  item.asset.applied = true;
  removeQueueItem(item.id);
  setViewMode(state.queueItems.length > 0 ? "queue" : "drop");
  return true;
}

function helperBaseUrl() {
  return (dom["helper-url"].value || DEFAULT_HELPER_URL).replace(/\/+$/, "");
}

function helperAssetUrl(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  if (/^https?:\/\//i.test(text)) {
    return text;
  }
  return `${helperBaseUrl()}${text.charAt(0) === "/" ? "" : "/"}${text}`;
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

function saveProxyRepositorySettings() {
  const methods = proxyRepositoryMethodsFromDom();
  try {
    window.localStorage.setItem(PROXY_REPOSITORY_ENABLED_STORAGE_KEY, dom["proxy-repository-enabled"].checked ? "1" : "0");
    window.localStorage.setItem(PROXY_REPOSITORY_ROOTS_STORAGE_KEY, dom["proxy-repository-roots"].value || "");
    window.localStorage.setItem(PROXY_REPOSITORY_METHODS_STORAGE_KEY, JSON.stringify(methods));
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
  }
  updateProxyRepositorySummary();
}

function proxyRepositoryMethodsFromDom() {
  const selected = [];
  if (dom["proxy-match-source-file"] && dom["proxy-match-source-file"].checked) {
    selected.push("sourceFile");
  }
  if (dom["proxy-match-source-path"] && dom["proxy-match-source-path"].checked) {
    selected.push("sourcePath");
  }
  if (dom["proxy-match-clip-name"] && dom["proxy-match-clip-name"].checked) {
    selected.push("clipName");
  }
  return normalizeProxyMatchMethods(selected);
}

function proxyRepositorySettings() {
  const fallbackRoots = state.helperConfig && Array.isArray(state.helperConfig.proxyRoots) ? state.helperConfig.proxyRoots : [];
  return {
    enabled: Boolean(dom["proxy-repository-enabled"] && dom["proxy-repository-enabled"].checked),
    roots: normalizeProxyRoots(dom["proxy-repository-roots"] && dom["proxy-repository-roots"].value, fallbackRoots),
    methods: proxyRepositoryMethodsFromDom(),
    extensions: state.helperConfig && Array.isArray(state.helperConfig.proxyExtensions) ? state.helperConfig.proxyExtensions : undefined
  };
}

function loadProxyRepositorySettings() {
  const enabled = localStorageItem(PROXY_REPOSITORY_ENABLED_STORAGE_KEY) === "1";
  const roots = localStorageItem(PROXY_REPOSITORY_ROOTS_STORAGE_KEY) || "";
  let methods = PROXY_MATCH_METHODS.slice();
  try {
    methods = normalizeProxyMatchMethods(JSON.parse(localStorageItem(PROXY_REPOSITORY_METHODS_STORAGE_KEY) || "[]"));
  } catch (error) {
    methods = PROXY_MATCH_METHODS.slice();
  }

  dom["proxy-repository-enabled"].checked = enabled;
  dom["proxy-repository-roots"].value = roots;
  dom["proxy-match-source-file"].checked = methods.indexOf("sourceFile") !== -1;
  dom["proxy-match-source-path"].checked = methods.indexOf("sourcePath") !== -1;
  dom["proxy-match-clip-name"].checked = methods.indexOf("clipName") !== -1;
  updateProxyRepositorySummary();
}

function updateProxyRepositorySummary() {
  if (!dom["proxy-repository-summary"]) {
    return;
  }
  const settings = proxyRepositorySettings();
  const usesSourcePath = settings.methods.indexOf("sourcePath") !== -1;
  const usesFolderSearch = settings.methods.some(function needsRoots(method) {
    return method === "sourceFile" || method === "clipName";
  });
  if (dom["proxy-repository-fields"]) {
    dom["proxy-repository-fields"].classList.toggle("hidden", !settings.enabled);
  }
  if (dom["proxy-repository-roots-field"]) {
    dom["proxy-repository-roots-field"].classList.toggle("hidden", !settings.enabled || !usesFolderSearch);
  }
  if (!settings.enabled) {
    dom["proxy-repository-summary"].textContent = "Existing proxy lookup is off. Mark will export temporary proxies from Avid.";
    return;
  }
  if (usesSourcePath && !usesFolderSearch) {
    dom["proxy-repository-summary"].textContent = "Mark will use Avid's Source Path directly. No search folder is required.";
    return;
  }
  if (usesSourcePath && usesFolderSearch && settings.roots.length === 0) {
    dom["proxy-repository-summary"].textContent = "Mark will use Avid's Source Path directly. Add folders only if you also want folder search.";
    return;
  }
  dom["proxy-repository-summary"].textContent = settings.roots.length > 0
    ? `Mark will search Avid Source Path plus ${settings.roots.length} folder location${settings.roots.length === 1 ? "" : "s"}.`
    : "Add at least one folder or drive path, or enable Avid Source Path.";
}

function proxyLookupFallbackMessage(asset, reason) {
  const clipName = asset && (asset.name || asset.displayName) || "clip";
  return `${reason} Exporting proxy for ${clipName} now.`;
}

function localStorageItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function normalizeReviewThumbnailSize(value) {
  return Object.prototype.hasOwnProperty.call(REVIEW_THUMBNAIL_SIZES, value)
    ? value
    : DEFAULT_REVIEW_THUMBNAIL_SIZE;
}

function applyReviewThumbnailSize(value) {
  const size = normalizeReviewThumbnailSize(value);
  document.documentElement.style.setProperty("--review-thumbnail-width", `${REVIEW_THUMBNAIL_SIZES[size]}px`);
  if (dom["review-thumbnail-size"]) {
    dom["review-thumbnail-size"].value = size;
  }
  return size;
}

function loadReviewThumbnailSize() {
  return applyReviewThumbnailSize(localStorageItem(REVIEW_THUMBNAIL_SIZE_STORAGE_KEY));
}

function saveReviewThumbnailSize() {
  const size = applyReviewThumbnailSize(dom["review-thumbnail-size"].value);
  try {
    window.localStorage.setItem(REVIEW_THUMBNAIL_SIZE_STORAGE_KEY, size);
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
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
    commentStyle: (dom["marker-comment-style"].value || DEFAULT_MARKER_COMMENT_STYLE).trim(),
    subclipSummaryStyle: (dom["subclip-summary-style"].value || DEFAULT_SUBCLIP_SUMMARY_STYLE).trim()
  };
}

function saveMarkerOutputStyle() {
  const style = markerOutputStyle();
  try {
    window.localStorage.setItem(MARKER_NAME_STYLE_STORAGE_KEY, style.nameStyle);
    window.localStorage.setItem(MARKER_COMMENT_STYLE_STORAGE_KEY, style.commentStyle);
    window.localStorage.setItem(SUBCLIP_SUMMARY_STYLE_STORAGE_KEY, style.subclipSummaryStyle);
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
  }
}

function loadMarkerOutputStyle() {
  dom["marker-name-style"].value = savedMarkerStyleText(MARKER_NAME_STYLE_STORAGE_KEY, DEFAULT_MARKER_NAME_STYLE);
  dom["marker-comment-style"].value = savedMarkerStyleText(MARKER_COMMENT_STYLE_STORAGE_KEY, DEFAULT_MARKER_COMMENT_STYLE);
  dom["subclip-summary-style"].value = localStorageItem(SUBCLIP_SUMMARY_STYLE_STORAGE_KEY) || DEFAULT_SUBCLIP_SUMMARY_STYLE;
}

function savedAvidMetadataColumns() {
  try {
    return normalizeMetadataColumnSelection(JSON.parse(localStorageItem(AVID_METADATA_COLUMNS_STORAGE_KEY) || "[]"));
  } catch (error) {
    return [];
  }
}

function selectedAvidMetadataColumns() {
  const select = dom["avid-metadata-columns"];
  if (!select) {
    return [];
  }
  return normalizeMetadataColumnSelection(Array.from(select.selectedOptions).map(function selected(option) {
    return option.value;
  }));
}

function saveAvidMetadataColumns() {
  const selected = selectedAvidMetadataColumns();
  try {
    window.localStorage.setItem(AVID_METADATA_COLUMNS_STORAGE_KEY, JSON.stringify(selected));
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
  }
  updateAvidMetadataSummary();
}

function renderAvidMetadataColumnOptions() {
  const select = dom["avid-metadata-columns"];
  if (!select) {
    return;
  }
  const selected = new Set(savedAvidMetadataColumns().map(function lower(column) {
    return column.toLowerCase();
  }));
  const columns = availableAvidMetadataColumns(
    state.selectedAssets,
    DEFAULT_AVID_METADATA_COLUMNS.concat(savedAvidMetadataColumns())
  );

  select.innerHTML = "";
  columns.forEach(function addColumn(column) {
    const option = document.createElement("option");
    option.value = column;
    option.textContent = column;
    option.selected = selected.has(column.toLowerCase());
    select.appendChild(option);
  });
  updateAvidMetadataSummary();
}

function updateAvidMetadataSummary() {
  if (!dom["avid-metadata-summary"]) {
    return;
  }
  const selected = selectedAvidMetadataColumns();
  if (selected.length === 0) {
    dom["avid-metadata-summary"].textContent = "No Avid metadata will be added to prompts.";
    return;
  }
  dom["avid-metadata-summary"].textContent = `Adds ${selected.length} selected column${selected.length === 1 ? "" : "s"} when the current clip has values.`;
}

function loadSubclipNamingOptions() {
  const options = normalizeSubclipNamingOptions({
    delimiter: localStorageItem(SUBCLIP_NAME_DELIMITER_STORAGE_KEY),
    suffix: localStorageItem(SUBCLIP_NAME_SUFFIX_STORAGE_KEY),
    startNumber: localStorageItem(SUBCLIP_NAME_START_STORAGE_KEY),
    padding: localStorageItem(SUBCLIP_NAME_PADDING_STORAGE_KEY)
  });
  state.subclipNamingOptions = options;
  dom["subclip-name-delimiter"].value = options.delimiter;
  dom["subclip-name-suffix"].value = options.suffix;
  dom["subclip-name-start"].value = String(options.startNumber);
  dom["subclip-name-padding"].value = String(options.padding);
  updateSubclipNamePreview();
}

function subclipNamingOptions() {
  state.subclipNamingOptions = normalizeSubclipNamingOptions({
    delimiter: dom["subclip-name-delimiter"].value,
    suffix: dom["subclip-name-suffix"].value,
    startNumber: dom["subclip-name-start"].value,
    padding: dom["subclip-name-padding"].value
  });
  return state.subclipNamingOptions;
}

function saveSubclipNamingOptions(commitInputs = true) {
  const options = subclipNamingOptions();
  if (commitInputs) {
    dom["subclip-name-delimiter"].value = options.delimiter;
    dom["subclip-name-suffix"].value = options.suffix;
    dom["subclip-name-start"].value = String(options.startNumber);
    dom["subclip-name-padding"].value = String(options.padding);
  }
  try {
    window.localStorage.setItem(SUBCLIP_NAME_DELIMITER_STORAGE_KEY, options.delimiter);
    window.localStorage.setItem(SUBCLIP_NAME_SUFFIX_STORAGE_KEY, options.suffix);
    window.localStorage.setItem(SUBCLIP_NAME_START_STORAGE_KEY, String(options.startNumber));
    window.localStorage.setItem(SUBCLIP_NAME_PADDING_STORAGE_KEY, String(options.padding));
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
  }
  updateSubclipNamePreview();
}

function updateSubclipNamePreview() {
  if (!dom["subclip-name-preview"]) {
    return;
  }
  dom["subclip-name-preview"].textContent = buildSubclipBatchName("Clip", 0, state.subclipNamingOptions, new Set());
}

function loadSubclipOptions() {
  const savedGranularity = normalizeGranularity(localStorageItem(SUBCLIP_GRANULARITY_STORAGE_KEY));
  const preset = granularityPreset(savedGranularity);
  dom["subclip-granularity"].value = savedGranularity;
  dom["subclip-min-duration"].value = localStorageItem(SUBCLIP_MIN_DURATION_STORAGE_KEY) || String(preset.minDuration);
  dom["subclip-max-duration"].value = localStorageItem(SUBCLIP_MAX_DURATION_STORAGE_KEY) || String(preset.maxDuration);
  updateSubclipDurationSummary();
}

function subclipOptions() {
  const granularity = normalizeGranularity(dom["subclip-granularity"].value);
  const preset = granularityPreset(granularity);
  return normalizeSubclipOptionValues({
    granularity,
    minDuration: dom["subclip-min-duration"].value || preset.minDuration,
    maxDuration: dom["subclip-max-duration"].value || preset.maxDuration,
    targetSegmentsPerMinute: preset.targetSegmentsPerMinute
  });
}

function saveSubclipOptions() {
  const options = subclipOptions();
  try {
    window.localStorage.setItem(SUBCLIP_GRANULARITY_STORAGE_KEY, options.granularity);
    window.localStorage.setItem(SUBCLIP_MIN_DURATION_STORAGE_KEY, String(options.minDuration));
    window.localStorage.setItem(SUBCLIP_MAX_DURATION_STORAGE_KEY, String(options.maxDuration));
  } catch (error) {
    // localStorage can be unavailable in some embedded browser states.
  }
}

function syncSettingsSubclipDefaults(options) {
  const normalized = options || subclipOptions();
  if (!dom["settings-subclip-granularity"]) {
    return;
  }
  dom["settings-subclip-granularity"].value = normalized.granularity;
  dom["settings-subclip-min-duration"].value = String(normalized.minDuration);
  dom["settings-subclip-max-duration"].value = String(normalized.maxDuration);
}

function applySettingsSubclipDefaults(useGranularityPreset) {
  dom["subclip-granularity"].value = dom["settings-subclip-granularity"].value || "balanced";
  if (useGranularityPreset) {
    applyGranularityDefaults();
    return;
  }
  dom["subclip-min-duration"].value = dom["settings-subclip-min-duration"].value;
  dom["subclip-max-duration"].value = dom["settings-subclip-max-duration"].value;
  updateSubclipDurationSummary();
  saveSubclipOptions();
}

function subclipGranularityLabel(granularity) {
  if (normalizeGranularity(granularity) === "fine") {
    return "Detailed";
  }
  return granularityPreset(granularity).label;
}

function hasCustomSubclipDuration(options) {
  const normalized = options || subclipOptions();
  const preset = granularityPreset(normalized.granularity);
  return Number(normalized.minDuration) !== Number(preset.minDuration)
    || Number(normalized.maxDuration) !== Number(preset.maxDuration);
}

function customDurationLabel(options) {
  const normalized = options || subclipOptions();
  return `${normalized.minDuration}-${normalized.maxDuration}s`;
}

function setSubclipOptionsPopoverOpen(isOpen, showDurationFields) {
  if (!dom["subclip-options-popover"]) {
    return;
  }

  dom["subclip-options-popover"].classList.toggle("hidden", !isOpen);
  dom["subclip-options-toggle"].setAttribute("aria-expanded", String(isOpen));
  dom["subclip-duration-toggle"].setAttribute("aria-expanded", String(isOpen));
  if (isOpen && showDurationFields) {
    setCustomDurationFieldsOpen(true);
  }
}

function setCustomDurationFieldsOpen(isOpen) {
  if (!dom["subclip-duration-fields"]) {
    return;
  }
  dom["subclip-duration-fields"].classList.toggle("hidden", !isOpen);
  dom["custom-duration-toggle"].setAttribute("aria-expanded", String(isOpen));
}

function applyGranularityDefaults() {
  const preset = granularityPreset(dom["subclip-granularity"].value);
  dom["subclip-min-duration"].value = String(preset.minDuration);
  dom["subclip-max-duration"].value = String(preset.maxDuration);
  updateSubclipDurationSummary();
  saveSubclipOptions();
}

function updateSubclipDurationSummary() {
  const options = subclipOptions();
  const customDuration = hasCustomSubclipDuration(options);
  const settingsLabel = `Subclip settings: ${subclipGranularityLabel(options.granularity)}${customDuration ? `, ${customDurationLabel(options)}` : ""}`;
  dom["subclip-options-toggle"].setAttribute("aria-label", settingsLabel);
  dom["subclip-options-toggle"].setAttribute("title", settingsLabel);
  dom["subclip-duration-toggle"].textContent = customDurationLabel(options);
  dom["subclip-duration-toggle"].classList.toggle("hidden", !customDuration);
  dom["custom-duration-toggle"].querySelector("strong").textContent = customDuration
    ? customDurationLabel(options)
    : "Default";
  Array.from(document.querySelectorAll(".granularity-choice")).forEach(function updateChoice(button) {
    const isActive = normalizeGranularity(button.dataset.granularity) === options.granularity;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  syncSettingsSubclipDefaults(options);
}

function updateWorkflowControls() {
  const isSubclips = isSubclipMode();
  dom["workflow-mode-markers"].classList.toggle("is-active", !isSubclips);
  dom["workflow-mode-markers"].setAttribute("aria-pressed", String(!isSubclips));
  dom["workflow-mode-subclips"].classList.toggle("is-active", isSubclips);
  dom["workflow-mode-subclips"].setAttribute("aria-pressed", String(isSubclips));
  dom["subclip-options"].classList.toggle("hidden", !isSubclips);
  if (!isSubclips) {
    setSubclipOptionsPopoverOpen(false);
  }
  dom["prompt-view"].setAttribute("aria-label", isSubclips ? "Subclip prompt" : "Marker prompt");
  dom["preview-empty"].textContent = isSubclips
    ? "I'll show suggested subclip sections here, grouped by clip."
    : "I'll show suggested marker moments here, grouped by clip.";
  dom["marker-prompt"].placeholder = isSubclips
    ? "continuous moments with strong reactions"
    : "exteriors of buildings";
  dom["analyze-button"].setAttribute("aria-label", isSubclips ? "Find sections" : "Find moments");
  dom["analyze-button"].setAttribute("title", isSubclips ? "Find sections" : "Find moments");
  const promptLabel = document.querySelector(".prompt-label");
  if (promptLabel) {
    promptLabel.textContent = isSubclips ? "What should I pull?" : "What should I look for?";
  }
  if (state.viewMode !== "settings") {
    updateTopbarForView(state.viewMode);
  }
  updateApplyButtonLabel();
}

function clearAnalysisResults() {
  cleanupRetainedJobs();
  clearPoll();
  state.batchPhase = "idle";
  state.selectedAssets.forEach(function resetAsset(asset) {
    asset.status = "idle";
    asset.message = "Ready";
    asset.exportTaskId = null;
    asset.helperJobId = null;
    asset.exportPath = null;
    asset.proxySource = null;
    asset.proxyCandidates = null;
    asset.proxyLookupMessage = "";
    asset.pendingExport = null;
    asset.markers = [];
    asset.subclips = [];
    asset.applied = false;
    asset.error = null;
    asset.debugMessage = "";
  });
  state.activeReviewClipIndex = -1;
  state.activeClipIndex = -1;
  state.currentJobClipIndex = -1;
  state.batchConfig = null;
  state.batchPrompt = "";
  state.batchOptions = null;
  state.hasShownIncrementalReview = false;
  setProgressIndeterminate(false);
  setProgress(0);
  dom["progress-detail"].textContent = "";
}

function setWorkflowMode(mode) {
  const nextMode = mode === "subclips" ? "subclips" : "markers";
  if (nextMode === state.workflowMode) {
    return;
  }
  if (state.isBusy) {
    return;
  }

  state.workflowMode = nextMode;
  clearAnalysisResults();
  updateWorkflowControls();
  renderPreview();
  setBusy(false);
  setStatus(nextMode === "subclips" ? "Ready to find continuous sections." : "Ready to find marker moments.");
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
  placeholder.textContent = state.favoritePrompts.length > 0 ? "Prompt presets" : "No presets yet";
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
    setStatus("Write a prompt before saving it as a preset.", true);
    return;
  }

  const lowerPrompt = prompt.toLowerCase();
  const nextPrompts = [prompt].concat(state.favoritePrompts.filter(function uniqueFavorite(existing) {
    return existing.toLowerCase() !== lowerPrompt;
  })).slice(0, MAX_FAVORITE_PROMPTS);

  saveFavoritePrompts(nextPrompts);
  dom["favorite-prompt-select"].value = prompt;
  setStatus("Prompt preset saved.");
}

function deleteSelectedFavoritePrompt() {
  const prompt = dom["favorite-prompt-select"].value;
  if (!prompt) {
    return;
  }

  saveFavoritePrompts(state.favoritePrompts.filter(function keepFavorite(existing) {
    return existing !== prompt;
  }));
  setStatus("Prompt preset removed.");
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
  return host.getMetadata();
}

function requestJson(method, path, body) {
  return helperClient.requestJson(method, path, body);
}

function reportHostError(code, message) {
  if (host && typeof host.reportError === "function") {
    host.reportError(code, message);
  }
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

  const columnCandidates = [
    asset.columns && asset.columns.Name,
    asset.columns && asset.columns.name,
    asset.columnValues && asset.columnValues.Name,
    asset.columnValues && asset.columnValues.name,
    asset.binColumns && asset.binColumns.Name,
    asset.binColumns && asset.binColumns.name
  ];

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

  return columnCandidates.concat(directCandidates).map(function cleanName(value) {
    return String(value || "").trim();
  }).find(function usableName(value) {
    return value && value !== String(asset.id || "").trim();
  }) || "";
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

function appendSvgIcon(element, paths) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 0 24 24");
  paths.forEach(function appendPath(pathData) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
  });
  element.appendChild(svg);
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
  state.selectedAssets.forEach(function renderSelectedClip(item, assetIndex) {
    const pill = document.createElement("span");
    pill.className = "selected-clip-pill";
    const label = document.createElement("span");
    label.className = "selected-clip-name";
    label.textContent = item.displayName;
    const remove = document.createElement("button");
    remove.className = "selected-clip-remove";
    remove.type = "button";
    remove.disabled = state.isBusy;
    remove.setAttribute("aria-label", `Remove ${item.displayName}`);
    remove.setAttribute("title", "Remove clip");
    appendSvgIcon(remove, ["M18 6 6 18", "M6 6l12 12"]);
    remove.addEventListener("click", function removeClip(event) {
      event.stopPropagation();
      removeSelectedClip(assetIndex);
    });
    pill.appendChild(label);
    pill.appendChild(remove);
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

function formatSubclipPoint(seconds) {
  const fps = state.project && state.project.fps ? state.project.fps : 24;
  const dropFrame = Boolean(state.project && state.project.dropFrame);
  return secondsToTimecode(seconds, fps, dropFrame);
}

function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value < 60) {
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)} sec`;
  }
  const minutes = Math.floor(value / 60);
  const remaining = Math.round(value % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function subclipDuration(subclip) {
  return Math.max(0, (Number(subclip.endTime) || 0) - (Number(subclip.startTime) || 0));
}

function renderMarkerSuggestionCard(asset, marker, markerIndex, activeIndex) {
  const card = document.createElement("article");
  card.className = "suggestion-card marker-card";
  card.classList.toggle("is-muted", marker.use === false);
  card.dataset.assetIndex = String(activeIndex);
  card.dataset.markerId = marker.id || createGuid();
  card.dataset.markerIndex = String(markerIndex);
  card.dataset.kind = "marker";

  const cardMeta = document.createElement("div");
  cardMeta.className = "review-metadata-strip suggestion-card-meta";
  cardMeta.classList.toggle("has-thumbnail", Boolean(marker.thumbnailUrl));

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
  if (marker.thumbnailUrl) {
    cardMeta.appendChild(resultThumbnail(marker.thumbnailUrl, `Marker ${markerIndex + 1} thumbnail`));
  }
  cardMeta.appendChild(timeRange);
  cardMeta.appendChild(color);
  card.appendChild(cardMeta);
  card.appendChild(nameField);
  card.appendChild(commentField);
  card.appendChild(startInput);
  card.appendChild(endInput);

  if (!marker.id) {
    state.selectedAssets[activeIndex].markers[markerIndex].id = card.dataset.markerId;
  }

  return card;
}

function renderSubclipSuggestionCard(asset, subclip, subclipIndex, activeIndex) {
  const card = document.createElement("article");
  card.className = "suggestion-card subclip-card";
  card.classList.toggle("is-muted", subclip.use === false);
  card.dataset.assetIndex = String(activeIndex);
  card.dataset.subclipId = subclip.id || createGuid();
  card.dataset.subclipIndex = String(subclipIndex);
  card.dataset.kind = "subclip";

  const cardHead = document.createElement("div");
  cardHead.className = "review-metadata-strip subclip-card-head";
  cardHead.classList.toggle("has-thumbnail", Boolean(subclip.thumbnailUrl));

  const selectLabel = document.createElement("label");
  selectLabel.className = "suggestion-select";
  const use = document.createElement("input");
  use.className = "subclip-use";
  use.type = "checkbox";
  use.checked = subclip.use !== false;
  use.setAttribute("aria-label", `Use subclip ${subclipIndex + 1} for ${asset.displayName || "clip"}`);
  use.addEventListener("change", function onSubclipUseChange() {
    syncPreviewFromCards();
    renderPreview();
  });
  selectLabel.appendChild(use);

  const timing = document.createElement("div");
  timing.className = "subclip-timing";
  timing.dataset.role = "timecode";
  timing.appendChild(subclipTimingItem("In", formatSubclipPoint(subclip.startTime)));
  timing.appendChild(subclipTimingItem("Out", formatSubclipPoint(subclip.endTime)));
  timing.appendChild(subclipTimingItem("Dur", formatDuration(subclipDuration(subclip))));

  const mergeControls = document.createElement("div");
  mergeControls.className = "subclip-merge-controls";
  mergeControls.appendChild(subclipMergeButton("up", activeIndex, subclipIndex, subclipIndex === 0));
  mergeControls.appendChild(subclipMergeButton("down", activeIndex, subclipIndex, subclipIndex >= (asset.subclips || []).length - 1));

  const summaryField = document.createElement("label");
  summaryField.className = "marker-field marker-field-comment subclip-summary-field";
  const summaryLabel = document.createElement("span");
  summaryLabel.className = "sr-only";
  summaryLabel.textContent = "Summary";
  const summary = document.createElement("textarea");
  summary.className = "marker-comment-input subclip-summary-input";
  summary.rows = 2;
  summary.value = subclip.summary || "";
  summary.setAttribute("aria-label", "Subclip summary");
  summary.addEventListener("input", syncPreviewFromCards);
  summaryField.appendChild(summaryLabel);
  summaryField.appendChild(summary);

  const startInput = subclipHiddenTimeInput("subclip-start-input", subclip.startTime);
  const endInput = subclipHiddenTimeInput("subclip-end-input", subclip.endTime);

  cardHead.appendChild(selectLabel);
  if (subclip.thumbnailUrl) {
    cardHead.appendChild(resultThumbnail(subclip.thumbnailUrl, `Subclip ${subclipIndex + 1} thumbnail`));
  }
  cardHead.appendChild(timing);
  cardHead.appendChild(mergeControls);
  card.appendChild(cardHead);
  card.appendChild(summaryField);
  card.appendChild(startInput);
  card.appendChild(endInput);

  if (!subclip.id) {
    state.selectedAssets[activeIndex].subclips[Number(card.dataset.subclipIndex)].id = card.dataset.subclipId;
  }

  return card;
}

function subclipMergeButton(direction, activeIndex, subclipIndex, isDisabled) {
  const button = document.createElement("button");
  button.className = "subclip-merge-button";
  button.type = "button";
  button.disabled = isDisabled || state.isApplying;
  button.textContent = direction === "up" ? "↑" : "↓";
  button.setAttribute("aria-label", direction === "up" ? "Merge subclip up" : "Merge subclip down");
  button.setAttribute("title", direction === "up" ? "Merge up" : "Merge down");
  button.addEventListener("click", function onMergeClick(event) {
    event.preventDefault();
    event.stopPropagation();
    mergeSubclipInAsset(activeIndex, subclipIndex, direction);
  });
  return button;
}

function mergeSubclipInAsset(assetIndex, subclipIndex, direction) {
  if (state.isApplying) {
    return;
  }
  syncPreviewFromCards();
  const asset = state.selectedAssets[assetIndex];
  if (!asset) {
    return;
  }
  asset.subclips = mergeSubclipAt(asset.subclips || [], subclipIndex, direction);
  renderPreview();
  setBusy(false);
}

function updateSubclipTiming(element, subclip) {
  element.replaceChildren(
    subclipTimingItem("In", formatSubclipPoint(subclip.startTime)),
    subclipTimingItem("Out", formatSubclipPoint(subclip.endTime)),
    subclipTimingItem("Dur", formatDuration(subclipDuration(subclip)))
  );
}

function subclipTimingItem(labelText, value) {
  const item = document.createElement("span");
  item.className = "subclip-timing-item";
  const label = document.createElement("span");
  const text = document.createElement("strong");
  label.textContent = labelText;
  text.textContent = value;
  item.appendChild(label);
  item.appendChild(text);
  return item;
}

function subclipHiddenTimeInput(className, value) {
  const input = document.createElement("input");
  input.className = className;
  input.type = "hidden";
  input.value = (Number(value) || 0).toFixed(3);
  return input;
}

function renderPreview() {
  const list = dom["suggestion-list"];
  const prompt = state.lastPrompt || dom["marker-prompt"].value.trim();
  const suggestionCount = totalSuggestionCount();
  const hasRunResults = state.selectedAssets.some(function hasResult(asset) {
    return asset.status === "ready" || asset.status === "failed";
  });
  const tabs = dom["review-clip-tabs"];
  list.innerHTML = "";
  tabs.innerHTML = "";

  if (suggestionCount === 0 && !hasRunResults) {
    dom["preview-count"].textContent = state.selectedAssets.length > 0
      ? `${state.selectedAssets.length} clip${state.selectedAssets.length === 1 ? "" : "s"} ready for analysis.`
      : "No suggestions yet.";
    dom["preview-empty"].classList.remove("hidden");
    dom["review-content"].classList.add("hidden");
    updateApplyButtonLabel();
    setBusy(state.isBusy);
    return;
  }

  dom["preview-count"].textContent = suggestionCount > 0
    ? `I found ${suggestionCount} ${currentSuggestionName(suggestionCount)} across ${state.selectedAssets.length} clip${state.selectedAssets.length === 1 ? "" : "s"}${prompt ? ` for "${prompt}"` : ""}.`
    : `No ${currentSuggestionName(2)} suggestions${prompt ? ` for "${prompt}"` : ""}.`;
  dom["preview-empty"].classList.add("hidden");
  dom["review-content"].classList.remove("hidden");
  const activeIndex = normalizedActiveReviewClipIndex();
  state.activeReviewClipIndex = activeIndex;

  sortedReviewClipEntries().forEach(function renderTab(entry) {
    const asset = entry.asset;
    const assetIndex = entry.assetIndex;
    const statusKind = reviewClipStatusKind(asset);
    const isSelectable = isReviewClipSelectable(asset);
    const isActive = assetIndex === state.activeReviewClipIndex;
    const labelText = asset.displayName || `Clip ${assetIndex + 1}`;
    const statusText = clipStatusLabel(asset);
    const button = document.createElement("button");
    button.className = "review-clip-tab";
    button.type = "button";
    button.disabled = !isSelectable;
    button.dataset.assetIndex = String(assetIndex);
    button.dataset.status = statusKind;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "true" : "false");
    button.setAttribute("aria-label", `${labelText}: ${statusText}`);
    button.setAttribute("title", `${labelText}: ${statusText}`);
    button.addEventListener("click", function activateClip() {
      if (!isSelectable) {
        return;
      }
      state.activeReviewClipIndex = assetIndex;
      renderPreview();
    });

    const status = document.createElement("span");
    status.className = "review-clip-status-dot";
    status.dataset.status = statusKind;
    status.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "review-clip-name";
    label.textContent = labelText;
    const meta = document.createElement("small");
    meta.className = "review-clip-meta";
    meta.textContent = statusText;
    button.appendChild(status);
    button.appendChild(label);
    button.appendChild(meta);
    tabs.appendChild(button);
  });
  const asset = state.selectedAssets[activeIndex];
  const suggestions = currentSuggestions(asset);

  const clipGroup = document.createElement("section");
  clipGroup.className = "clip-result";
  clipGroup.dataset.assetIndex = String(activeIndex);

  const header = document.createElement("div");
  header.className = "clip-result-header";
  const title = document.createElement("h3");
  title.textContent = asset ? asset.displayName : "Clip";
  const count = document.createElement("span");
  count.textContent = `${suggestions.length} ${currentSuggestionName(suggestions.length)}`;
  header.appendChild(title);
  header.appendChild(count);
  clipGroup.appendChild(header);

  const markerList = document.createElement("div");
  markerList.className = "clip-marker-list";

  if (suggestions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "clip-marker-empty";
    empty.textContent = asset && asset.error
      ? asset.error
      : asset && asset.status && asset.status !== "ready"
        ? asset.message || clipStatusLabel(asset)
        : `No ${currentSuggestionName(2)} suggestions for this clip.`;
    markerList.appendChild(empty);
  } else {
    suggestions.forEach(function renderCard(suggestion, suggestionIndex) {
      markerList.appendChild(isSubclipMode()
        ? renderSubclipSuggestionCard(asset, suggestion, suggestionIndex, activeIndex)
        : renderMarkerSuggestionCard(asset, suggestion, suggestionIndex, activeIndex));
    });
  }

  clipGroup.appendChild(markerList);
  list.appendChild(clipGroup);

  updateApplyButtonLabel();
  setBusy(state.isBusy);
}

function clipStatusLabel(asset) {
  const suggestionCount = currentSuggestions(asset).length;
  if (asset.status === "failed") {
    return "Failed";
  }
  if (asset.status === "analyzing") {
    return asset.message || "Analyzing";
  }
  if (asset.status === "queued" || asset.status === "resolvingProxy" || asset.status === "exporting" || asset.status === "proxyReady") {
    return asset.message || "Queued";
  }
  if (suggestionCount > 0) {
    return `${suggestionCount} ${currentSuggestionName(suggestionCount)}`;
  }
  return asset.message || `No ${currentSuggestionName(2)}`;
}

function reviewClipStatusKind(asset) {
  if (!asset) {
    return "idle";
  }
  if (asset.status === "failed") {
    return "failed";
  }
  if (asset.status === "ready" || currentSuggestions(asset).length > 0 || asset.applied) {
    return "ready";
  }
  if (asset.status === "queued" || asset.status === "resolvingProxy" || asset.status === "exporting" || asset.status === "proxyReady" || asset.status === "analyzing") {
    return "processing";
  }
  return "idle";
}

function isReviewClipSelectable(asset) {
  const statusKind = reviewClipStatusKind(asset);
  return statusKind === "ready" || statusKind === "failed";
}

function nextReviewCompletionOrder() {
  state.reviewCompletionSequence += 1;
  return state.reviewCompletionSequence;
}

function markReviewClipCompleted(asset) {
  if (!asset || asset.reviewCompletionOrder) {
    return;
  }
  asset.reviewCompletionOrder = nextReviewCompletionOrder();
}

function reviewClipSortRank(asset) {
  const statusKind = reviewClipStatusKind(asset);
  if (statusKind === "ready") {
    return 0;
  }
  if (statusKind === "failed") {
    return 2;
  }
  return 1;
}

function sortedReviewClipEntries() {
  return state.selectedAssets.map(function withIndex(asset, assetIndex) {
    return {
      asset,
      assetIndex,
      rank: reviewClipSortRank(asset),
      completionOrder: Number(asset.reviewCompletionOrder) || 0
    };
  }).sort(function byReviewStatus(left, right) {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }
    if (left.completionOrder !== right.completionOrder) {
      return (left.completionOrder || Number.MAX_SAFE_INTEGER) - (right.completionOrder || Number.MAX_SAFE_INTEGER);
    }
    return left.assetIndex - right.assetIndex;
  });
}

function normalizedActiveReviewClipIndex() {
  const activeAsset = state.selectedAssets[state.activeReviewClipIndex];
  if (activeAsset && isReviewClipSelectable(activeAsset)) {
    return state.activeReviewClipIndex;
  }

  const firstWithSuggestions = sortedReviewClipEntries().find(function hasSuggestions(entry) {
    const asset = entry.asset;
    return reviewClipStatusKind(asset) === "ready" && currentSuggestions(asset).length > 0;
  });

  if (firstWithSuggestions) {
    return firstWithSuggestions.assetIndex;
  }

  const firstReady = sortedReviewClipEntries().find(function isReady(entry) {
    return reviewClipStatusKind(entry.asset) === "ready";
  });

  if (firstReady) {
    return firstReady.assetIndex;
  }

  const firstFailed = sortedReviewClipEntries().find(function isFailed(entry) {
    return reviewClipStatusKind(entry.asset) === "failed";
  });

  if (firstFailed) {
    return firstFailed.assetIndex;
  }

  return state.activeReviewClipIndex >= 0 && state.activeReviewClipIndex < state.selectedAssets.length
    ? state.activeReviewClipIndex
    : 0;
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

function clampSubclip(subclip) {
  const startTime = Math.max(0, Number(subclip.startTime) || 0);
  const rawEnd = Number(subclip.endTime);
  const endTime = Number.isFinite(rawEnd) && rawEnd > startTime ? rawEnd : startTime + 1;

  return {
    id: subclip.id || createGuid(),
    use: subclip.use !== false,
    name: sanitizeSubclipName(subclip.name, "Mark subclip"),
    summary: String(subclip.summary || "").slice(0, 4000),
    startTime,
    endTime,
    duration: Number((endTime - startTime).toFixed(3)),
    thumbnailUrl: String(subclip.thumbnailUrl || "")
  };
}

function resultThumbnail(thumbnailUrl, altText) {
  const wrap = document.createElement("div");
  wrap.className = "result-thumbnail";
  const img = document.createElement("img");
  img.src = helperAssetUrl(thumbnailUrl);
  img.alt = altText;
  img.loading = "lazy";
  img.addEventListener("error", function hideBrokenThumbnail() {
    wrap.classList.add("hidden");
  });
  wrap.appendChild(img);
  return wrap;
}

function nameSubclipsForAsset(asset, subclips) {
  const usedNames = new Set();
  const sourceName = sanitizeSubclipName(asset.displayName || asset.name || "Source clip", "Source clip");
  const options = state.subclipNamingOptions || subclipNamingOptions();
  return (subclips || []).map(function nameSubclip(subclip, subclipIndex) {
    return {
      ...subclip,
      name: buildSubclipBatchName(sourceName, subclipIndex, options, usedNames)
    };
  });
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
  const suggestionsByAsset = new Map();

  cards.forEach(function readCard(card) {
    const assetIndex = Number(card.dataset.assetIndex);
    let suggestion;
    if (card.dataset.kind === "subclip") {
      const rawIndex = Number(card.dataset.subclipIndex);
      const asset = state.selectedAssets[assetIndex];
      const existing = asset && asset.subclips && asset.subclips[rawIndex] ? asset.subclips[rawIndex] : {};
      const summaryInput = card.querySelector(".subclip-summary-input");
      suggestion = clampSubclip({
        id: card.dataset.subclipId,
        use: card.querySelector(".subclip-use").checked,
        name: existing.name || "Mark subclip",
        summary: summaryInput ? summaryInput.value : existing.summary,
        startTime: Number(existing.startTime),
        endTime: Number(existing.endTime),
        thumbnailUrl: existing.thumbnailUrl
      });
      suggestion.rawIndex = rawIndex;
    } else {
      const rawIndex = Number(card.dataset.markerIndex);
      const asset = state.selectedAssets[assetIndex];
      const existing = asset && asset.markers && asset.markers[rawIndex] ? asset.markers[rawIndex] : {};
      suggestion = clampMarker({
        id: card.dataset.markerId,
        use: card.querySelector(".marker-use").checked,
        name: card.querySelector(".marker-name-input").value,
        comment: card.querySelector(".marker-comment-input").value,
        color: card.querySelector(".marker-color-select").value,
        startTime: Number(card.querySelector(".marker-start-input").value),
        endTime: Number(card.querySelector(".marker-end-input").value),
        thumbnailUrl: existing.thumbnailUrl
      });
    }
    const list = suggestionsByAsset.get(assetIndex) || [];
    if (card.dataset.kind === "subclip" && Number.isFinite(suggestion.rawIndex)) {
      list[suggestion.rawIndex] = suggestion;
    } else {
      list.push(suggestion);
    }
    suggestionsByAsset.set(assetIndex, list);
  });

  state.selectedAssets.forEach(function updateAssetSuggestions(asset, index) {
    if (isSubclipMode()) {
      const subclips = suggestionsByAsset.get(index);
      asset.subclips = subclips
        ? subclips.filter(function existingOnly(subclip) {
          return Boolean(subclip);
        })
        : asset.subclips || [];
    } else {
      asset.markers = suggestionsByAsset.get(index) || asset.markers || [];
    }
  });

  cards.forEach(function updateComputedFields(card) {
    const assetIndex = Number(card.dataset.assetIndex);
    const suggestions = suggestionsByAsset.get(assetIndex) || [];
    const siblingCards = Array.from(card.parentNode.querySelectorAll(".suggestion-card"));
    const suggestion = suggestions[siblingCards.indexOf(card)];
    card.classList.toggle("is-muted", suggestion.use === false);
    const timecode = card.querySelector("[data-role='timecode']");
    if (card.dataset.kind === "subclip") {
      updateSubclipTiming(timecode, suggestion);
    } else {
      timecode.textContent = formatMarkerIn(suggestion);
    }
    const duration = card.querySelector("[data-role='duration']");
    if (duration) {
      duration.textContent = formatDuration(subclipDuration(suggestion));
    }
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
    appendDebugEvent("Drop payload", dragList);
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
      name: asset.name || asset.Name || asset.clipName || asset.clip_name || "",
      displayName: asset.displayName || asset.display_name || asset.name || asset.Name || asset.mobName || asset.mob_name || "",
      mobName: asset.mobName || asset.mob_name || "",
      type: asset.type,
      head: asset.head,
      inMark: asset.in,
      outMark: asset.out,
      binPath: asset.binPath || asset.bin_path || asset.absoluteBinPath || asset.absolute_bin_path || asset.relativeBinPath || asset.relative_bin_path || "",
      systemId: asset.systemID || asset.systemId,
      systemType: asset.systemType,
      columns: asset.columns || asset.columnValues || asset.binColumns || {},
      rawDropData: asset,
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
    const fallbackName = asset.displayName || asset.name || asset.mobName || asset.mob_name || fallbackAssetName(asset);
    return {
      id: asset.id,
      name: sourceName || fallbackName,
      displayName: sourceName || fallbackName,
      mobName: asset.mobName || asset.mob_name || "",
      needsNameHydration: !sourceName,
      type: asset.type || "clip",
      head: asset.head,
      inMark: asset.inMark,
      outMark: asset.outMark,
      binPath: asset.binPath || "",
      binPathSource: asset.binPath ? "drop" : "",
      systemId: asset.systemId || asset.systemID || "",
      systemType: asset.systemType || "",
      columns: asset.columns || {},
      rawDropData: asset.rawDropData || null,
      source: asset.source || "unknown",
      status: "idle",
      message: "Ready",
      exportTaskId: null,
      helperJobId: null,
      helperDebugEventCount: 0,
      exportPath: null,
      proxySource: null,
      proxyCandidates: null,
      proxyLookupMessage: "",
      markers: [],
      subclips: [],
      applied: false
    };
  });

  if (normalizedAssets.length === 0) {
    setStatus("Mark could not read clip IDs from that selection.", true);
    return;
  }
  appendDebugEvent("Selected assets normalized", normalizedAssets.map(function summarize(asset) {
    return {
      id: asset.id,
      name: asset.name,
      displayName: asset.displayName,
      mobName: asset.mobName,
      binPath: asset.binPath,
      binPathSource: asset.binPathSource,
      columns: asset.columns,
      rawDropData: asset.rawDropData
    };
  }));

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
  loadProjectInfo().then(function hydrateAfterProject() {
    return Promise.all([
      hydrateAssetNames(normalizedAssets),
      hydrateAssetBinPaths(normalizedAssets)
    ]);
  }).then(function loaded() {
    renderAvidMetadataColumnOptions();
    renderAsset();
    renderPreview();
    renderProject();
    setStatus(isSubclipMode() ? "Ready. Tell me what to pull." : "Ready. Tell me what to find.");
    setBusy(false);
  }).catch(function failed(error) {
    setStatus(error.message, true);
    setBusy(false);
  });
}

function resetForNewAsset() {
  cleanupRetainedJobs();
  state.selectedAssets = [];
  state.activeQueueItemId = null;
  state.activeClipIndex = -1;
  state.currentJobClipIndex = -1;
  state.activeReviewClipIndex = -1;
  state.batchConfig = null;
  state.batchPrompt = "";
  if (state.queueItems.length === 0) {
    clearPoll();
  } else {
    ensureQueuePolling();
  }
  setProgressIndeterminate(false);
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
        reportHostError(err.code, err.message);
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
    if (!asset || !asset.id) {
      return Promise.resolve();
    }

    return readMobColumns(asset.id).then(function hydrateColumns(columns) {
      asset.columns = {
        ...(asset.columns || {}),
        ...columns
      };
      const name = candidateAssetName({
        ...asset,
        columns: asset.columns
      });
      if (!name) {
        return;
      }
      asset.name = name;
      asset.displayName = name;
      asset.needsNameHydration = false;
      appendDebugEvent("Mob columns hydrated", {
        mobId: asset.id,
        name,
        columns
      });
    }).catch(function ignoreColumnLookup() {});
  }));
}

function readMobColumns(mobId) {
  return new Promise(function read(resolve, reject) {
    const request = new GetMobInfoRequest();
    const body = new GetMobInfoRequestBody();
    const entries = [];

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
      if (columnName && columnValue) {
        entries.push({
          name: responseBody.getColumnName(),
          value: responseBody.getColumnValue()
        });
      }
    });

    stream.on("error", function onError(error) {
      reject(error);
    });

    stream.on("end", function onEnd() {
      resolve(normalizeMobColumns(entries));
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

function hydrateAssetBinPaths(assets) {
  return Promise.all((assets || []).map(function hydrate(asset) {
    if (!asset || !asset.id || asset.binPath) {
      return Promise.resolve();
    }

    return getBinPathFromMob(asset.id).then(function setBinPath(binPath) {
      asset.binPath = binPath || "";
      asset.binPathSource = asset.binPath ? "GetBinFromMob on drop" : "";
      appendDebugEvent("Asset bin path hydrated", {
        clip: asset.name || asset.displayName || "clip",
        mobId: asset.id,
        binPath: asset.binPath,
        projectRelativeCandidates: binRelativePathCandidates(asset.binPath)
      });
    }).catch(function ignoreBinPathLookup(error) {
      appendDebugEvent("Asset bin path hydration failed", {
        clip: asset.name || asset.displayName || "clip",
        mobId: asset.id,
        error: error.message || String(error)
      });
    });
  }));
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
  const resolveBinPath = asset && asset.binPath
    ? Promise.resolve(asset.binPath)
    : getBinPathFromMob(asset.id).then(function rememberBinPath(binPath) {
      if (asset) {
        asset.binPath = binPath || "";
        asset.binPathSource = asset.binPath ? "GetBinFromMob on apply" : "";
      }
      return binPath;
    });

  return resolveBinPath.then(function openOwningBin(binPath) {
    if (!binPath) {
      throw new Error(`No bin path found for ${asset.name || "clip"}`);
    }

    return openBinForWrite(binPath, true).then(function locked() {
      return {
        binPath,
        binPathSource: asset && asset.binPathSource || "",
        relativeCandidates: binRelativePathCandidates(binPath),
        lockMode: "opened with write lock"
      };
    }).catch(function retryUnlocked(lockError) {
      return openBinForWrite(binPath, false).then(function unlocked() {
        return {
          binPath,
          binPathSource: asset && asset.binPathSource || "",
          relativeCandidates: binRelativePathCandidates(binPath),
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
    appendDebugEvent("Helper config", {
      maxConcurrentJobs: config.maxConcurrentJobs,
      proxyRoots: config.proxyRoots,
      proxyExtensions: config.proxyExtensions,
      cloudAnalysisEnabled: config.cloudAnalysisEnabled
    });
    dom["connection-status"].textContent = "Online";
    dom["helper-status-dot"].dataset.status = "ready";
    dom["api-key-status"].textContent = config.cloudAnalysisEnabled
      ? "Ready"
      : "Unavailable";
    dom["api-key-status-dot"].dataset.status = config.cloudAnalysisEnabled ? "ready" : "warning";
    if (state.exportSettingsLoaded) {
      renderExportSettings(state.exportSettings, config);
    }
    updateProxyRepositorySummary();
    refreshAccount({ silent: true }).catch(function noop() {});
    if (!silent) {
      setStatus(config.cloudAnalysisEnabled ? "Mark bridge connected." : "Mark account service unavailable.", !config.cloudAnalysisEnabled);
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

function refreshAccount(options) {
  const silent = options && options.silent;
  return requestJson("GET", "/account").then(function loaded(account) {
    state.account = account;
    renderAccount();
    return account;
  }).catch(function failed(error) {
    state.account = {
      authenticated: false,
      credits: {
        balanceMinutes: 0
      },
      creditPacks: []
    };
    renderAccount();
    if (!silent) {
      setStatus(error.message, true);
    }
    throw error;
  });
}

function clearAuthPoll() {
  if (authPollTimer) {
    window.clearTimeout(authPollTimer);
    authPollTimer = null;
  }
}

function startSignIn() {
  if (!state.helperConfig || !state.helperConfig.cloudAnalysisEnabled) {
    setStatus("Mark account service unavailable.", true);
    return;
  }
  if (state.isSigningIn) {
    setStatus("Finish sign-in in the browser. Mark will update here automatically.");
    return;
  }
  clearAuthPoll();
  state.isSigningIn = true;
  renderAccount();
  setStatus("Opening Mark sign-in in your browser...");
  requestJson("POST", "/auth/device/start", {
    clientName: "Mark Avid Panel"
  }).then(function started(payload) {
    state.authDeviceCode = payload.deviceCode || "";
    if (!state.authDeviceCode) {
      throw new Error("Mark did not start a sign-in session.");
    }
    if (payload.openedInBrowser === false && payload.verificationUri) {
      tryOpenReturnedUrl(payload.verificationUri);
    }
    setStatus("Finish sign-in in the browser. Mark will update here automatically.");
    pollSignIn();
  }).catch(function failed(error) {
    state.isSigningIn = false;
    renderAccount();
    setStatus(error.message, true);
  });
}

function pollSignIn() {
  if (!state.authDeviceCode) {
    return;
  }
  requestJson("GET", `/auth/device/poll?deviceCode=${encodeURIComponent(state.authDeviceCode)}`).then(function polled(payload) {
    if (payload.status === "authorized") {
      clearAuthPoll();
      state.authDeviceCode = "";
      state.isSigningIn = false;
      refreshAccount({ silent: true }).then(function refreshed() {
        setStatus("Signed in to Mark. Credits and checkout are ready.");
      });
      return;
    }
    if (payload.status === "expired") {
      clearAuthPoll();
      state.authDeviceCode = "";
      state.isSigningIn = false;
      renderAccount();
      setStatus("Mark sign-in expired. Try again.", true);
      return;
    }
    authPollTimer = window.setTimeout(pollSignIn, 2000);
  }).catch(function failed(error) {
    clearAuthPoll();
    state.isSigningIn = false;
    renderAccount();
    setStatus(error.message, true);
  });
}

function signOut() {
  if (state.isSigningOut) {
    return;
  }
  clearAuthPoll();
  state.isSigningIn = false;
  state.isSigningOut = true;
  renderAccount();
  setStatus("Signing out of Mark...");
  requestJson("POST", "/auth/sign-out", {}).then(function signedOut() {
    state.isSigningOut = false;
    state.account = {
      authenticated: false,
      credits: {
        balanceMinutes: 0
      },
      creditPacks: []
    };
    renderAccount();
    setStatus("Signed out of Mark.");
  }).catch(function failed(error) {
    state.isSigningOut = false;
    renderAccount();
    setStatus(error.message, true);
  });
}

function buyCredits() {
  if (state.isBuyingCredits) {
    setStatus("Checkout is already opening.");
    return;
  }
  const packId = dom["credit-pack-select"] && dom["credit-pack-select"].value
    ? dom["credit-pack-select"].value
    : state.account && state.account.creditPacks && state.account.creditPacks[0] && state.account.creditPacks[0].id;
  if (!packId) {
    setStatus("No Mark credit packs are configured.", true);
    return;
  }
  state.isBuyingCredits = true;
  renderAccount();
  setStatus("Opening secure checkout...");
  requestJson("POST", "/billing/checkout-sessions", {
    packId
  }).then(function checkout() {
    state.isBuyingCredits = false;
    renderAccount();
    if (checkout && checkout.openedInBrowser === false && checkout.url) {
      tryOpenReturnedUrl(checkout.url);
    }
    setStatus("Checkout opened. After payment, return to Mark and refresh your account.");
  }).catch(function failed(error) {
    state.isBuyingCredits = false;
    renderAccount();
    setStatus(error.message, true);
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
        reportHostError(err.code, err.message);
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
    setStatus("Give me some clips first, then I'll take a look.", true);
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

  const queuedAssets = state.selectedAssets.slice();
  const queuedProject = {
    ...(state.project || {})
  };
  const queuedWorkflowMode = state.workflowMode;
  const queuedOptions = {
    prompt,
    outputMode: queuedWorkflowMode,
    subclipOptions: subclipOptions(),
    markerOutputStyle: markerOutputStyle(),
    metadataColumns: selectedAvidMetadataColumns(),
    proxyRepository: proxyRepositorySettings()
  };

  setBusy(true);
  setStatus("Adding clips to the render queue...");

  checkHelper()
    .then(function helperReady(config) {
      if (!config.cloudAnalysisEnabled) {
        throw new Error("Mark account service unavailable.");
      }
      if (accountRequiresSignIn()) {
        throw new Error("Sign in to Mark before analyzing media.");
      }
      return ensureExportSetting(config);
    })
    .then(function queueReady(config) {
      const items = queuedAssets.map(function createItem(asset) {
        return createQueueItem(asset, {
          prompt,
          workflowMode: queuedWorkflowMode,
          options: queuedOptions,
          project: queuedProject,
          config
        });
      });
      state.queueItems = state.queueItems.concat(items);
      state.lastPrompt = prompt;
      state.activeQueueItemId = null;
      state.selectedAssets = [];
      state.activeClipIndex = -1;
      state.currentJobClipIndex = -1;
      state.activeReviewClipIndex = -1;
      state.batchPhase = "idle";
      state.batchConfig = null;
      state.batchPrompt = "";
      state.batchOptions = null;
      state.hasShownIncrementalReview = false;
      setProgressIndeterminate(false);
      setProgress(0);
      dom["progress-detail"].textContent = "";
      renderAsset();
      renderPreview();
      renderQueue();
      setBusy(false);
      setViewMode("drop");
      showToast(`Added ${items.length} clip${items.length === 1 ? "" : "s"} to the render queue.`, "queued");
      setStatus(`Added ${items.length} clip${items.length === 1 ? "" : "s"} to the render queue.`);
      pumpQueue();
    })
    .catch(function failed(error) {
      if (error.requiresExportSetting) {
        showExportSettingDialog(error.message);
      } else {
        setStatus(error.message, true);
      }
      setProgressIndeterminate(false);
      setProgress(0);
      state.batchPhase = "idle";
      setBusy(false);
      setViewMode(inferMainViewMode());
    });
}

function hasActiveProxyPreparation() {
  return state.queueItems.some(function preparing(item) {
    return item.status === "resolvingProxy" || item.status === "exporting";
  });
}

function pumpQueue() {
  state.queueItems.filter(function readyForHelper(item) {
    return item.status === "proxyReady";
  }).forEach(postQueueHelperJob);

  if (hasActiveProxyPreparation()) {
    renderQueue();
    return;
  }

  const nextItem = state.queueItems.find(function next(item) {
    return item.status === "queued";
  });
  if (nextItem) {
    prepareQueueItemProxy(nextItem);
    return;
  }

  ensureQueuePolling();
  renderQueue();
}

function prepareQueueItemProxy(item) {
  const proxySettings = item.options && item.options.proxyRepository || {};
  const methods = Array.isArray(proxySettings.methods) ? proxySettings.methods : [];
  const roots = Array.isArray(proxySettings.roots) ? proxySettings.roots : [];
  const canUseSourcePath = proxySettings.enabled && methods.indexOf("sourcePath") !== -1;
  const needsFolderSearch = proxySettings.enabled && methods.some(function needsRoots(method) {
    return method === "sourceFile" || method === "clipName";
  });

  if (proxySettings.enabled && roots.length === 0 && !canUseSourcePath && needsFolderSearch) {
    failQueueItem(item, "Proxy lookup is enabled, but no folders or Avid Source Path method are configured.");
    openSettings();
    pumpQueue();
    return;
  }

  if (proxySettings.enabled && (roots.length > 0 || canUseSourcePath)) {
    resolveExistingProxyForQueueItem(item).then(function resolved(found) {
      if (found) {
        postQueueHelperJob(item);
        pumpQueue();
        return;
      }
      exportProxyForQueueItem(item);
    }).catch(function fallback(error) {
      item.proxyLookupMessage = proxyLookupFallbackMessage(item.asset, "Proxy lookup failed.");
      appendDebugEvent("Proxy lookup failed", {
        clip: buildClipProxyMetadata(item.asset),
        error: error.message || String(error)
      });
      appendAssetDebug(item.asset, "Existing proxy lookup failed", error.message || String(error));
      exportProxyForQueueItem(item);
    });
    return;
  }

  exportProxyForQueueItem(item);
}

function resolveExistingProxyForQueueItem(item) {
  const proxySettings = item.options.proxyRepository;
  updateQueueItem(item, {
    status: "resolvingProxy",
    message: "Looking for existing proxy",
    progress: 10
  });

  const requestBody = {
    clip: buildClipProxyMetadata(item.asset),
    roots: proxySettings.roots,
    options: {
      methods: proxySettings.methods,
      extensions: proxySettings.extensions
    }
  };
  appendDebugEvent("Proxy lookup request", requestBody);

  return requestJson("POST", "/proxy/resolve", requestBody).then(function resolved(result) {
    appendDebugEvent("Proxy lookup response", {
      clip: requestBody.clip,
      roots: requestBody.roots,
      result
    });
    item.proxyCandidates = result.candidates || [];
    if (result.status === "matched" && result.selected && result.selected.path) {
      item.exportPath = result.selected.path;
      item.proxySource = result.selected.sourceKind || "repository-proxy";
      updateQueueItem(item, {
        status: "proxyReady",
        message: "Existing proxy found",
        progress: 35,
        exportPath: item.exportPath,
        proxySource: item.proxySource,
        proxyCandidates: item.proxyCandidates
      });
      appendAssetDebug(item.asset, "Existing proxy matched", result.selected);
      return true;
    }

    if (result.status === "ambiguous") {
      item.proxyLookupMessage = proxyLookupFallbackMessage(item.asset, `Proxy lookup found ${item.proxyCandidates.length} possible matches, but none were confident.`);
      updateQueueItem(item, {
        status: "queued",
        message: "Proxy match ambiguous; exporting",
        proxyCandidates: item.proxyCandidates,
        proxyLookupMessage: item.proxyLookupMessage
      });
    } else {
      item.proxyLookupMessage = proxyLookupFallbackMessage(item.asset, "Proxy lookup did not find a matching file.");
      updateQueueItem(item, {
        status: "queued",
        message: "No existing proxy; exporting",
        proxyCandidates: item.proxyCandidates,
        proxyLookupMessage: item.proxyLookupMessage
      });
    }
    appendAssetDebug(item.asset, "Existing proxy lookup", {
      status: result.status,
      candidates: result.candidates || [],
      warnings: result.warnings || []
    });
    return false;
  });
}

function exportProxyForQueueItem(item) {
  const config = item.config || state.helperConfig || {};
  const fileName = `mark_${Date.now()}_${state.queueItems.indexOf(item) + 1}.mp4`;
  const exportSettingsName = config.resolvedExportSettingsName || configuredExportSettingName(config);
  const request = new ExportFileRequest();
  const body = new ExportFileRequestBody();
  body.setMobId(item.asset.id);
  body.setExportSettingsName(exportSettingsName);
  body.setDestinationPath(config.exportDestinationPath || "");
  body.setInDirectory("");
  body.setFileName(fileName);
  request.setBody(body);

  item.pendingExport = {
    prompt: item.prompt,
    fileName,
    exportSettingsName
  };
  updateQueueItem(item, {
    status: "exporting",
    message: item.proxyLookupMessage || "Exporting proxy",
    progress: 20
  });

  client.exportFile(request, getMetadata(), function onExportStarted(err, response) {
    if (err) {
      const message = formatExportStartError(err, exportSettingsName);
      failQueueItem(item, message);
      pumpQueue();
      reportHostError(err.code, err.message);
      return;
    }

    item.exportTaskId = response.getHeader().getTaskId();
    state.activeExportQueueItemId = item.id;
    updateQueueItem(item, {
      exportTaskId: item.exportTaskId,
      message: "Avid is making the proxy",
      progress: 28
    });
  });
}

function handleQueueExportFinished(item, data) {
  const noError = data.errorCode === CommandErrorType.NOERROR || data.errorCode === 0;
  item.exportTaskId = null;
  state.activeExportQueueItemId = state.activeExportQueueItemId === item.id ? null : state.activeExportQueueItemId;

  if (!noError) {
    failQueueItem(item, `Export failed for ${queueItemName(item)}: ${data.errorString || "Media Composer could not export this clip."}`);
    pumpQueue();
    return;
  }

  const exportPath = data.exportPath || data.path;
  if (!exportPath) {
    failQueueItem(item, `Export finished for ${queueItemName(item)}, but Media Composer did not return a proxy path.`);
    pumpQueue();
    return;
  }

  item.exportPath = exportPath;
  item.proxySource = "avid-export";
  item.proxyLookupMessage = "";
  updateQueueItem(item, {
    status: "proxyReady",
    message: "Proxy ready",
    progress: 35,
    exportTaskId: null,
    exportPath,
    proxySource: "avid-export",
    proxyLookupMessage: ""
  });
  postQueueHelperJob(item);
  pumpQueue();
}

function postQueueHelperJob(item) {
  if (!item || item.status !== "proxyReady" || !item.exportPath) {
    return;
  }

  const options = item.options || {};
  const promptContext = buildPromptContextFromAsset(item.asset, options.metadataColumns || selectedAvidMetadataColumns());
  updateQueueItem(item, {
    status: "analyzing",
    message: "Queued for analysis",
    progress: Math.max(40, Number(item.progress) || 40)
  });

  requestJson("POST", "/jobs", {
    filePath: item.exportPath,
    prompt: item.prompt,
    outputMode: item.workflowMode,
    subclipOptions: options.subclipOptions || subclipOptions(),
    markerOutputStyle: options.markerOutputStyle || markerOutputStyle(),
    promptContext,
    clip: buildClipProxyMetadata(item.asset),
    project: item.project || state.project,
    mediaSourceKind: item.proxySource || "unknown"
  }).then(function started(job) {
    item.helperJobId = job.id;
    item.helperDebugEventCount = 0;
    updateQueueItem(item, {
      helperJobId: job.id,
      message: conciseJobMessage(job, "Analysis queued"),
      progress: job.progress || item.progress || 40
    });
    ensureQueuePolling(true);
  }).catch(function failed(error) {
    failQueueItem(item, error.message);
    pumpQueue();
  });
}

function ensureQueuePolling(immediate) {
  if (pollTimer) {
    return;
  }
  const activeItems = state.queueItems.filter(function active(item) {
    return item.status === "analyzing" && item.helperJobId;
  });
  if (activeItems.length === 0) {
    return;
  }
  pollTimer = window.setTimeout(pollQueueJobs, immediate ? 0 : POLL_INTERVAL_MS);
}

function pollQueueJobs() {
  clearPoll();
  const activeItems = state.queueItems.filter(function active(item) {
    return item.status === "analyzing" && item.helperJobId;
  });

  if (activeItems.length === 0) {
    pumpQueue();
    return;
  }

  Promise.all(activeItems.map(function poll(item) {
    return requestJson("GET", `/jobs/${item.helperJobId}`).then(function jobReady(job) {
      return {
        item,
        job
      };
    }).catch(function failed(error) {
      return {
        item,
        error
      };
    });
  })).then(function updateAll(results) {
    results.forEach(function updateResult(result) {
      if (result.error) {
        if (/job not found/i.test(result.error.message || "")) {
          failQueueItem(result.item, "Helper job was not found. Run this clip again.");
          return;
        }
        updateQueueItem(result.item, {
          message: result.error.message
        });
        return;
      }
      updateQueueItemFromJob(result.item, result.job);
    });

    if (state.viewMode === "review" && activeQueueItem()) {
      renderPreview();
    }
    renderQueue();
    pumpQueue();
    ensureQueuePolling();
  });
}

function updateQueueItemFromJob(item, job) {
  appendNewHelperDebugEvents(item.asset, job);
  item.helperDebugEventCount = item.asset.helperDebugEventCount || item.helperDebugEventCount || 0;
  updateQueueItem(item, {
    message: conciseJobMessage(job, item.message || "Analyzing"),
    progress: job.progress || item.progress || 40
  });

  if (job.status === "ready") {
    item.asset.status = "ready";
    item.asset.message = "Analysis complete";
    item.asset.reviewCompletionOrder = item.asset.reviewCompletionOrder || nextReviewCompletionOrder();
    if ((job.outputMode || item.workflowMode) === "subclips") {
      item.asset.subclips = nameSubclipsForAsset(item.asset, (job.subclips || []).map(function normalize(subclip) {
        return clampSubclip({
          id: subclip.id || createGuid(),
          name: subclip.name,
          summary: subclip.summary,
          startTime: subclip.startTime,
          endTime: subclip.endTime,
          thumbnailUrl: subclip.thumbnailUrl,
          use: true
        });
      }));
    } else {
      item.asset.markers = (job.markers || []).map(function normalize(marker) {
        return clampMarker({
          id: marker.id || createGuid(),
          name: marker.name,
          comment: marker.comment,
          color: marker.color || "Yellow",
          startTime: marker.startTime,
          endTime: marker.endTime,
          thumbnailUrl: marker.thumbnailUrl,
          use: true
        });
      });
    }
    updateQueueItem(item, {
      status: "ready",
      message: "Analysis complete",
      progress: 100
    });
    setStatus(`${queueItemName(item)} is ready to review.`);
    showToast(`${queueItemName(item)} is ready to review.`, "ready");
  } else if (job.status === "failed") {
    failQueueItem(item, job.error ? job.error.message : "TwelveLabs analysis failed.");
  }
}

function failQueueItem(item, message) {
  if (!item) {
    return;
  }
  if (state.activeExportQueueItemId === item.id) {
    state.activeExportQueueItemId = null;
  }
  updateQueueItem(item, {
    status: "failed",
    message,
    progress: 0,
    error: message,
    exportTaskId: null
  });
  item.asset.applied = false;
  item.asset.error = message;
  item.asset.helperJobId = item.helperJobId;
  setStatus(message, true);
  showToast(`${queueItemName(item)} could not finish processing.`, "failed");
  renderQueue();
}

function updateBatchProgress(stagePercent, detail) {
  const total = Math.max(1, state.selectedAssets.length);
  const activeIndex = Math.max(0, state.activeClipIndex);
  const base = (activeIndex / total) * 100;
  const span = 100 / total;
  setProgress(base + (Math.max(0, Math.min(100, stagePercent)) / 100) * span);
  dom["progress-detail"].textContent = detail || `Clip ${Math.min(activeIndex + 1, total)}/${total}`;
}

function updateAggregateProgress() {
  const total = Math.max(1, state.selectedAssets.length);
  const readyOrFailed = state.selectedAssets.filter(function done(asset) {
    return asset.status === "ready" || asset.status === "failed";
  }).length;
  const proxyReady = state.selectedAssets.filter(function hasProxy(asset) {
    return Boolean(asset.exportPath) || asset.status === "analyzing" || asset.status === "ready";
  }).length;
  const analyzing = state.selectedAssets.filter(function active(asset) {
    return asset.status === "analyzing";
  });
  const analysisProgress = analyzing.reduce(function sumProgress(totalProgress, asset) {
    return totalProgress + (Number(asset.jobProgress) || 35);
  }, 0);

  if (state.batchPhase === "exporting") {
    setProgress(5 + (proxyReady / total) * 35);
    dom["progress-detail"].textContent = `${proxyReady}/${total} proxies`;
    return;
  }

  const completedProgress = readyOrFailed * 100;
  const totalAnalysisProgress = completedProgress + analysisProgress;
  setProgress(45 + (totalAnalysisProgress / (total * 100)) * 55);
  dom["progress-detail"].textContent = `${readyOrFailed}/${total} clips`;
}

function processNextProxySource() {
  state.batchPhase = "exporting";
  const nextIndex = state.selectedAssets.findIndex(function findQueued(asset) {
    return asset.status === "queued";
  });

  if (nextIndex === -1) {
    postHelperJobsForBatch();
    return;
  }

  state.activeClipIndex = nextIndex;
  const proxySettings = state.batchOptions && state.batchOptions.proxyRepository;
  const canUseSourcePath = proxySettings && proxySettings.enabled && proxySettings.methods.indexOf("sourcePath") !== -1;
  const needsFolderSearch = proxySettings && proxySettings.enabled && proxySettings.methods.some(function needsRoots(method) {
    return method === "sourceFile" || method === "clipName";
  });
  if (proxySettings && proxySettings.enabled && proxySettings.roots.length === 0 && !canUseSourcePath && needsFolderSearch) {
    const asset = state.selectedAssets[nextIndex];
    asset.proxyLookupMessage = proxyLookupFallbackMessage(asset, "Proxy lookup is enabled, but no folders are configured.");
    asset.status = "queued";
    asset.message = "Add proxy folders in Settings";
    appendDebugEvent("Proxy lookup skipped", {
      clip: buildClipProxyMetadata(asset),
      reason: "No proxy folders configured"
    });
    appendAssetDebug(asset, "Existing proxy lookup skipped", "No proxy folders configured.");
    state.batchPhase = "idle";
    setBusy(false);
    setProgressIndeterminate(false);
    setProgress(0);
    openSettings();
    setStatus("Folder proxy lookup is enabled, but no folders or drives are configured. Add a folder, enable Avid Source Path, or turn lookup off.", true);
    return;
  }

  if (proxySettings && proxySettings.enabled && (proxySettings.roots.length > 0 || canUseSourcePath)) {
    resolveExistingProxyForClip(nextIndex).then(function resolved(found) {
      if (found) {
        processNextProxySource();
        return;
      }
      exportProxyForClip(nextIndex);
    }).catch(function fallback(error) {
      const asset = state.selectedAssets[nextIndex];
      asset.proxyLookupMessage = proxyLookupFallbackMessage(asset, "Proxy lookup failed.");
      appendDebugEvent("Proxy lookup failed", {
        clip: buildClipProxyMetadata(asset),
        error: error.message || String(error)
      });
      appendAssetDebug(asset, "Existing proxy lookup failed", error.message || String(error));
      exportProxyForClip(nextIndex);
    });
    return;
  }

  exportProxyForClip(nextIndex);
}

function resolveExistingProxyForClip(assetIndex) {
  const asset = state.selectedAssets[assetIndex];
  const proxySettings = state.batchOptions.proxyRepository;
  asset.status = "resolvingProxy";
  asset.message = "Looking for existing proxy";
  dom["progress-stage"].textContent = "Finding proxy";
  setStatus("Finding proxy...");
  updateAggregateProgress();

  const requestBody = {
    clip: buildClipProxyMetadata(asset),
    roots: proxySettings.roots,
    options: {
      methods: proxySettings.methods,
      extensions: proxySettings.extensions
    }
  };
  appendDebugEvent("Proxy lookup request", requestBody);

  return requestJson("POST", "/proxy/resolve", requestBody).then(function resolved(result) {
    appendDebugEvent("Proxy lookup response", {
      clip: requestBody.clip,
      roots: requestBody.roots,
      result
    });
    asset.proxyCandidates = result.candidates || [];
    if (result.status === "matched" && result.selected && result.selected.path) {
      asset.exportPath = result.selected.path;
      asset.proxySource = result.selected.sourceKind || "repository-proxy";
      asset.status = "proxyReady";
      asset.message = "Existing proxy found";
      appendAssetDebug(asset, "Existing proxy matched", result.selected);
      updateAggregateProgress();
      return true;
    }

    asset.status = "queued";
    if (result.status === "ambiguous") {
      asset.message = "Proxy match ambiguous; exporting";
      asset.proxyLookupMessage = proxyLookupFallbackMessage(asset, `Proxy lookup found ${asset.proxyCandidates.length} possible matches, but none were confident.`);
    } else {
      asset.message = "No existing proxy; exporting";
      asset.proxyLookupMessage = proxyLookupFallbackMessage(asset, "Proxy lookup did not find a matching file.");
    }
    appendAssetDebug(asset, "Existing proxy lookup", {
      status: result.status,
      candidates: result.candidates || [],
      warnings: result.warnings || []
    });
    return false;
  });
}

function exportProxyForClip(assetIndex) {
  const config = state.batchConfig || state.helperConfig || {};
  const prompt = state.batchPrompt || state.lastPrompt;
  const asset = state.selectedAssets[assetIndex];
  asset.status = "exporting";
  asset.message = "Exporting proxy";
  dom["progress-stage"].textContent = "Exporting proxy";
  setStatus(asset.proxyLookupMessage || "Exporting proxy...");
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
      processNextProxySource();
      reportHostError(err.code, err.message);
      return;
    }

    asset.exportTaskId = response.getHeader().getTaskId();
    asset.message = "Avid is making the proxy";
    dom["progress-stage"].textContent = "Making proxy";
    setStatus(asset.proxyLookupMessage || "Making proxy...");
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

  const queueItem = state.queueItems.find(function findQueueExport(item) {
    return item.exportTaskId && data.taskId === item.exportTaskId;
  });
  if (queueItem) {
    handleQueueExportFinished(queueItem, data);
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
    processNextProxySource();
    return;
  }

  const exportPath = data.exportPath || data.path;
  if (!exportPath) {
    asset.exportTaskId = null;
    markClipFailed(assetIndex, `Export finished for ${asset.name || "clip"}, but Media Composer did not return a proxy path.`);
    processNextProxySource();
    return;
  }

  asset.exportTaskId = null;
  asset.exportPath = exportPath;
  asset.proxySource = "avid-export";
  asset.proxyLookupMessage = "";
  asset.status = "proxyReady";
  asset.message = "Proxy ready";
  updateAggregateProgress();
  processNextProxySource();
}

function postHelperJobsForBatch() {
  const assets = state.selectedAssets.filter(function canAnalyze(asset) {
    return asset.exportPath && asset.status !== "failed";
  });
  state.batchPhase = "postingJobs";
  state.activeClipIndex = -1;
  dom["progress-stage"].textContent = "Starting analysis";
  setStatus("Starting analysis...");
  setProgress(45);

  if (assets.length === 0) {
    finishBatch();
    return;
  }

  Promise.all(assets.map(function post(asset) {
    return startHelperJob(asset.exportPath, state.batchPrompt, state.selectedAssets.indexOf(asset));
  })).then(function posted() {
    state.batchPhase = "analyzing";
    updateAggregateProgress();
    pollJobs();
  });
}

function startHelperJob(filePath, prompt, assetIndex) {
  const asset = state.selectedAssets[assetIndex];
  asset.status = "analyzing";
  asset.message = "Queued for analysis";
  asset.jobProgress = 5;
  dom["progress-stage"].textContent = "Analyzing";
  setStatus(`${activeAnalysisLabel()}...`);
  updateAggregateProgress();

  const options = state.batchOptions || {};
  const promptContext = buildPromptContextFromAsset(asset, options.metadataColumns || selectedAvidMetadataColumns());
  return requestJson("POST", "/jobs", {
    filePath,
    prompt,
    outputMode: options.outputMode || state.workflowMode,
    subclipOptions: options.subclipOptions || subclipOptions(),
    markerOutputStyle: options.markerOutputStyle || markerOutputStyle(),
    promptContext,
    clip: buildClipProxyMetadata(asset),
    project: state.project,
    mediaSourceKind: asset.proxySource || "unknown"
  }).then(function started(job) {
    asset.helperJobId = job.id;
    asset.helperDebugEventCount = 0;
    asset.message = conciseJobMessage(job, "Analysis queued");
    asset.jobProgress = job.progress || 5;
    updateAggregateProgress();
  }).catch(function failed(error) {
    markClipFailed(assetIndex, error.message);
  });
}

function pollJobs() {
  clearPoll();
  const activeAssets = state.selectedAssets.filter(function active(asset) {
    return asset.status === "analyzing" && asset.helperJobId;
  });

  if (activeAssets.length === 0) {
    finishBatch();
    return;
  }

  Promise.all(activeAssets.map(function poll(asset) {
    return requestJson("GET", `/jobs/${asset.helperJobId}`).then(function jobReady(job) {
      return {
        asset,
        job
      };
    });
  })).then(function updateAll(results) {
    const prompt = state.batchPrompt || state.lastPrompt || "that";

    results.forEach(function updateAsset(result) {
      updateAssetFromJob(result.asset, result.job);
    });
    renderPreview();
    updateAggregateProgress();
    showIncrementalReviewIfReady(prompt);

    if (isBatchComplete()) {
      finishBatch();
      return;
    }

    setStatus(`${activeAnalysisLabel()}... ${completedClipCount()}/${state.selectedAssets.length} done`);
    pollTimer = window.setTimeout(pollJobs, POLL_INTERVAL_MS);
  }).catch(function failed(error) {
    activeAssets.forEach(function markUnknown(asset) {
      if (asset.status === "analyzing") {
        asset.message = error.message;
      }
    });
    pollTimer = window.setTimeout(pollJobs, POLL_INTERVAL_MS);
  });
}

function updateAssetFromJob(asset, job) {
  appendNewHelperDebugEvents(asset, job);
  asset.message = conciseJobMessage(job, asset.message || "Analyzing");
  asset.jobProgress = job.progress || asset.jobProgress || 40;
  if (job.stage === "preparing") {
    dom["progress-stage"].textContent = "Preparing media";
  } else if (job.stage === "uploading") {
    dom["progress-stage"].textContent = "Analyzing";
  } else if (job.stage === "thumbnailing") {
    dom["progress-stage"].textContent = "Creating thumbnails";
  }
  if (job.status === "ready") {
    markReviewClipCompleted(asset);
    asset.status = "ready";
    asset.message = "Analysis complete";
    if ((job.outputMode || state.workflowMode) === "subclips") {
      asset.subclips = nameSubclipsForAsset(asset, (job.subclips || []).map(function normalize(subclip) {
        return clampSubclip({
          id: subclip.id || createGuid(),
          name: subclip.name,
          summary: subclip.summary,
          startTime: subclip.startTime,
          endTime: subclip.endTime,
          thumbnailUrl: subclip.thumbnailUrl,
          use: true
        });
      }));
    } else {
      asset.markers = (job.markers || []).map(function normalize(marker) {
        return clampMarker({
          id: marker.id || createGuid(),
          name: marker.name,
          comment: marker.comment,
          color: marker.color || "Yellow",
          startTime: marker.startTime,
          endTime: marker.endTime,
          thumbnailUrl: marker.thumbnailUrl,
          use: true
        });
      });
    }
  }
  if (job.status === "failed") {
    const assetIndex = state.selectedAssets.indexOf(asset);
    markClipFailed(assetIndex, job.error ? job.error.message : "TwelveLabs analysis failed.");
  }
}

function appendNewHelperDebugEvents(asset, job) {
  const events = Array.isArray(job && job.debugEvents) ? job.debugEvents : [];
  const startIndex = asset.helperDebugEventCount || 0;
  if (events.length <= startIndex) {
    return;
  }

  events.slice(startIndex).forEach(function append(event) {
    appendDebugEvent("Helper media prep", {
      clip: asset.name || asset.displayName || "clip",
      jobId: job.id,
      event
    });
    appendAssetDebug(asset, event.label || "Helper media prep", event.details);
  });
  asset.helperDebugEventCount = events.length;
}

function completedClipCount() {
  return state.selectedAssets.filter(function complete(asset) {
    return asset.status === "ready" || asset.status === "failed";
  }).length;
}

function isBatchComplete() {
  return state.selectedAssets.every(function complete(asset) {
    return asset.status === "ready" || asset.status === "failed";
  });
}

function showIncrementalReviewIfReady(prompt) {
  if (state.hasShownIncrementalReview || !hasReviewableResults()) {
    return;
  }
  state.hasShownIncrementalReview = true;
  state.activeReviewClipIndex = normalizedActiveReviewClipIndex();
  renderPreview();
  setViewMode("review");
  setBusy(true);
  setStatus(`First ${currentSuggestionName(2)} are ready. Still analyzing.`);
}

function markClipFailed(assetIndex, message) {
  const asset = state.selectedAssets[assetIndex];
  if (!asset) {
    return;
  }
  asset.status = "failed";
  markReviewClipCompleted(asset);
  asset.message = message;
  asset.error = message;
  asset.exportTaskId = null;
  asset.helperJobId = null;
  renderPreview();
  setStatus(message, true);
}

function finishBatch() {
  clearPoll();
  const suggestionCount = totalSuggestionCount();
  const failedCount = state.selectedAssets.filter(function failed(asset) {
    return asset.status === "failed";
  }).length;
  state.activeClipIndex = -1;
  state.currentJobClipIndex = -1;
  state.batchPhase = "idle";
  state.activeReviewClipIndex = normalizedActiveReviewClipIndex();
  setProgressIndeterminate(false);
  setProgress(100);
  renderPreview();
  setBusy(state.isApplying);
  setViewMode(suggestionCount > 0 || failedCount > 0 ? "review" : "prompt");

  if (suggestionCount > 0) {
    const reviewAction = isSubclipMode() ? "creating" : "applying";
    setStatus(`Found ${suggestionCount} possible ${currentSuggestionName(suggestionCount)} across ${state.selectedAssets.length - failedCount} clip${state.selectedAssets.length - failedCount === 1 ? "" : "s"}. Review before ${reviewAction}.${failedCount ? ` ${failedCount} clip${failedCount === 1 ? "" : "s"} failed.` : ""}`, failedCount > 0);
    return;
  }

  setStatus(failedCount > 0
    ? `No ${currentSuggestionName(2)} suggestions were created. ${failedCount} clip${failedCount === 1 ? "" : "s"} failed.`
    : `I did not find matching ${currentSuggestionName(2)} suggestions. Try a broader search.`,
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
    if (isQueueAsset(asset)) {
      return;
    }
    if (!asset.helperJobId) {
      return;
    }
    if (asset.status === "analyzing" || asset.status === "queued") {
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
  setProgressIndeterminate(false);
  setStatus("Drop some clips and I'll take a look.");
  setViewMode("drop");
}

function discardSuggestions() {
  if (state.isBusy || state.selectedAssets.length === 0) {
    return;
  }
  if (activeQueueItem()) {
    state.activeQueueItemId = null;
    state.selectedAssets = [];
    state.activeReviewClipIndex = -1;
    renderAsset();
    renderPreview();
    renderQueue();
    setBusy(false);
    setStatus("Returned to render queue.");
    setViewMode("queue");
    return;
  }

  clearAnalysisResults();
  renderAsset();
  renderPreview();
  setBusy(false);
  setProgressIndeterminate(false);
  setStatus("Suggestions discarded. Ready to run again.");
  setViewMode("prompt");
}

function removeSelectedClip(assetIndex) {
  if (state.isBusy || assetIndex < 0 || assetIndex >= state.selectedAssets.length) {
    return;
  }

  const removed = state.selectedAssets[assetIndex];
  if (removed && removed.helperJobId) {
    requestJson("DELETE", `/jobs/${encodeURIComponent(removed.helperJobId)}`).catch(function noop() {});
  }

  state.selectedAssets.splice(assetIndex, 1);
  state.activeClipIndex = -1;
  state.currentJobClipIndex = -1;
  state.activeReviewClipIndex = -1;
  state.batchConfig = null;
  state.batchPrompt = "";
  clearPoll();
  setProgressIndeterminate(false);
  setProgress(0);
  dom["progress-detail"].textContent = "";
  renderAsset();
  renderPreview();
  setBusy(false);

  if (state.selectedAssets.length === 0) {
    setStatus("Drop some clips and I'll take a look.");
    setViewMode("drop");
    return;
  }

  setStatus(`Removed ${removed && removed.displayName ? removed.displayName : "clip"}.`);
  setViewMode(inferMainViewMode());
}

function applyCurrentSuggestions() {
  if (isSubclipMode()) {
    applySubclips();
  } else {
    applyMarkers();
  }
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

  state.isApplying = true;
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
    state.isApplying = false;
    setBusy(isBatchActive());
    if (totals.failed === 0) {
      if (!completeActiveQueueItemAfterApply()) {
        cleanupRetainedJobs();
      }
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
      reportHostError(err.code, err.message);
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
      reportHostError(err.code, err.message);
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

function sleep(ms) {
  return new Promise(function wait(resolve) {
    window.setTimeout(resolve, ms);
  });
}

function ensureAvbPath(binPath) {
  const text = String(binPath || "").trim();
  return text.toLowerCase().endsWith(".avb") ? text : `${text}.avb`;
}

function stripAvbExtension(binPath) {
  return String(binPath || "").trim().replace(/\.avb$/i, "");
}

function projectBinRelativePath(binPath) {
  const avbPath = String(binPath || "").trim();
  const projectPath = state.project && state.project.path ? String(state.project.path).trim() : "";
  if (!projectPath) {
    return avbPath;
  }

  const projectRoot = (projectPath.toLowerCase().endsWith(".avp")
    ? projectPath.replace(/\/[^/]+$/, "")
    : projectPath).replace(/\/+$/, "");
  const normalizedBinPath = avbPath.replace(/\/+$/, "");
  if (projectRoot && normalizedBinPath.toLowerCase().startsWith(`${projectRoot.toLowerCase()}/`)) {
    return normalizedBinPath.slice(projectRoot.length + 1);
  }
  return normalizedBinPath;
}

function pathTailCandidates(value) {
  const text = String(value || "").trim().replace(/\/+$/, "");
  if (!text || text.indexOf("/") === -1) {
    return [];
  }

  const parts = text.split("/").filter(Boolean);
  const tails = [];
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const tail = parts.slice(index).join("/");
    if (tail && tail.indexOf("/") !== -1) {
      tails.push(tail);
    }
  }
  tails.push(parts[parts.length - 1]);
  return tails;
}

function uniqueTextValues(values) {
  const seen = new Set();
  return values.map(function clean(value) {
    return String(value || "").trim();
  }).filter(function unique(value) {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function binRelativePathCandidates(binPath) {
  const raw = String(binPath || "").trim();
  const withAvb = raw ? ensureAvbPath(raw) : "";
  const withoutAvb = stripAvbExtension(raw);
  const relativeRaw = projectBinRelativePath(raw);
  const relativeWithAvb = projectBinRelativePath(withAvb);
  const relativeWithoutAvb = stripAvbExtension(relativeWithAvb || relativeRaw || withoutAvb);
  const relativeTails = pathTailCandidates(relativeWithoutAvb)
    .concat(pathTailCandidates(relativeWithAvb))
    .concat(pathTailCandidates(withoutAvb))
    .concat(pathTailCandidates(withAvb));
  const basename = withoutAvb.split("/").filter(Boolean).pop() || "";

  return uniqueTextValues([
    relativeWithoutAvb,
    basename,
    basename ? ensureAvbPath(basename) : "",
    ...relativeTails.map(stripAvbExtension),
    ...relativeTails,
    relativeWithoutAvb,
    relativeRaw,
    relativeWithAvb,
    withoutAvb,
    withAvb,
    raw
  ]);
}

function readBinItemsForRelativePath(relativePath) {
  return new Promise(function read(resolve, reject) {
    const request = new GetListOfBinItemsRequest();
    const body = new GetListOfBinItemsRequestBody();
    const flags = GetListOfBinItemsRequestBody.BinItemFlags;
    const items = [];

    if (typeof body.setBinRelativePath === "function") {
      body.setBinRelativePath(relativePath);
    }
    body.setOnlyVisibleFlag(false);
    body.setOnlySelectedFlag(false);
    body.setBinFlagsList([
      flags.ALLTYPES || flags.AllTypes || 0
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
      items.push({
        mobId: responseBody.getMobId(),
        mobName: responseBody.getMobName ? responseBody.getMobName() || "" : "",
        mobSelected: responseBody.getMobSelected ? responseBody.getMobSelected() : false
      });
    });

    stream.on("error", function onError(error) {
      reject(new Error(`Could not read destination bin: ${error.message || error}`));
    });

    stream.on("end", function onEnd() {
      resolve(items);
    });
  });
}

function readSelectedVisibleSubclipItems() {
  return new Promise(function read(resolve, reject) {
    const request = new GetListOfBinItemsRequest();
    const body = new GetListOfBinItemsRequestBody();
    const flags = GetListOfBinItemsRequestBody.BinItemFlags;
    const items = [];

    body.setOnlyVisibleFlag(true);
    body.setOnlySelectedFlag(true);
    body.setBinFlagsList([
      flags.SUBCLIPS
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
      items.push({
        mobId: responseBody.getMobId(),
        mobName: responseBody.getMobName ? responseBody.getMobName() || "" : "",
        mobSelected: responseBody.getMobSelected ? responseBody.getMobSelected() : true
      });
    });

    stream.on("error", function onError(error) {
      reject(new Error(`Could not read selected visible subclips: ${error.message || error}`));
    });

    stream.on("end", function onEnd() {
      resolve(items);
    });
  });
}

async function tryReadSelectedVisibleSubclipItems(asset, label) {
  try {
    const items = await readSelectedVisibleSubclipItems();
    if (asset) {
      appendAssetDebug(asset, label || "Selected visible subclips", {
        status: "ok",
        items: summarizeBinItems(items)
      });
    }
    return {
      ok: true,
      items,
      error: null
    };
  } catch (error) {
    if (asset) {
      appendAssetDebug(asset, label || "Selected visible subclips", {
        status: "failed",
        error: error.message || String(error)
      });
    }
    return {
      ok: false,
      items: [],
      error
    };
  }
}

async function readBinItemsForPath(binPath, asset, label) {
  const candidates = binRelativePathCandidates(binPath);
  const failures = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const relativePath = candidates[index];
    try {
      const items = await readBinItemsForRelativePath(relativePath);
      if (asset) {
        appendAssetDebug(asset, label || "Read destination bin", {
          status: "ok",
          attemptedRelativePath: relativePath,
          candidates,
          items: summarizeBinItems(items)
        });
      }
      return {
        relativePath,
        items
      };
    } catch (error) {
      failures.push({
        relativePath,
        error: error.message || String(error)
      });
    }
  }

  const message = failures.length > 0
    ? failures.map(function formatFailure(failure) {
      return `${failure.relativePath}: ${failure.error}`;
    }).join(" | ")
    : "No bin path candidates could be built.";
  const error = new Error(`Could not read destination bin with any path candidate. ${message}`);
  error.binReadFailures = failures;
  throw error;
}

async function tryReadBinItemsForPath(binPath, asset, label) {
  try {
    const result = await readBinItemsForPath(binPath, asset, label);
    return {
      ok: true,
      relativePath: result.relativePath,
      items: result.items,
      error: null
    };
  } catch (error) {
    if (asset) {
      appendAssetDebug(asset, label || "Read destination bin", {
        status: "failed",
        failures: error.binReadFailures || [],
        error: error.message || String(error)
      });
    }
    return {
      ok: false,
      relativePath: "",
      items: [],
      error
    };
  }
}

function summarizeBinItems(items) {
  const list = (items || []).map(function summarize(item) {
    return {
      mobId: item.mobId || "",
      mobName: item.mobName || "",
      mobSelected: Boolean(item.mobSelected)
    };
  });
  return {
    count: list.length,
    items: list.slice(-12)
  };
}

function binItemSignature(item) {
  return [
    item && item.mobId || "",
    item && item.mobName || ""
  ].join("|");
}

function diffNewBinItems(beforeItems, afterItems) {
  const beforeCounts = new Map();
  (beforeItems || []).forEach(function countItem(item) {
    const signature = binItemSignature(item);
    beforeCounts.set(signature, (beforeCounts.get(signature) || 0) + 1);
  });

  return (afterItems || []).filter(function newOnly(item) {
    const signature = binItemSignature(item);
    const count = beforeCounts.get(signature) || 0;
    if (count > 0) {
      beforeCounts.set(signature, count - 1);
      return false;
    }
    return true;
  });
}

function pickCreatedSubclip(beforeItems, afterItems, sourceMobId) {
  const sourceId = String(sourceMobId || "").trim();
  const newItems = diffNewBinItems(beforeItems, afterItems).filter(function usable(item) {
    return item.mobId && item.mobId !== sourceId;
  });
  return newItems.length > 0 ? newItems[newItems.length - 1] : null;
}

function pickSelectedCreatedSubclip(beforeRead, afterRead, sourceMobId) {
  if (!afterRead || !afterRead.ok) {
    return null;
  }

  const created = beforeRead && beforeRead.ok
    ? pickCreatedSubclip(beforeRead.items, afterRead.items, sourceMobId)
    : null;
  if (created) {
    return created;
  }

  const sourceId = String(sourceMobId || "").trim();
  const selected = (afterRead.items || []).filter(function usable(item) {
    return item.mobId && item.mobId !== sourceId;
  });
  return selected.length === 1 ? selected[0] : null;
}

function findBinItemByMobId(items, mobId) {
  const id = String(mobId || "").trim();
  if (!id) {
    return null;
  }
  return (items || []).find(function sameMob(item) {
    return String(item && item.mobId || "").trim() === id;
  }) || null;
}

function responseHeaderSnapshot(response) {
  const header = response && response.getHeader ? response.getHeader() : null;
  if (!header) {
    return null;
  }
  if (header.toObject) {
    return header.toObject();
  }
  return {
    warnings: header.getWarningsList ? header.getWarningsList() : []
  };
}

function createSubclipRequestSnapshot(asset, subclip, binPath) {
  const startFrame = secondsToFrames(subclip.startTime, state.project.fps);
  const endFrame = Math.max(startFrame + 1, secondsToFrames(subclip.endTime, state.project.fps));
  return {
    requestedName: subclip.name,
    sourceMobId: asset.id,
    destinationBinPath: binPath ? ensureAvbPath(binPath) : "",
    headFrame: startFrame,
    endFrame,
    durationFrames: endFrame - startFrame,
    startSeconds: Number(subclip.startTime) || 0,
    endSeconds: Number(subclip.endTime) || 0,
    headTimecode: formatSubclipPoint(subclip.startTime),
    endTimecode: formatSubclipPoint(subclip.endTime),
    useClipBounds: false,
    useMarksBounds: false,
    retainMarks: false,
    retainMarkers: false,
    createNewSequence: false,
    enabledTracksOnly: false,
    addFramesAtHead: 0,
    addFramesAtEnd: 0
  };
}

function createSubclipWithPanelSDK(asset, subclip, binPath) {
  return new Promise(function create(resolve, reject) {
    const startFrame = secondsToFrames(subclip.startTime, state.project.fps);
    const endFrame = Math.max(startFrame + 1, secondsToFrames(subclip.endTime, state.project.fps));
    const requestSnapshot = createSubclipRequestSnapshot(asset, subclip, binPath);
    const request = new CreateSubClipRequest();
    const body = new CreateSubClipRequestBody();

    body.setMobId(requestSnapshot.sourceMobId);
    body.setDestinationBinPath(requestSnapshot.destinationBinPath);
    body.setHeadFrame(startFrame);
    body.setEndFrame(endFrame);
    body.setUseClipBounds(false);
    body.setUseMarksBounds(false);
    body.setRetainMarks(false);
    body.setRetainMarkers(false);
    body.setCreateNewSequence(false);
    body.setEnabledTracksOnly(false);
    body.setAddFramesAtHead(0);
    body.setAddFramesAtEnd(0);
    request.setBody(body);

    client.createSubClip(request, getMetadata(), function onCreateSubclip(err, response) {
      if (err) {
        reject(new Error(`CreateSubClip failed: ${err.message || err}`));
        return;
      }
      resolve({
        request: requestSnapshot,
        responseHeader: responseHeaderSnapshot(response)
      });
    });
  });
}

function renameMob(mobId, name) {
  return new Promise(function rename(resolve, reject) {
    const request = new SetMobInfoRequest();
    const body = new SetMobInfoRequestBody();
    const column = new ColumnInfo();

    column.setColumnName("Name");
    column.setColumnValue(sanitizeSubclipName(name));
    body.setMobId(mobId);
    body.setColumn(column);
    request.setBody(body);

    client.setMobInfo(request, getMetadata(), function onRename(err, response) {
      if (err) {
        reject(new Error(`SetMobInfo failed for Name: ${err.message || err}`));
        return;
      }
      const bodyResponse = response && response.getBody ? response.getBody() : null;
      const failures = bodyResponse && bodyResponse.getMobFailureList ? bodyResponse.getMobFailureList() : [];
      const hasFailedColumns = failures.some(function hasFailure(failure) {
        const failedColumns = failure.getFailedColumnsList ? failure.getFailedColumnsList() : [];
        return failedColumns.length > 0;
      });
      if (hasFailedColumns) {
        reject(new Error("SetMobInfo reported that the Name column could not be changed."));
        return;
      }
      resolve(response);
    });
  });
}

function selectMobInBin(binPath, mobId) {
  return new Promise(function select(resolve, reject) {
    const request = new SelectMobsInBinRequest();
    const body = new SelectMobsInBinRequestBody();

    body.setBinPath(ensureAvbPath(binPath));
    body.setMobIdsList([mobId]);
    body.setAddToSelection(false);
    request.setBody(body);

    client.selectMobsInBin(request, getMetadata(), function onSelect(err, response) {
      if (err) {
        reject(new Error(`SelectMobsInBin failed: ${err.message || err}`));
        return;
      }
      const bodyResponse = response && response.getBody ? response.getBody() : null;
      resolve({
        selectedMobIds: bodyResponse && bodyResponse.getSelectedMobIdsList
          ? bodyResponse.getSelectedMobIdsList()
          : []
      });
    });
  });
}

function nameFromMobColumns(columns) {
  const source = columns && typeof columns === "object" ? columns : {};
  const direct = source.Name || source.name;
  if (direct) {
    return String(direct).trim();
  }
  const key = Object.keys(source).find(function isName(columnName) {
    return columnName.toLowerCase() === "name";
  });
  return key ? String(source[key] || "").trim() : "";
}

async function readMobName(mobId) {
  const columns = await readMobColumns(mobId);
  return nameFromMobColumns(columns);
}

async function readCreatedSubclipName(mobId, binPath, asset) {
  try {
    const name = await readMobName(mobId);
    if (name) {
      appendAssetDebug(asset, "GetMobInfo name read", {
        mobId,
        name
      });
      return {
        name,
        readOk: true,
        source: "GetMobInfo"
      };
    }
  } catch (error) {
    appendAssetDebug(asset, "GetMobInfo name read failed", error.message || String(error));
  }

  const binRead = await tryReadBinItemsForPath(binPath, asset, "Destination bin name read fallback");
  const item = findBinItemByMobId(binRead.items, mobId);
  return {
    name: item && item.mobName || "",
    readOk: binRead.ok,
    source: "GetListOfBinItems"
  };
}

async function renameCreatedSubclip(asset, createdItem, requestedName, binPath) {
  const cleanName = sanitizeSubclipName(requestedName);
  const delays = [350, 800, 1400];
  let finalName = createdItem.mobName || "";
  let readOk = false;
  let lastWarning = "";

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    try {
      await selectMobInBin(binPath, createdItem.mobId);
      appendAssetDebug(asset, "SelectMobsInBin before rename", {
        mobId: createdItem.mobId,
        attempt: attempt + 1
      });
    } catch (error) {
      appendAssetDebug(asset, "SelectMobsInBin before rename warning", error.message || String(error));
    }

    appendAssetDebug(asset, "SetMobInfo rename request", {
      mobId: createdItem.mobId,
      from: finalName || createdItem.mobName,
      to: cleanName,
      attempt: attempt + 1
    });
    try {
      await renameMob(createdItem.mobId, cleanName);
    } catch (error) {
      lastWarning = error.message || String(error);
      appendAssetDebug(asset, "SetMobInfo rename warning", {
        attempt: attempt + 1,
        error: lastWarning
      });
    }

    await sleep(delays[attempt]);
    const observed = await readCreatedSubclipName(createdItem.mobId, binPath, asset);
    finalName = observed.name || finalName;
    readOk = readOk || observed.readOk;
    appendAssetDebug(asset, "SetMobInfo rename observed", {
      requestedName: cleanName,
      finalName,
      source: observed.source,
      attempt: attempt + 1
    });

    if (finalName === cleanName) {
      return {
        finalName,
        renameWarning: ""
      };
    }
  }

  return {
    finalName,
    renameWarning: lastWarning || subclipRenameVerificationWarning(cleanName, finalName, {
      readOk,
      found: Boolean(finalName)
    })
  };
}

async function createVerifiedSubclip(asset, subclip, binPath, beforeRead) {
  const beforeItems = beforeRead && beforeRead.items ? beforeRead.items : [];
  const beforeSelectedRead = await tryReadSelectedVisibleSubclipItems(asset, "Selected visible subclips before create");
  const createResult = await createSubclipWithPanelSDK(asset, subclip, binPath);
  appendAssetDebug(asset, "CreateSubClip returned", createResult);
  await sleep(150);
  let afterRead = await tryReadBinItemsForPath(binPath, asset, "Destination bin after 150ms");
  let afterItems = afterRead.items;
  let newItems = beforeRead && beforeRead.ok && afterRead.ok ? diffNewBinItems(beforeItems, afterItems) : [];
  appendAssetDebug(asset, "Destination bin after 150ms", {
    binPath: ensureAvbPath(binPath),
    readRelativePath: afterRead.relativePath,
    readOk: afterRead.ok,
    before: summarizeBinItems(beforeItems),
    after: summarizeBinItems(afterItems),
    newItems
  });
  let createdItem = pickCreatedSubclip(beforeItems, afterItems, asset.id);

  if (!createdItem && afterRead.ok) {
    await sleep(250);
    afterRead = await tryReadBinItemsForPath(binPath, asset, "Destination bin after retry");
    afterItems = afterRead.items;
    newItems = beforeRead && beforeRead.ok && afterRead.ok ? diffNewBinItems(beforeItems, afterItems) : [];
    appendAssetDebug(asset, "Destination bin after retry", {
      binPath: ensureAvbPath(binPath),
      readRelativePath: afterRead.relativePath,
      readOk: afterRead.ok,
      after: summarizeBinItems(afterItems),
      newItems
    });
    createdItem = pickCreatedSubclip(beforeItems, afterItems, asset.id);
  }

  if (!createdItem) {
    const selectedAfterRead = await tryReadSelectedVisibleSubclipItems(asset, "Selected visible subclips after create");
    createdItem = pickSelectedCreatedSubclip(beforeSelectedRead, selectedAfterRead, asset.id);
    if (createdItem) {
      appendAssetDebug(asset, "Created subclip found from selected visible fallback", createdItem);
    }
  }

  if (!createdItem) {
    if (!beforeRead || !beforeRead.ok || !afterRead.ok) {
      return {
        afterItems,
        createdItem: null,
        renameWarning: "CreateSubClip returned, but Mark could not verify or rename because GetListOfBinItems could not read the destination bin."
      };
    }
    throw new Error(`Created "${subclip.name}", but could not verify the new subclip in the destination bin.`);
  }

  const renameResult = await renameCreatedSubclip(asset, createdItem, subclip.name, binPath);
  const finalName = renameResult.finalName;
  const renameWarning = renameResult.renameWarning;
  afterRead = await tryReadBinItemsForPath(binPath, asset, "Destination bin after rename");
  afterItems = afterRead.items;

  return {
    afterItems,
    createdItem,
    finalName,
    renameWarning
  };
}

function applySubclips() {
  saveSubclipNamingOptions();
  syncPreviewFromCards();
  const namingOptions = subclipNamingOptions();
  const groups = state.selectedAssets.map(function selectedForAsset(asset, assetIndex) {
    const selectedSubclips = effectiveSubclipsForAsset(asset);
    return {
      asset,
      assetIndex,
      subclips: asset.applied ? [] : nameSubclipsForAsset(asset, selectedSubclips)
    };
  }).filter(function hasSubclips(group) {
    return group.subclips.length > 0;
  });
  appendDebugEvent("Avid subclip apply clicked", {
    namingOptions,
    groupCount: groups.length,
    groups: groups.map(function summarizeGroup(group) {
      return {
        clip: group.asset.name || group.asset.displayName || "clip",
        mobId: group.asset.id || "",
        requestedNames: group.subclips.map(function subclipName(subclip) {
          return subclip.name;
        })
      };
    })
  });

  if (groups.length === 0) {
    setStatus("Select at least one subclip to create.", true);
    return;
  }

  state.isApplying = true;
  setBusy(true);
  setStatus("Creating selected subclips in Avid...");
  runSubclipApply(groups).catch(function failed(error) {
    setStatus(error.message, true);
    state.isApplying = false;
    setBusy(isBatchActive());
    renderPreview();
  });
}

async function runSubclipApply(groups) {
  const totals = {
    applied: 0,
    failed: 0,
    warnings: [],
    debugMessages: []
  };

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const asset = group.asset;
    const createdNames = [];
    const warnings = [];
    const namingOptions = subclipNamingOptions();
    appendDebugEvent("Avid subclip apply started", {
      clip: asset.name || asset.displayName || "clip",
      mobId: asset.id || "",
      selectedSubclips: group.subclips.length,
      namingOptions,
      requestedNames: group.subclips.map(function subclipName(subclip) {
        return subclip.name;
      })
    });
    asset.debugMessage = [
      "DEBUG Create Subclips",
      `clip=${asset.name || asset.displayName || "clip"}`,
      `mobId=${asset.id}`,
      `selectedSubclips=${group.subclips.length}`,
      `naming=${JSON.stringify(namingOptions)}`,
      `fps=${state.project.fps}`
    ].join("\n");
    asset.message = "Creating subclips";
    renderPreview();
    setStatus(`Creating ${group.subclips.length} subclip${group.subclips.length === 1 ? "" : "s"} from ${asset.name || "clip"} (${groupIndex + 1} of ${groups.length})...`);

    try {
      const binInfo = await ensureAssetBinOpenForWrite(asset);
      asset.debugMessage += `\nbinPath=${binInfo.binPath}`;
      asset.debugMessage += `\nbinPathSource=${binInfo.binPathSource || "unknown"}`;
      asset.debugMessage += `\nbinOpen=${binInfo.lockMode}`;
      let beforeRead = await tryReadBinItemsForPath(binInfo.binPath, asset, "Destination bin before create");
      let beforeItems = beforeRead.items;
      appendAssetDebug(asset, "Destination bin before create", {
        binPath: ensureAvbPath(binInfo.binPath),
        binPathSource: binInfo.binPathSource || "",
        projectRelativeCandidates: binInfo.relativeCandidates || binRelativePathCandidates(binInfo.binPath),
        readRelativePath: beforeRead.relativePath,
        readOk: beforeRead.ok,
        items: summarizeBinItems(beforeItems)
      });

      for (let subclipIndex = 0; subclipIndex < group.subclips.length; subclipIndex += 1) {
        const subclip = group.subclips[subclipIndex];
        appendAssetDebug(asset, `CreateSubClip request ${subclipIndex + 1}/${group.subclips.length}`, expectedSubclipWrite(subclip, asset, binInfo.binPath));
        renderPreview();
        const result = await createVerifiedSubclip(asset, subclip, binInfo.binPath, beforeRead);
        beforeItems = result.afterItems;
        beforeRead = {
          ok: true,
          relativePath: beforeRead.relativePath,
          items: beforeItems,
          error: null
        };
        createdNames.push(subclip.name);
        if (result.renameWarning) {
          warnings.push(`${subclip.name}: ${result.renameWarning}`);
        }
        if (result.createdItem) {
          asset.debugMessage += `\nObserved final subclip name=${result.finalName || result.createdItem.mobName || ""}`;
        }
      }

      asset.applied = true;
      asset.message = warnings.length > 0
        ? `Subclips created; rename warning: ${warnings[0]}`
        : "Subclips created";
      asset.debugMessage += `\nCreated subclips=${JSON.stringify(createdNames, null, 2)}`;
      if (warnings.length > 0) {
        asset.debugMessage += `\nWarnings=${warnings.join(" | ")}`;
        totals.warnings.push(warnings[0]);
      }
      appendDebugEvent("Avid subclip apply finished", {
        clip: asset.name || asset.displayName || "clip",
        mobId: asset.id || "",
        createdNames,
        warnings
      });
      totals.applied += group.subclips.length;
      renderPreview();
    } catch (error) {
      const debugMessage = avidErrorSummary("Create subclips failed", error);
      asset.applied = false;
      asset.message = debugMessage;
      asset.debugMessage += `\nERROR ${debugMessage}`;
      appendDebugEvent("Avid subclip apply failed", {
        clip: asset.name || asset.displayName || "clip",
        mobId: asset.id || "",
        error: debugMessage
      });
      totals.debugMessages.push(debugMessage);
      totals.failed += 1;
      renderPreview();
    }
  }

  state.isApplying = false;
  setBusy(isBatchActive());
  if (totals.failed === 0) {
    if (!completeActiveQueueItemAfterApply()) {
      cleanupRetainedJobs();
    }
  }
  const firstDebugMessage = totals.debugMessages && totals.debugMessages[0];
  setStatus(totals.failed === 0
    ? totals.warnings.length > 0
      ? `Created ${totals.applied} subclip${totals.applied === 1 ? "" : "s"} with rename warning: ${totals.warnings[0]}`
      : `Created and verified ${totals.applied} subclip${totals.applied === 1 ? "" : "s"}.`
    : firstDebugMessage || `Created ${totals.applied} subclip${totals.applied === 1 ? "" : "s"}; ${totals.failed} clip${totals.failed === 1 ? "" : "s"} failed.`,
  totals.failed > 0 || totals.warnings.length > 0);
}

function expectedSubclipWrite(subclip, asset, binPath) {
  const snapshot = asset && binPath
    ? createSubclipRequestSnapshot(asset, subclip, binPath)
    : null;
  return {
    name: subclip.name,
    summary: subclip.summary || "",
    ...(snapshot || createSubclipRequestSnapshot({ id: "" }, subclip, ""))
  };
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
  dom["clear-clips-button"].addEventListener("click", clearClips);
  dom["discard-suggestions-button"].addEventListener("click", discardSuggestions);
  dom["queue-toggle"].addEventListener("click", toggleQueue);
  dom["settings-toggle"].addEventListener("click", toggleSettings);
  dom["workflow-mode-markers"].addEventListener("click", function selectMarkerMode() {
    setWorkflowMode("markers");
  });
  dom["workflow-mode-subclips"].addEventListener("click", function selectSubclipMode() {
    setWorkflowMode("subclips");
  });
  dom["marker-prompt"].addEventListener("input", function onPromptInput() {
    setBusy(state.isBusy);
  });
  dom["prompt-favorites-toggle"].addEventListener("click", function onFavoriteToggle(event) {
    event.stopPropagation();
    setSubclipOptionsPopoverOpen(false);
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
  dom["subclip-options-toggle"].addEventListener("click", function onSubclipOptionsToggle(event) {
    event.stopPropagation();
    setFavoritePromptPopoverOpen(false);
    setSubclipOptionsPopoverOpen(dom["subclip-options-popover"].classList.contains("hidden"));
  });
  dom["subclip-duration-toggle"].addEventListener("click", function onSubclipDurationToggle(event) {
    event.stopPropagation();
    setFavoritePromptPopoverOpen(false);
    setSubclipOptionsPopoverOpen(true, true);
  });
  dom["subclip-options-popover"].addEventListener("click", function onSubclipOptionsPopoverClick(event) {
    event.stopPropagation();
  });
  dom["custom-duration-toggle"].addEventListener("click", function onCustomDurationToggle() {
    setCustomDurationFieldsOpen(dom["subclip-duration-fields"].classList.contains("hidden"));
  });
  Array.from(document.querySelectorAll(".granularity-choice")).forEach(function bindGranularityChoice(button) {
    button.addEventListener("click", function selectGranularity() {
      dom["subclip-granularity"].value = button.dataset.granularity || "balanced";
      applyGranularityDefaults();
      setCustomDurationFieldsOpen(false);
    });
  });
  dom["subclip-granularity"].addEventListener("change", applyGranularityDefaults);
  dom["settings-subclip-granularity"].addEventListener("change", function onSettingsSubclipGranularityChange() {
    applySettingsSubclipDefaults(true);
  });
  [
    "subclip-min-duration",
    "subclip-max-duration"
  ].forEach(function bindSubclipDuration(id) {
    dom[id].addEventListener("input", updateSubclipDurationSummary);
    dom[id].addEventListener("change", saveSubclipOptions);
  });
  [
    "settings-subclip-min-duration",
    "settings-subclip-max-duration"
  ].forEach(function bindSettingsSubclipDuration(id) {
    dom[id].addEventListener("input", function onSettingsSubclipDurationInput() {
      applySettingsSubclipDefaults(false);
    });
    dom[id].addEventListener("change", function onSettingsSubclipDurationChange() {
      applySettingsSubclipDefaults(false);
    });
  });
  document.addEventListener("click", function onDocumentClick() {
    setFavoritePromptPopoverOpen(false);
    setSubclipOptionsPopoverOpen(false);
  });
  Array.from(document.querySelectorAll(".example-chip")).forEach(function bindExample(button) {
    button.addEventListener("click", function useExample() {
      dom["marker-prompt"].value = button.dataset.prompt || button.textContent;
      dom["marker-prompt"].focus();
      setBusy(state.isBusy);
    });
  });
  dom["analyze-button"].addEventListener("click", startAnalyze);
  dom["apply-button"].addEventListener("click", applyCurrentSuggestions);
  dom["account-button"].addEventListener("click", function onAccountButton() {
    if (accountRequiresSignIn()) {
      startSignIn();
      return;
    }
    openSettings();
  });
  dom["sign-in-button"].addEventListener("click", startSignIn);
  dom["refresh-account-button"].addEventListener("click", function onRefreshAccount() {
    setStatus("Refreshing Mark account...");
    refreshAccount({ silent: false }).then(function refreshed() {
      setStatus("Mark account refreshed.");
    }).catch(function noop() {});
  });
  dom["sign-out-button"].addEventListener("click", signOut);
  dom["buy-credits-button"].addEventListener("click", buyCredits);
  dom["settings-buy-credits-button"].addEventListener("click", buyCredits);
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
  dom["review-thumbnail-size"].addEventListener("change", saveReviewThumbnailSize);
  [
    "proxy-repository-enabled",
    "proxy-match-source-file",
    "proxy-match-source-path",
    "proxy-match-clip-name"
  ].forEach(function bindProxyCheckbox(id) {
    dom[id].addEventListener("change", saveProxyRepositorySettings);
  });
  dom["proxy-repository-roots"].addEventListener("input", updateProxyRepositorySummary);
  dom["proxy-repository-roots"].addEventListener("change", saveProxyRepositorySettings);
  dom["proxy-repository-roots"].addEventListener("blur", saveProxyRepositorySettings);
  dom["debug-panel-enabled"].addEventListener("change", function onDebugPanelToggle() {
    setDebugPanelEnabled(dom["debug-panel-enabled"].checked);
  });
  dom["debug-panel-clear"].addEventListener("click", function onDebugPanelClear() {
    state.debugEvents = [];
    renderDebugPanel();
  });
  [
    "marker-name-style",
    "marker-comment-style",
    "subclip-summary-style"
  ].forEach(function bindStyleField(id) {
    dom[id].addEventListener("change", saveMarkerOutputStyle);
    dom[id].addEventListener("blur", saveMarkerOutputStyle);
  });
  dom["avid-metadata-columns"].addEventListener("change", saveAvidMetadataColumns);
  [
    "subclip-name-delimiter",
    "subclip-name-suffix",
    "subclip-name-start",
    "subclip-name-padding"
  ].forEach(function bindSubclipNameField(id) {
    dom[id].addEventListener("input", function onSubclipNamingInput() {
      saveSubclipNamingOptions(false);
    });
    dom[id].addEventListener("change", saveSubclipNamingOptions);
    dom[id].addEventListener("blur", saveSubclipNamingOptions);
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

  host.onExportFileFinished(handleExportFinished);
}

document.addEventListener("DOMContentLoaded", function main() {
  initDom();
  host = createAvidHost({
    mcapi,
    MCAPIClient
  });
  client = host.client;
  helperClient = createHelperClient({
    getBaseUrl: helperBaseUrl
  });
  loadMarkerOutputStyle();
  loadReviewThumbnailSize();
  renderAvidMetadataColumnOptions();
  loadSubclipOptions();
  loadSubclipNamingOptions();
  loadProxyRepositorySettings();
  loadDebugPanelSetting();
  state.favoritePrompts = loadFavoritePrompts();
  registerEvents();
  updateWorkflowControls();
  renderAsset();
  renderProject();
  renderPreview();
  renderQueue();
  renderFavoritePrompts();
  renderAccount();
  setViewMode("drop");
  checkHelper({ silent: true }).catch(function noop() {});
  refreshExportSettings(false).catch(function noop() {});
});
