export const ACTIVE_QUEUE_STATUSES = [
  "queued",
  "resolvingProxy",
  "exporting",
  "proxyReady",
  "analyzing"
];

export function isActiveQueueStatus(status) {
  return ACTIVE_QUEUE_STATUSES.indexOf(String(status || "")) !== -1;
}

export function activeQueueItemCount(items) {
  return (items || []).filter(function active(item) {
    return isActiveQueueStatus(item && item.status);
  }).length;
}

export function queueStatusKind(status) {
  const normalized = String(status || "").trim();
  if (normalized === "ready") {
    return "ready";
  }
  if (normalized === "failed") {
    return "failed";
  }
  if (isActiveQueueStatus(normalized)) {
    return "processing";
  }
  return "idle";
}

export function queueStatusLabel(status) {
  switch (String(status || "")) {
    case "queued":
      return "Queued";
    case "resolvingProxy":
      return "Finding proxy";
    case "exporting":
      return "Exporting proxy";
    case "proxyReady":
      return "Starting analysis";
    case "analyzing":
      return "Analyzing";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return "Idle";
  }
}

export function cloneQueueValue(value) {
  if (value === undefined || value === null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

export function createQueueItem(asset, options = {}) {
  const now = options.now || new Date().toISOString();
  const id = options.id || `queue_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const workflowMode = options.workflowMode === "subclips" ? "subclips" : "markers";
  const snapshot = cloneQueueValue(asset) || {};

  return {
    id,
    createdAt: now,
    updatedAt: now,
    status: "queued",
    progress: 5,
    message: "Queued",
    prompt: String(options.prompt || "").trim(),
    workflowMode,
    options: cloneQueueValue(options.options || {}),
    project: cloneQueueValue(options.project || null),
    config: cloneQueueValue(options.config || null),
    asset: {
      ...snapshot,
      status: "queued",
      message: "Queued",
      exportTaskId: null,
      helperJobId: null,
      helperDebugEventCount: 0,
      exportPath: null,
      proxySource: null,
      proxyCandidates: null,
      proxyLookupMessage: "",
      markers: [],
      subclips: [],
      applied: false,
      error: null,
      reviewCompletionOrder: null
    },
    helperJobId: null,
    helperDebugEventCount: 0,
    exportTaskId: null,
    exportPath: null,
    proxySource: null,
    proxyCandidates: null,
    proxyLookupMessage: "",
    error: null
  };
}

export function removeCompletedQueueItems(items) {
  return (items || []).filter(function keep(item) {
    return !(item && item.status === "ready" && item.asset && item.asset.applied);
  });
}
