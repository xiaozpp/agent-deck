function shouldOpenDevTools(env = process.env) {
  return env.TOOL_MASTER_OPEN_DEVTOOLS === "1";
}

module.exports = {
  shouldOpenDevTools,
};
