const { execFile } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const {
  buildAntigravityCacheLines,
  buildAntigravityProjectEntries,
  syncAntigravitySessions,
} = require("./usage/antigravityUsage.cjs");

const projectRoot = path.resolve(__dirname, "..", "..");
const USAGE_CLI_TIMEOUT_MS = 12_000;

// Resolve a CLI's real JS entry point (e.g. node_modules/tokscale/bin.js) via
// the package's `bin` field. We deliberately do NOT use node_modules/.bin
// shims: those .cmd/.ps1 wrappers are not bundled into the packaged app, so the
// previous `.bin/tokscale.cmd` path broke in the built exe. require.resolve
// also follows Electron's asar.unpacked redirection, so it works both in dev
// and in the packaged app. The entry is then run with Electron's own Node
// (process.execPath), which is always present.
function resolveBin(name) {
  // Explicit override wins (TOKSCALE_BIN / CCUSAGE_BIN), treated as a full path.
  const override = process.env[`${name.toUpperCase()}_BIN`];
  if (override) return { command: override, prefix: [] };
  try {
    const pkg = require(`${name}/package.json`);
    const rel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin && pkg.bin[name];
    if (rel) {
      const entry = require.resolve(`${name}/${rel.replace(/^\.\//, "")}`);
      return { command: process.execPath, prefix: [entry] };
    }
  } catch (_) { /* fall through to PATH lookup */ }
  // Last resort: rely on the CLI being on PATH (dev machines with global installs).
  const suffix = process.platform === "win32" ? ".cmd" : "";
  return { command: name + suffix, prefix: [] };
}

function runCli(spec, label, args) {
  // `spec` is { command, prefix } from resolveBin; or a bare string (PATH name).
  const command = typeof spec === "string" ? spec : spec.command;
  const fullArgs = typeof spec === "string" ? args : [...spec.prefix, ...args];
  // Only use a shell when invoking a PATH name / .cmd shim; never when running
  // an absolute exe + script args (avoids quoting bugs with spaces in paths).
  const useShell = process.platform === "win32" && command === process.execPath ? false
    : process.platform === "win32";
  return new Promise((resolve, reject) => {
    execFile(
      command,
      fullArgs,
      {
        shell: useShell,
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024,
        timeout: USAGE_CLI_TIMEOUT_MS,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${label} 执行失败: ${stderr || error.message}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          reject(new Error(`${label} JSON 解析失败: ${parseError.message}\n${stdout.slice(0, 500)}`));
        }
      },
    );
  });
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeClient(client) {
  if (client === "claude" || client === "antigravity" || client === "all") {
    return client;
  }
  return "codex";
}

function tokscaleClientValue(client) {
  return client === "all" ? "codex,claude,antigravity" : client;
}

function ccusageRangeArgs(query = {}) {
  const range = query.range || "today";
  const today = new Date();
  if (range === "today") {
    const date = isoDate(today);
    return ["--since", date, "--until", date];
  }
  if (range === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return ["--since", isoDate(start), "--until", isoDate(today)];
  }
  if (range === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return ["--since", isoDate(start), "--until", isoDate(today)];
  }
  if (range === "year") {
    const start = new Date(today.getFullYear(), 0, 1);
    return ["--since", isoDate(start), "--until", isoDate(today)];
  }
  if (range === "all") {
    return [];
  }
  if (range === "custom") {
    const args = [];
    if (query.since) args.push("--since", query.since);
    if (query.until) args.push("--until", query.until);
    return args;
  }
  return [];
}

function rangeArgs(query = {}) {
  const range = query.range || "today";
  if (range === "today") return ["--today"];
  if (range === "week") return ["--week"];
  if (range === "month") return ["--month"];
  if (range === "year") {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    return ["--since", isoDate(start), "--until", isoDate(today)];
  }
  if (range === "all") return [];
  if (range === "custom") {
    const args = [];
    if (query.since) args.push("--since", query.since);
    if (query.until) args.push("--until", query.until);
    return args;
  }
  return [];
}

function ccusageValue(report, field) {
  const totals = report?.totals || {};
  if (field === "cost") {
    return Number(totals.costUSD ?? totals.totalCost ?? 0) || 0;
  }
  if (field === "cache") {
    return Number(totals.cachedInputTokens ?? totals.cacheReadTokens ?? 0) || 0;
  }
  return Number(totals[field] || 0) || 0;
}

function combineCcusageReports(reports) {
  const totals = (Array.isArray(reports) ? reports : []).reduce(
    (sum, report) => {
      sum.inputTokens += ccusageValue(report, "inputTokens");
      sum.outputTokens += ccusageValue(report, "outputTokens");
      sum.cachedInputTokens += ccusageValue(report, "cache");
      sum.cacheReadTokens += ccusageValue(report, "cache");
      sum.reasoningOutputTokens += ccusageValue(report, "reasoningOutputTokens");
      sum.totalTokens += ccusageValue(report, "totalTokens");
      sum.costUSD += ccusageValue(report, "cost");
      sum.totalCost += ccusageValue(report, "cost");
      return sum;
    },
    {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      cacheReadTokens: 0,
      reasoningOutputTokens: 0,
      totalTokens: 0,
      costUSD: 0,
      totalCost: 0,
    },
  );
  return { daily: (Array.isArray(reports) ? reports : []).flatMap((report) => report?.daily || []), totals };
}

// ccusage rescans the entire Claude/Codex history on every call (10-40s for the
// "all" client over wide ranges). Cache results briefly so switching clients or
// ranges back and forth is instant; the manual 刷新 button passes force=true to
// fetch fresh data on demand.
const CCUSAGE_CACHE_TTL_MS = 60_000;
const ccusageCache = new Map();

async function loadCcusage(client, query, force = false) {
  if (client === "antigravity") {
    return { daily: [], totals: {} };
  }
  const ccusageBin = resolveBin("ccusage");
  const range = ccusageRangeArgs(query);
  const cacheKey = `${client}|${range.join("")}`;
  if (!force) {
    const hit = ccusageCache.get(cacheKey);
    if (hit && Date.now() - hit.ts < CCUSAGE_CACHE_TTL_MS) return hit.data;
  }

  let data;
  if (client === "all") {
    const [codex, claude] = await Promise.all([
      runCli(ccusageBin, "ccusage", ["codex", "daily", "--json", ...range]),
      runCli(ccusageBin, "ccusage", ["claude", "daily", "--json", ...range]),
    ]);
    data = combineCcusageReports([codex, claude]);
  } else {
    data = await runCli(ccusageBin, "ccusage", [client, "daily", "--json", ...range]);
  }

  ccusageCache.set(cacheKey, { ts: Date.now(), data });
  return data;
}

let scanCache = null;

function initScanCache() {
  if (scanCache) return scanCache;

  const mapping = new Map();
  const searchDirs = [
    process.env.TOOL_MASTER_WORK_ROOT,
    path.join(os.homedir(), "projects"),
    path.join(os.homedir(), "Documents"),
    path.join(os.homedir(), "Desktop"),
  ].filter(Boolean);

  function traverse(dir, depth = 0) {
    if (depth > 2) return;
    try {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const name = entry.name;
          if (name === "node_modules" || name === ".git" || name === ".codegraph" || name === ".claude") {
            continue;
          }
          const fullPath = path.join(dir, name);
          
          const normalKey = fullPath
            .replace(/\\/g, "/")
            .replace(/^[a-zA-Z]:/, (m) => m[0].toUpperCase() + "-")
            .replace(/[\/:]/g, "-");
            
          const asciiOnlyKey = normalKey.replace(/[^\x00-\x7F]/g, "-");

          const meta = { path: fullPath, name: name };
          mapping.set(normalKey.toLowerCase(), meta);
          mapping.set(asciiOnlyKey.toLowerCase(), meta);
          
          traverse(fullPath, depth + 1);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  for (const root of searchDirs) {
    traverse(root);
  }

  scanCache = mapping;
  return scanCache;
}

function findOriginalCwdFromSession(key) {
  try {
    const home = os.homedir();
    const projectDir = path.join(home, ".claude", "projects", key);
    if (!fs.existsSync(projectDir)) return null;
    
    const files = fs.readdirSync(projectDir);
    for (const file of files) {
      if (file.endsWith(".jsonl")) {
        const filePath = path.join(projectDir, file);
        const fd = fs.openSync(filePath, "r");
        const buffer = Buffer.alloc(100 * 1024);
        const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
        fs.closeSync(fd);
        
        const content = buffer.toString("utf8", 0, bytesRead);
        const match = content.match(/"cwd"\s*:\s*"([^"]+)"/);
        if (match) {
          return match[1].replace(/\\\\/g, "\\");
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function resolveWorkspace(key, label, cache) {
  const cleanKey = (key || "").toLowerCase();
  const cleanLabel = (label || "").toLowerCase();
  
  // 1. Try exact lookup in cache
  if (cache.has(cleanKey)) {
    const meta = cache.get(cleanKey);
    return {
      existsLocally: true,
      displayPath: meta.path,
      realName: meta.name
    };
  }
  
  if (cache.has(cleanLabel)) {
    const meta = cache.get(cleanLabel);
    return {
      existsLocally: true,
      displayPath: meta.path,
      realName: meta.name
    };
  }

  // 2. Try session lookup for Claude Code projects to get original cwd
  if (key) {
    const sessionCwd = findOriginalCwdFromSession(key);
    if (sessionCwd) {
      const norm = path.normalize(sessionCwd);
      const exists = fs.existsSync(norm);
      return {
        existsLocally: exists,
        displayPath: norm,
        realName: path.basename(norm)
      };
    }
  }

  // 3. If key looks like a path already
  if (key && (key.includes("/") || key.includes("\\"))) {
    const norm = path.normalize(key);
    if (fs.existsSync(norm)) {
      return {
        existsLocally: true,
        displayPath: norm,
        realName: path.basename(norm)
      };
    }
  }

  // 4. Try parsing D--work-... style path (fallback fallback)
  if (key && key.match(/^[a-zA-Z]--/)) {
    let reconstructed = key.replace(/^([a-zA-Z])--/, "$1:\\");
    let parts = reconstructed.split("-");
    if (parts.length > 1) {
      let currentTry = parts[0];
      for (let i = 1; i < parts.length; i++) {
        const nextTryWithSep = currentTry + "\\" + parts.slice(i).join("-");
        if (fs.existsSync(nextTryWithSep)) {
          return {
            existsLocally: true,
            displayPath: nextTryWithSep,
            realName: path.basename(nextTryWithSep)
          };
        }
        currentTry = currentTry + "-" + parts[i];
      }
    }
  }

  // 5. Fallback for non-existent local projects
  let displayName = label || key || "未识别项目";
  if (displayName.startsWith("D--work-")) {
    displayName = displayName.replace("D--work-", "");
  }
  
  return {
    existsLocally: false,
    displayPath: key || "",
    realName: displayName
  };
}

async function buildUsageReport(query = {}) {
  const client = normalizeClient(query.client || "codex");
  const force = query.force === true;
  if (force || client === "antigravity") {
    await syncAntigravitySessions();
  }
  scanCache = null; // reset cache on each refresh
  const provider = query.provider || "combined";
  const tokscaleBin = resolveBin("tokscale");
  const tokscaleClient = tokscaleClientValue(client);
  const common = ["--client", tokscaleClient, "--json", "--no-spinner", ...rangeArgs(query)];
  const ccusageTask = provider !== "tokscale" && force
    ? withTimeout(loadCcusage(client, query, true), 12_000, "ccusage")
    : Promise.resolve(null);

  // Each source is fetched independently with allSettled: a failure in one
  // (e.g. tokscale's internal LiteLLM parse error, or a flaky ccusage scan)
  // degrades that one section to empty rather than crashing the whole report.
  const settled = await Promise.allSettled([
    runCli(tokscaleBin, "tokscale", ["--group-by", "workspace,model", ...common]),
    runCli(tokscaleBin, "tokscale", ["hourly", ...common]),
    runCli(tokscaleBin, "tokscale", ["clients", "--json"]),
    ccusageTask,
  ]);

  const warnings = [];
  const pick = (index, label, fallback) => {
    const r = settled[index];
    if (r.status === "fulfilled") return r.value;
    warnings.push(label);
    return fallback;
  };
  const summary = pick(0, "用量明细", { entries: [], totalCost: 0, totalInput: 0, totalOutput: 0, totalCacheRead: 0, totalMessages: 0 });
  const hourly = pick(1, "用量趋势", { entries: [] });
  const clients = pick(2, "客户端列表", { clients: [] });
  const ccusage = pick(3, "成本数据", null);

  if (summary && summary.entries) {
    if (client === "antigravity") {
      // tokscale can't break Antigravity down by workspace, so swap its single
      // collapsed row for our per-conversation breakdown (fall back to the
      // collapsed row if the local session cache is empty for this range).
      const breakdown = buildAntigravityProjectEntries(query, summary.totalCost);
      if (breakdown.length) summary.entries = breakdown;
    } else if (client === "all") {
      const cache = initScanCache();
      const others = [];
      const collapsedAg = [];
      let agCost = 0;
      for (const entry of summary.entries) {
        if (entry.client === "antigravity") {
          collapsedAg.push(entry);
          agCost += Number(entry.cost) || 0;
          continue;
        }
        const resolved = resolveWorkspace(entry.workspaceKey, entry.workspaceLabel, cache);
        entry.existsLocally = resolved.existsLocally;
        entry.displayPath = resolved.displayPath;
        entry.realName = resolved.realName;
        others.push(entry);
      }
      const agBreakdown = buildAntigravityProjectEntries(query, agCost);
      summary.entries = others.concat(agBreakdown.length ? agBreakdown : collapsedAg);
    } else {
      const cache = initScanCache();
      for (const entry of summary.entries) {
        const resolved = resolveWorkspace(entry.workspaceKey, entry.workspaceLabel, cache);
        entry.existsLocally = resolved.existsLocally;
        entry.displayPath = resolved.displayPath;
        entry.realName = resolved.realName;
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    client,
    provider,
    range: query.range || "today",
    summary,
    hourly,
    clients,
    ccusage,
    warnings,
  };
}

module.exports = {
  buildAntigravityCacheLines,
  buildUsageReport,
  ccusageRangeArgs,
  combineCcusageReports,
  normalizeClient,
  rangeArgs,
  tokscaleClientValue,
};
