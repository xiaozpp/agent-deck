const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ANTIGRAVITY_CACHE_VERSION = 2;
// Internal id used only when synthesizing the tokscale cache. It is NOT a real
// model — Antigravity stores the per-turn model only inside its encrypted .pb
// files, so we cannot know which model (Gemini 3.x / Claude 4.x / …) a session
// actually used.
const ANTIGRAVITY_MODEL_ID = "gemini-2.5-pro";
// User-facing label for the model column: we deliberately do NOT claim a
// specific model, since the local data does not record it per session.
const ANTIGRAVITY_MODEL_LABEL = "反重力（未区分模型）";

function jsonSize(value) {
  if (value == null) return 0;
  if (typeof value === "string") return value.length;
  try {
    return JSON.stringify(value).length;
  } catch (_) {
    return 0;
  }
}

function parseAntigravityTimestamp(value, fallbackTimestamp) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return fallbackTimestamp;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallbackTimestamp;
}

function estimateTokensFromChars(chars, minimum = 0) {
  if (!chars) return minimum;
  return Math.max(minimum, Math.ceil(chars / 4));
}

function parseAntigravityLogTurns(logContent, fallbackTimestamp) {
  const turns = [];
  let current = null;

  function flush() {
    if (!current) return;
    if (current.inputChars > 0 || current.outputChars > 0) turns.push(current);
    current = null;
  }

  for (const line of String(logContent || "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let step;
    try {
      step = JSON.parse(line);
    } catch (_) {
      continue;
    }

    const timestamp = parseAntigravityTimestamp(step.created_at ?? step.timestamp, fallbackTimestamp);
    const contentChars = jsonSize(step.content);
    const toolCallChars = jsonSize(step.tool_calls);

    if (step.type === "USER_INPUT") {
      flush();
      current = {
        timestamp,
        inputChars: Math.max(1, contentChars),
        outputChars: 0,
      };
      continue;
    }

    if (!current) {
      current = {
        timestamp,
        inputChars: 0,
        outputChars: 0,
      };
    }
    current.outputChars += contentChars + toolCallChars;
  }

  flush();
  return turns;
}

function buildAntigravityCacheLines({
  sessionId,
  logContent = "",
  pbSize = 0,
  fallbackTimestamp = Date.now(),
  modelId = ANTIGRAVITY_MODEL_ID,
}) {
  const turns = parseAntigravityLogTurns(logContent, fallbackTimestamp);

  if (turns.length === 0) {
    const fallbackTokens = pbSize > 0 ? Math.max(200, Math.min(2_000, Math.round(pbSize / 4096))) : 200;
    turns.push({
      timestamp: fallbackTimestamp,
      inputChars: fallbackTokens * 4,
      outputChars: 0,
    });
  }

  const jsonlLines = [];
  jsonlLines.push(JSON.stringify({
    type: "session_meta",
    sessionId,
    modelId,
    generator: "agent-deck",
    generatorVersion: ANTIGRAVITY_CACHE_VERSION,
  }));

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const inputTokens = estimateTokensFromChars(turn.inputChars, turn.inputChars > 0 ? 50 : 0);
    const outputTokens = estimateTokensFromChars(turn.outputChars, turn.outputChars > 0 ? 25 : 0);
    const cacheReadTokens = Math.round(inputTokens * 0.3);

    jsonlLines.push(JSON.stringify({
      type: "usage",
      sessionId,
      timestamp: turn.timestamp,
      input: inputTokens,
      output: outputTokens,
      cacheRead: cacheReadTokens,
      cacheWrite: 0,
      reasoning: 0,
      responseId: `turn-${i}`,
    }));
  }

  return jsonlLines;
}

function hasCurrentAntigravityCache(cacheFilePath) {
  try {
    const firstLine = fs.readFileSync(cacheFilePath, "utf8").split(/\r?\n/, 1)[0];
    const meta = JSON.parse(firstLine);
    return meta.generator === "agent-deck" && meta.generatorVersion === ANTIGRAVITY_CACHE_VERSION;
  } catch (_) {
    return false;
  }
}

async function syncAntigravitySessions() {
  try {
    const home = os.homedir();
    const antigravityDir = path.join(home, ".gemini", "antigravity");
    if (!fs.existsSync(antigravityDir)) return;

    const brainDir = path.join(antigravityDir, "brain");
    const convDir = path.join(antigravityDir, "conversations");
    const annDir = path.join(antigravityDir, "annotations");
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    const tokscaleCacheDir = path.join(appData, "tokscale", "antigravity-cache", "sessions");

    if (!fs.existsSync(tokscaleCacheDir)) {
      fs.mkdirSync(tokscaleCacheDir, { recursive: true });
    }

    // Collect all conversation IDs from all sources
    const convoIds = new Set();
    if (fs.existsSync(brainDir)) {
      for (const entry of fs.readdirSync(brainDir)) {
        if (entry === "tempmediaStorage") continue;
        const full = path.join(brainDir, entry);
        try { if (fs.statSync(full).isDirectory()) convoIds.add(entry); } catch (_) {}
      }
    }
    if (fs.existsSync(convDir)) {
      for (const f of fs.readdirSync(convDir)) {
        if (f.endsWith(".pb")) convoIds.add(f.replace(".pb", ""));
      }
    }
    if (fs.existsSync(annDir)) {
      for (const f of fs.readdirSync(annDir)) {
        if (f.endsWith(".pbtxt")) convoIds.add(f.replace(".pbtxt", ""));
      }
    }

    for (const convoId of convoIds) {
      const cacheFilePath = path.join(tokscaleCacheDir, `${convoId}.jsonl`);
      const pbPath = path.join(convDir, `${convoId}.pb`);
      const hasPb = fs.existsSync(pbPath);
      const pbSize = hasPb ? fs.statSync(pbPath).size : 0;
      const brainConvoDir = path.join(brainDir, convoId);
      const logPath = [
        path.join(brainConvoDir, ".system_generated", "logs", "overview.txt"),
        path.join(brainConvoDir, ".system_generated", "logs", "transcript.jsonl"),
      ].find((p) => fs.existsSync(p));

      // Skip conversations with no data at all
      if (pbSize === 0 && !logPath) continue;

      // Check freshness: skip if cache is newer than pb AND transcript
      const sourceMtimeMs = Math.max(
        hasPb ? fs.statSync(pbPath).mtimeMs : 0,
        logPath ? fs.statSync(logPath).mtimeMs : 0,
      );
      if (fs.existsSync(cacheFilePath)) {
        const cacheMtime = fs.statSync(cacheFilePath).mtimeMs;
        if (cacheMtime >= sourceMtimeMs && hasCurrentAntigravityCache(cacheFilePath)) continue;
      }

      const logContent = logPath ? fs.readFileSync(logPath, "utf8") : "";
      const fallbackTimestamp = sourceMtimeMs || Date.now();
      const jsonlLines = buildAntigravityCacheLines({
        sessionId: convoId,
        logContent,
        pbSize,
        fallbackTimestamp,
      });

      fs.writeFileSync(cacheFilePath, jsonlLines.join("\n") + "\n", "utf8");
    }
  } catch (e) {
    console.error("Failed to sync Antigravity sessions:", e);
  }
}

function decodeFolderUri(uri) {
  if (!uri) return "";
  let s = uri;
  try {
    s = decodeURIComponent(uri);
  } catch (_) {
    s = uri;
  }
  s = s.replace(/^file:\/\/\/?/, "").replace(/\//g, "\\");
  s = s.replace(/^([a-z]):/, (m) => m.toUpperCase());
  return s;
}

function cleanTitle(title) {
  if (!title || typeof title !== "string") return null;
  const cleaned = title.replace(/[\u0000-\u001f]/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.length > 80 ? cleaned.slice(0, 80) : cleaned;
}

function readProtoVarint(buf, pos) {
  let shift = 0n;
  let result = 0n;
  let p = pos;
  while (p < buf.length) {
    const byte = buf[p++];
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7n;
  }
  return [result, p];
}

function parseProtoFields(buf, start, end) {
  const fields = [];
  let p = start;
  while (p < end) {
    let key;
    [key, p] = readProtoVarint(buf, p);
    const field = Number(key >> 3n);
    const wire = Number(key & 7n);
    if (wire === 0) {
      let value;
      [value, p] = readProtoVarint(buf, p);
      fields.push({ field, wire, value });
    } else if (wire === 1) {
      fields.push({ field, wire, bytes: buf.slice(p, p + 8) });
      p += 8;
    } else if (wire === 5) {
      fields.push({ field, wire, bytes: buf.slice(p, p + 4) });
      p += 4;
    } else if (wire === 2) {
      let len;
      [len, p] = readProtoVarint(buf, p);
      len = Number(len);
      if (len < 0 || p + len > end) break;
      fields.push({ field, wire, bytes: buf.slice(p, p + len) });
      p += len;
    } else {
      break;
    }
  }
  return fields;
}

// Antigravity stores conversation content in encrypted .pb files, but
// agyhub_summaries_proto.pb keeps a plaintext index of recent conversations
// (id -> title + opened workspace folder). It's the only local source that
// links a conversation to a project, so we mine it best-effort.
function parseAntigravitySummaries() {
  const map = new Map();
  try {
    const summariesPath = path.join(os.homedir(), ".gemini", "antigravity", "agyhub_summaries_proto.pb");
    if (!fs.existsSync(summariesPath)) return map;
    const buf = fs.readFileSync(summariesPath);
    const top = parseProtoFields(buf, 0, buf.length);
    for (const entry of top) {
      if (entry.field !== 1 || entry.wire !== 2 || !entry.bytes) continue;
      const fields = parseProtoFields(entry.bytes, 0, entry.bytes.length);
      const idField = fields.find((f) => f.field === 1 && f.wire === 2);
      const id = idField ? idField.bytes.toString("utf8") : null;
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) continue;

      const detail = fields.find((f) => f.field === 2 && f.wire === 2);
      let title = null;
      let workspacePath = null;
      if (detail && detail.bytes) {
        const detailFields = parseProtoFields(detail.bytes, 0, detail.bytes.length);
        const titleField = detailFields.find((f) => f.field === 1 && f.wire === 2);
        if (titleField) title = cleanTitle(titleField.bytes.toString("utf8"));
        const uriMatch = detail.bytes.toString("latin1").match(/file:\/\/\/?[^\x00-\x1f"'\\]+/);
        if (uriMatch) workspacePath = decodeFolderUri(uriMatch[0]);
      }
      map.set(id, { title, workspacePath });
    }
  } catch (_) {
    // best-effort; fall back to ids when the proto layout changes
  }
  return map;
}

function antigravityRangeBounds(query = {}) {
  const range = query.range || "today";
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (range === "all") return { sinceMs: 0, untilMs: Infinity };
  if (range === "today") return { sinceMs: startOf(now), untilMs: endOfToday };
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { sinceMs: startOf(start), untilMs: endOfToday };
  }
  if (range === "month") return { sinceMs: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), untilMs: endOfToday };
  if (range === "year") return { sinceMs: new Date(now.getFullYear(), 0, 1).getTime(), untilMs: endOfToday };
  if (range === "custom") {
    const since = query.since ? Date.parse(`${query.since}T00:00:00`) : 0;
    const until = query.until ? Date.parse(`${query.until}T23:59:59.999`) : endOfToday;
    return {
      sinceMs: Number.isFinite(since) ? since : 0,
      untilMs: Number.isFinite(until) ? until : endOfToday,
    };
  }
  return { sinceMs: 0, untilMs: Infinity };
}

function readAntigravitySessionTotals({ sinceMs, untilMs }) {
  const map = new Map();
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const dir = path.join(appData, "tokscale", "antigravity-cache", "sessions");
  if (!fs.existsSync(dir)) return map;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".jsonl")) continue;
    const convoId = file.slice(0, -6);
    const agg = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      reasoning: 0,
      messageCount: 0,
      model: ANTIGRAVITY_MODEL_ID,
    };
    let content;
    try {
      content = fs.readFileSync(path.join(dir, file), "utf8");
    } catch (_) {
      continue;
    }
    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch (_) {
        continue;
      }
      if (rec.type === "session_meta" && rec.modelId) {
        agg.model = rec.modelId;
        continue;
      }
      if (rec.type !== "usage") continue;
      const ts = Number(rec.timestamp) || 0;
      if (ts < sinceMs || ts > untilMs) continue;
      agg.input += Number(rec.input) || 0;
      agg.output += Number(rec.output) || 0;
      agg.cacheRead += Number(rec.cacheRead) || 0;
      agg.cacheWrite += Number(rec.cacheWrite) || 0;
      agg.reasoning += Number(rec.reasoning) || 0;
      agg.messageCount += 1;
    }
    if (agg.input || agg.output || agg.cacheRead || agg.messageCount) map.set(convoId, agg);
  }
  return map;
}

// tokscale collapses every Antigravity session into one "Unknown workspace"
// row (it hardcodes workspace_root = NULL for this client). We rebuild a
// per-conversation breakdown from our own session cache, naming each row by
// its conversation title and distributing tokscale's total cost by token share.
function buildAntigravityProjectEntries(query, totalCost) {
  const totals = readAntigravitySessionTotals(antigravityRangeBounds(query));
  if (totals.size === 0) return [];
  const summaries = parseAntigravitySummaries();

  let grandTokens = 0;
  for (const t of totals.values()) grandTokens += t.input + t.output + t.cacheRead;

  const entries = [];
  for (const [convoId, t] of totals) {
    const meta = summaries.get(convoId) || {};
    const tokens = t.input + t.output + t.cacheRead;
    const cost = grandTokens > 0 ? (Number(totalCost) || 0) * (tokens / grandTokens) : 0;
    const workspacePath = meta.workspacePath || "";
    const title =
      meta.title ||
      (workspacePath ? `${path.basename(workspacePath)} · 会话` : "") ||
      `会话 ${convoId.slice(0, 8)}`;
    entries.push({
      client: "antigravity",
      workspaceKey: convoId,
      workspaceLabel: title,
      // Local data does not record the per-session model, so label it honestly
      // instead of pretending it was the synthesized placeholder id.
      model: ANTIGRAVITY_MODEL_LABEL,
      input: t.input,
      output: t.output,
      cacheRead: t.cacheRead,
      cacheWrite: t.cacheWrite,
      reasoning: t.reasoning,
      messageCount: t.messageCount,
      cost,
      existsLocally: workspacePath ? fs.existsSync(workspacePath) : true,
      displayPath: workspacePath,
      realName: title,
    });
  }
  return entries.sort((a, b) => (b.cost || 0) - (a.cost || 0));
}

module.exports = {
  buildAntigravityCacheLines,
  buildAntigravityProjectEntries,
  syncAntigravitySessions,
};
