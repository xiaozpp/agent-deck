import type { LucideIcon } from "lucide-react";
import { BarChart3, Blocks, FileText, FolderGit2, Home, MessageSquare, Plug, Settings } from "lucide-react";
import type { ModuleId } from "../types";

export const modules: Array<{ id: ModuleId; label: string; icon: LucideIcon; tone: string }> = [
  { id: "home", label: "首页", icon: Home, tone: "#0b94ff" },
  { id: "codex-usage", label: "大模型用量", icon: BarChart3, tone: "#7c3aed" },
  { id: "mcp", label: "MCP 管理", icon: Plug, tone: "#e11d48" },
  { id: "projects", label: "项目指挥台", icon: FolderGit2, tone: "#f97316" },
  { id: "skills", label: "Skills 管理", icon: Blocks, tone: "#6366f1" },
  { id: "sessions", label: "会话历史", icon: MessageSquare, tone: "#0ea5e9" },
  { id: "markdown-viewer", label: "Markdown", icon: FileText, tone: "#f59e0b" },
  { id: "tool-manager", label: "工具管理", icon: Settings, tone: "#10b981" },
];

export const HOME_CARDS: Array<{ id: ModuleId; desc: string }> = [
  { id: "codex-usage", desc: "Codex / Claude / 反重力的 token、费用与用量趋势，含项目排行与热力图。" },
  { id: "mcp", desc: "集中管理反重力、Codex、Claude Code 的 MCP 服务器配置。" },
  { id: "projects", desc: "扫描本地项目、查看 git 状态，统一编辑并同步 AGENTS.md / .mcp.json / CLAUDE.md。" },
  { id: "skills", desc: "跨 Claude Code、Claude 桌面版与 Codex 的 Agent Skills 统一管理。" },
  { id: "sessions", desc: "跨 agent 的会话历史时间线，可全文搜索、查看完整对话、在原项目继续。" },
  { id: "markdown-viewer", desc: "选择 Markdown 文件后在 Agent 指挥台内预览。" },
];
