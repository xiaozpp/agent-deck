const fs = require("node:fs");
const path = require("node:path");

function configPath(rootDir) {
  return path.join(rootDir, "config", "tools.json");
}

function loadTools(rootDir) {
  const raw = fs.readFileSync(configPath(rootDir), "utf8");
  const tools = JSON.parse(raw);

  if (!Array.isArray(tools)) {
    throw new Error("Tool config must be an array.");
  }

  return tools.map((tool, index) => ({
    favorite: false,
    recommended: false,
    requiresFile: false,
    tags: [],
    ...tool,
    order: index,
  }));
}

function getToolById(tools, id) {
  const tool = tools.find((item) => item.id === id);
  if (!tool) {
    throw new Error(`Unknown tool: ${id}`);
  }
  return tool;
}

function resolveToolTarget(rootDir, tool, extraArgs = []) {
  if (!tool.launch || !tool.launch.command) {
    throw new Error(`Tool ${tool.id} does not have a launch command.`);
  }

  const command = path.isAbsolute(tool.launch.command)
    ? tool.launch.command
    : path.resolve(rootDir, tool.launch.command);
  const cwd = tool.cwd
    ? (path.isAbsolute(tool.cwd) ? tool.cwd : path.resolve(rootDir, tool.cwd))
    : path.dirname(command);
  const args = [...(tool.launch.args || []), ...extraArgs];

  return { command, cwd, args };
}

function withStatus(rootDir, tool) {
  const target = resolveToolTarget(rootDir, tool);
  const exists = fs.existsSync(target.command);

  return {
    ...tool,
    executableExists: exists,
    executablePath: target.command,
    cwd: target.cwd,
  };
}

module.exports = {
  loadTools,
  getToolById,
  resolveToolTarget,
  withStatus,
};
