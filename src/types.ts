export type IconName = "shield" | "activity" | "file-text";

export type ModuleId = "home" | "codex-usage" | "markdown-viewer" | "tool-manager" | "skills" | "sessions" | "projects" | "mcp";

export type ProjectGitInfo = {
  isGit: boolean;
  branch?: string;
  changes?: number;
  lastCommitAt?: number;
  lastSubject?: string;
  ahead?: number;
  behind?: number;
};

export type ProjectConfigState = { present: boolean; size: number };

export type ProjectItem = {
  name: string;
  path: string;
  git: ProjectGitInfo;
  config: Record<string, ProjectConfigState>;
  sortAt: number;
};

export type ProjectList = {
  root: string;
  available: boolean;
  projects: ProjectItem[];
};

export type ProjectConfig = {
  key: string;
  file: string;
  label: string;
  lang: string;
  present: boolean;
  content: string;
};

export type SyncResult = {
  ok: boolean;
  results: Array<{ projectPath: string; ok: boolean; backup?: string | null; error?: string }>;
};

export type SkillSource = "claude" | "codex";

export type SessionSource = "claude" | "codex";

export type SessionItem = {
  id: string;
  source: SessionSource;
  file: string;
  cwd: string;
  project: string;
  gitBranch: string;
  title: string;
  preview: string;
  startedAt: number;
  updatedAt: number;
  messageCount: number;
  sessionId?: string;
  originator?: string;
  // Present only on search results: where/why this session matched.
  match?: { field: "body" | "title" | "project"; role?: "user" | "assistant"; snippet?: string };
};

export type SessionPart = {
  role: "user" | "assistant";
  kind: "text" | "thinking" | "tool_use" | "tool_result";
  text?: string;
  tool?: string;
};

export type SessionMessage = {
  role: "user" | "assistant";
  ts: number;
  parts: SessionPart[];
};

export type SessionDetail = SessionItem & { messages: SessionMessage[] };

export type SessionList = {
  sessions: SessionItem[];
  counts: { all: number; claude: number; codex: number };
  available: { claude: boolean; codex: boolean };
};

export type SessionQuery = {
  source?: "all" | "claude" | "codex";
  search?: string;
  force?: boolean;
};

export type SkillItem = {
  id: string;
  path: string;
  dir: string;
  source: SkillSource;
  scope: "personal" | "plugin" | "system" | "desktop" | "prompt";
  readOnly: boolean;
  name: string;
  description: string;
  allowedTools: string[];
  enabled: boolean;
  supportFiles: number;
  updatedAt: number;
};

export type SkillList = {
  skills: SkillItem[];
  roots: { claude: string; codex: string; plugins: string; claudeDesktop?: string };
  available: { claude: boolean; codex: boolean };
};

export type SkillDetail = {
  name: string;
  description: string;
  allowedTools: string[];
  body: string;
  raw: string;
  isClaude: boolean;
};

export type ToolItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  accent: string;
  icon: IconName;
  tags: string[];
  favorite: boolean;
  recommended: boolean;
  requiresFile: boolean;
  executableExists: boolean;
  executablePath: string;
  cwd: string;
};

export type UsageQuery = {
  client: "codex" | "claude" | "all" | "antigravity";
  range: "today" | "week" | "month" | "year" | "all" | "custom";
  provider?: "combined" | "tokscale";
  since?: string;
  until?: string;
  /** Bypass the in-memory ccusage cache (set by the manual 刷新 button). */
  force?: boolean;
};

export type UsageWorkspaceEntry = {
  client?: string;
  workspaceKey?: string;
  workspaceLabel?: string;
  model?: string;
  input?: number;
  output?: number;
  cacheRead?: number;
  reasoning?: number;
  messageCount?: number;
  cost?: number;
  existsLocally?: boolean;
  displayPath?: string;
  realName?: string;
};

export type UsageHourlyEntry = {
  hour?: string;
  month?: string;
  cost?: number;
  clients?: string[];
};

export type UsageReport = {
  generatedAt: string;
  client: string;
  provider: string;
  range: string;
  summary?: {
    totalCost?: number;
    totalInput?: number;
    totalOutput?: number;
    totalCacheRead?: number;
    totalMessages?: number;
    entries?: UsageWorkspaceEntry[];
  };
  hourly?: {
    entries?: UsageHourlyEntry[];
  };
  clients?: {
    clients?: Array<{ client: string; label: string; messageCount?: number; sessionsPathExists?: boolean }>;
  };
  ccusage?: {
    daily?: Array<Record<string, unknown>>;
    totals?: Record<string, number>;
  } | null;
  /** Labels of data sources that failed to load (e.g. tokscale hiccup). */
  warnings?: string[];
};

export type QuotaBar = {
  label: string;
  /** Remaining percentage of this quota window/model (0–100; 100 = full). */
  percentage: number;
  /** Epoch ms when this quota resets (0 = unknown). */
  resetAt: number;
  /** False when cockpit-tools hasn't cached this window's data (show "未获取"). */
  available?: boolean;
};

export type QuotaCredit = {
  label: string;
  amount: number;
  minimum: number;
};

export type QuotaAccount = {
  id: string;
  provider: string;
  email: string;
  name: string;
  current: boolean;
  /** Codex only: true if this account has switchable OAuth credentials. */
  switchable?: boolean;
  disabled: boolean;
  planLabel: string;
  isForbidden: boolean;
  lastUpdated: number;
  /** Epoch ms the subscription is valid until (0 = unknown). */
  validUntil: number;
  credits: QuotaCredit[];
  bars: QuotaBar[];
};

export type QuotaProvider = {
  provider: string;
  label: string;
  available: boolean;
  reason: string;
  accounts: QuotaAccount[];
};

export type QuotaReport = {
  available: boolean;
  source: string;
  reason: string;
  providers: QuotaProvider[];
};

export type MarkdownManifest = {
  path: string;
  name: string;
  folderName: string;
  content: string;
  images: Record<string, string>;
};

// ── MCP Server Manager ─────────────────────────────────────

export type McpTransport = "stdio" | "remote";

export type McpClientSummary = {
  id: string;
  label: string;
  configPath: string;
  configExists: boolean;
  docUrl: string;
  serverCount: number;
  enabledCount: number;
};

export type McpServer = {
  name: string;
  clientId: string;
  transport: McpTransport;
  enabled: boolean;
  command: string;
  args: string[];
  env: Record<string, string>;
  url: string;
  headers: Record<string, string>;
  type: string;
  issues?: string[];
};

export type McpClientDetail = {
  id: string;
  label: string;
  configPath: string;
  docUrl: string;
  configExists: boolean;
  rawJson: string;
  servers: McpServer[];
};

export type McpServerSavePayload = {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  type?: string;
};

export type McpPreset = {
  id: string;
  name: string;
  title: string;
  author: string;
  description: string;
  homepage: string;
  category: string;
  runtime: string;
  transport: string;
  needsConfig: string;
  variables: Array<{ name: string; secret: boolean; defaultValue: string }>;
};

export type SkillPreset = {
  id: string;
  name: string;
  title: string;
  author: string;
  category: string;
  description: string;
  body: string;
};
