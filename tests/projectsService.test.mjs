import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const servicePath = path.join(root, "electron", "services", "projectsService.cjs");

function runService(env) {
  const script = `
    const svc = require(${JSON.stringify(servicePath)});
    process.stdout.write(JSON.stringify(svc.listProjects()));
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("projects service treats missing default ~/projects as empty first-run state", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-home-"));
  const result = runService({
    USERPROFILE: home,
    HOME: home,
    TOOL_MASTER_WORK_ROOT: "",
  });

  assert.equal(result.available, true);
  assert.deepEqual(result.projects, []);
  assert.equal(result.root, path.join(home, "projects"));
});

test("projects service reports missing explicit work root", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-home-"));
  const missingRoot = path.join(home, "missing-workspace");
  const result = runService({
    USERPROFILE: home,
    HOME: home,
    TOOL_MASTER_WORK_ROOT: missingRoot,
  });

  assert.equal(result.available, false);
  assert.equal(result.root, missingRoot);
});
