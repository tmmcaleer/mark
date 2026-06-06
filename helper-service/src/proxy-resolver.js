const fs = require("fs");
const path = require("path");

const config = require("./config");
const { MarkError } = require("./mark-error");

const DEFAULT_METHODS = ["sourceFile", "sourcePath", "clipName"];
const SOURCE_FILE_COLUMNS = [
  "source file",
  "source filename",
  "source name",
  "file name",
  "filename",
  "original filename"
];
const SOURCE_PATH_COLUMNS = [
  "source path",
  "source file path",
  "file path",
  "path",
  "original path"
];

function normalizeExtension(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) {
    return "";
  }
  return text.startsWith(".") ? text : `.${text}`;
}

function normalizeToken(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,8}$/i, "")
    .replace(/([._ -])(proxy|proresproxy|h264|h265|lowres|lores)$/i, "")
    .replace(/\b(proxy|proresproxy|h264|h265|lowres|lores)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function filenameStem(value) {
  return normalizeToken(path.basename(String(value || "")));
}

function normalizePathText(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .toLowerCase()
    .replace(/\/+/g, "/");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sourcePathValues(clip) {
  return columnValues(clip, SOURCE_PATH_COLUMNS);
}

function columnValues(clip, names) {
  const columns = clip && clip.columns && typeof clip.columns === "object" ? clip.columns : {};
  const normalizedNames = names.map(function normalize(name) {
    return name.toLowerCase();
  });
  return Object.keys(columns).filter(function selected(key) {
    return normalizedNames.indexOf(String(key).trim().toLowerCase()) !== -1;
  }).map(function value(key) {
    return String(columns[key] || "").trim();
  }).filter(Boolean);
}

function clipMatchNeedles(clip) {
  const sourceFiles = unique(columnValues(clip, SOURCE_FILE_COLUMNS).concat(
    columnValues(clip, SOURCE_PATH_COLUMNS).map(function basename(value) {
      return path.basename(value);
    })
  )).map(filenameStem);

  const sourcePaths = unique(columnValues(clip, SOURCE_PATH_COLUMNS)).map(normalizePathText);
  const clipNames = unique([
    clip && clip.name,
    clip && clip.displayName,
    clip && clip.mobName,
    clip && clip.columns && (clip.columns.Name || clip.columns.name)
  ].map(function stringify(value) {
    return String(value || "").trim();
  })).map(filenameStem);

  return {
    sourceFiles: unique(sourceFiles),
    sourcePaths: unique(sourcePaths),
    clipNames: unique(clipNames)
  };
}

function scoreCandidate(candidatePath, needles, methods) {
  const stem = filenameStem(candidatePath);
  const normalizedPath = normalizePathText(candidatePath);
  const matchedOn = [];
  let score = 0;

  if (methods.indexOf("sourceFile") !== -1) {
    needles.sourceFiles.forEach(function compare(needle) {
      if (needle && stem === needle) {
        score = Math.max(score, 0.98);
        matchedOn.push("sourceFile");
      } else if (needle && (stem.includes(needle) || needle.includes(stem))) {
        score = Math.max(score, 0.86);
        matchedOn.push("sourceFile");
      }
    });
  }

  if (methods.indexOf("sourcePath") !== -1) {
    needles.sourcePaths.forEach(function compare(sourcePath) {
      const sourceBase = filenameStem(sourcePath);
      if (sourceBase && stem === sourceBase) {
        score = Math.max(score, 0.96);
        matchedOn.push("sourcePath");
      } else if (sourcePath && normalizedPath.endsWith(sourcePath)) {
        score = Math.max(score, 0.92);
        matchedOn.push("sourcePath");
      }
    });
    if ((needles.sourcePathRoots || []).some(function inSourceRoot(root) {
      return isInsideOrSame(candidatePath, root);
    })) {
      needles.sourceFiles.forEach(function compare(needle) {
        if (needle && stem === needle) {
          score = Math.max(score, 0.96);
          matchedOn.push("sourcePath");
        } else if (needle && (stem.includes(needle) || needle.includes(stem))) {
          score = Math.max(score, 0.84);
          matchedOn.push("sourcePath");
        }
      });
      needles.clipNames.forEach(function compare(needle) {
        if (needle && stem === needle) {
          score = Math.max(score, 0.9);
          matchedOn.push("sourcePath");
        }
      });
    }
  }

  if (methods.indexOf("clipName") !== -1) {
    needles.clipNames.forEach(function compare(needle) {
      if (needle && stem === needle) {
        score = Math.max(score, 0.9);
        matchedOn.push("clipName");
      } else if (needle && (stem.includes(needle) || needle.includes(stem))) {
        score = Math.max(score, 0.78);
        matchedOn.push("clipName");
      }
    });
  }

  return {
    score,
    matchedOn: unique(matchedOn)
  };
}

function isInsideOrSame(filePath, rootPath) {
  const relative = path.relative(path.resolve(rootPath), path.resolve(filePath));
  return relative === "" || Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function scanRoot(root, options, results, warnings, depth) {
  if (depth > options.maxDepth || results.length >= options.scanLimit) {
    return;
  }

  let entries;
  try {
    entries = fs.readdirSync(root, {
      withFileTypes: true
    });
  } catch (error) {
    warnings.push(`Could not read ${root}: ${error.message}`);
    return;
  }

  for (const entry of entries) {
    if (results.length >= options.scanLimit) {
      return;
    }
    const fullPath = path.join(root, entry.name);
    if (!isInsideOrSame(fullPath, options.root)) {
      continue;
    }
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      scanRoot(fullPath, options, results, warnings, depth + 1);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const extension = path.extname(entry.name).toLowerCase();
    if (options.extensions.indexOf(extension) === -1) {
      continue;
    }
    results.push(fullPath);
  }
}

function directSourcePathRoots(clip, extensions, warnings) {
  const roots = [];
  sourcePathValues(clip).forEach(function addSourcePath(value) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return;
    }
    if (!path.isAbsolute(normalized)) {
      warnings.push(`Avid Source Path is not absolute: ${normalized}`);
      return;
    }
    const resolved = path.resolve(normalized);
    let stat;
    try {
      stat = fs.statSync(resolved);
    } catch (error) {
      warnings.push(`Avid Source Path not found: ${resolved}`);
      return;
    }
    if (stat.isDirectory()) {
      roots.push(resolved);
      return;
    }
    if (stat.isFile() && extensions.indexOf(path.extname(resolved).toLowerCase()) !== -1) {
      roots.push(path.dirname(resolved));
    }
  });
  return unique(roots);
}

function resolveProxy(body, options = {}) {
  const clip = body && body.clip && typeof body.clip === "object" ? body.clip : {};
  const roots = (body && Array.isArray(body.roots) ? body.roots : config.proxyRoots)
    .map(function clean(root) {
      return String(root || "").trim();
    })
    .filter(Boolean);
  const requestOptions = body && body.options && typeof body.options === "object" ? body.options : {};
  const methods = (Array.isArray(requestOptions.methods) ? requestOptions.methods : DEFAULT_METHODS)
    .filter(function known(method) {
      return DEFAULT_METHODS.indexOf(method) !== -1;
    });
  const extensions = (Array.isArray(requestOptions.extensions) ? requestOptions.extensions : config.proxyExtensions)
    .map(normalizeExtension)
    .filter(Boolean);
  const maxDepth = Math.max(0, Math.min(20, Number(requestOptions.maxDepth) || 8));
  const maxResults = Math.max(1, Math.min(100, Number(requestOptions.maxResults) || 20));
  const scanLimit = Math.max(maxResults, Math.min(50000, Number(requestOptions.scanLimit) || 10000));
  const maxBytes = options.maxDirectUploadBytes || config.maxDirectUploadBytes;
  const mediaPrepEnabled = options.mediaPrepEnabled !== undefined
    ? Boolean(options.mediaPrepEnabled)
    : config.mediaPrepEnabled;
  const warnings = [];

  const sourcePathRoots = methods.indexOf("sourcePath") !== -1
    ? directSourcePathRoots(clip, extensions, warnings)
    : [];
  const scanRoots = unique(roots.concat(sourcePathRoots));

  if (scanRoots.length === 0) {
    if (methods.indexOf("sourcePath") !== -1) {
      return {
        status: "not_found",
        selected: null,
        candidates: [],
        warnings
      };
    }
    throw new MarkError("At least one proxy root is required", {
      code: "MISSING_PROXY_ROOT",
      statusCode: 400
    });
  }

  if (methods.length === 0 || extensions.length === 0) {
    return {
      status: "not_found",
      selected: null,
      candidates: [],
      warnings
    };
  }

  const needles = {
    ...clipMatchNeedles(clip),
    sourcePathRoots
  };
  const files = [];
  scanRoots.forEach(function scanConfiguredRoot(root) {
    const resolvedRoot = path.resolve(root);
    let stat;
    try {
      stat = fs.statSync(resolvedRoot);
    } catch (error) {
      warnings.push(`Proxy root not found: ${resolvedRoot}`);
      return;
    }
    if (!stat.isDirectory()) {
      warnings.push(`Proxy root is not a directory: ${resolvedRoot}`);
      return;
    }
    scanRoot(resolvedRoot, {
      root: resolvedRoot,
      extensions,
      maxDepth: sourcePathRoots.indexOf(resolvedRoot) !== -1 ? Math.min(maxDepth, 1) : maxDepth,
      scanLimit
    }, files, warnings, 0);
  });

  const candidates = files.map(function toCandidate(filePath) {
    const match = scoreCandidate(filePath, needles, methods);
    if (match.score <= 0) {
      return null;
    }

    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (error) {
      return null;
    }
    if (!stat.isFile()) {
      return null;
    }
    const sourceKind = (sourcePathRoots || []).some(function inDirectSourceRoot(root) {
      return isInsideOrSame(filePath, root);
    }) ? "avid-source-path" : "repository-proxy";

    if (stat.size > maxBytes && !mediaPrepEnabled) {
      warnings.push(`${filePath} is above the TwelveLabs direct upload size limit`);
      return null;
    } else if (stat.size > maxBytes) {
      warnings.push(`${filePath} is above the TwelveLabs direct upload size limit and will be prepared by the helper`);
    }

    return {
      path: filePath,
      score: Number(match.score.toFixed(3)),
      matchedOn: match.matchedOn,
      sourceKind,
      size: stat.size,
      mtime: stat.mtime.toISOString()
    };
  }).filter(Boolean).sort(function byScore(a, b) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.mtime.localeCompare(a.mtime);
  }).slice(0, maxResults);

  if (candidates.length === 0) {
    return {
      status: "not_found",
      selected: null,
      candidates,
      warnings
    };
  }

  const top = candidates[0];
  const next = candidates[1];
  const isConfident = top.score >= 0.9 && (!next || top.score - next.score > 0.02);
  return {
    status: isConfident ? "matched" : "ambiguous",
    selected: isConfident ? {
      path: top.path,
      score: top.score,
      reason: top.matchedOn[0] || "match",
      sourceKind: top.sourceKind
    } : null,
    candidates,
    warnings
  };
}

module.exports = {
  clipMatchNeedles,
  resolveProxy,
  scoreCandidate
};
