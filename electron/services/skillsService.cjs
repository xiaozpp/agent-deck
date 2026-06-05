const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { listSkillPresets, getSkillPreset } = require("./skills/presetCatalog.cjs");

// Unified manager for "Agent Skills" across the two desktop coding agents.
// Both now use the SAME SKILL.md standard (a directory + SKILL.md frontmatter):
//   - Claude Code: ~/.claude/skills/<name>/SKILL.md          (personal, RW)
//                  ~/.claude/plugins/**/skills/<name>/SKILL.md (plugin, RO)
//   - Codex:       ~/.codex/skills/<name>/SKILL.md            (personal, RW)
//                  ~/.codex/skills/.system/<name>/SKILL.md    (built-in, RO)
// All operations are local file I/O. Writes are confined to the two personal
// skills dirs (plugin / .system skills are read-only).

const HOME = process.env.TOOL_MASTER_HOME || os.homedir();
const CLAUDE_SKILLS_DIR = path.join(HOME, ".claude", "skills");
const CLAUDE_PLUGINS_DIR = path.join(HOME, ".claude", "plugins");
const CODEX_SKILLS_DIR = path.join(HOME, ".codex", "skills");
const CODEX_SYSTEM_DIR = path.join(CODEX_SKILLS_DIR, ".system");
// Claude DESKTOP (the GUI app, not the CLI) stores its managed "Personal skills"
// under <ClaudeData>/local-agent-mode-sessions/skills-plugin/<account>/<plugin>/skills/.
// These are app-managed → read-only here. The data dir differs between the
// classic installer (%APPDATA%/Claude) and the MSIX/Store build
// (%LOCALAPPDATA%/Packages/Claude_*/LocalCache/Roaming/Claude), so scan both.
const APPDATA = process.env.APPDATA || path.join(HOME, "AppData", "Roaming");
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local");
function claudeDesktopRoots() {
  const roots = [path.join(APPDATA, "Claude")];
  try {
    const pkgs = path.join(LOCALAPPDATA, "Packages");
    for (const name of fs.readdirSync(pkgs)) {
      if (/^Claude_/.test(name)) roots.push(path.join(pkgs, name, "LocalCache", "Roaming", "Claude"));
    }
  } catch { /* no Packages dir */ }
  return roots.map((r) => path.join(r, "local-agent-mode-sessions", "skills-plugin")).filter(exists);
}
const DISABLED = ".disabled";

function safeRead(file) {
  try { return fs.readFileSync(file, "utf8"); } catch { return null; }
}
function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}
function mtimeMs(p) {
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
}
function sanitizeName(name) {
  return String(name || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

// ── frontmatter ─────────────────────────────────────────────
function parseFrontmatter(text) {
  const out = { data: {}, body: text || "" };
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text || "");
  if (!m) return out;
  out.body = m[2] || "";
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // YAML block scalar (`key: |` or `key: >`): gather the following indented
    // lines until indentation drops back to a top-level key.
    if (val === "|" || val === ">" || val === "|-" || val === ">-") {
      const fold = val.startsWith(">");
      const block = [];
      while (i + 1 < lines.length && (lines[i + 1].trim() === "" || /^\s/.test(lines[i + 1]))) {
        block.push(lines[++i].replace(/^\s{1,4}/, ""));
      }
      out.data[key] = block.join(fold ? " " : "\n").replace(/\n{2,}/g, "\n").trim();
      continue;
    }
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out.data[key] = val;
  }
  return out;
}
function parseAllowedTools(data) {
  const v = data["allowed-tools"] || data["allowed_tools"] || data.allowedTools;
  if (!v) return [];
  return String(v).replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}
function firstMeaningfulLine(body) {
  for (const raw of String(body || "").split(/\r?\n/)) {
    const line = raw.replace(/^#+\s*/, "").trim();
    if (line) return line.slice(0, 160);
  }
  return "";
}
function buildSkillMd({ name, description, allowedTools, body }) {
  const lines = ["---", `name: ${name}`, `description: ${description || ""}`];
  if (allowedTools && allowedTools.length) lines.push(`allowed-tools: ${allowedTools.join(", ")}`);
  lines.push("---", "", (body || "").replace(/^\s+/, ""));
  return lines.join("\n").replace(/\s*$/, "") + "\n";
}

// ── listing ─────────────────────────────────────────────────
function readSkillDir(skillDir, source, scope, readOnly) {
  const md = path.join(skillDir, "SKILL.md");
  const raw = safeRead(md);
  if (raw == null) return null;
  const { data, body } = parseFrontmatter(raw);
  const base = path.basename(skillDir);
  const enabled = !base.endsWith(DISABLED);
  const name = data.name || base.replace(new RegExp("\\" + DISABLED + "$"), "");
  let supportFiles = 0;
  try { supportFiles = fs.readdirSync(skillDir).filter((f) => f !== "SKILL.md").length; } catch {}
  return {
    id: md,
    path: md,
    dir: skillDir,
    source,
    scope,
    readOnly: !!readOnly,
    name,
    description: data.description || firstMeaningfulLine(body),
    allowedTools: parseAllowedTools(data),
    enabled,
    supportFiles,
    updatedAt: mtimeMs(md),
  };
}

function listDirSkills(root, source, scope, readOnly, skipNames) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (skipNames && skipNames.has(e.name)) continue;
    const s = readSkillDir(path.join(root, e.name), source, scope, readOnly);
    if (s) out.push(s);
  }
  return out;
}

function listClaudePlugins() {
  const out = [];
  if (!exists(CLAUDE_PLUGINS_DIR)) return out;
  const stack = [[CLAUDE_PLUGINS_DIR, 0]];
  while (stack.length && out.length < 300) {
    const [dir, depth] = stack.pop();
    if (depth > 6) continue;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      if (e.name === "skills") {
        for (const s of listDirSkills(full, "claude", "plugin", true)) out.push(s);
      } else {
        stack.push([full, depth + 1]);
      }
    }
  }
  return out;
}

// Claude Desktop skills live under .../skills-plugin/<account>/<plugin>/skills/.
// They are managed by the app (read-only here). Dedup by skill name so the same
// skill surfaced under multiple account/plugin/root folders shows once.
function listClaudeDesktop() {
  const out = [];
  const seen = new Set();
  for (const pluginDir of claudeDesktopRoots()) {
    let accounts;
    try { accounts = fs.readdirSync(pluginDir, { withFileTypes: true }); } catch { continue; }
    for (const acc of accounts) {
      if (!acc.isDirectory()) continue;
      let plugins;
      try { plugins = fs.readdirSync(path.join(pluginDir, acc.name), { withFileTypes: true }); } catch { continue; }
      for (const pl of plugins) {
        if (!pl.isDirectory()) continue;
        const skillsRoot = path.join(pluginDir, acc.name, pl.name, "skills");
        for (const s of listDirSkills(skillsRoot, "claude", "desktop", true)) {
          if (seen.has(s.name)) continue;
          seen.add(s.name);
          out.push(s);
        }
      }
    }
  }
  return out;
}

function listSkills() {
  const skills = [
    ...listDirSkills(CLAUDE_SKILLS_DIR, "claude", "personal", false),
    ...listClaudePlugins(),
    ...listClaudeDesktop(),
    ...listDirSkills(CODEX_SKILLS_DIR, "codex", "personal", false, new Set([".system"])),
    ...listDirSkills(CODEX_SYSTEM_DIR, "codex", "system", true),
  ];
  skills.sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name));
  const desktopRoots = claudeDesktopRoots();
  const claudeAvailable = exists(path.join(HOME, ".claude")) || desktopRoots.length > 0;
  return {
    skills,
    roots: { claude: CLAUDE_SKILLS_DIR, codex: CODEX_SKILLS_DIR, plugins: CLAUDE_PLUGINS_DIR, claudeDesktop: desktopRoots[0] || "" },
    available: { claude: claudeAvailable, codex: exists(path.join(HOME, ".codex")) },
  };
}

// ── guards ──────────────────────────────────────────────────
function within(p, root) {
  const rel = path.relative(root, p);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
// A skill file under any of the Claude Desktop session roots (read-only).
function isDesktopPath(p) {
  return claudeDesktopRoots().some((r) => within(p, r));
}
function assertWritable(p) {
  const writable = within(p, CLAUDE_SKILLS_DIR) || within(p, CODEX_SKILLS_DIR);
  const readonly = within(p, CLAUDE_PLUGINS_DIR) || within(p, CODEX_SYSTEM_DIR);
  if (!writable || readonly) {
    throw new Error("该 skill 为只读（插件 / 内置），或路径越界，无法修改。");
  }
}

// ── read / mutate ───────────────────────────────────────────
function readSkill(filePath) {
  const known =
    within(filePath, CLAUDE_SKILLS_DIR) ||
    within(filePath, CODEX_SKILLS_DIR) ||
    within(filePath, CLAUDE_PLUGINS_DIR) ||
    isDesktopPath(filePath);
  if (!known) throw new Error("路径越界。");
  const raw = safeRead(filePath);
  if (raw == null) throw new Error("读取失败：文件不存在。");
  const { data, body } = parseFrontmatter(raw);
  return {
    name: data.name || path.basename(path.dirname(filePath)),
    description: data.description || "",
    allowedTools: parseAllowedTools(data),
    body,
    raw,
    isClaude: within(filePath, CLAUDE_SKILLS_DIR) || within(filePath, CLAUDE_PLUGINS_DIR) || isDesktopPath(filePath),
  };
}

function saveSkill(filePath, patch) {
  assertWritable(filePath);
  fs.writeFileSync(filePath, buildSkillMd({
    name: sanitizeName(patch.name) || path.basename(path.dirname(filePath)),
    description: patch.description || "",
    allowedTools: Array.isArray(patch.allowedTools) ? patch.allowedTools : [],
    body: patch.body || "",
  }), "utf8");
  return { ok: true };
}

function createSkill({ source, name, description, body }) {
  const clean = sanitizeName(name);
  if (!clean) throw new Error("名称无效（仅支持小写字母、数字、- 和 _）。");
  const root = source === "codex" ? CODEX_SKILLS_DIR : CLAUDE_SKILLS_DIR;
  const dir = path.join(root, clean);
  if (exists(dir)) throw new Error("同名 skill 已存在。");
  fs.mkdirSync(dir, { recursive: true });
  const md = path.join(dir, "SKILL.md");
  fs.writeFileSync(md, buildSkillMd({
    name: clean,
    description: description || "",
    allowedTools: [],
    body: body || `# ${clean}\n\n在这里描述该 skill 的步骤与使用方式。\n`,
  }), "utf8");
  return { ok: true, path: md };
}

function deleteSkill(filePath) {
  assertWritable(filePath);
  fs.rmSync(path.dirname(filePath), { recursive: true, force: true });
  return { ok: true };
}

function toggleSkill(filePath, enabled) {
  assertWritable(filePath);
  const dir = path.dirname(filePath);
  const isDisabled = dir.endsWith(DISABLED);
  const wantEnabled = !!enabled;
  if (wantEnabled === !isDisabled) return { ok: true, path: filePath };
  const target = wantEnabled ? dir.slice(0, -DISABLED.length) : dir + DISABLED;
  fs.renameSync(dir, target);
  return { ok: true, path: path.join(target, "SKILL.md") };
}

function skillFolder(filePath) {
  return path.dirname(filePath);
}

// Install a curated preset into the chosen agent by reusing createSkill.
function installSkillPreset(source, presetId) {
  const preset = getSkillPreset(presetId);
  if (!preset) throw new Error(`Unknown skill preset: ${presetId}`);
  return createSkill({
    source: source === "codex" ? "codex" : "claude",
    name: preset.name,
    description: preset.description,
    body: preset.body,
  });
}

module.exports = {
  listSkills,
  readSkill,
  saveSkill,
  createSkill,
  deleteSkill,
  toggleSkill,
  skillFolder,
  listSkillPresets,
  installSkillPreset,
};
