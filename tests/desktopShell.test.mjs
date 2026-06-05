import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("Electron shell includes tray and app icon assets", () => {
  const main = fs.readFileSync(path.join(root, "electron", "main.cjs"), "utf8");
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

  assert.match(main, /\bTray\b/);
  assert.match(main, /createTray/);
  assert.match(main, /setContextMenu/);
  assert.match(main, /icon:\s*appIconPath\(\)/);
  assert.equal(fs.existsSync(path.join(root, "build", "icon.ico")), true);
  assert.equal(fs.existsSync(path.join(root, "build", "icon.png")), true);
  assert.equal(pkg.build.icon, "build/icon.ico");
  assert.equal(pkg.build.win.icon, "build/icon.ico");
  assert.ok(pkg.build.files.includes("build/icon.ico"));
  assert.ok(pkg.build.files.includes("build/icon.png"));
});
