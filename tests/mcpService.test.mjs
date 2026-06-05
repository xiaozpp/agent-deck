import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

import {
  listClients,
  listServers,
  toggleServer,
  saveServer,
  removeServer,
  duplicateServer,
  installPreset,
  listMcpPresets,
  serverIssues,
  MCP_CLIENTS,
} from "../electron/services/mcpService.cjs";
import {
  exportMcpPreset,
  exportLocalMcpPresets,
  importLocalMcpPresets,
} from "../electron/services/mcp/presetCatalog.cjs";

test("mcp service exposes known client definitions", () => {
  const ids = MCP_CLIENTS.map((c) => c.id);
  assert.deepEqual(ids, ["antigravity", "claude-code", "codex"]);
});

test("mcp service lists clients and reports detection status", () => {
  const clients = listClients();
  assert.equal(clients.length, MCP_CLIENTS.length);
  for (const client of clients) {
    assert.equal(typeof client.configExists, "boolean");
    assert.equal(typeof client.serverCount, "number");
    assert.equal(typeof client.enabledCount, "number");
  }
});

test("mcp service performs CRUD and toggle on a temp config", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-mcp-"));
  const configPath = path.join(dir, "mcp.json");
  fs.writeFileSync(configPath, JSON.stringify({ mcpServers: {} }), "utf8");

  const testClient = { id: "__test__", label: "Test", configPath, docUrl: "", format: "json" };
  MCP_CLIENTS.push(testClient);

  try {
    saveServer("__test__", { name: "my-server", command: "npx", args: ["-y", "pkg"] });
    let servers = listServers("__test__");
    assert.equal(servers.length, 1);
    assert.equal(servers[0].name, "my-server");
    assert.equal(servers[0].command, "npx");
    assert.deepEqual(servers[0].args, ["-y", "pkg"]);
    assert.equal(servers[0].enabled, true);

    toggleServer("__test__", "my-server", false);
    servers = listServers("__test__");
    assert.equal(servers[0].enabled, false);

    toggleServer("__test__", "my-server", true);
    servers = listServers("__test__");
    assert.equal(servers[0].enabled, true);

    removeServer("__test__", "my-server");
    servers = listServers("__test__");
    assert.equal(servers.length, 0);
  } finally {
    const idx = MCP_CLIENTS.findIndex((c) => c.id === "__test__");
    if (idx !== -1) MCP_CLIENTS.splice(idx, 1);
  }
});

test("mcp service creates Antigravity MCP JSON config from an empty file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-ag-mcp-"));
  const configPath = path.join(dir, "mcp_config.json");
  fs.writeFileSync(configPath, "", "utf8");

  const client = { id: "__antigravity__", label: "反重力", configPath, docUrl: "", format: "json" };
  MCP_CLIENTS.push(client);

  try {
    saveServer("__antigravity__", { name: "codegraph", command: "codegraph", args: ["serve", "--mcp"] });
    const servers = listServers("__antigravity__");
    assert.equal(servers.length, 1);
    assert.equal(servers[0].name, "codegraph");
    assert.deepEqual(servers[0].args, ["serve", "--mcp"]);
    assert.deepEqual(JSON.parse(fs.readFileSync(configPath, "utf8")), {
      mcpServers: {
        codegraph: {
          command: "codegraph",
          args: ["serve", "--mcp"],
        },
      },
    });
  } finally {
    const idx = MCP_CLIENTS.findIndex((c) => c.id === "__antigravity__");
    if (idx !== -1) MCP_CLIENTS.splice(idx, 1);
  }
});

test("mcp service reads and updates Codex TOML MCP servers", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-codex-mcp-"));
  const configPath = path.join(dir, "config.toml");
  fs.writeFileSync(configPath, [
    'model = "gpt-5.5"',
    "",
    "[mcp_servers.codegraph]",
    'command = "codegraph"',
    'args = ["serve", "--mcp"]',
    "",
    "[mcp_servers.node_repl]",
    'command = "node_repl.exe"',
    "startup_timeout_sec = 120",
    "",
    "[mcp_servers.node_repl.env]",
    'CODEX_HOME = "C:\\\\Users\\\\Example\\\\.codex"',
    "",
    "[features]",
    "js_repl = false",
    "",
  ].join("\n"), "utf8");

  const client = { id: "__codex__", label: "Codex", configPath, docUrl: "", format: "codex-toml" };
  MCP_CLIENTS.push(client);

  try {
    let servers = listServers("__codex__");
    assert.equal(servers.length, 2);
    assert.equal(servers[0].name, "codegraph");
    assert.equal(servers[0].command, "codegraph");
    assert.deepEqual(servers[0].args, ["serve", "--mcp"]);
    assert.equal(servers[1].name, "node_repl");
    assert.deepEqual(servers[1].env, { CODEX_HOME: "C:\\Users\\Example\\.codex" });

    toggleServer("__codex__", "codegraph", false);
    servers = listServers("__codex__");
    assert.equal(servers.find((s) => s.name === "codegraph").enabled, false);

    saveServer("__codex__", { name: "local-tool", command: "tool", args: ["serve"], env: { API_KEY: "x" } });
    const content = fs.readFileSync(configPath, "utf8");
    assert.ok(content.includes('model = "gpt-5.5"'));
    assert.match(content, /\[features\]\njs_repl = false/);
    assert.match(content, /\[mcp_servers\."local-tool"\]/);
    assert.match(content, /API_KEY = "x"/);
  } finally {
    const idx = MCP_CLIENTS.findIndex((c) => c.id === "__codex__");
    if (idx !== -1) MCP_CLIENTS.splice(idx, 1);
  }
});

test("mcp service duplicates a server across clients", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-mcp-dup-"));
  const srcPath = path.join(dir, "src.json");
  const dstPath = path.join(dir, "dst.json");
  fs.writeFileSync(srcPath, JSON.stringify({
    mcpServers: { "brave-search": { command: "npx", args: ["-y", "@anthropic/mcp-brave"], env: { BRAVE_KEY: "xxx" } } },
  }), "utf8");
  fs.writeFileSync(dstPath, JSON.stringify({ mcpServers: {} }), "utf8");

  const src = { id: "__src__", label: "Src", configPath: srcPath, docUrl: "", format: "json" };
  const dst = { id: "__dst__", label: "Dst", configPath: dstPath, docUrl: "", format: "json" };
  MCP_CLIENTS.push(src, dst);

  try {
    duplicateServer("__src__", "brave-search", "__dst__");
    const dstServers = listServers("__dst__");
    assert.equal(dstServers.length, 1);
    assert.equal(dstServers[0].name, "brave-search");
    assert.equal(dstServers[0].command, "npx");
    assert.deepEqual(dstServers[0].env, { BRAVE_KEY: "xxx" });
  } finally {
    MCP_CLIENTS.splice(MCP_CLIENTS.findIndex((c) => c.id === "__src__"), 1);
    MCP_CLIENTS.splice(MCP_CLIENTS.findIndex((c) => c.id === "__dst__"), 1);
  }
});

test("mcp presets hide install payloads but expose required variables", () => {
  const presets = listMcpPresets();
  const github = presets.find((preset) => preset.id === "github");
  const filesystem = presets.find((preset) => preset.id === "filesystem");

  assert.ok(github);
  assert.equal(Object.hasOwn(github, "install"), false);
  assert.deepEqual(github.variables, [{ name: "GITHUB_TOKEN", secret: true, defaultValue: "" }]);
  assert.ok(filesystem);
  assert.deepEqual(filesystem.variables, [{ name: "HOME", secret: false, defaultValue: "${HOME}" }]);
});

test("mcp single preset export includes install payload", () => {
  const exported = exportMcpPreset("filesystem");
  assert.equal(exported.preset.id, "filesystem");
  assert.deepEqual(exported.preset.install.args.slice(0, 2), ["-y", "@modelcontextprotocol/server-filesystem"]);
});

test("mcp service installs presets with variable substitution", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-mcp-preset-"));
  const configPath = path.join(dir, "mcp.json");
  fs.writeFileSync(configPath, JSON.stringify({ mcpServers: {} }), "utf8");

  const client = { id: "__preset__", label: "Preset", configPath, docUrl: "", format: "json" };
  MCP_CLIENTS.push(client);

  try {
    installPreset("__preset__", "github", { GITHUB_TOKEN: "ghp_example" });
    const servers = listServers("__preset__");
    assert.equal(servers.length, 1);
    assert.equal(servers[0].name, "github");
    assert.equal(servers[0].url, "https://api.githubcopilot.com/mcp/");
    assert.deepEqual(servers[0].headers, { Authorization: "Bearer ghp_example" });
  } finally {
    const idx = MCP_CLIENTS.findIndex((c) => c.id === "__preset__");
    if (idx !== -1) MCP_CLIENTS.splice(idx, 1);
  }
});

test("mcp preset HOME variable falls back when left blank", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-mcp-home-"));
  const configPath = path.join(dir, "mcp.json");
  fs.writeFileSync(configPath, JSON.stringify({ mcpServers: {} }), "utf8");

  const client = { id: "__preset_home__", label: "Preset Home", configPath, docUrl: "", format: "json" };
  MCP_CLIENTS.push(client);

  try {
    installPreset("__preset_home__", "filesystem", { HOME: "" });
    const servers = listServers("__preset_home__");
    assert.equal(servers.length, 1);
    assert.equal(servers[0].name, "filesystem");
    assert.equal(servers[0].args.at(-1), os.homedir());
  } finally {
    const idx = MCP_CLIENTS.findIndex((c) => c.id === "__preset_home__");
    if (idx !== -1) MCP_CLIENTS.splice(idx, 1);
  }
});

test("mcp service reports lightweight configuration issues", () => {
  assert.deepEqual(serverIssues({ command: "" }), ["stdio-command-missing"]);
  assert.deepEqual(serverIssues({ url: "localhost:3000" }), ["remote-url-invalid"]);
  assert.ok(serverIssues({ command: "definitely-missing-agent-deck-command" }).includes("command-not-found:definitely-missing-agent-deck-command"));
  const withPlaceholder = serverIssues({ command: "C:\\tools\\npx.exe", env: { TOKEN: "${API_TOKEN}" } });
  assert.deepEqual(withPlaceholder, ["placeholder:API_TOKEN"]);
});

test("mcp presets can be extended from config/mcp-presets.json", () => {
  const configDir = path.resolve("config");
  const configPath = path.join(configDir, "mcp-presets.json");
  const previous = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : null;
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify([
    {
      id: "local-test",
      name: "local-test",
      title: "Local Test",
      author: "local",
      description: "Local preset",
      category: "Local",
      runtime: "npx",
      transport: "stdio",
      install: { command: "npx", args: ["-y", "local-test", "${LOCAL_TOKEN}"] },
    },
  ]), "utf8");

  try {
    const local = listMcpPresets().find((preset) => preset.id === "local-test");
    assert.ok(local);
    assert.deepEqual(local.variables, [{ name: "LOCAL_TOKEN", secret: true, defaultValue: "" }]);
  } finally {
    if (previous == null) {
      fs.rmSync(configPath, { force: true });
      try { fs.rmdirSync(configDir); } catch {}
    } else {
      fs.writeFileSync(configPath, previous, "utf8");
    }
  }
});

test("mcp local presets can be imported and exported", () => {
  const configDir = path.resolve("config");
  const configPath = path.join(configDir, "mcp-presets.json");
  const previous = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : null;
  fs.mkdirSync(configDir, { recursive: true });

  try {
    const result = importLocalMcpPresets(JSON.stringify({
      id: "imported-local",
      name: "imported-local",
      title: "Imported Local",
      category: "Local",
      runtime: "npx",
      transport: "stdio",
      install: { command: "npx", args: ["-y", "imported-local"] },
    }));
    assert.equal(result.ok, true);
    assert.equal(result.count, 1);

    const exported = exportLocalMcpPresets();
    assert.equal(exported.file, configPath);
    assert.equal(exported.presets.some((preset) => preset.id === "imported-local"), true);
  } finally {
    if (previous == null) {
      fs.rmSync(configPath, { force: true });
      try { fs.rmdirSync(configDir); } catch {}
    } else {
      fs.writeFileSync(configPath, previous, "utf8");
    }
  }
});
