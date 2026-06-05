const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const cp = require("node:child_process");

// Project command center: list projects under the work root, show git status,
// and view/edit/sync the per-project agent config files (AGENTS.md, .mcp.json,
// CLAUDE.md). Writes are confined to the work root and always back up first.
//
// The work root is user-configurable at runtime (via the UI) and persisted to
// ~/.agent-deck/work-root so it survives restarts. Resolution order:
//   1. TOOL_MASTER_WORK_ROOT env var (highest priority, for power users / CI)
//   2. the persisted value the user picked in the UI
//   3. default: ~/projects
const SETTINGS_FILE = path.join(os.homedir(), ".agent-deck", "work-root");
const DEFAULT_WORK_ROOT = path.join(os.homedir(), "projects");

function loadPersistedRoot() {
  try {
    const v = fs.readFileSync(SETTINGS_FILE, "utf8").trim();
    return v || "";
  } catch {
    return "";
  }
}

let workRoot = process.env.TOOL_MASTER_WORK_ROOT || loadPersistedRoot() || DEFAULT_WORK_ROOT;

function getWorkRoot() {
  return workRoot;
}

function setWorkRoot(dir) {
  const next = String(dir || "").trim();
  if (!next) throw new Error("目录不能为空。");
  if (!exists(next)) throw new Error("目录不存在：" + next);
  workRoot = next;
  // Persist (best-effort; the env var still wins on next launch if set).
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, next, "utf8");
  } catch { /* non-fatal */ }
  return { ok: true, root: workRoot };
}

// The config files we surface per project. `key` is the stable id used by the UI.
const CONFIG_FILES = [
  { key: "agents", file: "AGENTS.md", label: "AGENTS.md", lang: "markdown" },
  { key: "claude", file: "CLAUDE.md", label: "CLAUDE.md", lang: "markdown" },
  { key: "mcp", file: ".mcp.json", label: ".mcp.json", lang: "json" },
];

function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function safeRead(file) { try { return fs.readFileSync(file, "utf8"); } catch { return null; } }
function statMs(p) { try { return fs.statSync(p).mtimeMs; } catch { return 0; } }

function git(cwd, args) {
  try {
    return cp.execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 4000 }).trim();
  } catch {
    return "";
  }
}

function gitStatus(dir) {
  if (!exists(path.join(dir, ".git"))) return { isGit: false };
  const branch = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]) || "";
  const porcelain = git(dir, ["status", "--porcelain"]);
  const changes = porcelain ? porcelain.split(/\r?\n/).filter(Boolean).length : 0;
  const lastTs = git(dir, ["log", "-1", "--format=%ct"]);
  const lastSubject = git(dir, ["log", "-1", "--format=%s"]);
  const ahead = git(dir, ["rev-list", "--count", "@{u}..HEAD"]);
  const behind = git(dir, ["rev-list", "--count", "HEAD..@{u}"]);
  return {
    isGit: true,
    branch: branch === "HEAD" ? "(detached)" : branch,
    changes,
    lastCommitAt: lastTs ? Number(lastTs) * 1000 : 0,
    lastSubject: lastSubject || "",
    ahead: Number(ahead) || 0,
    behind: Number(behind) || 0,
  };
}

function configState(dir) {
  const out = {};
  for (const c of CONFIG_FILES) {
    const fp = path.join(dir, c.file);
    out[c.key] = { present: exists(fp), size: exists(fp) ? statMs(fp) && fs.statSync(fp).size : 0 };
  }
  return out;
}

function listProjects() {
  const root = getWorkRoot();
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch {
    return { root, available: false, projects: [] };
  }
  const projects = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith(".")) continue;
    const dir = path.join(root, e.name);
    const g = gitStatus(dir);
    projects.push({
      name: e.name,
      path: dir,
      git: g,
      config: configState(dir),
      sortAt: g.lastCommitAt || statMs(dir),
    });
  }
  // Git projects first (by last commit), then non-git (by folder mtime).
  projects.sort((a, b) => {
    if (!!a.git.isGit !== !!b.git.isGit) return a.git.isGit ? -1 : 1;
    return (b.sortAt || 0) - (a.sortAt || 0);
  });
  return { root, available: true, projects };
}

// ── config read / write (guarded) ──────────────────────────
function within(p, root) {
  const rel = path.relative(root, p);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
function resolveConfig(projectPath, key) {
  const def = CONFIG_FILES.find((c) => c.key === key);
  if (!def) throw new Error("未知的配置类型。");
  const fp = path.join(projectPath, def.file);
  const root = getWorkRoot();
  if (!within(fp, root)) throw new Error("路径越界（仅允许操作 " + root + "）。");
  return { def, fp };
}

function readConfig(projectPath, key) {
  const { def, fp } = resolveConfig(projectPath, key);
  return { key, file: def.file, label: def.label, lang: def.lang, present: exists(fp), content: safeRead(fp) || "" };
}

function backup(fp) {
  if (!exists(fp)) return null;
  const bak = fp + ".bak-" + new Date().toISOString().replace(/[:.]/g, "-");
  try { fs.copyFileSync(fp, bak); return bak; } catch { return null; }
}

function saveConfig(projectPath, key, content) {
  const { def, fp } = resolveConfig(projectPath, key);
  if (def.lang === "json") {
    try { JSON.parse(content); } catch (e) { throw new Error(".mcp.json 不是合法 JSON：" + e.message); }
  }
  const bak = backup(fp);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content, "utf8");
  return { ok: true, backup: bak };
}

function deleteConfig(projectPath, key) {
  const { fp } = resolveConfig(projectPath, key);
  if (!exists(fp)) return { ok: true };
  const bak = backup(fp);
  fs.rmSync(fp, { force: true });
  return { ok: true, backup: bak };
}

// Push one project's config file (the "template source") to many targets.
function syncConfig({ key, content, targets }) {
  const def = CONFIG_FILES.find((c) => c.key === key);
  if (!def) throw new Error("未知的配置类型。");
  if (def.lang === "json") {
    try { JSON.parse(content); } catch (e) { throw new Error(".mcp.json 模板不是合法 JSON：" + e.message); }
  }
  const results = [];
  const root = getWorkRoot();
  for (const projectPath of targets || []) {
    try {
      const fp = path.join(projectPath, def.file);
      if (!within(fp, root)) { results.push({ projectPath, ok: false, error: "路径越界" }); continue; }
      if (!exists(projectPath)) { results.push({ projectPath, ok: false, error: "目录不存在" }); continue; }
      const bak = backup(fp);
      fs.writeFileSync(fp, content, "utf8");
      results.push({ projectPath, ok: true, backup: bak });
    } catch (e) {
      results.push({ projectPath, ok: false, error: e.message });
    }
  }
  return { ok: results.every((r) => r.ok), results };
}

module.exports = { listProjects, readConfig, saveConfig, deleteConfig, syncConfig, getWorkRoot, setWorkRoot, CONFIG_FILES };
