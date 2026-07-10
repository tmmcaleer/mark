const MAX_CONTEXT_COLUMNS = 12;
const MAX_CONTEXT_NAME_LENGTH = 80;
const MAX_CONTEXT_VALUE_LENGTH = 300;

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function promptContextEntries(input) {
  if (Array.isArray(input)) {
    return input.map(function mapEntry(entry) {
      return [
        entry && (entry.name || entry.columnName),
        entry && (entry.value || entry.columnValue)
      ];
    });
  }
  if (input && typeof input === "object") {
    return Object.keys(input).map(function mapKey(key) {
      return [key, input[key]];
    });
  }
  return [];
}

function normalizePromptContext(value) {
  const source = value && typeof value === "object" ? value : {};
  const columns = {};
  const rawColumns = source.columns || source.avidColumns || source.metadata || {};

  promptContextEntries(rawColumns).forEach(function addColumn(pair) {
    if (Object.keys(columns).length >= MAX_CONTEXT_COLUMNS) {
      return;
    }
    const name = cleanText(pair[0], MAX_CONTEXT_NAME_LENGTH);
    const columnValue = cleanText(pair[1], MAX_CONTEXT_VALUE_LENGTH);
    if (!name || !columnValue || columns[name]) {
      return;
    }
    columns[name] = columnValue;
  });

  return {
    columns
  };
}

function formatPromptContext(value) {
  const context = normalizePromptContext(value);
  const pairs = Object.keys(context.columns).map(function formatPair(name) {
    return `${name}: ${context.columns[name]}`;
  });
  if (pairs.length === 0) {
    return "";
  }
  return `Known Avid metadata for this source clip: ${pairs.join("; ")}. Use this as context when deciding relevance, but only mark visible or audible moments in the video.`;
}

function userMetadataKey(name, used) {
  const base = `avid_${cleanText(name, MAX_CONTEXT_NAME_LENGTH)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "column"}`.slice(0, 64);
  let key = base;
  let suffix = 2;
  while (used.has(key)) {
    const suffixText = `_${suffix}`;
    key = `${base.slice(0, 64 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  used.add(key);
  return key;
}

function promptContextUserMetadata(value) {
  const context = normalizePromptContext(value);
  const used = new Set();
  return Object.keys(context.columns).reduce(function collect(metadata, name) {
    metadata[userMetadataKey(name, used)] = context.columns[name];
    return metadata;
  }, {});
}

module.exports = {
  formatPromptContext,
  normalizePromptContext,
  promptContextUserMetadata
};
