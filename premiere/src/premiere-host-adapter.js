(function exposePremiereHost(global) {
  function requirePremiere() {
    if (typeof require !== "function") {
      throw new Error("Premiere UXP require() is not available");
    }
    return require("premierepro");
  }

  function activeProject(app) {
    return app.Project.getActiveProject();
  }

  async function activeSequence(app, project) {
    if (!project || typeof project.getActiveSequence !== "function") {
      return null;
    }
    return project.getActiveSequence();
  }

  async function getProjectSummary() {
    const app = requirePremiere();
    const project = await activeProject(app);
    const sequence = await activeSequence(app, project);

    return {
      host: "premiere-uxp",
      projectName: project && project.name || "",
      projectPath: project && project.path || "",
      sequenceName: sequence && sequence.name || "",
      sequenceGuid: sequence && sequence.guid || ""
    };
  }

  function markerDurationSeconds(marker) {
    const start = Number(marker && marker.startTime) || 0;
    const end = Number(marker && marker.endTime) || start;
    return Math.max(0.001, end - start);
  }

  async function applyMarkersToActiveSequence(markers) {
    const app = requirePremiere();
    const project = await activeProject(app);
    const sequence = await activeSequence(app, project);
    if (!project || !sequence) {
      throw new Error("Open a Premiere project with an active sequence first.");
    }
    if (!app.Markers || !app.TickTime) {
      throw new Error("Premiere marker APIs are not available in this UXP host.");
    }

    const markerList = Array.isArray(markers) ? markers : [];
    if (markerList.length === 0) {
      return {
        ok: true,
        count: 0,
        target: sequence.name || "active sequence"
      };
    }

    const sequenceMarkers = app.Markers.getMarkers(sequence);
    const ok = project.executeTransaction(function addMarkMarkers(compoundAction) {
      markerList.forEach(function addMarker(marker, index) {
        const start = app.TickTime.createWithSeconds(Number(marker.startTime) || 0);
        const duration = app.TickTime.createWithSeconds(markerDurationSeconds(marker));
        const action = sequenceMarkers.createAddMarkerAction(
          marker.name || `Mark marker ${index + 1}`,
          marker.markerType || "Comment",
          start,
          duration,
          marker.comment || ""
        );
        compoundAction.addAction(action);
      });
    }, "Apply Mark markers");

    return {
      ok: Boolean(ok),
      count: markerList.length,
      target: sequence.name || "active sequence"
    };
  }

  global.markPremiereHost = {
    getProjectSummary,
    applyMarkersToActiveSequence
  };
})(this);
