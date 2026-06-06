(function startMarkPremierePanel(global) {
  const DEFAULT_HELPER_URL = "http://localhost:4500";

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

  function text(id, value) {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  }

  function toast(message, kind) {
    const node = document.getElementById("toast");
    if (!node) {
      return;
    }
    node.textContent = message;
    node.classList.remove("hidden");
    node.dataset.kind = kind || "info";
    global.setTimeout(function hideToast() {
      node.classList.add("hidden");
    }, 3600);
  }

  async function refreshHost() {
    try {
      const summary = await global.markPremiereHost.getProjectSummary();
      const project = summary.projectName || "Untitled project";
      const sequence = summary.sequenceName || "No active sequence";
      text("premiere-summary", `${project} - ${sequence}`);
      return summary;
    } catch (error) {
      text("premiere-summary", error.message || String(error));
      throw error;
    }
  }

  async function checkHelper() {
    try {
      const response = await fetch(`${DEFAULT_HELPER_URL}/config`);
      if (!response.ok) {
        throw new Error(`Helper returned HTTP ${response.status}`);
      }
      const config = await response.json();
      text("helper-summary", config.hasTwelveLabsApiKey ? "Online - API key ready" : "Online - API key missing");
      return config;
    } catch (error) {
      text("helper-summary", `Offline - ${error.message || error}`);
      throw error;
    }
  }

  async function applySampleMarker() {
    try {
      const result = await global.markPremiereHost.applyMarkersToActiveSequence([
        {
          name: "Mark test marker",
          comment: "Created by the Mark Premiere UXP adapter smoke test.",
          startTime: 0,
          endTime: 1,
          markerType: "Comment"
        }
      ]);
      const message = `Applied ${result.count} marker to ${result.target}.`;
      text("marker-summary", message);
      toast(message, "ready");
    } catch (error) {
      const message = error.message || String(error);
      text("marker-summary", message);
      toast(message, "error");
    }
  }

  function bindEvents() {
    document.getElementById("refresh-host-button").addEventListener("click", function onRefreshHost() {
      refreshHost().catch(function noop() {});
    });
    document.getElementById("check-helper-button").addEventListener("click", function onCheckHelper() {
      checkHelper().catch(function noop() {});
    });
    document.getElementById("apply-sample-marker-button").addEventListener("click", applySampleMarker);
  }

  document.addEventListener("DOMContentLoaded", function onReady() {
    bindEvents();
    refreshHost().catch(function noop() {});
    checkHelper().catch(function noop() {});
  });

  registerUxPEntrypoints();
})(this);
