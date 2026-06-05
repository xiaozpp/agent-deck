/// <reference types="vite/client" />

import type {
  MarkdownManifest,
  McpClientDetail,
  McpClientSummary,
  McpServer,
  McpServerSavePayload,
  McpPreset,
  SkillPreset,
  ToolItem,
  ProjectConfig,
  ProjectList,
  QuotaReport,
  SessionDetail,
  SessionList,
  SessionQuery,
  SyncResult,
  SkillDetail,
  SkillList,
  UsageQuery,
  UsageReport,
} from "./types";

type ToolMasterApi = {
  listTools: () => Promise<ToolItem[]>;
  launchTool: (toolId: string) => Promise<{ ok: boolean; canceled?: boolean; pid?: number }>;
  openToolFolder: (toolId: string) => Promise<{ ok: boolean }>;
  usageReport: (query: UsageQuery) => Promise<UsageReport>;
  quota: () => Promise<QuotaReport>;
  switchCodexAccount: (accountId: string) => Promise<{ ok: boolean; switchedTo?: string; message?: string; backup?: string | null }>;
  skillsList: () => Promise<SkillList>;
  skillRead: (filePath: string) => Promise<SkillDetail>;
  skillSave: (filePath: string, patch: { name?: string; description?: string; allowedTools?: string[]; body?: string }) => Promise<{ ok: boolean }>;
  skillCreate: (payload: { source: string; name: string; description?: string; body?: string }) => Promise<{ ok: boolean; path: string }>;
  skillDelete: (filePath: string) => Promise<{ ok: boolean }>;
  skillToggle: (filePath: string, enabled: boolean) => Promise<{ ok: boolean; path: string }>;
  skillOpenFolder: (filePath: string) => Promise<{ ok: boolean }>;
  skillListPresets: () => Promise<SkillPreset[]>;
  skillInstallPreset: (source: string, presetId: string) => Promise<{ ok: boolean; path: string }>;
  skillExportPresets: () => Promise<{ dir: string; presets: SkillPreset[] }>;
  skillImportPresets: (files: Array<{ name: string; content: string }>) => Promise<{ ok: boolean; count: number; dir: string }>;
  sessionsList: (query?: SessionQuery) => Promise<SessionList>;
  sessionRead: (filePath: string) => Promise<SessionDetail>;
  sessionOpenFolder: (cwd: string) => Promise<{ ok: boolean }>;
  sessionContinue: (payload: { cwd: string; source: string }) => Promise<{ ok: boolean; message?: string }>;
  projectsList: () => Promise<ProjectList>;
  projectReadConfig: (projectPath: string, key: string) => Promise<ProjectConfig>;
  projectSaveConfig: (projectPath: string, key: string, content: string) => Promise<{ ok: boolean; backup?: string | null }>;
  projectDeleteConfig: (projectPath: string, key: string) => Promise<{ ok: boolean; backup?: string | null }>;
  projectSyncConfig: (payload: { key: string; content: string; targets: string[] }) => Promise<SyncResult>;
  projectOpenFolder: (projectPath: string) => Promise<{ ok: boolean }>;
  projectChooseRoot: () => Promise<{ canceled?: boolean; ok?: boolean; root?: string }>;
  openMarkdown: () => Promise<{ canceled: boolean; manifest?: MarkdownManifest }>;
  readMarkdown: (filePath: string) => Promise<{ canceled: boolean; manifest?: MarkdownManifest }>;
  mcpListClients: () => Promise<McpClientSummary[]>;
  mcpListServers: (clientId?: string) => Promise<McpServer[]>;
  mcpReadClient: (clientId: string) => Promise<McpClientDetail>;
  mcpToggleServer: (clientId: string, serverName: string, enabled: boolean) => Promise<{ ok: boolean; backup?: string | null }>;
  mcpSaveServer: (clientId: string, serverData: McpServerSavePayload) => Promise<{ ok: boolean; backup?: string | null }>;
  mcpRemoveServer: (clientId: string, serverName: string) => Promise<{ ok: boolean; backup?: string | null }>;
  mcpDuplicateServer: (sourceClientId: string, serverName: string, targetClientId: string) => Promise<{ ok: boolean; backup?: string | null }>;
  mcpListPresets: () => Promise<McpPreset[]>;
  mcpInstallPreset: (clientId: string, presetId: string, variables?: Record<string, string>) => Promise<{ ok: boolean; backup?: string | null; name: string }>;
  mcpExportPresets: () => Promise<{ file: string; presets: unknown[] }>;
  mcpExportPreset: (presetId: string) => Promise<{ preset: unknown }>;
  mcpImportPresets: (raw: string) => Promise<{ ok: boolean; count: number; file: string }>;
  windowAction: (action: "minimize" | "maximize" | "close") => Promise<void>;
};

declare global {
  interface Window {
    toolMaster: ToolMasterApi;
  }
}

export {};
