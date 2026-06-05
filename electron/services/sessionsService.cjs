const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

// Unified read-only browser for local agent conversation history.
//   - Claude Code: ~/.claude/projects/<encoded-cwd>/<uuid>.jsonl
//   - Codex:       ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
// We only READ these files. Nothing here writes to the agents' data.

const HOME = os.homedir();
const CLAUDE_PROJECTS_DIR = path.join(HOME, ".claude", "projects");
const CODEX_SESSIONS_DIR = path.join(HOME, ".codex", "sessions");

function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function readLines(file) {
  try { return fs.readFileSync(file, "utf8").split(/\r?\n/); } catch { return []; }
}
function basenameOf(cwd) {
  if (!cwd) return "";
  return path.basename(cwd.replace(/[\\/]+$/, "")) || cwd;
}
function clip(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) : t;
}

// ── content-block flattening (shared shape) ─────────────────
// Returns { role, kind: "text"|"thinking"|"tool_use"|"tool_result", text, tool }.
function blocksToParts(role, content) {
  const parts = [];
  if (typeof content === "string") {
    if (content.trim()) parts.push({ role, kind: "text", text: content });
    return parts;
  }
  if (!Array.isArray(content)) return parts;
  for (const b of content) {
    if (!b || typeof b !== "object") continue;
    if (b.type === "text" && b.text) parts.push({ role, kind: "text", text: b.text });
    else if (b.type === "thinking" && (b.thinking || b.text)) parts.push({ role, kind: "thinking", text: b.thinking || b.text });
    else if (b.type === "tool_use") parts.push({ role, kind: "tool_use", tool: b.name || "tool", text: typeof b.input === "object" ? JSON.stringify(b.input) : String(b.input || "") });
    else if (b.type === "tool_result") {
      let t = b.content;
      if (Array.isArray(t)) t = t.map((x) => (x && x.text) || "").join("\n");
      parts.push({ role, kind: "tool_result", text: typeof t === "string" ? t : JSON.stringify(t || "") });
    }
  }
  return parts;
}

// ── Claude Code ─────────────────────────────────────────────
function parseClaudeSession(file, encDir) {
  const lines = readLines(file).filter(Boolean);
  if (lines.length === 0) return null;
  let cwd = "", gitBranch = "", title = "", aiTitle = "", customTitle = "";
  let firstUser = "", startTs = 0, endTs = 0, msgCount = 0;
  const records = [];
  for (const ln of lines) {
    let o;
    try { o = JSON.parse(ln); } catch { continue; }
    if (o.type === "custom-title") { customTitle = o.customTitle || customTitle; continue; }
    if (o.type === "ai-title") { aiTitle = o.aiTitle || aiTitle; continue; }
    if (o.cwd && !cwd) cwd = o.cwd;
    if (o.gitBranch && o.gitBranch !== "HEAD" && !gitBranch) gitBranch = o.gitBranch;
    const ts = o.timestamp ? Date.parse(o.timestamp) : 0;
    if (ts) { if (!startTs || ts < startTs) startTs = ts; if (ts > endTs) endTs = ts; }
    if (o.type === "user" || o.type === "assistant") {
      const msg = o.message || {};
      const parts = blocksToParts(o.type, msg.content);
      if (parts.length) {
        msgCount++;
        records.push({ role: o.type, ts, parts });
        if (o.type === "user" && !firstUser) {
          const txt = parts.find((p) => p.kind === "text");
          // skip the compaction-continuation system prompt as a title source
          if (txt && !/^This session is being continued/.test(txt.text)) firstUser = txt.text;
        }
      }
    }
  }
  title = customTitle || aiTitle || clip(firstUser, 60) || "(无标题会话)";
  // searchable haystack = all text/thinking + user inputs (lowercased)
  return {
    id: file,
    source: "claude",
    file,
    cwd,
    project: basenameOf(cwd) || encDir,
    gitBranch,
    title,
    preview: clip(firstUser, 120),
    startedAt: startTs,
    updatedAt: endTs || (function () { try { return fs.statSync(file).mtimeMs; } catch { return 0; } })(),
    messageCount: msgCount,
    _records: records,
  };
}

function listClaudeSessions() {
  const out = [];
  let dirs;
  try { dirs = fs.readdirSync(CLAUDE_PROJECTS_DIR, { withFileTypes: true }); } catch { return out; }
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const full = path.join(CLAUDE_PROJECTS_DIR, d.name);
    let files;
    try { files = fs.readdirSync(full).filter((f) => f.endsWith(".jsonl")); } catch { continue; }
    for (const f of files) {
      const s = parseClaudeSession(path.join(full, f), d.name);
      if (s && s.messageCount > 0) out.push(s);
    }
  }
  return out;
}

// ── Codex ───────────────────────────────────────────────────
function parseCodexSession(file) {
  const lines = readLines(file).filter(Boolean);
  if (lines.length === 0) return null;
  let cwd = "", gitBranch = "", id = "", originator = "", firstUser = "", startTs = 0, endTs = 0, msgCount = 0;
  const records = [];
  for (const ln of lines) {
    let o;
    try { o = JSON.parse(ln); } catch { continue; }
    const ts = o.timestamp ? Date.parse(o.timestamp) : 0;
    if (ts) { if (!startTs || ts < startTs) startTs = ts; if (ts > endTs) endTs = ts; }
    const pl = o.payload || {};
    if (o.type === "session_meta") {
      cwd = pl.cwd || cwd;
      id = pl.id || id;
      originator = pl.originator || originator;
      if (pl.git && pl.git.branch) gitBranch = pl.git.branch;
      continue;
    }
    // Clean conversational events Codex emits alongside raw response_items.
    if (o.type === "event_msg" && pl.type === "user_message" && pl.message) {
      const text = String(pl.message);
      if (/<environment_context>|<user_instructions>/.test(text)) continue;
      msgCount++;
      records.push({ role: "user", ts, parts: [{ role: "user", kind: "text", text }] });
      if (!firstUser) firstUser = text;
      continue;
    }
    if (o.type === "event_msg" && pl.type === "agent_message" && pl.message) {
      msgCount++;
      records.push({ role: "assistant", ts, parts: [{ role: "assistant", kind: "text", text: String(pl.message) }] });
      continue;
    }
    // Tool calls (MCP / patch apply) → collapsed tool_use parts.
    if (o.type === "event_msg" && pl.type === "mcp_tool_call_end") {
      records.push({ role: "assistant", ts, parts: [{ role: "assistant", kind: "tool_use", tool: pl.tool || pl.server || "mcp", text: clip(JSON.stringify(pl.result || pl.arguments || {}), 200) }] });
      continue;
    }
    if (o.type === "event_msg" && pl.type === "patch_apply_end") {
      records.push({ role: "assistant", ts, parts: [{ role: "assistant", kind: "tool_use", tool: "apply_patch", text: clip(JSON.stringify(pl.files || pl), 200) }] });
      continue;
    }
  }
  return {
    id: file,
    source: "codex",
    file,
    cwd,
    project: basenameOf(cwd),
    gitBranch,
    title: clip(firstUser, 60) || "(无标题会话)",
    preview: clip(firstUser, 120),
    startedAt: startTs,
    updatedAt: endTs || (function () { try { return fs.statSync(file).mtimeMs; } catch { return 0; } })(),
    messageCount: msgCount,
    sessionId: id,
    originator,
    _records: records,
  };
}

function listCodexSessions() {
  const out = [];
  const stack = [CODEX_SESSIONS_DIR];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (/^rollout-.*\.jsonl$/.test(e.name)) {
        const s = parseCodexSession(full);
        if (s && s.messageCount > 0) out.push(s);
      }
    }
  }
  return out;
}

// strip the heavy _records before sending the list to the renderer
function lite(s) {
  const { _records, ...rest } = s;
  return rest;
}

// ── public API ──────────────────────────────────────────────
let CACHE = null; // { ts, sessions: [full] }
const CACHE_TTL_MS = 15_000;

function loadAll(force) {
  if (!force && CACHE && Date.now() - CACHE.ts < CACHE_TTL_MS) return CACHE.sessions;
  const sessions = [...listClaudeSessions(), ...listCodexSessions()];
  sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  CACHE = { ts: Date.now(), sessions };
  return sessions;
}

function listSessions(query = {}) {
  const all = loadAll(query.force === true);
  const source = query.source && query.source !== "all" ? query.source : null;
  const q = (query.search || "").trim().toLowerCase();
  let arr = all;
  if (source) arr = arr.filter((s) => s.source === source);
  if (q) {
    arr = arr.filter((s) => {
      if (s.title.toLowerCase().includes(q) || (s.project || "").toLowerCase().includes(q)) return true;
      // search message text bodies
      for (const r of s._records) {
        for (const p of r.parts) {
          if ((p.kind === "text" || p.kind === "thinking") && p.text && p.text.toLowerCase().includes(q)) return true;
        }
      }
      return false;
    });
  }
  const counts = {
    all: all.length,
    claude: all.filter((s) => s.source === "claude").length,
    codex: all.filter((s) => s.source === "codex").length,
  };
  return {
    sessions: arr.slice(0, 500).map(lite),
    counts,
    available: { claude: exists(CLAUDE_PROJECTS_DIR), codex: exists(CODEX_SESSIONS_DIR) },
  };
}

function readSession(file) {
  if (!file.endsWith(".jsonl")) throw new Error("无效的会话文件。");
  const within =
    !path.relative(CLAUDE_PROJECTS_DIR, file).startsWith("..") ||
    !path.relative(CODEX_SESSIONS_DIR, file).startsWith("..");
  if (!within) throw new Error("路径越界。");
  const all = loadAll(false);
  let s = all.find((x) => x.file === file);
  if (!s) {
    // not in cache (maybe just created) — parse directly
    s = file.includes(path.join(".codex", "sessions")) ? parseCodexSession(file) : parseClaudeSession(file, "");
  }
  if (!s) throw new Error("读取会话失败。");
  return {
    ...lite(s),
    messages: s._records.map((r) => ({ role: r.role, ts: r.ts, parts: r.parts })),
  };
}

module.exports = {
  listSessions,
  readSession,
  CLAUDE_PROJECTS_DIR,
  CODEX_SESSIONS_DIR,
  // exported for unit tests
  _parseClaudeSession: parseClaudeSession,
  _parseCodexSession: parseCodexSession,
  _blocksToParts: blocksToParts,
};
