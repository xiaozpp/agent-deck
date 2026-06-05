import test from "node:test";
import assert from "node:assert/strict";

import { shouldOpenDevTools } from "../electron/windowPolicy.cjs";
import { appRoot, distIndexPath } from "../electron/appPaths.cjs";

test("devtools stay closed by default and require an explicit opt-in", () => {
  assert.equal(shouldOpenDevTools({}), false);
  assert.equal(shouldOpenDevTools({ TOOL_MASTER_OPEN_DEVTOOLS: "0" }), false);
  assert.equal(shouldOpenDevTools({ TOOL_MASTER_OPEN_DEVTOOLS: "1" }), true);
});

test("packaged app loads renderer from app.asar, not resources root", () => {
  const fakePackagedApp = {
    isPackaged: true,
    getAppPath: () => "C:\\Apps\\Agent Deck\\resources\\app.asar",
  };
  const root = appRoot(fakePackagedApp, "C:\\repo\\electron");

  assert.equal(root, "C:\\Apps\\Agent Deck\\resources\\app.asar");
  assert.equal(distIndexPath(root), "C:\\Apps\\Agent Deck\\resources\\app.asar\\dist\\index.html");
});

test("development app loads renderer from project root", () => {
  const fakeDevApp = {
    isPackaged: false,
    getAppPath: () => "unused",
  };

  assert.equal(appRoot(fakeDevApp, "C:\\repo\\electron"), "C:\\repo");
});
