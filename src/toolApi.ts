import type {
  MarkdownManifest,
  ProjectConfig,
  ProjectList,
  QuotaReport,
  SessionDetail,
  SessionList,
  SkillDetail,
  SkillList,
  ToolItem,
  UsageQuery,
  UsageReport,
} from "./types";

const fallbackTools: ToolItem[] = [
  {
    id: "codex-usage",
    name: "大模型用量",
    category: "AI 工具",
    description: "查看 Codex / Claude token、费用和使用趋势。",
    status: "已接入",
    accent: "#7c3aed",
    icon: "activity",
    tags: ["Codex", "Claude", "统计", "AI"],
    favorite: true,
    recommended: true,
    requiresFile: false,
    executableExists: true,
    executablePath: ".",
    cwd: ".",
  },
  {
    id: "markdown-viewer",
    name: "Markdown 查看器",
    category: "文档工具",
    description: "选择 Markdown 文件后，在 Agent 指挥台内预览。",
    status: "已接入",
    accent: "#f59e0b",
    icon: "file-text",
    tags: ["Markdown", "文档", "预览"],
    favorite: false,
    recommended: true,
    requiresFile: true,
    executableExists: true,
    executablePath: ".",
    cwd: ".",
  },
];

const fallbackUsage: UsageReport = {
  generatedAt: new Date().toISOString(),
  client: "codex",
  provider: "combined",
  range: "today",
  summary: {
    totalCost: 0,
    totalInput: 0,
    totalOutput: 0,
    totalCacheRead: 0,
    totalMessages: 0,
    entries: [],
  },
  hourly: { entries: [] },
  clients: { clients: [] },
  ccusage: { daily: [], totals: {} },
};

const fallbackQuota: QuotaReport = {
  available: false,
  source: "cockpit-tools",
  reason: "在浏览器预览模式下无法读取本地配额缓存。",
  providers: [],
};

const fallbackSkillList: SkillList = {
  skills: [],
  roots: { claude: "", codex: "", plugins: "" },
  available: { claude: false, codex: false },
};

const fallbackSkillDetail: SkillDetail = {
  name: "",
  description: "",
  allowedTools: [],
  body: "",
  raw: "",
  isClaude: true,
};

const fallbackSessionList: SessionList = {
  sessions: [],
  counts: { all: 0, claude: 0, codex: 0 },
  available: { claude: false, codex: false },
};

const fallbackSessionDetail: SessionDetail = {
  id: "",
  source: "claude",
  file: "",
  cwd: "",
  project: "",
  gitBranch: "",
  title: "",
  preview: "",
  startedAt: 0,
  updatedAt: 0,
  messageCount: 0,
  messages: [],
};

const fallbackProjectList: ProjectList = {
  root: "",
  available: false,
  projects: [],
};

const fallbackProjectConfig: ProjectConfig = {
  key: "",
  file: "",
  label: "",
  lang: "markdown",
  present: false,
  content: "",
};

const fallbackMarkdown: MarkdownManifest = {
  path: "",
  name: "未选择文档",
  folderName: "",
  content: "# Markdown 查看器\n\n点击上方按钮选择一个 `.md` 文件。",
  images: {},
};

export const toolApi = window.toolMaster ?? {
  listTools: async () => fallbackTools,
  launchTool: async () => ({ ok: true }),
  openToolFolder: async () => ({ ok: true }),
  usageReport: async (_query: UsageQuery) => fallbackUsage,
  quota: async () => fallbackQuota,
  switchCodexAccount: async () => ({ ok: false, message: "仅在桌面应用内可用。" }),
  skillsList: async () => fallbackSkillList,
  skillRead: async () => fallbackSkillDetail,
  skillSave: async () => ({ ok: true }),
  skillCreate: async () => ({ ok: true, path: "" }),
  skillDelete: async () => ({ ok: true }),
  skillToggle: async () => ({ ok: true, path: "" }),
  skillOpenFolder: async () => ({ ok: true }),
  skillListPresets: async () => [],
  skillInstallPreset: async () => ({ ok: false, path: "" }),
  skillExportPresets: async () => ({ dir: "", presets: [] }),
  skillImportPresets: async () => ({ ok: false, count: 0, dir: "" }),
  sessionsList: async () => fallbackSessionList,
  sessionRead: async () => fallbackSessionDetail,
  sessionOpenFolder: async () => ({ ok: true }),
  sessionContinue: async () => ({ ok: true }),
  projectsList: async () => fallbackProjectList,
  projectReadConfig: async () => fallbackProjectConfig,
  projectSaveConfig: async () => ({ ok: true }),
  projectDeleteConfig: async () => ({ ok: true }),
  projectSyncConfig: async () => ({ ok: true, results: [] }),
  projectOpenFolder: async () => ({ ok: true }),
  projectChooseRoot: async () => ({ canceled: true }),
  openMarkdown: async () => ({ canceled: false, manifest: fallbackMarkdown }),
  readMarkdown: async () => ({ canceled: false, manifest: fallbackMarkdown }),
  mcpListClients: async () => [],
  mcpListServers: async () => [],
  mcpReadClient: async () => ({ id: "", label: "", configPath: "", docUrl: "", configExists: false, rawJson: "", servers: [] }),
  mcpToggleServer: async () => ({ ok: false }),
  mcpSaveServer: async () => ({ ok: false }),
  mcpRemoveServer: async () => ({ ok: false }),
  mcpDuplicateServer: async () => ({ ok: false }),
  mcpListPresets: async () => [],
  mcpInstallPreset: async () => ({ ok: false, name: "" }),
  mcpExportPresets: async () => ({ file: "", presets: [] }),
  mcpExportPreset: async () => ({ preset: null }),
  mcpImportPresets: async () => ({ ok: false, count: 0, file: "" }),
  windowAction: async () => undefined,
};
