# Agent Deck · Agent 指挥台

<p align="center">
  <img src="docs/screenshot.png" alt="Agent Deck 截图" width="820" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"/>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-Windows-blue.svg" alt="Platform: Windows">
  <img src="https://img.shields.io/badge/Version-v0.1.7-orange.svg" alt="Version: v0.1.7">
  <a href="https://github.com/xiaozpp/Agent-Deck/actions/workflows/ci.yml"><img src="https://github.com/xiaozpp/Agent-Deck/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <b>简体中文</b>
</p>

---

> **一个绝不联网的 AI 编程 Agent 指挥台。**
> 你的 OAuth 凭据永不离开 Electron 主进程。没有网络客户端、没有遥测、不需要账号，所有数据都从你自己的硬盘读取。

**Agent Deck**（Agent 指挥台）把 **Claude Code**、**Codex**、**反重力（Antigravity）** 散落各处的状态收进一个窗口——用量与费用、剩余配额、Agent 技能、MCP 服务器、会话历史、工作区 git 状态。不必再在六七个 CLI 窗口、终端日志和配置文件之间反复横跳，你得到的是一个统一的、**本地优先**的桌面应用。

同类工具大多要么是 web 面板（数据离开本机），要么是只做一件事的小工具。Agent Deck 在两条别人难抄的轴上不一样：

- **🔒 隐私即产品。** 含凭据的文件**只**在主进程解析；只有安全展示字段（套餐名、用量百分比）会跨过 IPC 边界进入 UI。邮箱默认打码。应用自身没有任何对外网络。
- **🎛️ 一处掌控全局。** 通常分散在七个终端里的七件事被统一起来——而且每一次写配置都被限制在工作区内、先自动备份、先校验。

---

## ✨ 核心能力

### 📊 大模型用量分析
实时追踪 **Codex**、**Claude Code**、**反重力** 的 token、费用与习惯（由 [`tokscale`](https://www.npmjs.com/package/tokscale) + [`ccusage`](https://www.npmjs.com/package/ccusage) 驱动）。
* 聚合的费用、输入/输出/缓存 token，以及 GitHub 风格的 **53 周活跃热力图**。
* 项目排行与按模型的费用拆解，一眼看清 token 花在哪。

<p align="center"><img src="docs/usage.png" alt="用量分析与配额" width="780"/></p>

### 🔋 电池条式配额 & 账号切换
* 直观的**剩余百分比电池条**，直接读取本机 [cockpit-tools](https://github.com/jlcodes99/cockpit-tools) 缓存。
* **安全的 Codex 一键切号**——原子化改写并校验 `auth.json`，自动备份原文件。

### 🧩 统一 Agent Skills 管理
* 自动索引 **Claude Code**、**Claude 桌面版**、**Codex** 的个人 / 插件 / 内置技能。
* 查看、编辑、启用/禁用、打开或删除任意技能。
* 内置一个**离线**精选起步市场（commit 助手、代码审查、PR 撰写、测试生成、代码库讲解、调试助手）——安装即向所选 agent 写入一份可直接编辑的 `SKILL.md`。

<p align="center"><img src="docs/skills-market.png" alt="技能市场" width="780"/></p>

### 🔌 MCP 服务器管理
* 读写 **Claude Code**（`~/.claude.json`）、**Codex**（`~/.codex/config.toml`）、**反重力** 的 MCP 配置——JSON 与 TOML 由适配层透明处理。
* 对 `stdio` 和远程（HTTP）服务器完整增删改查，含 `env` 与 headers；一键把可用配置复制到其他客户端（自动备份）。
* 内置一个**离线**的"写配置即用"精选市场——安装只写入配置项，**绝不执行安装命令**。

<p align="center"><img src="docs/mcp-market.png" alt="MCP 市场" width="780"/></p>

### 🔍 跨 Agent 会话时间线
* 对 Claude Code 与 Codex 的全部历史对话与终端会话做**全文搜索**。
* 干净的对话渲染，并可**一键在原项目目录拉起新的 agent 会话**。

### 🎛️ 项目指挥台
* 扫描本地仓库，查看分支、是否有改动、领先/落后状态。
* 编辑每个项目的 agent 提示词（`AGENTS.md`、`.mcp.json`、`CLAUDE.md`），并可**一次性把标准模板同步到多个项目**（自动备份）。

### 📝 内嵌 Markdown 查看器
* 在应用内预览任意本地 Markdown 文件，本地图片完整解析。

---

## 🔒 安全与隐私

Agent Deck 会读取磁盘上其他工具生成的数据文件，因此安全是第一优先级：

* **OAuth 凭据只留本地。** 含访问密钥的文件只在 Electron 主进程解析。只有安全展示字段会跨 IPC 进入 React——凭据永远不会。
* **邮箱默认打码。** 账号邮箱在 IPC 边界被打码（`dev***@domain.com`），避免直播/分享屏幕时泄露。可用 `TOOL_MASTER_SHOW_EMAILS=1` 关闭。
* **安全写配置。** 写入限制在工作区根目录内，先生成带时间戳的 `.bak-<时间戳>` 备份，并在保存前做 JSON 校验。
* **零遥测。** 应用自身没有网络客户端，不会回传任何数据。

### Agent Deck 访问的路径

| 目标 | 用途 | 模式 |
|---|---|---|
| `~/.claude/projects/**.jsonl` | Claude Code 会话历史 | 只读 |
| `~/.codex/sessions/**.jsonl` | Codex 会话历史 | 只读 |
| `~/.claude/skills`、`~/.codex/skills` | Agent Skills 发现与编辑 | 读写 |
| `%APPDATA%/Claude/.../skills-plugin/**` | Claude 桌面版技能 | 只读 |
| `~/.antigravity_cockpit/**` | cockpit-tools 配额缓存 | 只读 |
| `~/.codex/auth.json` | Codex 当前账号 | 读写 |
| `<WORK_ROOT>/*`（默认 `~/projects`） | 项目目录 + `AGENTS.md`/`.mcp.json`/`CLAUDE.md` | 读写 |

---

## 🛠️ 快速开始

> **平台：** Agent Deck 目前**仅支持 Windows**——在 Windows 10/11 上构建与测试。代码本身大体跨平台，但 macOS/Linux 的路径与打包尚未验证。见 [路线图](#-路线图)。

### 前置要求
* **系统：** Windows 10 / 11
* **Node.js：** v20.19+（Node 20 LTS）或 v22.12+

### 从源码运行
```bash
git clone git@github.com:xiaozpp/Agent-Deck.git
cd Agent-Deck
npm install
npm start          # Vite 开发服务器 + Electron 窗口
```

### 打包便携版 Windows .exe
```bash
npm run package:win
```

### 跑全部检查（测试 + 类型检查 + 生产构建 + 语法）
```bash
npm run check
```

### 配置（环境变量）

| 变量 | 默认 | 用途 |
|---|---|---|
| `TOOL_MASTER_WORK_ROOT` | `~/projects` | 扫描本地编程项目的目录。 |
| `TOOL_MASTER_SHOW_EMAILS` | （未设置） | 设为 `1` 显示完整账号邮箱（关闭打码）。 |
| `CCUSAGE_BIN` / `TOKSCALE_BIN` | （自动） | 覆盖用量统计二进制的路径。 |

### 扩展离线市场（无需改源码）
* `config/mcp-presets.json` — MCP preset 数组（必填 `id`、`name`、`install`；`${VAR}` 占位符会在安装前提示填写）。
* `config/skill-presets/*.md` — 每个文件一个 Skill preset；frontmatter 设置元数据，正文成为 `SKILL.md`。

---

## 🗺️ 路线图

* **macOS 与 Linux 支持** — UI 是 web 技术，且文件访问大多用 `os.homedir()`，底子已经在。缺的是平台相关的路径映射（如 macOS 上的 `~/Library/Application Support/Claude`）与打包。**欢迎贡献**——如果你用 macOS 或 Linux，非常欢迎提交代码与测试。
* 主题 / 暗色模式。

---

## 🌐 多语言

界面提供 **English** 与 **简体中文** 两种语言。首次启动跟随系统语言，标题栏的 `中文` / `EN` 开关可随时切换。

---

## 🤝 参与贡献

欢迎贡献——见 **[CONTRIBUTING.md](./CONTRIBUTING.md)**。简而言之：任何涉及用户凭据的代码必须遵守 **No Spread** 规则（只通过 IPC 桥转发明确白名单内的元数据字段，绝不序列化完整 token 对象）；文件写入必须限制范围 + 备份 + 校验。每个 PR 都必须通过 `npm run check`。

## 📄 许可证

基于 [MIT License](./LICENSE) 授权。

*免责声明：Agent Deck 是独立的开源工具，与 Anthropic、OpenAI、Google 或 cockpit-tools 无官方关联。*
