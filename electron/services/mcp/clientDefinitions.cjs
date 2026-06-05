const path = require("node:path");
const os = require("node:os");

const HOME = os.homedir();

const MCP_CLIENTS = [
  {
    id: "antigravity",
    label: "反重力",
    configPath: path.join(HOME, ".gemini", "antigravity", "mcp_config.json"),
    docUrl: "",
    format: "json",
  },
  {
    id: "claude-code",
    label: "Claude Code",
    configPath: path.join(HOME, ".claude.json"),
    docUrl: "https://docs.anthropic.com/en/docs/claude-code/mcp",
    format: "json",
  },
  {
    id: "codex",
    label: "Codex",
    configPath: path.join(HOME, ".codex", "config.toml"),
    docUrl: "",
    format: "codex-toml",
  },
];

module.exports = { MCP_CLIENTS };
