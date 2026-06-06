export const PROXY_MATCH_METHODS = ["sourceFile", "sourcePath", "clipName"];
export const DEFAULT_AVID_METADATA_COLUMNS = [
  "Name",
  "Comments",
  "Scene",
  "Take",
  "Tape",
  "Source File",
  "Source Path",
  "Shoot Date"
];

const MAX_PROMPT_CONTEXT_COLUMNS = 12;
const MAX_PROMPT_CONTEXT_VALUE_LENGTH = 300;

export function normalizeMobColumns(entries) {
  const columns = {};
  (entries || []).forEach(function addColumn(entry) {
    const name = String(entry && (entry.name || entry.columnName) || "").trim();
    const value = String(entry && (entry.value || entry.columnValue) || "").trim();
    if (!name || !value || columns[name]) {
      return;
    }
    columns[name] = value;
  });
  return columns;
}

export function normalizeProxyRoots(value, fallback) {
  const text = String(value || "").trim();
  const source = text || (Array.isArray(fallback) ? fallback.join("\n") : "");
  return source.split(/[\n,]+/)
    .map(function clean(root) {
      return root.trim();
    })
    .filter(Boolean);
}

export function normalizeProxyMatchMethods(methods) {
  const selected = new Set(Array.isArray(methods) ? methods : []);
  const normalized = PROXY_MATCH_METHODS.filter(function include(method) {
    return selected.has(method);
  });
  return normalized.length > 0 ? normalized : PROXY_MATCH_METHODS.slice();
}

export function buildClipProxyMetadata(asset) {
  const columns = asset && asset.columns && typeof asset.columns === "object" ? asset.columns : {};
  return {
    mobId: asset && asset.id || "",
    name: asset && asset.name || "",
    displayName: asset && asset.displayName || "",
    mobName: asset && asset.mobName || "",
    type: asset && asset.type || "clip",
    head: asset && asset.head,
    inMark: asset && asset.inMark,
    outMark: asset && asset.outMark,
    systemId: asset && asset.systemId || "",
    systemType: asset && asset.systemType || "",
    columns
  };
}

function cleanPromptContextText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeMetadataColumnSelection(columns) {
  const selected = Array.isArray(columns) ? columns : [];
  const seen = new Set();
  return selected.map(function cleanColumn(column) {
    return cleanPromptContextText(column, 80);
  }).filter(function uniqueColumn(column) {
    const key = column.toLowerCase();
    if (!column || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, MAX_PROMPT_CONTEXT_COLUMNS);
}

export function availableAvidMetadataColumns(assets, fallbackColumns = DEFAULT_AVID_METADATA_COLUMNS) {
  const byLowerName = new Map();
  (fallbackColumns || []).forEach(function addFallback(column) {
    const name = cleanPromptContextText(column, 80);
    if (name && !byLowerName.has(name.toLowerCase())) {
      byLowerName.set(name.toLowerCase(), name);
    }
  });
  (assets || []).forEach(function addAssetColumns(asset) {
    const columns = asset && asset.columns && typeof asset.columns === "object" ? asset.columns : {};
    Object.keys(columns).forEach(function addColumn(column) {
      const name = cleanPromptContextText(column, 80);
      if (name && !byLowerName.has(name.toLowerCase())) {
        byLowerName.set(name.toLowerCase(), name);
      }
    });
  });
  return Array.from(byLowerName.values()).sort(function byName(left, right) {
    return left.localeCompare(right, undefined, { sensitivity: "base" });
  });
}

export function buildPromptContextFromAsset(asset, selectedColumns) {
  const columns = asset && asset.columns && typeof asset.columns === "object" ? asset.columns : {};
  const contextColumns = {};
  normalizeMetadataColumnSelection(selectedColumns).forEach(function addContextColumn(column) {
    const matchedKey = Object.keys(columns).find(function sameColumn(key) {
      return key.toLowerCase() === column.toLowerCase();
    });
    if (!matchedKey) {
      return;
    }
    const value = cleanPromptContextText(columns[matchedKey], MAX_PROMPT_CONTEXT_VALUE_LENGTH);
    if (value) {
      contextColumns[matchedKey] = value;
    }
  });
  return {
    columns: contextColumns
  };
}
