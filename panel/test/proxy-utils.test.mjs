import test from "node:test";
import assert from "node:assert/strict";

import {
  availableAvidMetadataColumns,
  buildPromptContextFromAsset,
  buildClipProxyMetadata,
  normalizeMobColumns,
  normalizeMetadataColumnSelection,
  normalizeProxyMatchMethods,
  normalizeProxyRoots
} from "../src/js/proxy-utils.mjs";

test("normalizes non-empty mob columns without overwriting first values", function () {
  assert.deepEqual(normalizeMobColumns([
    { name: "Name", value: "Clip A" },
    { name: "Name", value: "Clip B" },
    { name: "Source File", value: "A001.mov" },
    { name: "Empty", value: "" }
  ]), {
    Name: "Clip A",
    "Source File": "A001.mov"
  });
});

test("normalizes proxy roots from text or fallback config", function () {
  assert.deepEqual(normalizeProxyRoots("/Volumes/A\n/Volumes/B, /Volumes/C"), [
    "/Volumes/A",
    "/Volumes/B",
    "/Volumes/C"
  ]);
  assert.deepEqual(normalizeProxyRoots("", ["/Volumes/Fallback"]), ["/Volumes/Fallback"]);
});

test("normalizes proxy match methods to known defaults", function () {
  assert.deepEqual(normalizeProxyMatchMethods(["clipName", "bogus"]), ["clipName"]);
  assert.deepEqual(normalizeProxyMatchMethods([]), ["sourceFile", "sourcePath", "clipName"]);
});

test("builds helper proxy metadata from selected asset state", function () {
  assert.deepEqual(buildClipProxyMetadata({
    id: "mob-id",
    name: "Clip",
    displayName: "Clip Display",
    mobName: "Mob",
    type: "masterclip",
    head: 10,
    inMark: 20,
    outMark: 30,
    systemId: "system-id",
    systemType: "mc",
    columns: {
      Name: "Clip"
    }
  }), {
    mobId: "mob-id",
    name: "Clip",
    displayName: "Clip Display",
    mobName: "Mob",
    type: "masterclip",
    head: 10,
    inMark: 20,
    outMark: 30,
    systemId: "system-id",
    systemType: "mc",
    columns: {
      Name: "Clip"
    }
  });
});

test("builds Avid metadata prompt context from selected non-empty columns", function () {
  const asset = {
    columns: {
      Name: "Interview A",
      Scene: "  Exterior   alley  ",
      Empty: "",
      Notes: "A".repeat(400)
    }
  };

  assert.deepEqual(buildPromptContextFromAsset(asset, ["scene", "Empty", "Notes"]), {
    columns: {
      Scene: "Exterior alley",
      Notes: "A".repeat(300)
    }
  });
});

test("normalizes metadata column selection and available column options", function () {
  assert.deepEqual(normalizeMetadataColumnSelection([" Scene ", "scene", "", "Take"]), [
    "Scene",
    "Take"
  ]);
  assert.deepEqual(availableAvidMetadataColumns([
    {
      columns: {
        "Custom Tag": "hero",
        Scene: "12"
      }
    }
  ], ["Name"]), [
    "Custom Tag",
    "Name",
    "Scene"
  ]);
});
