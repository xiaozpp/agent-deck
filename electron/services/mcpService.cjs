const { MCP_CLIENTS } = require("./mcp/clientDefinitions.cjs");
const fileStore = require("./mcp/fileStore.cjs");
const os = require("node:os");
const path = require("node:path");
const { readJsonConfig, writeJsonConfig } = require("./mcp/jsonAdapter.cjs");
const { readCodexTomlConfig, writeCodexTomlConfig } = require("./mcp/codexTomlAdapter.cjs");
const { listMcpPresets, getMcpPreset } = require("./mcp/presetCatalog.cjs");

function extractServers(configData) {
  if (!configData || typeof configData !== "object") return {};
  return configData.mcpServers || {};
}

function readClientData(client) {
  if (client.format === "codex-toml") {
    return readCodexTomlConfig(fileStore.readText, client.configPath);
  }
  return readJsonConfig(fileStore.readJson, client.configPath);
}

function writeClientData(client, data) {
  if (client.format === "codex-toml") {
    return writeCodexTomlConfig(fileStore, client.configPath, data);
  }
  return writeJsonConfig(fileStore.writeJsonSafe, client.configPath, data);
}

function normalizeServer(name, raw, clientId) {
  const transport = raw.url ? "remote" : "stdio";
  const issues = serverIssues(raw);
  return {
    name,
    clientId,
    transport,
    enabled: !raw.disabled,
    command: raw.command || "",
    args: Array.isArray(raw.args) ? raw.args : [],
    env: raw.env && typeof raw.env === "object" ? { ...raw.env } : {},
    url: raw.url || "",
    headers: raw.headers && typeof raw.headers === "object" ? { ...raw.headers } : {},
    type: raw.type || "",
    issues,
  };
}

function unresolvedVariables(value, out = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$\{([A-Z0-9_]+)\}/g)) out.add(match[1]);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) unresolvedVariables(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) unresolvedVariables(item, out);
  }
  return out;
}

function serverIssues(raw = {}) {
  const issues = [];
  if (raw.url) {
    if (!/^https?:\/\//i.test(raw.url)) issues.push("remote-url-invalid");
  } else if (!raw.command) {
    issues.push("stdio-command-missing");
  } else if (!commandAvailable(raw.command)) {
    issues.push(`command-not-found:${raw.command}`);
  }
  for (const name of unresolvedVariables(raw)) {
    issues.push(`placeholder:${name}`);
  }
  return issues;
}

function commandAvailable(command) {
  if (!command || /[\\/]/.test(command)) return true;
  const dirs = String(process.env.PATH || "").split(path.delimiter).filter(Boolean);
  const extensions = process.platform === "win32" ? ["", ".cmd", ".exe", ".bat", ".ps1"] : [""];
  return dirs.some((dir) => extensions.some((ext) => fileStore.exists(path.join(dir, command + ext))));
}

function listClients() {
  return MCP_CLIENTS.map((client) => {
    const configExists = fileStore.exists(client.configPath);
    const data = configExists ? readClientData(client) : null;
    const servers = extractServers(data);
    const serverCount = Object.keys(servers).length;
    const enabledCount = Object.values(servers).filter((s) => !s.disabled).length;
    return {
      id: client.id,
      label: client.label,
      configPath: client.configPath,
      configExists,
      docUrl: client.docUrl,
      serverCount,
      enabledCount,
    };
  });
}

function listServers(clientId) {
  const clients = clientId ? MCP_CLIENTS.filter((c) => c.id === clientId) : MCP_CLIENTS;
  const result = [];

  for (const client of clients) {
    const data = readClientData(client);
    const servers = extractServers(data);
    for (const [name, raw] of Object.entries(servers)) {
      result.push(normalizeServer(name, raw, client.id));
    }
  }

  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

function readClientConfig(clientId) {
  const client = MCP_CLIENTS.find((c) => c.id === clientId);
  if (!client) throw new Error(`Unknown MCP client: ${clientId}`);

  const configExists = fileStore.exists(client.configPath);
  const data = configExists ? readClientData(client) : null;
  const servers = extractServers(data);
  const normalized = Object.entries(servers).map(([name, raw]) =>
    normalizeServer(name, raw, clientId),
  );
  normalized.sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: client.id,
    label: client.label,
    configPath: client.configPath,
    docUrl: client.docUrl,
    configExists,
    rawJson: configExists ? fileStore.readText(client.configPath) : "",
    servers: normalized,
  };
}

function toggleServer(clientId, serverName, enabled) {
  const client = MCP_CLIENTS.find((c) => c.id === clientId);
  if (!client) throw new Error(`Unknown MCP client: ${clientId}`);

  const data = readClientData(client);
  if (!data) throw new Error(`Config file not found: ${client.configPath}`);

  const servers = data.mcpServers || {};
  const entry = servers[serverName];
  if (!entry) throw new Error(`Server "${serverName}" not found in ${client.label}.`);

  if (enabled) {
    delete entry.disabled;
  } else {
    entry.disabled = true;
  }

  const backup = writeClientData(client, data);
  return { ok: true, backup };
}

function saveServer(clientId, serverData) {
  const client = MCP_CLIENTS.find((c) => c.id === clientId);
  if (!client) throw new Error(`Unknown MCP client: ${clientId}`);
  if (!serverData || !serverData.name) throw new Error("Server name is required.");

  const data = readClientData(client) || {};
  if (!data.mcpServers) data.mcpServers = {};

  const entry = {};
  if (serverData.url) {
    entry.url = serverData.url;
    if (serverData.headers && Object.keys(serverData.headers).length > 0) {
      entry.headers = serverData.headers;
    }
  } else {
    if (serverData.command) entry.command = serverData.command;
    if (Array.isArray(serverData.args) && serverData.args.length > 0) entry.args = serverData.args;
  }
  if (serverData.env && Object.keys(serverData.env).length > 0) {
    entry.env = serverData.env;
  }
  if (serverData.type) entry.type = serverData.type;

  data.mcpServers[serverData.name] = entry;
  const backup = writeClientData(client, data);
  return { ok: true, backup };
}

function removeServer(clientId, serverName) {
  const client = MCP_CLIENTS.find((c) => c.id === clientId);
  if (!client) throw new Error(`Unknown MCP client: ${clientId}`);

  const data = readClientData(client);
  if (!data || !data.mcpServers) throw new Error("Config file not found or empty.");

  if (!data.mcpServers[serverName]) {
    throw new Error(`Server "${serverName}" not found in ${client.label}.`);
  }

  delete data.mcpServers[serverName];
  const backup = writeClientData(client, data);
  return { ok: true, backup };
}

function duplicateServer(sourceClientId, serverName, targetClientId) {
  const sourceClient = MCP_CLIENTS.find((c) => c.id === sourceClientId);
  const targetClient = MCP_CLIENTS.find((c) => c.id === targetClientId);
  if (!sourceClient) throw new Error(`Unknown source client: ${sourceClientId}`);
  if (!targetClient) throw new Error(`Unknown target client: ${targetClientId}`);

  const sourceData = readClientData(sourceClient);
  if (!sourceData?.mcpServers?.[serverName]) {
    throw new Error(`Server "${serverName}" not found in ${sourceClient.label}.`);
  }

  const entry = JSON.parse(JSON.stringify(sourceData.mcpServers[serverName]));
  const targetData = readClientData(targetClient) || {};
  if (!targetData.mcpServers) targetData.mcpServers = {};
  targetData.mcpServers[serverName] = entry;

  const backup = writeClientData(targetClient, targetData);
  return { ok: true, backup };
}

function expandPresetValue(value, variables = {}) {
  if (typeof value === "string") {
    return value.replace(/\$\{([A-Z0-9_]+)\}/g, (match, name) => {
      if (Object.prototype.hasOwnProperty.call(variables, name)) {
        const replacement = variables[name];
        if ((replacement == null || replacement === "") && name === "HOME") return os.homedir();
        return String(replacement ?? "");
      }
      if (name === "HOME") return os.homedir();
      return match;
    });
  }
  if (Array.isArray(value)) return value.map((item) => expandPresetValue(item, variables));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expandPresetValue(item, variables)]));
  }
  return value;
}

// Install a curated preset into a client by reusing the safe saveServer path.
function installPreset(clientId, presetId, variables = {}) {
  const preset = getMcpPreset(presetId);
  if (!preset) throw new Error(`Unknown MCP preset: ${presetId}`);
  const i = expandPresetValue(preset.install || {}, variables);
  const serverData = {
    name: preset.name,
    url: i.url || "",
    headers: i.headers && typeof i.headers === "object" ? { ...i.headers } : {},
    command: i.command || "",
    args: Array.isArray(i.args) ? i.args : [],
    env: i.env && typeof i.env === "object" ? { ...i.env } : {},
    type: i.type || "",
  };
  const res = saveServer(clientId, serverData);
  return { ...res, name: preset.name };
}

module.exports = {
  MCP_CLIENTS,
  listClients,
  listServers,
  readClientConfig,
  toggleServer,
  saveServer,
  removeServer,
  duplicateServer,
  listMcpPresets,
  installPreset,
  expandPresetValue,
  serverIssues,
  commandAvailable,
};
