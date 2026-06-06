import test from "node:test";
import assert from "node:assert/strict";

import {
  activeQueueItemCount,
  createQueueItem,
  queueStatusKind,
  queueStatusLabel,
  removeCompletedQueueItems
} from "../src/js/queue-utils.mjs";

test("creates session queue items from selected assets", function () {
  const item = createQueueItem({
    id: "mob-1",
    displayName: "Interview A",
    markers: [{ id: "old" }]
  }, {
    id: "queue-1",
    now: "2026-05-29T12:00:00.000Z",
    prompt: "  strong reactions ",
    workflowMode: "subclips",
    options: {
      metadataColumns: ["Scene"]
    },
    project: {
      fps: 23.976
    }
  });

  assert.equal(item.id, "queue-1");
  assert.equal(item.prompt, "strong reactions");
  assert.equal(item.workflowMode, "subclips");
  assert.equal(item.status, "queued");
  assert.equal(item.asset.status, "queued");
  assert.deepEqual(item.asset.markers, []);
  assert.deepEqual(item.options.metadataColumns, ["Scene"]);
  assert.deepEqual(item.project, { fps: 23.976 });
});

test("counts active queue rows for badge display", function () {
  assert.equal(activeQueueItemCount([
    { status: "queued" },
    { status: "analyzing" },
    { status: "ready" },
    { status: "failed" }
  ]), 2);
});

test("maps queue statuses to compact UI kinds and labels", function () {
  assert.equal(queueStatusKind("queued"), "processing");
  assert.equal(queueStatusKind("proxyReady"), "processing");
  assert.equal(queueStatusKind("ready"), "ready");
  assert.equal(queueStatusKind("failed"), "failed");
  assert.equal(queueStatusKind("missing"), "idle");
  assert.equal(queueStatusLabel("resolvingProxy"), "Finding proxy");
  assert.equal(queueStatusLabel("failed"), "Failed");
});

test("removes applied ready queue rows without removing failed history", function () {
  const items = removeCompletedQueueItems([
    { id: "applied", status: "ready", asset: { applied: true } },
    { id: "ready", status: "ready", asset: { applied: false } },
    { id: "failed", status: "failed", asset: { applied: true } }
  ]);

  assert.deepEqual(items.map(function ids(item) {
    return item.id;
  }), ["ready", "failed"]);
});
