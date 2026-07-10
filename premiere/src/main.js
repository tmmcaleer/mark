(function startMarkPremierePanel(global) {
  const DEFAULT_HELPER_URL = "http://localhost:4500";
  const HELPER_URL_STORAGE_KEY = "mark.premiere.helperUrl";
  const PRESET_PATH_STORAGE_KEY = "mark.premiere.proxyPresetPath";
  const MARKER_NAME_STYLE_STORAGE_KEY = "mark.markerNameStyle";
  const MARKER_COMMENT_STYLE_STORAGE_KEY = "mark.markerCommentStyle";
  const POLL_INTERVAL_MS = 2000;
  let authPollTimer = null;

  const state = {
    selectedAssets: [],
    project: null,
    sequence: null,
    helperConfig: null,
    activeJobId: "",
    isBusy: false,
    isApplying: false,
    lastPrompt: "",
    viewMode: "drop",
    pollTimer: null,
    workflowMode: "markers",
    account: null,
    authDeviceCode: ""
  };

  const dom = {};

  function registerUxPEntrypoints() {
    if (typeof require !== "function") {
      return;
    }
    try {
      require("uxp").entrypoints.setup({
        panels: {
          markPanel: {
            show: function show() {}
          }
        }
      });
    } catch (error) {
      console.warn("Could not register Mark UXP entrypoints", error);
    }
  }

  function $(id) {
    return document.getElementById(id);
  }

  function initDom() {
    [
      "view-title",
      "drop-view",
      "drop-area",
      "drop-empty",
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
      "settings-toggle",
      "clip-tray",
      "selected-clip-list",
      "clear-clips-button",
      "workflow-mode-markers",
      "workflow-mode-subclips",
      "marker-prompt",
      "analyze-button",
      "apply-button",
      "status-message",
      "progress-stage",
      "progress-detail",
      "progress-bar",
      "preview-count",
      "preview-empty",
      "review-content",
      "review-clip-tabs",
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
      "sign-out-button",
      "settings-buy-credits-button",
      "export-setting-select",
      "export-setting-summary",
      "refresh-export-settings-button",
      "marker-name-style",
      "marker-comment-style",
      "toast",
      "asset-details"
    ].forEach(function cache(id) {
      dom[id] = $(id);
    });
  }

  function showToast(message, kind) {
    const node = dom.toast;
    if (!node) {
      return;
    }
    node.textContent = message;
    node.dataset.kind = kind || "info";
    node.classList.remove("hidden");
    global.setTimeout(function hideToast() {
      node.classList.add("hidden");
    }, 3600);
  }

  function setStatus(message, isError) {
    if (dom["status-message"]) {
      dom["status-message"].textContent = message || "";
      dom["status-message"].classList.toggle("is-error", Boolean(isError));
    }
    if (message && isError) {
      showToast(message, "error");
    }
  }

  function setProgress(value) {
    if (!dom["progress-bar"]) {
      return;
    }
    const numeric = Math.max(0, Math.min(100, Number(value) || 0));
    dom["progress-bar"].style.width = `${numeric}%`;
  }

  function setBusy(isBusy) {
    state.isBusy = Boolean(isBusy);
    if (dom["analyze-button"]) {
      dom["analyze-button"].disabled = state.isBusy || state.selectedAssets.length === 0 || !promptText() || accountRequiresSignIn();
    }
    if (dom["apply-button"]) {
      dom["apply-button"].disabled = state.isApplying || selectedMarkerCount() === 0;
    }
  }

  function setViewMode(mode) {
    state.viewMode = mode;
    const viewIds = ["drop-view", "prompt-view", "busy-view", "queue-view", "review-view", "settings-view"];
    viewIds.forEach(function toggle(id) {
      if (dom[id]) {
        dom[id].classList.toggle("hidden", id !== `${mode}-view`);
      }
    });
    const shell = document.querySelector(".app-shell");
    if (shell) {
      shell.dataset.view = mode;
      shell.dataset.host = "premiere";
    }
    if (dom["view-title"]) {
      dom["view-title"].textContent = mode === "review"
        ? "Review Markers"
        : mode === "settings"
          ? "Premiere Settings"
          : "Hi, I'm Mark.";
    }
  }

  function promptText() {
    return dom["marker-prompt"] ? dom["marker-prompt"].value.trim() : "";
  }

  function markerOutputStyle() {
    return {
      nameStyle: dom["marker-name-style"] && dom["marker-name-style"].value.trim()
        ? dom["marker-name-style"].value.trim()
        : "Short marker names. No confidence or reasoning.",
      commentStyle: dom["marker-comment-style"] && dom["marker-comment-style"].value.trim()
        ? dom["marker-comment-style"].value.trim()
        : "Short marker notes. No confidence or reasoning."
    };
  }

  function helperBaseUrl() {
    return String(dom["helper-url"] && dom["helper-url"].value || DEFAULT_HELPER_URL).replace(/\/+$/, "");
  }

  function accountRequiresSignIn() {
    return Boolean(state.helperConfig && state.helperConfig.cloudAnalysisEnabled)
      && !(state.account && state.account.authenticated);
  }

  function accountCreditText(account) {
    if (!state.helperConfig || !state.helperConfig.cloudAnalysisEnabled) {
      return "Local";
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
    const packs = Array.isArray(account.creditPacks) ? account.creditPacks : [];
    if (dom["account-summary"]) {
      dom["account-summary"].textContent = cloudEnabled ? authenticated ? accountCreditText(account) : "Sign in" : "Local";
    }
    if (dom["account-button"]) {
      dom["account-button"].disabled = !cloudEnabled;
    }
    if (dom["buy-credits-button"]) {
      dom["buy-credits-button"].classList.toggle("hidden", !authenticated);
      dom["buy-credits-button"].disabled = !authenticated || packs.length === 0;
    }
    if (dom["account-detail"]) {
      dom["account-detail"].textContent = cloudEnabled ? authenticated ? "Signed in for hosted analysis." : "Sign in to use hosted analysis." : "Local analysis mode.";
    }
    if (dom["account-credit-balance"]) {
      dom["account-credit-balance"].textContent = accountCreditText(account);
    }
    if (dom["account-email"]) {
      dom["account-email"].textContent = authenticated && account.user ? account.user.email || "Signed in" : "Not signed in";
    }
    if (dom["credit-pack-select"]) {
      dom["credit-pack-select"].innerHTML = "";
      if (packs.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No packs available";
        dom["credit-pack-select"].appendChild(option);
      } else {
        packs.forEach(function addPack(pack) {
          const option = document.createElement("option");
          option.value = pack.id;
          option.textContent = `${pack.label} - ${pack.minutes} min`;
          dom["credit-pack-select"].appendChild(option);
        });
      }
      dom["credit-pack-select"].disabled = !authenticated || packs.length === 0;
    }
    if (dom["sign-in-button"]) {
      dom["sign-in-button"].disabled = !cloudEnabled || authenticated || state.isBusy;
    }
    if (dom["sign-out-button"]) {
      dom["sign-out-button"].disabled = !authenticated || state.isBusy;
    }
    if (dom["settings-buy-credits-button"]) {
      dom["settings-buy-credits-button"].disabled = !authenticated || packs.length === 0 || state.isBusy;
    }
    setBusy(state.isBusy);
  }

  async function requestJson(method, path, body) {
    const response = await fetch(`${helperBaseUrl()}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json;charset=UTF-8"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      const message = payload && payload.error && payload.error.message
        ? payload.error.message
        : `Helper request failed with HTTP ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  function createGuid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return `mark-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clampMarker(marker) {
    const start = Math.max(0, Number(marker && marker.startTime) || 0);
    const end = Math.max(start + 0.001, Number(marker && marker.endTime) || start + 1);
    return {
      id: marker && marker.id || createGuid(),
      name: marker && marker.name || "Mark marker",
      comment: marker && marker.comment || "",
      color: marker && marker.color || "Yellow",
      startTime: Number(start.toFixed(3)),
      endTime: Number(end.toFixed(3)),
      thumbnailUrl: marker && marker.thumbnailUrl || "",
      use: true
    };
  }

  function secondsToClock(value) {
    const total = Math.max(0, Number(value) || 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = Math.floor(total % 60);
    const ms = Math.floor((total - Math.floor(total)) * 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }

  function formatDuration(marker) {
    const duration = Math.max(0, Number(marker.endTime) - Number(marker.startTime));
    return `${duration.toFixed(duration < 10 ? 1 : 0)}s`;
  }

  function buildClipMetadata(asset) {
    return {
      mobId: asset.id || "",
      name: asset.name || "",
      displayName: asset.displayName || asset.name || "",
      mobName: asset.name || "",
      type: asset.type || "clip",
      inMark: asset.inMark,
      outMark: asset.outMark,
      columns: asset.columns || {}
    };
  }

  function buildPromptContext(asset) {
    return {
      columns: {
        ...(asset.columns || {}),
        "Premiere Project": state.project && state.project.name || "",
        "Premiere Sequence": state.sequence && state.sequence.name || ""
      }
    };
  }

  function selectedMarkerCount() {
    return state.selectedAssets.reduce(function count(total, asset) {
      return total + (asset.markers || []).filter(function selected(marker) {
        return marker.use !== false;
      }).length;
    }, 0);
  }

  function totalMarkerCount() {
    return state.selectedAssets.reduce(function count(total, asset) {
      return total + (asset.markers || []).length;
    }, 0);
  }

  function renderSelectedAssets() {
    const list = dom["selected-clip-list"];
    if (!list) {
      return;
    }
    list.innerHTML = "";
    state.selectedAssets.forEach(function renderAsset(asset) {
      const item = document.createElement("div");
      item.className = "selected-clip-pill";
      item.textContent = asset.displayName || asset.name || "Premiere clip";
      list.appendChild(item);
    });
    if (dom["asset-details"]) {
      dom["asset-details"].textContent = state.selectedAssets.length === 0
        ? ""
        : `${state.selectedAssets.length} Premiere item${state.selectedAssets.length === 1 ? "" : "s"} ready.`;
    }
    setBusy(state.isBusy);
  }

  function renderReviewTabs() {
    const tabs = dom["review-clip-tabs"];
    if (!tabs) {
      return;
    }
    tabs.innerHTML = "";
    state.selectedAssets.forEach(function renderTab(asset, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `review-clip-tab${index === 0 ? " is-active" : ""}`;
      button.textContent = asset.displayName || asset.name || `Clip ${index + 1}`;
      button.addEventListener("click", function activate() {
        document.querySelectorAll(".review-clip-tab").forEach(function deactivate(tab) {
          tab.classList.remove("is-active");
        });
        button.classList.add("is-active");
        renderSuggestionList(index);
      });
      tabs.appendChild(button);
    });
  }

  function renderSuggestionList(assetIndex) {
    const list = dom["suggestion-list"];
    if (!list) {
      return;
    }
    list.innerHTML = "";
    const asset = state.selectedAssets[assetIndex || 0];
    if (!asset || !asset.markers || asset.markers.length === 0) {
      return;
    }
    asset.markers.forEach(function renderMarker(marker, markerIndex) {
      const card = document.createElement("article");
      card.className = "suggestion-card";
      card.dataset.assetIndex = String(assetIndex || 0);
      card.dataset.markerIndex = String(markerIndex);

      const header = document.createElement("div");
      header.className = "suggestion-card-header";

      const use = document.createElement("input");
      use.type = "checkbox";
      use.checked = marker.use !== false;
      use.addEventListener("change", function updateUse() {
        marker.use = use.checked;
        card.classList.toggle("is-muted", !use.checked);
        setBusy(state.isBusy);
      });
      header.appendChild(use);

      const time = document.createElement("span");
      time.className = "suggestion-time";
      time.textContent = `${secondsToClock(marker.startTime)} - ${formatDuration(marker)}`;
      header.appendChild(time);

      card.appendChild(header);

      const name = document.createElement("input");
      name.className = "suggestion-title-input";
      name.value = marker.name || "";
      name.addEventListener("input", function updateName() {
        marker.name = name.value;
      });
      card.appendChild(name);

      const comment = document.createElement("textarea");
      comment.className = "suggestion-comment-input";
      comment.rows = 3;
      comment.value = marker.comment || "";
      comment.addEventListener("input", function updateComment() {
        marker.comment = comment.value;
      });
      card.appendChild(comment);

      list.appendChild(card);
    });
  }

  function renderReview() {
    const count = totalMarkerCount();
    if (dom["preview-count"]) {
      dom["preview-count"].textContent = count === 0
        ? "No marker suggestions yet."
        : `Found ${count} marker suggestion${count === 1 ? "" : "s"} across ${state.selectedAssets.length} Premiere item${state.selectedAssets.length === 1 ? "" : "s"}.`;
    }
    if (dom["preview-empty"]) {
      dom["preview-empty"].classList.toggle("hidden", count > 0);
    }
    if (dom["review-content"]) {
      dom["review-content"].classList.toggle("hidden", count === 0);
    }
    renderReviewTabs();
    renderSuggestionList(0);
    setBusy(state.isBusy);
  }

  function normalizeAsset(asset) {
    return {
      id: asset.id,
      name: asset.name || "Premiere clip",
      displayName: asset.displayName || asset.name || "Premiere clip",
      type: asset.type || "clip",
      filePath: asset.filePath,
      mediaSourceKind: asset.mediaSourceKind || "premiere-source-path",
      columns: asset.columns || {},
      inMark: asset.inMark,
      outMark: asset.outMark,
      fps: asset.fps,
      target: asset.target,
      status: "idle",
      message: "Ready",
      markers: [],
      helperJobId: "",
      helperDebugEventCount: 0
    };
  }

  function selectAssets(assets) {
    state.selectedAssets = (assets || []).filter(function hasFile(asset) {
      return asset && asset.filePath && asset.id && asset.target;
    }).map(normalizeAsset);
    if (state.selectedAssets.length === 0) {
      setStatus("Select Premiere clips with local media paths, or export the active sequence proxy.", true);
      return;
    }
    renderSelectedAssets();
    renderReview();
    setViewMode("prompt");
    setStatus("Ready. Tell Mark what to find.");
  }

  async function refreshHostSummary() {
    const summary = await global.markPremiereHost.getProjectSummary();
    state.project = {
      name: summary.projectName || "",
      path: summary.projectPath || "",
      fps: Number(summary.timebase) || 0
    };
    state.sequence = summary.sequenceName ? {
      name: summary.sequenceName,
      guid: summary.sequenceGuid
    } : null;
    const status = document.getElementById("premiere-host-summary");
    if (status) {
      status.textContent = summary.sequenceName
        ? `${summary.projectName || "Untitled project"} - ${summary.sequenceName}`
        : `${summary.projectName || "Untitled project"} - no active sequence`;
    }
    return summary;
  }

  async function usePremiereSelection() {
    setBusy(true);
    setStatus("Reading Premiere selection...");
    try {
      const result = await global.markPremiereHost.getSelectedMediaTargets();
      state.project = result.project || state.project;
      state.sequence = result.sequence || state.sequence;
      selectAssets(result.items || []);
      setBusy(false);
    } catch (error) {
      setBusy(false);
      setStatus(error.message || String(error), true);
    }
  }

  function proxyPresetPath() {
    const input = document.getElementById("premiere-proxy-preset-path");
    return input ? input.value.trim() : "";
  }

  function proxyOutputPath(config) {
    const root = String(config && config.exportDestinationPath || "").replace(/\/+$/, "");
    if (!root) {
      return "";
    }
    return `${root}/mark_premiere_${Date.now()}.mp4`;
  }

  async function useActiveSequenceExport() {
    setBusy(true);
    setProgress(4);
    setViewMode("busy");
    if (dom["progress-stage"]) {
      dom["progress-stage"].textContent = "Exporting Premiere proxy";
    }
    setStatus("Checking helper before export...");
    try {
      const config = await checkHelper({ silent: true });
      const outputFile = proxyOutputPath(config);
      setStatus("Premiere is exporting a Mark proxy...");
      const asset = await global.markPremiereHost.exportActiveSequenceProxy({
        outputFile,
        presetFile: proxyPresetPath()
      });
      selectAssets([asset]);
      setProgress(0);
      setBusy(false);
    } catch (error) {
      setProgress(0);
      setBusy(false);
      setViewMode("drop");
      setStatus(error.message || String(error), true);
    }
  }

  async function checkHelper(options) {
    const silent = options && options.silent;
    if (dom["connection-status"]) {
      dom["connection-status"].textContent = "Checking";
    }
    if (dom["helper-status-dot"]) {
      dom["helper-status-dot"].dataset.status = "checking";
    }
    try {
      const config = await requestJson("GET", "/config");
      state.helperConfig = config;
      if (dom["connection-status"]) {
        dom["connection-status"].textContent = "Online";
      }
      if (dom["helper-status-dot"]) {
        dom["helper-status-dot"].dataset.status = "ready";
      }
      if (dom["api-key-status"]) {
        dom["api-key-status"].textContent = config.cloudAnalysisEnabled
          ? "Cloud"
          : config.hasTwelveLabsApiKey ? "Ready" : "Missing";
      }
      if (dom["api-key-status-dot"]) {
        dom["api-key-status-dot"].dataset.status = (config.cloudAnalysisEnabled || config.hasTwelveLabsApiKey) ? "ready" : "warning";
      }
      refreshAccount({ silent: true }).catch(function noop() {});
      if (!silent) {
        const analysisReady = config.cloudAnalysisEnabled || config.hasTwelveLabsApiKey;
        setStatus(analysisReady ? "Helper connected." : "Helper connected, but TWELVELABS_API_KEY is missing.", !analysisReady);
      }
      return config;
    } catch (error) {
      if (dom["connection-status"]) {
        dom["connection-status"].textContent = "Offline";
      }
      if (dom["helper-status-dot"]) {
        dom["helper-status-dot"].dataset.status = "error";
      }
      if (!silent) {
        setStatus(error.message || String(error), true);
      }
      throw error;
    }
  }

  async function refreshAccount(options) {
    const silent = options && options.silent;
    try {
      state.account = await requestJson("GET", "/account");
      renderAccount();
      return state.account;
    } catch (error) {
      state.account = {
        authenticated: false,
        credits: {
          balanceMinutes: 0
        },
        creditPacks: []
      };
      renderAccount();
      if (!silent) {
        setStatus(error.message || String(error), true);
      }
      throw error;
    }
  }

  function clearAuthPoll() {
    if (authPollTimer) {
      global.clearTimeout(authPollTimer);
      authPollTimer = null;
    }
  }

  async function startSignIn() {
    if (!state.helperConfig || !state.helperConfig.cloudAnalysisEnabled) {
      setStatus("Hosted Mark analysis is not configured.", true);
      return;
    }
    clearAuthPoll();
    try {
      const payload = await requestJson("POST", "/auth/device/start", {
        clientName: "Mark Premiere Panel"
      });
      state.authDeviceCode = payload.deviceCode || "";
      setStatus("Check your browser to finish signing in.");
      pollSignIn();
    } catch (error) {
      setStatus(error.message || String(error), true);
    }
  }

  async function pollSignIn() {
    if (!state.authDeviceCode) {
      return;
    }
    try {
      const payload = await requestJson("GET", `/auth/device/poll?deviceCode=${encodeURIComponent(state.authDeviceCode)}`);
      if (payload.status === "authorized") {
        clearAuthPoll();
        state.authDeviceCode = "";
        await refreshAccount({ silent: true });
        setStatus("Signed in to Mark.");
        return;
      }
      if (payload.status === "expired") {
        clearAuthPoll();
        state.authDeviceCode = "";
        setStatus("Mark sign-in expired. Try again.", true);
        return;
      }
      authPollTimer = global.setTimeout(pollSignIn, 2000);
    } catch (error) {
      clearAuthPoll();
      setStatus(error.message || String(error), true);
    }
  }

  async function signOut() {
    clearAuthPoll();
    try {
      await requestJson("POST", "/auth/sign-out", {});
      state.account = {
        authenticated: false,
        credits: {
          balanceMinutes: 0
        },
        creditPacks: []
      };
      renderAccount();
      setStatus("Signed out of Mark.");
    } catch (error) {
      setStatus(error.message || String(error), true);
    }
  }

  async function buyCredits() {
    const packId = dom["credit-pack-select"] && dom["credit-pack-select"].value
      ? dom["credit-pack-select"].value
      : state.account && state.account.creditPacks && state.account.creditPacks[0] && state.account.creditPacks[0].id;
    if (!packId) {
      setStatus("No Mark credit packs are configured.", true);
      return;
    }
    try {
      await requestJson("POST", "/billing/checkout-sessions", {
        packId
      });
      setStatus("Checkout opened in your browser.");
    } catch (error) {
      setStatus(error.message || String(error), true);
    }
  }

  async function startAnalyze() {
    const prompt = promptText();
    if (state.selectedAssets.length === 0) {
      setStatus("Select Premiere media first.", true);
      return;
    }
    if (!prompt) {
      setStatus("Tell Mark what to look for first.", true);
      return;
    }

    setBusy(true);
    setProgress(8);
    setViewMode("busy");
    if (dom["progress-stage"]) {
      dom["progress-stage"].textContent = "Analyzing";
    }
    setStatus("Checking the Mark helper...");

    try {
      const config = await checkHelper({ silent: true });
      if (!config.cloudAnalysisEnabled && !config.hasTwelveLabsApiKey) {
        throw new Error("TWELVELABS_API_KEY is not set in the helper service.");
      }
      if (accountRequiresSignIn()) {
        throw new Error("Sign in to Mark before analyzing media.");
      }

      state.lastPrompt = prompt;
      for (let index = 0; index < state.selectedAssets.length; index += 1) {
        const asset = state.selectedAssets[index];
        asset.status = "analyzing";
        asset.markers = [];
        setStatus(`Sending ${asset.displayName || asset.name} to the helper (${index + 1} of ${state.selectedAssets.length})...`);
        const job = await requestJson("POST", "/jobs", {
          filePath: asset.filePath,
          prompt,
          outputMode: "markers",
          markerOutputStyle: markerOutputStyle(),
          promptContext: buildPromptContext(asset),
          clip: buildClipMetadata(asset),
          project: state.project || {},
          mediaSourceKind: asset.mediaSourceKind || "premiere-source-path"
        });
        asset.helperJobId = job.id;
        asset.helperDebugEventCount = 0;
        state.activeJobId = job.id;
      }
      pollJobs();
    } catch (error) {
      setBusy(false);
      setProgress(0);
      setViewMode("prompt");
      setStatus(error.message || String(error), true);
    }
  }

  function activeAssets() {
    return state.selectedAssets.filter(function active(asset) {
      return asset.status === "analyzing" && asset.helperJobId;
    });
  }

  function completedAssetCount() {
    return state.selectedAssets.filter(function complete(asset) {
      return asset.status === "ready" || asset.status === "failed";
    }).length;
  }

  async function pollJobs() {
    clearPoll();
    const assets = activeAssets();
    if (assets.length === 0) {
      finishAnalyze();
      return;
    }

    try {
      const results = await Promise.all(assets.map(async function poll(asset) {
        const job = await requestJson("GET", `/jobs/${encodeURIComponent(asset.helperJobId)}`);
        return {
          asset,
          job
        };
      }));
      results.forEach(function update(result) {
        updateAssetFromJob(result.asset, result.job);
      });
      const completed = completedAssetCount();
      setProgress(Math.min(95, 15 + completed * (80 / Math.max(1, state.selectedAssets.length))));
      setStatus(`Analyzing... ${completed}/${state.selectedAssets.length} done`);
      if (activeAssets().length === 0) {
        finishAnalyze();
        return;
      }
      state.pollTimer = global.setTimeout(pollJobs, POLL_INTERVAL_MS);
    } catch (error) {
      setStatus(error.message || String(error), true);
      state.pollTimer = global.setTimeout(pollJobs, POLL_INTERVAL_MS);
    }
  }

  function updateAssetFromJob(asset, job) {
    if (!job) {
      return;
    }
    asset.message = job.message || asset.message || "Analyzing";
    if (job.progress) {
      setProgress(job.progress);
    }
    if (job.status === "ready") {
      asset.status = "ready";
      asset.message = "Analysis complete";
      asset.markers = (job.markers || []).map(clampMarker);
    }
    if (job.status === "failed") {
      asset.status = "failed";
      asset.message = job.error && job.error.message || "TwelveLabs analysis failed.";
    }
  }

  function finishAnalyze() {
    clearPoll();
    setProgress(100);
    renderReview();
    setBusy(false);
    setViewMode("review");
    const count = totalMarkerCount();
    setStatus(count > 0
      ? `Found ${count} possible marker${count === 1 ? "" : "s"}. Review before applying.`
      : "No marker suggestions were created.",
    count === 0);
  }

  function clearPoll() {
    if (state.pollTimer) {
      global.clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function clearClips() {
    clearPoll();
    state.selectedAssets.forEach(function cleanup(asset) {
      if (asset.helperJobId && asset.status !== "analyzing") {
        requestJson("DELETE", `/jobs/${encodeURIComponent(asset.helperJobId)}`).catch(function noop() {});
      }
    });
    state.selectedAssets = [];
    state.activeJobId = "";
    setProgress(0);
    renderSelectedAssets();
    renderReview();
    setBusy(false);
    setViewMode("drop");
    setStatus("Select Premiere media and I'll take a look.");
  }

  function discardSuggestions() {
    state.selectedAssets.forEach(function reset(asset) {
      asset.markers = [];
      asset.status = "idle";
      if (asset.helperJobId) {
        requestJson("DELETE", `/jobs/${encodeURIComponent(asset.helperJobId)}`).catch(function noop() {});
      }
      asset.helperJobId = "";
    });
    renderReview();
    setProgress(0);
    setViewMode("prompt");
    setStatus("Suggestions discarded. Ready to run again.");
  }

  async function applyMarkers() {
    const groups = state.selectedAssets.map(function group(asset) {
      return {
        target: asset.target,
        markers: (asset.markers || []).filter(function selected(marker) {
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
    setStatus("Writing selected markers to Premiere...");
    try {
      const result = await global.markPremiereHost.applyMarkerGroups(groups);
      state.selectedAssets.forEach(function markApplied(asset) {
        asset.applied = true;
      });
      renderReview();
      setStatus(`Applied ${result.count} marker${result.count === 1 ? "" : "s"} to Premiere.`);
      showToast("Markers applied in Premiere.", "ready");
    } catch (error) {
      setStatus(error.message || String(error), true);
    } finally {
      state.isApplying = false;
      setBusy(false);
    }
  }

  function openSettings() {
    setViewMode("settings");
  }

  function closeSettings() {
    setViewMode(state.selectedAssets.length > 0 ? "prompt" : "drop");
  }

  function injectPremiereControls() {
    if (dom["drop-empty"]) {
      dom["drop-empty"].innerHTML = "";
      const title = document.createElement("strong");
      title.textContent = "Choose Premiere media and I'll take a look.";
      dom["drop-empty"].appendChild(title);

      const summary = document.createElement("p");
      summary.id = "premiere-host-summary";
      summary.className = "premiere-host-summary";
      summary.textContent = "Checking active project...";
      dom["drop-empty"].appendChild(summary);

      const actions = document.createElement("div");
      actions.className = "premiere-source-actions";

      const selectionButton = document.createElement("button");
      selectionButton.id = "use-premiere-selection-button";
      selectionButton.type = "button";
      selectionButton.className = "primary-button";
      selectionButton.textContent = "Use Selection";
      selectionButton.addEventListener("click", usePremiereSelection);
      actions.appendChild(selectionButton);

      const sequenceButton = document.createElement("button");
      sequenceButton.id = "use-active-sequence-button";
      sequenceButton.type = "button";
      sequenceButton.className = "secondary-button";
      sequenceButton.textContent = "Export Active Sequence";
      sequenceButton.addEventListener("click", useActiveSequenceExport);
      actions.appendChild(sequenceButton);

      dom["drop-empty"].appendChild(actions);
    }

    if (dom["queue-toggle"]) {
      dom["queue-toggle"].classList.add("hidden");
    }
    if (dom["workflow-mode-subclips"]) {
      dom["workflow-mode-subclips"].disabled = true;
      dom["workflow-mode-subclips"].title = "Premiere subclip creation is not enabled in Mark Premiere v1.";
    }
    const proxyRepository = document.getElementById("settings-proxy-repository-heading");
    if (proxyRepository && proxyRepository.closest(".settings-section")) {
      proxyRepository.closest(".settings-section").classList.add("hidden");
    }
    const metadata = document.getElementById("settings-metadata-heading");
    if (metadata && metadata.closest(".settings-section")) {
      metadata.closest(".settings-section").classList.add("hidden");
    }
    const subclipSettings = document.getElementById("settings-subclip-heading");
    if (subclipSettings && subclipSettings.closest(".settings-section")) {
      subclipSettings.closest(".settings-section").classList.add("hidden");
    }
    const exportHeading = document.getElementById("settings-export-heading");
    if (exportHeading) {
      exportHeading.textContent = "Premiere proxy export";
    }
    if (dom["export-setting-summary"]) {
      dom["export-setting-summary"].textContent = "Used only when direct source media is unavailable and Mark exports the active sequence.";
    }
    if (dom["export-setting-select"]) {
      dom["export-setting-select"].classList.add("hidden");
      const field = dom["export-setting-select"].closest(".field");
      if (field && !document.getElementById("premiere-proxy-preset-path")) {
        const label = document.createElement("label");
        label.className = "field field-wide";
        label.setAttribute("for", "premiere-proxy-preset-path");
        const span = document.createElement("span");
        span.textContent = "AME preset path";
        label.appendChild(span);
        const input = document.createElement("input");
        input.id = "premiere-proxy-preset-path";
        input.spellcheck = false;
        input.placeholder = "/Users/admin/Presets/Mark Proxy.epr";
        input.value = global.localStorage.getItem(PRESET_PATH_STORAGE_KEY) || "";
        input.addEventListener("change", function savePreset() {
          global.localStorage.setItem(PRESET_PATH_STORAGE_KEY, input.value.trim());
        });
        label.appendChild(input);
        field.parentNode.insertBefore(label, field.nextSibling);
      }
    }
    if (dom["refresh-export-settings-button"]) {
      dom["refresh-export-settings-button"].classList.add("hidden");
    }
  }

  function loadPreferences() {
    if (dom["helper-url"]) {
      dom["helper-url"].value = global.localStorage.getItem(HELPER_URL_STORAGE_KEY) || DEFAULT_HELPER_URL;
      dom["helper-url"].addEventListener("change", function saveHelperUrl() {
        global.localStorage.setItem(HELPER_URL_STORAGE_KEY, dom["helper-url"].value.trim());
      });
    }
    if (dom["marker-name-style"]) {
      dom["marker-name-style"].value = global.localStorage.getItem(MARKER_NAME_STYLE_STORAGE_KEY) || dom["marker-name-style"].value;
      dom["marker-name-style"].addEventListener("change", function saveNameStyle() {
        global.localStorage.setItem(MARKER_NAME_STYLE_STORAGE_KEY, dom["marker-name-style"].value.trim());
      });
    }
    if (dom["marker-comment-style"]) {
      dom["marker-comment-style"].value = global.localStorage.getItem(MARKER_COMMENT_STYLE_STORAGE_KEY) || dom["marker-comment-style"].value;
      dom["marker-comment-style"].addEventListener("change", function saveCommentStyle() {
        global.localStorage.setItem(MARKER_COMMENT_STYLE_STORAGE_KEY, dom["marker-comment-style"].value.trim());
      });
    }
  }

  function bindEvents() {
    if (dom["drop-area"]) {
      dom["drop-area"].addEventListener("dragover", function dragOver(event) {
        event.preventDefault();
      });
      dom["drop-area"].addEventListener("drop", function drop(event) {
        event.preventDefault();
        setStatus("Use the Premiere selection buttons in Mark Premiere v1.", true);
      });
    }
    if (dom["settings-toggle"]) {
      dom["settings-toggle"].addEventListener("click", openSettings);
    }
    if (dom["clear-clips-button"]) {
      dom["clear-clips-button"].addEventListener("click", clearClips);
    }
    if (dom["discard-suggestions-button"]) {
      dom["discard-suggestions-button"].addEventListener("click", discardSuggestions);
    }
    if (dom["workflow-mode-markers"]) {
      dom["workflow-mode-markers"].addEventListener("click", function markersOnly() {
        state.workflowMode = "markers";
      });
    }
    if (dom["workflow-mode-subclips"]) {
      dom["workflow-mode-subclips"].addEventListener("click", function noSubclips() {
        state.workflowMode = "markers";
        setStatus("Premiere subclip creation is not enabled in Mark Premiere v1.", true);
      });
    }
    if (dom["marker-prompt"]) {
      dom["marker-prompt"].addEventListener("input", function updateAnalyzeButton() {
        setBusy(state.isBusy);
      });
    }
    if (dom["analyze-button"]) {
      dom["analyze-button"].addEventListener("click", startAnalyze);
    }
    if (dom["account-button"]) {
      dom["account-button"].addEventListener("click", function accountClick() {
        if (accountRequiresSignIn()) {
          startSignIn();
          return;
        }
        openSettings();
      });
    }
    if (dom["sign-in-button"]) {
      dom["sign-in-button"].addEventListener("click", startSignIn);
    }
    if (dom["sign-out-button"]) {
      dom["sign-out-button"].addEventListener("click", signOut);
    }
    if (dom["buy-credits-button"]) {
      dom["buy-credits-button"].addEventListener("click", buyCredits);
    }
    if (dom["settings-buy-credits-button"]) {
      dom["settings-buy-credits-button"].addEventListener("click", buyCredits);
    }
    if (dom["apply-button"]) {
      dom["apply-button"].addEventListener("click", applyMarkers);
    }
    if (dom["check-helper-button"]) {
      dom["check-helper-button"].addEventListener("click", function check() {
        checkHelper().catch(function noop() {});
      });
    }
    const settingsClose = document.getElementById("export-setting-dialog-close-button");
    if (settingsClose) {
      settingsClose.addEventListener("click", closeSettings);
    }
  }

  document.addEventListener("DOMContentLoaded", function onReady() {
    initDom();
    injectPremiereControls();
    loadPreferences();
    bindEvents();
    renderAccount();
    setViewMode("drop");
    setStatus("Select Premiere media and I'll take a look.");
    refreshHostSummary().catch(function failed(error) {
      setStatus(error.message || String(error), true);
    });
    checkHelper({ silent: true }).catch(function noop() {});
    setBusy(false);
  });

  registerUxPEntrypoints();
})(this);
