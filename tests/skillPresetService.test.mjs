import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-skills-"));
process.env.TOOL_MASTER_HOME = home;

const {
  installSkillPreset,
  listSkillPresets,
  listSkills,
  readSkill,
} = require("../electron/services/skillsService.cjs");
const {
  exportLocalSkillPresets,
  importLocalSkillPresets,
} = require("../electron/services/skills/presetCatalog.cjs");

test("skill presets expose preview bodies without leaking filesystem paths", () => {
  const presets = listSkillPresets();
  const preset = presets.find((item) => item.id === "commit-helper");

  assert.ok(preset);
  assert.equal(Object.hasOwn(preset, "path"), false);
  assert.match(preset.body, /# Commit Helper/);
});

test("skill preset install writes a personal SKILL.md for the chosen agent", () => {
  const result = installSkillPreset("codex", "commit-helper");

  assert.equal(result.ok, true);
  assert.equal(result.path, path.join(home, ".codex", "skills", "commit-helper", "SKILL.md"));
  assert.equal(fs.existsSync(result.path), true);

  const detail = readSkill(result.path);
  assert.equal(detail.name, "commit-helper");
  assert.match(detail.description, /commit messages/);
  assert.match(detail.body, /# Commit Helper/);

  const skills = listSkills().skills.filter((skill) => skill.source === "codex");
  assert.equal(skills.some((skill) => skill.name === "commit-helper"), true);
});

test("skill preset install rejects unknown presets", () => {
  assert.throws(() => installSkillPreset("codex", "missing-preset"), /Unknown skill preset/);
});

test("skill presets can be extended from config/skill-presets markdown files", () => {
  const dir = path.resolve("config", "skill-presets");
  const file = path.join(dir, "local-test.md");
  const previous = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, [
    "---",
    "id: local-test-skill",
    "name: local-test-skill",
    "title: Local Test Skill",
    "author: local",
    "category: Local",
    "description: Local markdown preset",
    "---",
    "# Local Test Skill",
    "",
    "Use this for local testing.",
  ].join("\n"), "utf8");

  try {
    const local = listSkillPresets().find((preset) => preset.id === "local-test-skill");
    assert.ok(local);
    assert.equal(local.name, "local-test-skill");
    assert.equal(local.category, "Local");
    assert.match(local.body, /# Local Test Skill/);
  } finally {
    if (previous == null) {
      fs.rmSync(file, { force: true });
      try { fs.rmdirSync(dir); } catch {}
      try { fs.rmdirSync(path.dirname(dir)); } catch {}
    } else {
      fs.writeFileSync(file, previous, "utf8");
    }
  }
});

test("skill local presets can be imported and exported", () => {
  const dir = path.resolve("config", "skill-presets");
  const file = path.join(dir, "imported-skill.md");
  const previous = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  fs.mkdirSync(dir, { recursive: true });

  try {
    const result = importLocalSkillPresets([{
      name: "imported-skill.md",
      content: [
        "---",
        "id: imported-skill",
        "name: imported-skill",
        "title: Imported Skill",
        "author: local",
        "category: Local",
        "description: Imported markdown preset",
        "---",
        "# Imported Skill",
        "",
        "Imported body.",
      ].join("\n"),
    }]);
    assert.equal(result.ok, true);
    assert.equal(result.count, 1);
    assert.equal(fs.existsSync(file), true);

    const exported = exportLocalSkillPresets();
    assert.equal(exported.dir, dir);
    assert.equal(exported.presets.some((preset) => preset.id === "imported-skill"), true);
  } finally {
    if (previous == null) {
      fs.rmSync(file, { force: true });
      try { fs.rmdirSync(dir); } catch {}
      try { fs.rmdirSync(path.dirname(dir)); } catch {}
    } else {
      fs.writeFileSync(file, previous, "utf8");
    }
  }
});

test("skill preset import sanitizes malicious ids (no path traversal)", () => {
  const dir = path.resolve("config", "skill-presets");
  fs.mkdirSync(dir, { recursive: true });
  const before = new Set(fs.readdirSync(dir));
  // An attacker-controlled preset id with traversal + separators must NOT
  // escape config/skill-presets when written to disk.
  const evil = [
    "---",
    "id: ../../../../tmp/evil",
    "name: ../../../../tmp/evil",
    "title: Evil",
    "author: x",
    "category: Local",
    "description: nope",
    "---",
    "# Evil",
  ].join("\n");
  try {
    importLocalSkillPresets([{ name: "evil.md", content: evil }]);
    // every newly-written file must live directly inside dir, no traversal
    for (const f of fs.readdirSync(dir)) {
      if (before.has(f)) continue;
      const resolved = path.resolve(dir, f);
      // The real safety guarantee: the written file resolves inside dir and the
      // filename carries no path separator (literal ".." chars are harmless
      // without a separator — they can't traverse).
      assert.ok(resolved.startsWith(dir + path.sep), `escaped dir: ${resolved}`);
      assert.ok(!f.includes("/") && !f.includes("\\"), `unsafe name: ${f}`);
      assert.equal(path.dirname(resolved), dir, `wrote outside dir: ${resolved}`);
    }
  } finally {
    for (const f of fs.readdirSync(dir)) {
      if (!before.has(f)) fs.rmSync(path.join(dir, f), { force: true });
    }
    try { fs.rmdirSync(dir); } catch {}
    try { fs.rmdirSync(path.dirname(dir)); } catch {}
  }
});

test("skill preset import accepts a bundled markdown export", () => {
  const dir = path.resolve("config", "skill-presets");
  const files = ["bundle-one.md", "bundle-two.md"].map((name) => path.join(dir, name));
  const previous = new Map(files.map((file) => [file, fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null]));
  fs.mkdirSync(dir, { recursive: true });

  try {
    const bundle = [
      [
        "---",
        "id: bundle-one",
        "name: bundle-one",
        "title: Bundle One",
        "author: local",
        "category: Local",
        "description: First bundled preset",
        "---",
        "# Bundle One",
      ].join("\n"),
      [
        "---",
        "id: bundle-two",
        "name: bundle-two",
        "title: Bundle Two",
        "author: local",
        "category: Local",
        "description: Second bundled preset",
        "---",
        "# Bundle Two",
      ].join("\n"),
    ].join("\n\n");

    const result = importLocalSkillPresets([{ name: "skill-presets.md", content: bundle }]);
    assert.equal(result.count, 2);
    const exported = exportLocalSkillPresets();
    assert.equal(exported.presets.some((preset) => preset.id === "bundle-one"), true);
    assert.equal(exported.presets.some((preset) => preset.id === "bundle-two"), true);
  } finally {
    for (const [file, content] of previous) {
      if (content == null) fs.rmSync(file, { force: true });
      else fs.writeFileSync(file, content, "utf8");
    }
    try { fs.rmdirSync(dir); } catch {}
    try { fs.rmdirSync(path.dirname(dir)); } catch {}
  }
});
