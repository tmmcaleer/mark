const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { resolveProxy } = require("../src/proxy-resolver");

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mark-proxy-resolver-"));
}

test("resolves a nested proxy by source filename", function () {
  const root = tempRoot();
  const nested = path.join(root, "day-01", "cam-a");
  fs.mkdirSync(nested, {
    recursive: true
  });
  const proxyPath = path.join(nested, "A001_C003_proxy.mp4");
  fs.writeFileSync(proxyPath, "proxy");

  try {
    const result = resolveProxy({
      clip: {
        columns: {
          "Source File": "A001_C003.mov"
        }
      },
      roots: [root],
      options: {
        methods: ["sourceFile"]
      }
    });

    assert.equal(result.status, "matched");
    assert.equal(result.selected.path, proxyPath);
    assert.equal(result.candidates[0].matchedOn.includes("sourceFile"), true);
  } finally {
    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});

test("falls back to clip-name matching", function () {
  const root = tempRoot();
  const proxyPath = path.join(root, "Interview_Bob.mp4");
  fs.writeFileSync(proxyPath, "proxy");

  try {
    const result = resolveProxy({
      clip: {
        name: "Interview Bob"
      },
      roots: [root],
      options: {
        methods: ["clipName"]
      }
    });

    assert.equal(result.status, "matched");
    assert.equal(result.selected.reason, "clipName");
  } finally {
    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});

test("uses Avid Source Path directly without configured proxy roots", function () {
  const sourceDirectory = tempRoot();
  const proxyPath = path.join(sourceDirectory, "A001_C003.mp4");
  fs.writeFileSync(proxyPath, "proxy");

  try {
    const result = resolveProxy({
      clip: {
        columns: {
          "Source Path": sourceDirectory,
          "Source File": "A001_C003.mov"
        }
      },
      roots: [],
      options: {
        methods: ["sourcePath"]
      }
    });

    assert.equal(result.status, "matched");
    assert.equal(result.selected.path, proxyPath);
    assert.equal(result.selected.reason, "sourcePath");
  } finally {
    fs.rmSync(sourceDirectory, {
      recursive: true,
      force: true
    });
  }
});

test("reports ambiguous duplicate proxy candidates", function () {
  const root = tempRoot();
  fs.mkdirSync(path.join(root, "a"));
  fs.mkdirSync(path.join(root, "b"));
  fs.writeFileSync(path.join(root, "a", "A001_C003.mp4"), "proxy");
  fs.writeFileSync(path.join(root, "b", "A001_C003.mov"), "proxy");

  try {
    const result = resolveProxy({
      clip: {
        columns: {
          "Source File": "A001_C003.mov"
        }
      },
      roots: [root],
      options: {
        methods: ["sourceFile"]
      }
    });

    assert.equal(result.status, "ambiguous");
    assert.equal(result.selected, null);
    assert.equal(result.candidates.length, 2);
  } finally {
    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});

test("filters extensions, depth, oversize files, and symlink escapes", function () {
  const root = tempRoot();
  const outside = tempRoot();
  fs.mkdirSync(path.join(root, "too-deep", "level-2"), {
    recursive: true
  });
  fs.writeFileSync(path.join(root, "A001_C003.txt"), "proxy");
  fs.writeFileSync(path.join(root, "A001_C003.mp4"), Buffer.alloc(32));
  fs.writeFileSync(path.join(root, "too-deep", "level-2", "A001_C003.mov"), "proxy");
  fs.writeFileSync(path.join(outside, "A001_C003.mov"), "proxy");
  fs.symlinkSync(outside, path.join(root, "outside-link"));

  try {
    const result = resolveProxy({
      clip: {
        columns: {
          "Source File": "A001_C003.mov"
        }
      },
      roots: [root],
      options: {
        methods: ["sourceFile"],
        extensions: [".mp4"],
        maxDepth: 1
      }
    }, {
      maxDirectUploadBytes: 8,
      mediaPrepEnabled: false
    });

    assert.equal(result.status, "not_found");
    assert.equal(result.candidates.length, 0);
    assert.equal(result.warnings.some(function hasSizeWarning(warning) {
      return warning.includes("direct upload size limit");
    }), true);
  } finally {
    fs.rmSync(root, {
      recursive: true,
      force: true
    });
    fs.rmSync(outside, {
      recursive: true,
      force: true
    });
  }
});

test("does not treat Avid Drive column as a source path", function () {
  const result = resolveProxy({
    clip: {
      columns: {
        Drive: "MEDIA_E2E",
        "Source File": "A001_C003.mov"
      }
    },
    roots: [],
    options: {
      methods: ["sourcePath"]
    }
  });

  assert.equal(result.status, "not_found");
  assert.equal(result.warnings.some(function hasBogusResolvedPath(warning) {
    return warning.includes(path.join(process.cwd(), "MEDIA_E2E"));
  }), false);
});

test("does not direct-scan relative Avid Source Path values", function () {
  const result = resolveProxy({
    clip: {
      columns: {
        "Source Path": "MEDIA_E2E",
        "Source File": "A001_C003.mov"
      }
    },
    roots: [],
    options: {
      methods: ["sourcePath"]
    }
  });

  assert.equal(result.status, "not_found");
  assert.equal(result.warnings.some(function hasRelativeWarning(warning) {
    return warning === "Avid Source Path is not absolute: MEDIA_E2E";
  }), true);
});

test("keeps oversized matches when media prep is enabled", function () {
  const root = tempRoot();
  const proxyPath = path.join(root, "A001_C003.mp4");
  fs.writeFileSync(proxyPath, Buffer.alloc(32));

  try {
    const result = resolveProxy({
      clip: {
        columns: {
          "Source File": "A001_C003.mov"
        }
      },
      roots: [root],
      options: {
        methods: ["sourceFile"],
        extensions: [".mp4"]
      }
    }, {
      maxDirectUploadBytes: 8,
      mediaPrepEnabled: true
    });

    assert.equal(result.status, "matched");
    assert.equal(result.selected.path, proxyPath);
    assert.equal(result.selected.sourceKind, "repository-proxy");
    assert.equal(result.warnings.some(function hasPrepWarning(warning) {
      return warning.includes("will be prepared by the helper");
    }), true);
  } finally {
    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});
