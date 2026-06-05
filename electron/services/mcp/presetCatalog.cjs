// Curated, offline MCP server presets — the "marketplace" shelf.
//
// Only "config-and-go" servers are listed: each installs by writing a config
// entry (stdio via npx/uvx, or a remote URL). Nothing here runs an installer;
// npx/uvx fetch the package on first launch by the agent itself. Servers that
// need a separate `pip install` / build step are intentionally excluded so a
// one-click install never executes arbitrary setup commands.
//
// `install` is the raw entry written into the client config (same shape the
// editor produces). `runtime` is informational for the UI.

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..", "..");

const MCP_PRESETS = [
  {
    id: "filesystem",
    name: "filesystem",
    title: "Filesystem",
    author: "modelcontextprotocol",
    description: "Read/write files in allowed directories. The canonical reference server.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
    category: "Files",
    runtime: "npx",
    transport: "stdio",
    needsConfig: "Replace the final argument with a directory you want to expose.",
    install: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "${HOME}"] },
  },
  {
    id: "git",
    name: "git",
    title: "Git",
    author: "modelcontextprotocol",
    description: "Inspect, search and operate on a Git repository (status, diff, log, commit).",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/git",
    category: "Dev",
    runtime: "uvx",
    transport: "stdio",
    install: { command: "uvx", args: ["mcp-server-git"] },
  },
  {
    id: "fetch",
    name: "fetch",
    title: "Fetch (web)",
    author: "modelcontextprotocol",
    description: "Fetch a URL and convert the page to clean markdown for the model to read.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/fetch",
    category: "Web",
    runtime: "uvx",
    transport: "stdio",
    install: { command: "uvx", args: ["mcp-server-fetch"] },
  },
  {
    id: "memory",
    name: "memory",
    title: "Memory (knowledge graph)",
    author: "modelcontextprotocol",
    description: "A persistent knowledge-graph memory the agent can read and write across sessions.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
    category: "Memory",
    runtime: "npx",
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@modelcontextprotocol/server-memory"] },
  },
  {
    id: "sequential-thinking",
    name: "sequential-thinking",
    title: "Sequential Thinking",
    author: "modelcontextprotocol",
    description: "Structured step-by-step reasoning scaffold for complex multi-step problems.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking",
    category: "Reasoning",
    runtime: "npx",
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@modelcontextprotocol/server-sequential-thinking"] },
  },
  {
    id: "github",
    name: "github",
    title: "GitHub",
    author: "GitHub (official)",
    description: "Official GitHub MCP server: issues, PRs, code search, repo operations.",
    homepage: "https://github.com/github/github-mcp-server",
    category: "Dev",
    runtime: "remote",
    transport: "remote",
    needsConfig: "Requires a GitHub token. Set the Authorization header to `Bearer <your token>`.",
    install: { url: "https://api.githubcopilot.com/mcp/", headers: { Authorization: "Bearer ${GITHUB_TOKEN}" } },
  },
  {
    id: "playwright",
    name: "playwright",
    title: "Playwright (browser)",
    author: "Microsoft",
    description: "Drive a real browser: navigate, click, fill forms, snapshot the DOM.",
    homepage: "https://github.com/microsoft/playwright-mcp",
    category: "Web",
    runtime: "npx",
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@playwright/mcp@latest"] },
  },
  {
    id: "context7",
    name: "context7",
    title: "Context7 (live docs)",
    author: "Upstash",
    description: "Pull up-to-date, version-specific library documentation into the model's context.",
    homepage: "https://github.com/upstash/context7",
    category: "Docs",
    runtime: "npx",
    transport: "stdio",
    install: { command: "npx", args: ["-y", "@upstash/context7-mcp"] },
  },
  {
    id: "time",
    name: "time",
    title: "Time & Timezone",
    author: "modelcontextprotocol",
    description: "Current time and timezone conversions — small, handy, zero-config.",
    homepage: "https://github.com/modelcontextprotocol/servers/tree/main/src/time",
    category: "Utility",
    runtime: "uvx",
    transport: "stdio",
    install: { command: "uvx", args: ["mcp-server-time"] },
  },
];

function collectVariables(value, out = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$\{([A-Z0-9_]+)\}/g)) out.add(match[1]);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectVariables(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectVariables(item, out);
  }
  return out;
}

function presetVariables(preset) {
  return [...collectVariables(preset.install || {})].map((name) => ({
    name,
    secret: /TOKEN|KEY|SECRET|PASSWORD/i.test(name),
    defaultValue: name === "HOME" ? "${HOME}" : "",
  }));
}

function loadLocalMcpPresets() {
  const file = path.join(projectRoot, "config", "mcp-presets.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((preset) => preset && preset.id && preset.name && preset.install);
  } catch (_) {
    return [];
  }
}

function readLocalMcpPresetFile() {
  const file = path.join(projectRoot, "config", "mcp-presets.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeLocalMcpPresets(presets) {
  const file = path.join(projectRoot, "config", "mcp-presets.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(presets, null, 2)}\n`, "utf8");
  return file;
}

function importLocalMcpPresets(raw) {
  const parsed = JSON.parse(raw);
  const incoming = Array.isArray(parsed) ? parsed : [parsed];
  const valid = incoming.filter((preset) => preset && preset.id && preset.name && preset.install);
  if (valid.length === 0) throw new Error("No valid MCP presets found.");
  const map = new Map();
  for (const preset of readLocalMcpPresetFile()) {
    if (preset && preset.id) map.set(preset.id, preset);
  }
  for (const preset of valid) map.set(preset.id, preset);
  const file = writeLocalMcpPresets([...map.values()]);
  return { ok: true, count: valid.length, file };
}

function exportLocalMcpPresets() {
  return {
    file: path.join(projectRoot, "config", "mcp-presets.json"),
    presets: readLocalMcpPresetFile(),
  };
}

function exportMcpPreset(id) {
  const preset = getMcpPreset(id);
  if (!preset) throw new Error(`Unknown MCP preset: ${id}`);
  return { preset };
}

function allMcpPresets() {
  const map = new Map();
  for (const preset of MCP_PRESETS) map.set(preset.id, preset);
  for (const preset of loadLocalMcpPresets()) map.set(preset.id, { ...preset, author: preset.author || "local" });
  return [...map.values()];
}

function listMcpPresets() {
  return allMcpPresets().map((p) => ({
    id: p.id,
    name: p.name,
    title: p.title,
    author: p.author,
    description: p.description,
    homepage: p.homepage,
    category: p.category,
    runtime: p.runtime,
    transport: p.transport,
    needsConfig: p.needsConfig || "",
    variables: presetVariables(p),
  }));
}

function getMcpPreset(id) {
  return allMcpPresets().find((p) => p.id === id) || null;
}

module.exports = {
  MCP_PRESETS,
  allMcpPresets,
  listMcpPresets,
  getMcpPreset,
  presetVariables,
  importLocalMcpPresets,
  exportLocalMcpPresets,
  exportMcpPreset,
};
