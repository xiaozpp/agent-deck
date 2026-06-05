const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { buildUsageReport } = require("./services/usageService.cjs");
const { getQuota } = require("./services/quotaService.cjs");
const { switchCodexAccount, switchAvailable } = require("./services/accountsService.cjs");
const { listSessions, readSession } = require("./services/sessionsService.cjs");
const {
  listProjects,
  readConfig: readProjectConfig,
  saveConfig: saveProjectConfig,
  deleteConfig: deleteProjectConfig,
  syncConfig: syncProjectConfig,
  setWorkRoot: setProjectRoot,
} = require("./services/projectsService.cjs");
const {
  listSkills,
  readSkill,
  saveSkill,
  createSkill,
  deleteSkill,
  toggleSkill,
  skillFolder,
  listSkillPresets,
  installSkillPreset,
} = require("./services/skillsService.cjs");
const { readMarkdownFile } = require("./services/markdownService.cjs");
const { shouldOpenDevTools } = require("./windowPolicy.cjs");
const { appRoot, distIndexPath } = require("./appPaths.cjs");
const {
  listClients: mcpListClients,
  listServers: mcpListServers,
  readClientConfig: mcpReadClient,
  toggleServer: mcpToggleServer,
  saveServer: mcpSaveServer,
  removeServer: mcpRemoveServer,
  duplicateServer: mcpDuplicateServer,
  listMcpPresets,
  installPreset: mcpInstallPreset,
} = require("./services/mcpService.cjs");

const {
  getToolById,
  loadTools,
  resolveToolTarget,
  withStatus,
} = require("./toolRegistry.cjs");

const rootDir = appRoot(app, __dirname);
let mainWindow;
let tray;
let isQuitting = false;

function appIconPath() {
  return path.join(rootDir, "build", process.platform === "win32" ? "icon.ico" : "icon.png");
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  if (tray) return tray;
  const image = nativeImage.createFromPath(appIconPath());
  tray = new Tray(image);
  tray.setToolTip("Agent Deck");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "显示 Agent Deck", click: showMainWindow },
    { label: "隐藏到托盘", click: () => mainWindow?.hide() },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
  tray.on("double-click", showMainWindow);
  return tray;
}

async function runUsageProbeIfRequested() {
  const outputFile = process.env.TOOL_MASTER_USAGE_PROBE_FILE;
  if (!outputFile) return false;
  try {
    const startedAt = Date.now();
    const report = await buildUsageReport({ client: "all", range: "month", provider: "combined" });
    fs.writeFileSync(outputFile, JSON.stringify({
      ok: true,
      elapsed: Date.now() - startedAt,
      warnings: report.warnings || [],
      summaryEntries: report.summary?.entries?.length || 0,
      hourlyEntries: report.hourly?.entries?.length || 0,
      clients: report.clients?.clients?.length || 0,
    }, null, 2), "utf8");
  } catch (error) {
    fs.writeFileSync(outputFile, JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.stack || error.message : String(error),
    }, null, 2), "utf8");
  }
  app.quit();
  return true;
}

function createWindow() {
  const width = Number.parseInt(process.env.TOOL_MASTER_QA_WIDTH || "1180", 10);
  const height = Number.parseInt(process.env.TOOL_MASTER_QA_HEIGHT || "760", 10);

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 980,
    minHeight: 680,
    frame: app.isPackaged,
    transparent: false,
    backgroundColor: "#f3f7fb",
    title: "Agent Deck",
    icon: appIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
  });

  if (app.isPackaged || process.env.TOOL_MASTER_LOAD_DIST === "1") {
    mainWindow.loadFile(distIndexPath(rootDir));
  } else {
    mainWindow.loadURL("http://127.0.0.1:5173");
    if (shouldOpenDevTools()) {
      mainWindow.webContents.openDevTools();
    }
  }
}

function readToolsWithStatus() {
  return loadTools(rootDir).map((tool) => withStatus(rootDir, tool));
}

function launchDetached(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
  return { ok: true, pid: child.pid };
}

ipcMain.handle("tools:list", () => readToolsWithStatus());

ipcMain.handle("tools:launch", async (_event, toolId) => {
  const tools = loadTools(rootDir);
  const tool = getToolById(tools, toolId);
  const extraArgs = [];

  if (tool.requiresFile || tool.launch.kind === "file") {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "选择 Markdown 文件",
      properties: ["openFile"],
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, canceled: true };
    }
    extraArgs.push(result.filePaths[0]);
  }

  const target = resolveToolTarget(rootDir, tool, extraArgs);
  return launchDetached(target.command, target.args, target.cwd);
});

ipcMain.handle("tools:open-folder", async (_event, toolId) => {
  const tool = getToolById(loadTools(rootDir), toolId);
  const target = resolveToolTarget(rootDir, tool);
  await shell.openPath(target.cwd);
  return { ok: true };
});

ipcMain.handle("usage:report", async (_event, query) => buildUsageReport(query || {}));

ipcMain.handle("quota:get", async () => getQuota());

ipcMain.handle("accounts:switch-codex", async (_event, accountId) => switchCodexAccount(accountId));
ipcMain.handle("accounts:switch-available", async () => ({ available: switchAvailable() }));

ipcMain.handle("skills:list", async () => listSkills());
ipcMain.handle("skills:read", async (_event, filePath) => readSkill(filePath));
ipcMain.handle("skills:save", async (_event, filePath, patch) => saveSkill(filePath, patch || {}));
ipcMain.handle("skills:create", async (_event, payload) => createSkill(payload || {}));
ipcMain.handle("skills:delete", async (_event, filePath) => deleteSkill(filePath));
ipcMain.handle("skills:toggle", async (_event, filePath, enabled) => toggleSkill(filePath, enabled));
ipcMain.handle("skills:open-folder", async (_event, filePath) => {
  await shell.openPath(skillFolder(filePath));
  return { ok: true };
});
ipcMain.handle("skills:list-presets", async () => listSkillPresets());
ipcMain.handle("skills:install-preset", async (_event, source, presetId) => installSkillPreset(source, presetId));
ipcMain.handle("skills:export-presets", async () => {
  const { exportLocalSkillPresets } = require("./services/skills/presetCatalog.cjs");
  return exportLocalSkillPresets();
});
ipcMain.handle("skills:import-presets", async (_event, raw) => {
  const { importLocalSkillPresets } = require("./services/skills/presetCatalog.cjs");
  return importLocalSkillPresets(String(raw || ""));
});

ipcMain.handle("sessions:list", async (_event, query) => listSessions(query || {}));
ipcMain.handle("sessions:read", async (_event, filePath) => readSession(filePath));
ipcMain.handle("sessions:open-folder", async (_event, cwd) => {
  if (cwd) await shell.openPath(cwd);
  return { ok: true };
});

ipcMain.handle("projects:list", async () => listProjects());
ipcMain.handle("projects:read-config", async (_event, projectPath, key) => readProjectConfig(projectPath, key));
ipcMain.handle("projects:save-config", async (_event, projectPath, key, content) => saveProjectConfig(projectPath, key, content));
ipcMain.handle("projects:delete-config", async (_event, projectPath, key) => deleteProjectConfig(projectPath, key));
ipcMain.handle("projects:sync-config", async (_event, payload) => syncProjectConfig(payload || {}));
ipcMain.handle("projects:open-folder", async (_event, projectPath) => {
  if (projectPath) await shell.openPath(projectPath);
  return { ok: true };
});
ipcMain.handle("projects:choose-root", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择要扫描的项目根目录",
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  return { canceled: false, ...setProjectRoot(result.filePaths[0]) };
});
// Open a NEW agent session in the given project directory via a terminal.
ipcMain.handle("sessions:continue", async (_event, payload) => {
  const { cwd, source } = payload || {};
  if (!cwd) return { ok: false, message: "缺少项目目录。" };
  const cli = source === "codex" ? "codex" : "claude";
  if (process.platform === "win32") {
    // Open a new cmd window, cd into the project, and launch the CLI.
    launchDetached("cmd.exe", ["/c", "start", "", "cmd", "/k", `cd /d "${cwd}" && ${cli}`], cwd);
  } else {
    launchDetached(cli, [], cwd);
  }
  return { ok: true };
});

ipcMain.handle("markdown:open", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择 Markdown 文件",
    properties: ["openFile"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  return { canceled: false, manifest: readMarkdownFile(result.filePaths[0]) };
});

ipcMain.handle("markdown:read", async (_event, filePath) => ({
  canceled: false,
  manifest: readMarkdownFile(filePath),
}));



ipcMain.handle("mcp:list-clients", async () => mcpListClients());
ipcMain.handle("mcp:list-servers", async (_event, clientId) => mcpListServers(clientId || undefined));
ipcMain.handle("mcp:read-client", async (_event, clientId) => mcpReadClient(clientId));
ipcMain.handle("mcp:toggle-server", async (_event, clientId, serverName, enabled) => mcpToggleServer(clientId, serverName, enabled));
ipcMain.handle("mcp:save-server", async (_event, clientId, serverData) => mcpSaveServer(clientId, serverData));
ipcMain.handle("mcp:remove-server", async (_event, clientId, serverName) => mcpRemoveServer(clientId, serverName));
ipcMain.handle("mcp:duplicate-server", async (_event, sourceClientId, serverName, targetClientId) => mcpDuplicateServer(sourceClientId, serverName, targetClientId));
ipcMain.handle("mcp:list-presets", async () => listMcpPresets());
ipcMain.handle("mcp:install-preset", async (_event, clientId, presetId, variables) => mcpInstallPreset(clientId, presetId, variables || {}));
ipcMain.handle("mcp:export-presets", async () => {
  const { exportLocalMcpPresets } = require("./services/mcp/presetCatalog.cjs");
  return exportLocalMcpPresets();
});
ipcMain.handle("mcp:export-preset", async (_event, presetId) => {
  const { exportMcpPreset } = require("./services/mcp/presetCatalog.cjs");
  return exportMcpPreset(presetId);
});
ipcMain.handle("mcp:import-presets", async (_event, raw) => {
  const { importLocalMcpPresets } = require("./services/mcp/presetCatalog.cjs");
  return importLocalMcpPresets(String(raw || ""));
});

ipcMain.handle("window:action", (_event, action) => {
  if (!mainWindow) return;
  if (action === "minimize") mainWindow.minimize();
  if (action === "maximize") {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
  if (action === "close") mainWindow.close();
});

app.whenReady().then(async () => {
  if (await runUsageProbeIfRequested()) return;
  createTray();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") return;
  if (isQuitting) app.quit();
});

app.on("activate", () => {
  showMainWindow();
});
