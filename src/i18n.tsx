import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "zh" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const STORAGE_KEY = "agent-deck-language";
const LanguageContext = createContext<LanguageContextValue | null>(null);

const zhToEn: Record<string, string> = {
  "Agent 指挥台": "Agent Deck",
  "首页": "Home",
  "大模型用量": "LLM Usage",
  "MCP 管理": "MCP",
  "MCP 服务管理": "MCP Server Manager",
  "项目指挥台": "Projects",
  "Skills 管理": "Skills",
  "会话历史": "Sessions",
  "工具管理": "Tools",
  "统一 Electron + React 技术栈": "Unified Electron + React stack",
  "一个窗口，掌控你的 vibecoding": "One window for your vibecoding cockpit",
  "把散落在各个 agent 里的用量、配额、技能、会话与项目状态收拢到一处。全程本地运行，不联网、不上报。": "Bring usage, quota, skills, sessions, and project state from different agents into one local-first app. No servers, no telemetry.",
  "查看用量": "View usage",
  "已整合模块": "Integrated modules",
  "用量 / 项目 / 技能 / 会话 …": "Usage / projects / skills / sessions ...",
  "技术栈": "Stack",
  "数据来源": "Data source",
  "本地": "Local",
  "只读优先 · 不联网": "Read-first · offline",
  "刷新": "Refresh",
  "全部客户端": "All clients",
  "概览": "Overview",
  "模型": "Models",
  "项目": "Projects",
  "消息": "Messages",
  "总 Token": "Total tokens",
  "活跃天数": "Active days",
  "当前连续": "Current streak",
  "最长连续": "Longest streak",
  "活跃时段": "Active hours",
  "主力模型": "Top model",
  "成本": "Cost",
  "输入": "Input",
  "输出": "Output",
  "缓存": "Cache",
  "缓存读取": "Cache read",
  "用量趋势": "Usage trend",
  "按日": "Daily",
  "按周": "Weekly",
  "按月": "Monthly",
  "项目排行": "Project ranking",
  "隐藏已失效": "Hide missing",
  "已失效": "Missing",
  "上一页": "Previous",
  "下一页": "Next",
  "当前范围没有项目数据。": "No project data in the selected range.",
  "当前范围没有模型用量数据。": "No model usage data in the selected range.",
  "账号配额": "Account quota",
  "当前": "Current",
  "已受限": "Restricted",
  "已停用": "Disabled",
  "配额刷新：": "Quota refresh: ",
  "切换到此账号": "Switch to this account",
  "当前 Codex 账号": "Current Codex account",
  "暂无配额数据。": "No quota data yet.",
  "配额数据来源于本机 cockpit-tools 缓存，只读展示。": "Quota data is read-only from the local cockpit-tools cache.",
  "客户端": "Clients",
  "MCP 服务": "MCP servers",
  "当前客户端": "Current client",
  "已检测到配置文件": "Config files detected",
  "个已启用": "enabled",
  "请选择一个客户端": "Choose a client",
  "管理": "Manage",
  "市场": "Market",
  "文档": "Docs",
  "添加服务": "Add server",
  "添加服务器": "Add server",
  "启用": "Enable",
  "禁用": "Disable",
  "编辑": "Edit",
  "删除": "Delete",
  "复制到其它客户端": "Copy to another client",
  "复制到：": "Copy to:",
  "需检查": "Needs review",
  "未检测到配置文件": "No config file detected",
  "该客户端下没有配置 MCP 服务器。": "This client has no MCP servers configured.",
  "精选 Agent Skills，一键写入本地 SKILL.md，可随后编辑。安装到：": "Curated Agent Skills. Install a local SKILL.md in one click, then edit it. Install to:",
  "搜索 preset、分类或作者": "Search presets, categories, or authors",
  "导入": "Import",
  "导出": "Export",
  "导出本地": "Export local",
  "全部": "All",
  "含已安装": "Show installed",
  "仅未安装": "Only uninstalled",
  "预览": "Preview",
  "已装": "Installed",
  "没有匹配的 Skill preset。": "No matching Skill presets.",
  "关闭预览": "Close preview",
  "选择 Markdown 文件": "Choose Markdown file",
  "选择要扫描的项目根目录": "Choose project root",
  "Markdown 查看器": "Markdown Viewer",
  "选择文档": "Choose document",
  "目录": "Contents",
  "暂无标题": "No headings",
  "内嵌预览，不再打开独立 C# 窗口": "Embedded preview, no separate viewer window",
  "以后新增工具时，在这里统一登记模块、路径和状态。": "Register future tools, paths, and status here.",
  "搜索工具、分类或标签": "Search tools, categories, or tags",
  "搜索名称或描述…": "Search name or description...",
  "新建": "New",
  "新建第一个 skill": "Create first skill",
  "没有匹配的 skill。": "No matching skill.",
  "只读": "Read-only",
  "已禁用": "Disabled",
  "已启用": "Enabled",
  "打开文件夹": "Open folder",
  "保存": "Save",
  "取消": "Cancel",
  "来源": "Source",
  "名称": "Name",
  "描述": "Description",
  "提示内容": "Prompt content",
  "一句话说明这个 skill 做什么、何时使用": "Describe what this skill does and when to use it",
  "在这里编写提示内容…": "Write the prompt content here...",
  "Codex / Claude / 反重力的 token、费用与用量趋势，含项目排行与热力图。": "Track token usage, costs, trends, project rankings, and heatmaps across Codex, Claude, and Antigravity.",
  "集中管理反重力、Codex、Claude Code 的 MCP 服务器配置。": "Manage MCP server configs for Antigravity, Codex, and Claude Code in one place.",
  "扫描本地项目、查看 git 状态，统一编辑并同步 AGENTS.md / .mcp.json / CLAUDE.md。": "Scan local projects, inspect git state, and edit or sync AGENTS.md, .mcp.json, and CLAUDE.md.",
  "跨 Claude Code、Claude 桌面版与 Codex 的 Agent Skills 统一管理。": "Manage Agent Skills across Claude Code, Claude Desktop, and Codex.",
  "跨 agent 的会话历史时间线，可全文搜索、查看完整对话、在原项目继续。": "Search cross-agent session timelines, read complete transcripts, and continue in the original project.",
  "选择 Markdown 文件后在 Agent 指挥台内预览。": "Preview Markdown files inside Agent Deck.",
  "搜索标题、项目或对话内容…": "Search title, project, or conversation...",
  "暂无会话历史。": "No sessions yet.",
  "选择左侧的会话查看完整对话。支持搜索你说过的话或 agent 生成的内容。": "Select a session to view the full transcript. Search your messages or agent responses.",
  "打开项目": "Open project",
  "在此目录继续": "Continue here",
  "加载对话中…": "Loading transcript...",
  "该会话没有可显示的消息。": "This session has no displayable messages.",
  "我": "Me",
  "助手": "Assistant",
  "工具结果": "Tool result",
  "思考": "Thinking",
  "更改目录": "Change folder",
  "搜索项目…": "Search projects...",
  "没有匹配的项目。": "No matching projects.",
  "选择左侧项目，查看 git 状态与配置文件（AGENTS.md / .mcp.json / CLAUDE.md），可编辑并一键同步到其它项目。": "Select a project to inspect git status and agent config files (AGENTS.md / .mcp.json / CLAUDE.md), edit them, and sync to other projects.",
  "创建": "Create",
  "同步到其它项目…": "Sync to other projects...",
  "确认同步到": "Confirm sync to",
  "目标": "targets",
  "干净": "Clean",
  "非 git 仓库": "Not a git repository",
  "工作区干净": "Working tree clean",
  "最近": "Latest",
  "刚刚": "Just now",
};

const enToZh: Record<string, string> = {
  "Agent Deck": "Agent 指挥台",
  "Home": "首页",
  "LLM Usage": "大模型用量",
  "MCP": "MCP 管理",
  "Projects": "项目指挥台",
  "Skills": "Skills 管理",
  "Sessions": "会话历史",
  "Tools": "工具管理",
  "Unified Electron + React stack": "统一 Electron + React 技术栈",
  "One window for your vibecoding cockpit": "一个窗口，掌控你的 vibecoding",
  "Bring usage, quota, skills, sessions, and project state from different agents into one local-first app. No servers, no telemetry.": "把散落在各个 agent 里的用量、配额、技能、会话与项目状态收拢到一处。全程本地运行，不联网、不上报。",
  "View usage": "查看用量",
  "Integrated modules": "已整合模块",
  "Usage / projects / skills / sessions ...": "用量 / 项目 / 技能 / 会话 …",
  "Stack": "技术栈",
  "Data source": "数据来源",
  "Local": "本地",
  "Read-first · offline": "只读优先 · 不联网",
  "Track token usage, costs, trends, project rankings, and heatmaps across Codex, Claude, and Antigravity.": "Codex / Claude / 反重力的 token、费用与用量趋势，含项目排行与热力图。",
  "Manage MCP server configs for Antigravity, Codex, and Claude Code in one place.": "集中管理反重力、Codex、Claude Code 的 MCP 服务器配置。",
  "Scan local projects, inspect git state, and edit or sync AGENTS.md, .mcp.json, and CLAUDE.md.": "扫描本地项目、查看 git 状态，统一编辑并同步 AGENTS.md / .mcp.json / CLAUDE.md。",
  "Manage Agent Skills across Claude Code, Claude Desktop, and Codex.": "跨 Claude Code、Claude 桌面版与 Codex 的 Agent Skills 统一管理。",
  "Search cross-agent session timelines, read complete transcripts, and continue in the original project.": "跨 agent 的会话历史时间线，可全文搜索、查看完整对话、在原项目继续。",
  "Preview Markdown files inside Agent Deck.": "选择 Markdown 文件后在 Agent 指挥台内预览。",
};

const regexTranslations: Array<[RegExp, (match: RegExpMatchArray, language: Language) => string]> = [
  [/^(\d+) 天$/, (m, lang) => lang === "en" ? `${m[1]} days` : `${m[1]} 天`],
  [/^(\d+) 消息$/, (m, lang) => lang === "en" ? `${m[1]} messages` : `${m[1]} 消息`],
  [/^(\d+) 项$/, (m, lang) => lang === "en" ? `${m[1]} items` : `${m[1]} 项`],
  [/^(\d+) 个已启用$/, (m, lang) => lang === "en" ? `${m[1]} enabled` : `${m[1]} 个已启用`],
  [/^(\d+) \/ (\d+) 启用$/, (m, lang) => lang === "en" ? `${m[1]} / ${m[2]} enabled` : `${m[1]} / ${m[2]} 启用`],
  [/^剩余 (\d+)%$/, (m, lang) => lang === "en" ? `${m[1]}% left` : `剩余 ${m[1]}%`],
  [/^(\d+) 分钟前$/, (m, lang) => lang === "en" ? `${m[1]} minutes ago` : `${m[1]} 分钟前`],
  [/^(\d+) 小时前$/, (m, lang) => lang === "en" ? `${m[1]} hours ago` : `${m[1]} 小时前`],
  [/^(\d+) 天前$/, (m, lang) => lang === "en" ? `${m[1]} days ago` : `${m[1]} 天前`],
  [/^更新于 (.+)$/, (m, lang) => lang === "en" ? `Updated at ${m[1]}` : `更新于 ${m[1]}`],
  [/^扫描 (.+) · (\d+) 个项目$/, (m, lang) => lang === "en" ? `Scanning ${m[1]} · ${m[2]} projects` : `扫描 ${m[1]} · ${m[2]} 个项目`],
];

function translateText(input: string, language: Language) {
  const trimmed = input.trim();
  if (!trimmed) return input;
  const map = language === "en" ? zhToEn : enToZh;
  const exact = map[trimmed];
  if (exact) return input.replace(trimmed, exact);
  for (const [regex, render] of regexTranslations) {
    const match = trimmed.match(regex);
    if (match) return input.replace(trimmed, render(match, language));
  }
  return input;
}

function translateNodeTree(root: ParentNode, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const next = translateText(node.nodeValue || "", language);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  const attrs = ["placeholder", "title", "aria-label"];
  for (const el of Array.from(root.querySelectorAll("*"))) {
    for (const attr of attrs) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      const next = translateText(value, language);
      if (next !== value) el.setAttribute(attr, next);
    }
  }
}

function detectInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => detectInitialLanguage());

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage(next) {
      localStorage.setItem(STORAGE_KEY, next);
      setLanguageState(next);
    },
  }), [language]);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    translateNodeTree(document.body, language);
    const observer = new MutationObserver(() => translateNodeTree(document.body, language));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

export function t(input: string, language: Language) {
  return translateText(input, language);
}
