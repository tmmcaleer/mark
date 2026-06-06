const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const manifest = JSON.parse(fs.readFileSync(
  path.join(__dirname, "../manifest.json"),
  "utf8"
));

test("Premiere manifest targets UXP panel host", function () {
  assert.equal(manifest.manifestVersion, 5);
  assert.equal(manifest.host.app, "premierepro");
  assert.equal(manifest.host.minVersion, "25.6.0");
  assert.equal(manifest.main, "src/index.html");
  assert.equal(manifest.entrypoints[0].type, "panel");
});

test("Premiere manifest allows the shared local helper origins", function () {
  const domains = manifest.requiredPermissions.network.domains;

  assert.deepEqual(domains, [
    "http://localhost:4500",
    "http://127.0.0.1:4500"
  ]);
  domains.forEach(function assertOrigin(domain) {
    assert.match(domain, /^https?:\/\//);
  });
});
