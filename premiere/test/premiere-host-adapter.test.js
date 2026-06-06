const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const adapterSource = fs.readFileSync(
  path.join(__dirname, "../src/premiere-host-adapter.js"),
  "utf8"
);

function tick(seconds) {
  return {
    seconds
  };
}

function runAdapter(app) {
  const context = {
    console,
    setTimeout,
    require(moduleName) {
      if (moduleName === "premierepro") {
        return app;
      }
      throw new Error(`Unexpected module: ${moduleName}`);
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(adapterSource, context);
  return context.markPremiereHost;
}

test("timeline selections write marker proposals to sequence time", async function () {
  const addedActions = [];
  const clipProjectItem = {
    name: "Interview A",
    getId: () => "clip-1",
    getMediaFilePath: () => "/media/interview-a.mov",
    getProxyPath: () => "",
    hasProxy: () => false,
    getFootageInterpretation: () => ({
      getFrameRate: () => 23.976
    }),
    getInPoint: () => tick(0),
    getOutPoint: () => tick(30)
  };
  const sequence = {
    guid: "sequence-1",
    name: "Scene selects",
    getTimebase: () => "23.976",
    getSelection: () => ({
      getTrackItems: () => [{
        getProjectItem: () => clipProjectItem,
        getTrackIndex: () => 0,
        getStartTime: () => tick(10),
        getEndTime: () => tick(20),
        getInPoint: () => tick(2)
      }]
    })
  };
  const project = {
    name: "Premiere Test",
    path: "/projects/test.prproj",
    getActiveSequence: () => sequence,
    executeTransaction(callback) {
      callback({
        addAction(action) {
          addedActions.push(action);
        }
      });
      return true;
    }
  };
  const app = {
    Project: {
      getActiveProject: () => project
    },
    ProjectUtils: {
      getSelection: () => ({
        getItems: () => []
      })
    },
    ClipProjectItem: {
      cast: (item) => item
    },
    TickTime: {
      createWithSeconds: tick
    },
    Markers: {
      getMarkers(owner) {
        assert.equal(owner, sequence);
        return {
          createAddMarkerAction(name, markerType, start, duration, comments) {
            return {
              name,
              markerType,
              start,
              duration,
              comments
            };
          }
        };
      }
    },
    constants: {
      MediaType: {
        VIDEO: 1
      }
    }
  };

  const host = runAdapter(app);
  const selection = await host.getSelectedMediaTargets();

  assert.equal(selection.items.length, 1);
  assert.equal(selection.items[0].target.kind, "sequence");
  assert.equal(selection.items[0].timeline.startTime, 10);
  assert.equal(selection.items[0].timeline.sourceIn, 2);

  const result = await host.applyMarkerGroups([{
    target: selection.items[0].target,
    markers: [{
      name: "Good answer",
      comment: "strong line",
      startTime: 3,
      endTime: 5
    }]
  }]);

  assert.equal(result.ok, true);
  assert.equal(result.count, 1);
  assert.equal(addedActions.length, 1);
  assert.equal(addedActions[0].start.seconds, 11);
  assert.equal(addedActions[0].duration.seconds, 2);
});

test("project selections write marker proposals to the selected project item", async function () {
  const addedActions = [];
  const clipProjectItem = {
    name: "B-roll",
    getId: () => "clip-2",
    getMediaFilePath: () => "/media/broll.mov",
    getProxyPath: () => "",
    hasProxy: () => false,
    getFootageInterpretation: () => null,
    getInPoint: () => tick(0),
    getOutPoint: () => tick(12)
  };
  const project = {
    name: "Premiere Test",
    path: "/projects/test.prproj",
    getActiveSequence: () => null,
    executeTransaction(callback) {
      callback({
        addAction(action) {
          addedActions.push(action);
        }
      });
      return true;
    }
  };
  const app = {
    Project: {
      getActiveProject: () => project
    },
    ProjectUtils: {
      getSelection: () => ({
        getItems: () => [clipProjectItem]
      })
    },
    ClipProjectItem: {
      cast: (item) => item
    },
    TickTime: {
      createWithSeconds: tick
    },
    Markers: {
      getMarkers(owner) {
        assert.equal(owner, clipProjectItem);
        return {
          createAddMarkerAction(name, markerType, start, duration, comments) {
            return {
              name,
              markerType,
              start,
              duration,
              comments
            };
          }
        };
      }
    },
    constants: {
      MediaType: {
        VIDEO: 1
      }
    }
  };

  const host = runAdapter(app);
  const selection = await host.getSelectedMediaTargets();

  assert.equal(selection.items.length, 1);
  assert.equal(selection.items[0].target.kind, "projectItem");

  await host.applyMarkerGroups([{
    target: selection.items[0].target,
    markers: [{
      name: "Cutaway",
      startTime: 4,
      endTime: 6
    }]
  }]);

  assert.equal(addedActions[0].start.seconds, 4);
  assert.equal(addedActions[0].duration.seconds, 2);
});
