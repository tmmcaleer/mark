#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node scripts/bump-version.js X.Y.Z");
  process.exit(1);
}

const repo = path.resolve(__dirname, "..");
const jsonFiles = [
  path.join(repo, "panel", "package.json"),
  path.join(repo, "helper-service", "package.json"),
  path.join(repo, "panel", "resource", "avid-manifest.json")
];

const lockFiles = [
  path.join(repo, "panel", "package-lock.json"),
  path.join(repo, "helper-service", "package-lock.json")
];

for (const filePath of jsonFiles) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  data.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`updated ${path.relative(repo, filePath)} -> ${version}`);
}

for (const filePath of lockFiles) {
  if (!fs.existsSync(filePath)) {
    continue;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  data.version = version;
  if (data.packages && data.packages[""]) {
    data.packages[""].version = version;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`updated ${path.relative(repo, filePath)} -> ${version}`);
}
