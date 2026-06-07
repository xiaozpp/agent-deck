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
  "最近:": "Latest:",
  "刚刚": "Just now",
  // Window controls
  "最小化": "Minimize",
  "最大化": "Maximize",
  "关闭": "Close",
  // Providers / usage
  "反重力": "Antigravity",
  "未知": "Unknown",
  "未识别": "Unknown",
  "未识别项目": "Unknown project",
  "刚刚更新": "Just updated",
  "Google One AI 积分": "Google One AI credits",
  "可用门槛": "Min",
  "每周": "Weekly",
  "✓ 当前 Codex 账号": "✓ Current Codex account",
  "数据未获取": "No data",
  "本年": "Year",
  "本月": "Month",
  "今天": "Today",
  "24小时": "24h",
  "最近7天": "Last 7 days",
  "本月趋势": "This month",
  "本年趋势": "This year",
  "所有历史": "All time",
  "读取 tokscale / ccusage 数据": "Reading tokscale / ccusage data",
  "项": "items",
  "端": "clients",
  "隐藏本地已被删除或重命名的项目": "Hide projects deleted or renamed locally",
  "尚无足够数据进行有趣的对比。": "Not enough data for a fun comparison yet.",
  "当前范围没有趋势数据。": "No trend data in the selected range.",
  "Claude Code 的配额由 Anthropic 实时下发，凭据存于系统安全存储、用量不落地为本地文件，因此无法离线读取（成本/Token 已在下方统计中通过 ccusage 展示）。": "Claude Code quota is issued by Anthropic in real time; credentials live in OS secure storage and usage is never written to local files, so it cannot be read offline (cost / tokens are still shown below via ccusage).",
  "配额刷新中…（在 cockpit-tools 中打开该账号即可更新）": "Refreshing quota… (open this account in cockpit-tools to update)",
  // MCP
  "MCP 服务器": "MCP servers",
  "复制到其他客户端": "Copy to another client",
  "跨 AI 客户端统一管理你的 Model Context Protocol 服务器配置。支持 反重力、Codex 和 Claude Code。": "Manage Model Context Protocol server configs across AI clients — Antigravity, Codex, and Claude Code.",
  "该客户端的配置文件尚未创建。添加第一个 MCP 服务器后将自动创建。": "This client has no config file yet. It is created automatically after you add the first MCP server.",
  "添加 MCP 服务器": "Add MCP server",
  "服务器名称": "Server name",
  "传输类型": "Transport",
  "stdio（本地进程）": "stdio (local process)",
  "HTTP / SSE（远程）": "HTTP / SSE (remote)",
  "命令 (command)": "Command",
  "参数 (args，空格分隔)": "Args (space-separated)",
  "Headers（每行 Key: Value）": "Headers (one Key: Value per line)",
  "环境变量（每行 KEY=VALUE）": "Env vars (one KEY=VALUE per line)",
  "添加": "Add",
  // MCP market
  "精选 MCP 市场": "MCP Marketplace",
  "安装到：": "Install to:",
  "以下均为写配置即用的服务。安装只会写入所选客户端配置并自动备份，不会执行安装命令；带变量的 preset 可在安装前填写 token 或路径。": "Every server below is config-and-go. Installing only writes the chosen client's config (with an automatic backup) — it never runs an installer. Presets with variables let you fill in a token or path before installing.",
  "搜索 MCP、分类或作者": "Search MCP, category, or author",
  "全部运行时": "All runtimes",
  "未安装": "Not installed",
  "需配置": "Needs config",
  "源": "Source",
  "装到": "Add to",
  "留空使用当前用户目录": "Leave blank to use your home directory",
  "读取 MCP preset 失败": "Failed to load MCP presets",
  "没有匹配的 MCP preset。": "No matching MCP presets.",
  "读取 Skill preset 失败": "Failed to load Skill presets",
  "暂无可导出的 Skill preset。": "No Skill presets to export.",
  // Skills
  "个人": "Personal",
  "插件": "Plugin",
  "内置": "Built-in",
  "桌面版": "Desktop",
  "提示": "Prompt",
  "（无描述）": "(no description)",
  "（空）": "(empty)",
  "新建 Skill": "New Skill",
  "编辑 ·": "Edit ·",
  "统一管理 Claude Code 与 Codex 的 Agent Skills（~/.claude/skills 与 ~/.codex/skills，同为 SKILL.md 格式）": "Manage Agent Skills for Claude Code and Codex (~/.claude/skills and ~/.codex/skills, both in SKILL.md format).",
  "选择左侧的 skill 查看与编辑，或点击「新建」创建一个。": "Select a skill on the left to view and edit, or click \"New\" to create one.",
  "未检测到 ~/.claude 或 ~/.codex 目录。": "No ~/.claude or ~/.codex directory found.",
  "Claude Code 还没有任何 skill。": "Claude Code has no skills yet.",
  "Codex 还没有个人 skill。": "Codex has no personal skills yet.",
  "还没有任何 skill。": "No skills yet.",
  "Claude 桌面版的托管 skill 为只读；如需新增个人 skill，可在桌面版「Customize → Skills」中添加，或在此处为 Claude Code（~/.claude/skills）新建。": "Claude Desktop's managed skills are read-only; to add a personal skill use \"Customize → Skills\" in the desktop app, or create one here for Claude Code (~/.claude/skills).",
  "Codex 内置 skill 为只读，无法在此修改。": "Codex built-in skills are read-only and cannot be edited here.",
  "插件内置 skill 为只读，如需修改请在对应插件中调整。": "Plugin built-in skills are read-only; edit them in the corresponding plugin.",
  "（仅字母、数字、- 和 _）": "(letters, digits, - and _ only)",
  "（决定何时被自动调用，务必清晰）": "(decides when it is auto-invoked — keep it clear)",
  "（逗号分隔，可留空）": "(comma-separated, optional)",
  "SKILL.md 正文": "SKILL.md body",
  "例如 pdf-export": "e.g. pdf-export",
  "例如 review": "e.g. review",
  // Sessions
  "跨 Claude Code 与 Codex 的本地会话时间线，可全文搜索、查看完整对话、在原项目继续。": "Local session timeline across Claude Code and Codex — full-text search, full transcripts, and continue in the original project.",
  "↳ 工具结果": "↳ Tool result",
  "💭 思考": "💭 Thinking",
  "（无预览）": "(no preview)",
  "未知项目": "Unknown project",
  "条": "msgs",
  "条 ·": "msgs ·",
  // Markdown
  "点击“选择文档”打开": "Click \"Choose document\" to open a",
  "文件。": "file.",
  // Tools
  "AI 工具": "AI tools",
  "文档工具": "Doc tools",
  // Projects
  "未找到目录": "Folder not found:",
  "无 git": "No git",
  "项改动": "changes",
  "该项目还没有": "This project has no",
  "，点「创建」新建一个。": ", click \"Create\" to add one.",
  "个项目": "projects",
  "个目标": "targets",
  "将覆盖（已备份）": "will overwrite (backed up)",
};

// Reverse map is derived from zhToEn so every translation round-trips (en → zh)
// without maintaining a second hand-written table. On the rare value collision
// (two Chinese strings sharing one English value) the last one wins, which is
// fine because the colliding pairs are synonyms (e.g. 已停用 / 已禁用 → Disabled).
const enToZh: Record<string, string> = Object.fromEntries(
  Object.entries(zhToEn).map(([zh, en]) => [en, zh]),
);

// English-mode compact number formatting for strings the UI built with the
// Chinese 万 (10^4) / 亿 (10^8) units via Intl's zh-CN compact notation.
function compactEn(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

const EN_MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  // Quota: countdown reset readouts (cockpit-tools style)
  [/^(\d+)天(\d+)时后重置 · (.+)$/, (m, lang) => lang === "en" ? `Resets in ${m[1]}d ${m[2]}h · ${m[3]}` : m[0]],
  [/^(\d+)时(\d+)分后重置 · (.+)$/, (m, lang) => lang === "en" ? `Resets in ${m[1]}h ${m[2]}m · ${m[3]}` : m[0]],
  [/^(\d+)分后重置 · (.+)$/, (m, lang) => lang === "en" ? `Resets in ${m[1]}m · ${m[2]}` : m[0]],
  [/^已重置 · (.+)$/, (m, lang) => lang === "en" ? `Reset · ${m[1]}` : m[0]],
  // Quota: window/age labels
  [/^(\d+) 小时$/, (m, lang) => lang === "en" ? `${m[1]}h` : m[0]],
  [/^(\d+) 分钟前更新$/, (m, lang) => lang === "en" ? `Updated ${m[1]} min ago` : m[0]],
  [/^(\d+) 小时前更新$/, (m, lang) => lang === "en" ? `Updated ${m[1]}h ago` : m[0]],
  [/^(\d+) 天前更新$/, (m, lang) => lang === "en" ? `Updated ${m[1]}d ago` : m[0]],
  [/^有效期 (\d+) 天$/, (m, lang) => lang === "en" ? `${m[1]} days left` : m[0]],
  [/^(\d+) 项未提交$/, (m, lang) => lang === "en" ? `${m[1]} uncommitted` : m[0]],
  // Usage stats
  [/^用量热力图 \((\d+) 周\)$/, (m, lang) => lang === "en" ? `Usage heatmap (${m[1]} weeks)` : m[0]],
  [/^你已用掉相当于 ~(.+)× 部《白鲸记》的 token。$/, (m, lang) => lang === "en" ? `You've burned ~${m[1]}× the tokens in Moby-Dick.` : m[0]],
  [/^费用: (.+)$/, (m, lang) => lang === "en" ? `Cost: ${m[1]}` : m[0]],
  // Projects: sync confirmation phrase (single-node template)
  [/^把 (.+) 同步到：$/, (m, lang) => lang === "en" ? `Sync ${m[1]} to:` : m[0]],
  // Marketplace install buttons / placeholders (JS-concatenated single nodes)
  [/^配置后装到 (.+)$/, (m, lang) => lang === "en" ? `Configure & add to ${m[1]}` : m[0]],
  [/^装到 (.+)$/, (m, lang) => lang === "en" ? `Add to ${m[1]}` : m[0]],
  [/^填写 (.+)$/, (m, lang) => lang === "en" ? `Enter ${m[1]}` : m[0]],
  // Compact numbers the UI rendered with Chinese 万 / 亿 units
  [/^([\d,]+(?:\.\d+)?)万$/, (m, lang) => lang === "en" ? compactEn(parseFloat(m[1].replace(/,/g, "")) * 1e4) : m[0]],
  [/^([\d,]+(?:\.\d+)?)亿$/, (m, lang) => lang === "en" ? compactEn(parseFloat(m[1].replace(/,/g, "")) * 1e8) : m[0]],
  // Chart axis labels
  [/^(\d{1,2})日$/, (m, lang) => lang === "en" ? m[1] : m[0]],
  [/^(\d{1,2})月$/, (m, lang) => lang === "en" ? (EN_MONTHS[Number(m[1])] || m[1]) : m[0]],
  [/^(\d{2}-\d{2})周$/, (m, lang) => lang === "en" ? m[1] : m[0]],
  // Fallback: any leftover string still carrying 反重力 (e.g. the quota provider
  // summary "反重力 1 · Codex 3"). Exact-map hits are handled earlier, so only
  // un-mapped composites reach here.
  [/反重力/, (m, lang) => lang === "en" ? m[0].replace(/反重力/g, "Antigravity") : m[0]],
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
