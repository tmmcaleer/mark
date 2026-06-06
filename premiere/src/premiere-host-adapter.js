(function exposePremiereHost(global) {
  const storedTargets = new Map();

  function requirePremiere() {
    if (typeof require !== "function") {
      throw new Error("Premiere UXP require() is not available.");
    }
    return require("premierepro");
  }

  function safeCall(label, fn, fallback) {
    try {
      const value = fn();
      return value === undefined || value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function objectId(item, fallback) {
    return String(safeCall("id", function getId() {
      return typeof item.getId === "function" ? item.getId() : item.guid || item.id;
    }, fallback || "") || fallback || "");
  }

  function tickSeconds(tickTime) {
    const seconds = Number(tickTime && tickTime.seconds);
    if (Number.isFinite(seconds)) {
      return seconds;
    }
    const ticksNumber = Number(tickTime && tickTime.ticksNumber);
    if (Number.isFinite(ticksNumber) && ticksNumber > 0) {
      return ticksNumber / 254016000000;
    }
    return 0;
  }

  function mediaTypeVideo(app) {
    return app.constants && app.constants.MediaType
      ? app.constants.MediaType.VIDEO
      : 1;
  }

  function clipProjectItem(app, projectItem) {
    if (!projectItem) {
      return null;
    }
    if (app.ClipProjectItem && typeof app.ClipProjectItem.cast === "function") {
      return safeCall("cast clip project item", function cast() {
        return app.ClipProjectItem.cast(projectItem);
      }, projectItem);
    }
    return projectItem;
  }

  function normalizeProjectItem(app, projectItem, source) {
    const clipItem = clipProjectItem(app, projectItem);
    if (!clipItem) {
      return null;
    }

    const id = objectId(clipItem, `premiere-item-${storedTargets.size + 1}`);
    const name = String(clipItem.name || projectItem.name || "Premiere clip");
    const mediaPath = String(safeCall("media path", function getMediaPath() {
      return typeof clipItem.getMediaFilePath === "function" ? clipItem.getMediaFilePath() : "";
    }, "") || "");
    const proxyPath = String(safeCall("proxy path", function getProxyPath() {
      return typeof clipItem.getProxyPath === "function" ? clipItem.getProxyPath() : "";
    }, "") || "");
    const hasProxy = Boolean(safeCall("has proxy", function hasProxyPath() {
      return typeof clipItem.hasProxy === "function" ? clipItem.hasProxy() : Boolean(proxyPath);
    }, Boolean(proxyPath)));
    const chosenPath = mediaPath || proxyPath;

    if (!chosenPath) {
      return null;
    }

    const footage = safeCall("footage interpretation", function getFootage() {
      return typeof clipItem.getFootageInterpretation === "function"
        ? clipItem.getFootageInterpretation()
        : null;
    }, null);
    const fps = Number(safeCall("frame rate", function getFrameRate() {
      return footage && typeof footage.getFrameRate === "function" ? footage.getFrameRate() : 0;
    }, 0)) || 0;
    const videoType = mediaTypeVideo(app);
    const inPoint = tickSeconds(safeCall("in point", function getIn() {
      return typeof clipItem.getInPoint === "function" ? clipItem.getInPoint(videoType) : null;
    }, null));
    const outPoint = tickSeconds(safeCall("out point", function getOut() {
      return typeof clipItem.getOutPoint === "function" ? clipItem.getOutPoint(videoType) : null;
    }, null));

    storedTargets.set(id, {
      kind: "projectItem",
      item: clipItem,
      projectItem,
      name
    });

    return {
      id,
      name,
      displayName: name,
      type: "clip",
      source: source || "premiere-project",
      filePath: chosenPath,
      mediaSourceKind: mediaPath ? "premiere-source-path" : "premiere-proxy",
      proxyPath: hasProxy ? proxyPath : "",
      columns: {
        "Premiere Source": source || "Project selection",
        "Media Path": mediaPath,
        "Proxy Path": proxyPath
      },
      inMark: inPoint,
      outMark: outPoint,
      fps,
      target: {
        id,
        kind: "projectItem",
        name
      }
    };
  }

  async function activeProject(app) {
    return app.Project.getActiveProject();
  }

  async function activeSequence(project) {
    if (!project || typeof project.getActiveSequence !== "function") {
      return null;
    }
    return project.getActiveSequence();
  }

  async function getProjectSummary() {
    const app = requirePremiere();
    const project = await activeProject(app);
    const sequence = await activeSequence(project);
    return {
      host: "premiere-uxp",
      projectName: project && project.name || "",
      projectPath: project && project.path || "",
      sequenceName: sequence && sequence.name || "",
      sequenceGuid: sequence && sequence.guid || "",
      timebase: sequence && typeof sequence.getTimebase === "function"
        ? safeCall("timebase", function timebase() {
          return sequence.getTimebase();
        }, "")
        : ""
    };
  }

  async function getProjectSelection(app, project) {
    if (!app.ProjectUtils || typeof app.ProjectUtils.getSelection !== "function") {
      return [];
    }
    const selection = app.ProjectUtils.getSelection(project);
    if (!selection || typeof selection.getItems !== "function") {
      return [];
    }
    return selection.getItems() || [];
  }

  async function getTimelineSelection(sequence) {
    if (!sequence || typeof sequence.getSelection !== "function") {
      return [];
    }
    const selection = sequence.getSelection();
    if (!selection || typeof selection.getTrackItems !== "function") {
      return [];
    }
    return selection.getTrackItems() || [];
  }

  async function getSelectedMediaTargets() {
    const app = requirePremiere();
    const project = await activeProject(app);
    const sequence = await activeSequence(project);
    if (!project) {
      throw new Error("Open a Premiere project first.");
    }

    const byId = new Map();
    const addTarget = function addTarget(target) {
      if (target && target.id && !byId.has(target.id)) {
        byId.set(target.id, target);
      }
    };

    const projectItems = await getProjectSelection(app, project);
    projectItems.forEach(function addProjectItem(projectItem) {
      addTarget(normalizeProjectItem(app, projectItem, "Premiere project selection"));
    });

    const trackItems = await getTimelineSelection(sequence);
    trackItems.forEach(function addTrackItem(trackItem, index) {
      const target = normalizeTimelineTrackItem(app, trackItem, sequence, index);
      addTarget(target);
    });

    return {
      project: {
        name: project.name || "",
        path: project.path || "",
        fps: sequence && typeof sequence.getTimebase === "function"
          ? Number(sequence.getTimebase()) || 0
          : 0
      },
      sequence: sequence ? {
        name: sequence.name || "",
        guid: sequence.guid || ""
      } : null,
      items: Array.from(byId.values())
    };
  }

  function markerDurationSeconds(marker) {
    const start = Number(marker && marker.startTime) || 0;
    const end = Number(marker && marker.endTime) || start;
    return Math.max(0.001, end - start);
  }

  function normalizeTimelineTrackItem(app, trackItem, sequence, selectionIndex) {
    const projectItem = safeCall("track project item", function getProjectItem() {
      return typeof trackItem.getProjectItem === "function" ? trackItem.getProjectItem() : null;
    }, null);
    const target = normalizeProjectItem(app, projectItem, "Premiere timeline selection");
    if (!target) {
      return null;
    }

    const trackStart = tickSeconds(safeCall("start time", function getStart() {
      return typeof trackItem.getStartTime === "function" ? trackItem.getStartTime() : null;
    }, null));
    const trackEnd = tickSeconds(safeCall("end time", function getEnd() {
      return typeof trackItem.getEndTime === "function" ? trackItem.getEndTime() : null;
    }, null));
    const sourceIn = tickSeconds(safeCall("in point", function getInPoint() {
      return typeof trackItem.getInPoint === "function" ? trackItem.getInPoint() : null;
    }, null));
    const trackIndex = safeCall("track index", function getTrackIndex() {
      return typeof trackItem.getTrackIndex === "function" ? trackItem.getTrackIndex() : null;
    }, null);
    const sequenceId = sequence && (sequence.guid || sequence.name) || "active-sequence";
    const timelineId = [
      target.id,
      sequenceId,
      trackIndex === null ? "track" : trackIndex,
      trackStart.toFixed(3),
      selectionIndex
    ].join(":");
    const timelineName = `${target.displayName || target.name} @ ${trackStart.toFixed(2)}s`;

    storedTargets.set(timelineId, {
      kind: "sequence",
      sequence,
      name: sequence && sequence.name || "active sequence",
      timeOffsetSeconds: trackStart - sourceIn
    });

    return {
      ...target,
      id: timelineId,
      displayName: timelineName,
      source: "premiere-timeline-selection",
      columns: {
        ...target.columns,
        "Premiere Source": "Premiere timeline selection",
        "Timeline Sequence": sequence && sequence.name || "",
        "Timeline Start": String(trackStart || 0),
        "Timeline End": String(trackEnd || 0),
        "Timeline Source In": String(sourceIn || 0)
      },
      timeline: {
        trackIndex,
        startTime: trackStart,
        endTime: trackEnd,
        sourceIn,
        selectionIndex
      },
      target: {
        id: timelineId,
        kind: "sequence",
        name: sequence && sequence.name || "active sequence",
        timeOffsetSeconds: trackStart - sourceIn
      }
    };
  }

  function markerTargetForTarget(target) {
    if (!target || !target.id) {
      return null;
    }
    const stored = storedTargets.get(target.id);
    if (!stored) {
      return null;
    }
    return {
      owner: stored.kind === "sequence" ? stored.sequence : stored.item,
      kind: stored.kind,
      timeOffsetSeconds: Number(stored.timeOffsetSeconds || target.timeOffsetSeconds) || 0
    };
  }

  async function applyMarkerGroups(groups) {
    const app = requirePremiere();
    const project = await activeProject(app);
    if (!project) {
      throw new Error("Open a Premiere project before applying markers.");
    }
    if (!app.Markers || !app.TickTime) {
      throw new Error("Premiere marker APIs are not available in this UXP host.");
    }

    const markerGroups = Array.isArray(groups) ? groups : [];
    let markerCount = 0;
    const missingTargets = [];
    const ok = project.executeTransaction(function addMarkMarkers(compoundAction) {
      markerGroups.forEach(function addGroup(group) {
        const markerTarget = markerTargetForTarget(group.target);
        if (!markerTarget || !markerTarget.owner) {
          missingTargets.push(group.target && group.target.name || "Premiere target");
          return;
        }
        const markerCollection = app.Markers.getMarkers(markerTarget.owner);
        (group.markers || []).forEach(function addMarker(marker, index) {
          const startSeconds = Math.max(0, (Number(marker.startTime) || 0) + markerTarget.timeOffsetSeconds);
          const start = app.TickTime.createWithSeconds(startSeconds);
          const duration = app.TickTime.createWithSeconds(markerDurationSeconds(marker));
          const action = markerCollection.createAddMarkerAction(
            marker.name || `Mark marker ${index + 1}`,
            marker.markerType || "Comment",
            start,
            duration,
            marker.comment || ""
          );
          compoundAction.addAction(action);
          markerCount += 1;
        });
      });
    }, "Apply Mark markers");

    if (missingTargets.length > 0) {
      throw new Error(`Could not resolve marker target: ${missingTargets.join(", ")}.`);
    }

    return {
      ok: Boolean(ok),
      count: markerCount
    };
  }

  async function applyMarkersToActiveSequence(markers) {
    const app = requirePremiere();
    const project = await activeProject(app);
    const sequence = await activeSequence(project);
    if (!sequence) {
      throw new Error("Open a Premiere project with an active sequence first.");
    }
    const id = sequence.guid || "active-sequence";
    storedTargets.set(id, {
      kind: "sequence",
      sequence,
      name: sequence.name || "active sequence"
    });
    return applyMarkerGroups([{
      target: {
        id,
        kind: "sequence",
        name: sequence.name || "active sequence"
      },
      markers
    }]);
  }

  function eventNames(app, key) {
    const names = [];
    if (app.EncoderManager && app.EncoderManager[key]) {
      names.push(app.EncoderManager[key]);
    }
    names.push(key);
    names.push(`EncoderManager.${key}`);
    return names.filter(Boolean);
  }

  function eventLooksLikeOutput(event, outputFile) {
    if (!event || !outputFile) {
      return true;
    }
    const text = JSON.stringify(event);
    return text.indexOf(outputFile) !== -1 || text.indexOf(outputFile.split("/").pop()) !== -1;
  }

  function waitForRender(app, outputFile, timeoutMs) {
    if (!app.EventManager || typeof app.EventManager.addGlobalEventListener !== "function") {
      return Promise.reject(new Error("Premiere render events are not available; Mark cannot wait for the proxy export."));
    }

    return new Promise(function wait(resolve, reject) {
      let settled = false;
      const cleanupFns = [];
      function settle(fn, value) {
        if (settled) {
          return;
        }
        settled = true;
        cleanupFns.forEach(function cleanup(cleanupFn) {
          cleanupFn();
        });
        fn(value);
      }
      function listen(names, handler) {
        names.forEach(function add(name) {
          try {
            app.EventManager.addGlobalEventListener(name, handler);
            cleanupFns.push(function remove() {
              try {
                app.EventManager.removeGlobalEventListener(name, handler);
              } catch (error) {}
            });
          } catch (error) {}
        });
      }
      listen(eventNames(app, "EVENT_RENDER_COMPLETE"), function complete(event) {
        if (eventLooksLikeOutput(event, outputFile)) {
          settle(resolve, event || {});
        }
      });
      listen(eventNames(app, "EVENT_RENDER_ERROR"), function error(event) {
        if (eventLooksLikeOutput(event, outputFile)) {
          settle(reject, new Error("Premiere failed to export the Mark proxy."));
        }
      });
      listen(eventNames(app, "EVENT_RENDER_CANCEL"), function cancel(event) {
        if (eventLooksLikeOutput(event, outputFile)) {
          settle(reject, new Error("Premiere proxy export was canceled."));
        }
      });
      global.setTimeout(function timeout() {
        settle(reject, new Error("Timed out waiting for Premiere proxy export."));
      }, timeoutMs || 20 * 60 * 1000);
    });
  }

  async function exportActiveSequenceProxy(options) {
    const app = requirePremiere();
    const project = await activeProject(app);
    const sequence = await activeSequence(project);
    if (!project || !sequence) {
      throw new Error("Open a Premiere project with an active sequence first.");
    }
    if (!app.EncoderManager || typeof app.EncoderManager.getManager !== "function") {
      throw new Error("Premiere EncoderManager is not available in this UXP host.");
    }

    const presetFile = String(options && options.presetFile || "").trim();
    const outputFile = String(options && options.outputFile || "").trim();
    if (!presetFile) {
      throw new Error("Set a Premiere/AME .epr proxy preset path in Mark settings before exporting a sequence proxy.");
    }
    if (!outputFile) {
      throw new Error("Mark could not determine a proxy export path.");
    }

    const manager = app.EncoderManager.getManager();
    if (manager && manager.isAMEInstalled === false) {
      throw new Error("Adobe Media Encoder is required for Premiere proxy export.");
    }

    const renderPromise = waitForRender(app, outputFile, options && options.timeoutMs);
    const exportType = app.constants && app.constants.ExportType && app.constants.ExportType.IMMEDIATELY !== undefined
      ? app.constants.ExportType.IMMEDIATELY
      : 0;
    const started = manager.exportSequence(sequence, exportType, outputFile, presetFile, true);
    if (!started) {
      throw new Error("Premiere did not start the proxy export.");
    }
    await renderPromise;

    const id = sequence.guid || "active-sequence";
    storedTargets.set(id, {
      kind: "sequence",
      sequence,
      name: sequence.name || "active sequence"
    });

    return {
      id,
      name: sequence.name || "active sequence",
      displayName: sequence.name || "active sequence",
      type: "sequence",
      source: "premiere-active-sequence-export",
      filePath: outputFile,
      mediaSourceKind: "premiere-sequence-export",
      columns: {
        "Premiere Source": "Active sequence export",
        "Sequence": sequence.name || "",
        "Preset": presetFile
      },
      target: {
        id,
        kind: "sequence",
        name: sequence.name || "active sequence"
      }
    };
  }

  global.markPremiereHost = {
    getProjectSummary,
    getSelectedMediaTargets,
    exportActiveSequenceProxy,
    applyMarkerGroups,
    applyMarkersToActiveSequence
  };
})(this);
