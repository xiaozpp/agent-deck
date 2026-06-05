function decodeTomlString(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseTomlValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((part) => decodeTomlString(part.trim()))
      .filter(Boolean);
  }
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return decodeTomlString(trimmed);
}

function encodeTomlString(value) {
  return JSON.stringify(String(value));
}

function encodeTomlValue(value) {
  if (Array.isArray(value)) return `[${value.map(encodeTomlString).join(", ")}]`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return encodeTomlString(value);
}

function parseCodexServerSection(sectionName) {
  if (!sectionName.startsWith("mcp_servers.")) return null;
  let rest = sectionName.slice("mcp_servers.".length);
  const nested = rest.match(/^(.*)\.(env|headers)$/);
  const table = nested ? nested[2] : "server";
  if (nested) rest = nested[1];
  const name = decodeTomlString(rest);
  return name ? { name, table } : null;
}

function parseCodexToml(content) {
  const mcpServers = {};
  let current = null;

  for (const line of content.split(/\r?\n/)) {
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch) {
      current = parseCodexServerSection(sectionMatch[1].trim());
      if (current && !mcpServers[current.name]) mcpServers[current.name] = {};
      continue;
    }

    if (!current) continue;
    const keyMatch = line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/);
    if (!keyMatch) continue;

    const target = current.table === "server"
      ? mcpServers[current.name]
      : (mcpServers[current.name][current.table] ||= {});
    target[keyMatch[1]] = parseTomlValue(keyMatch[2]);
  }

  return { mcpServers };
}

function serializeCodexServer(name, raw) {
  const lines = [`[mcp_servers.${encodeTomlString(name)}]`];
  for (const key of ["command", "args", "url", "type", "disabled", "startup_timeout_sec"]) {
    const value = raw[key];
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    lines.push(`${key} = ${encodeTomlValue(value)}`);
  }
  for (const table of ["headers", "env"]) {
    if (!raw[table] || Object.keys(raw[table]).length === 0) continue;
    lines.push("");
    lines.push(`[mcp_servers.${encodeTomlString(name)}.${table}]`);
    for (const [key, value] of Object.entries(raw[table])) {
      lines.push(`${key} = ${encodeTomlValue(value)}`);
    }
  }
  return lines.join("\n");
}

function stripCodexMcpServers(content) {
  const lines = content.split(/\r?\n/);
  const kept = [];
  let skipping = false;

  for (const line of lines) {
    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch) skipping = Boolean(parseCodexServerSection(sectionMatch[1].trim()));
    if (!skipping) kept.push(line);
  }

  return kept.join("\n").replace(/\s+$/, "");
}

function readCodexTomlConfig(readText, filePath) {
  const content = readText(filePath);
  return content ? parseCodexToml(content) : null;
}

function writeCodexTomlConfig({ readText, writeTextSafe }, filePath, data) {
  const base = stripCodexMcpServers(readText(filePath));
  const serverBlocks = Object.entries(data.mcpServers || {})
    .map(([name, raw]) => serializeCodexServer(name, raw))
    .join("\n\n");
  const content = [base, serverBlocks].filter(Boolean).join("\n\n") + "\n";
  return writeTextSafe(filePath, content);
}

module.exports = {
  parseCodexToml,
  readCodexTomlConfig,
  writeCodexTomlConfig,
};
