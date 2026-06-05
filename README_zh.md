# Agent Deck · Agent 指挥台

<p align="center">
  <img src="docs/screenshot.png" alt="Agent Deck 软件截图" width="800" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"/>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-Windows-blue.svg" alt="Platform: Windows">
  <img src="https://img.shields.io/badge/Version-v0.1.0--alpha-orange.svg" alt="Version: v0.1.0-alpha">
</p>

<p align="center">
  <a href="README.md">English</a> | <b>简体中文</b>
</p>

---

**Agent Deck**（Agent 指挥台）是一款**本地运行、专注隐私保护**的桌面控制中心，专为深度依赖 **Claude Code** 和 **Codex** 等 AI 编码智能体（Agents）的开发者量身打造。

无需再频繁切换于多个 CLI 命令行窗口、终端日志以及分散的配置文件中，Agent Deck 将所有 Agent 的运行状态收拢至统一的精美 UI 界面中：包括大模型用量与成本追踪、Token 配额可视化、Agent Skills（技能）管理、会话历史搜索以及工作区 Git 分支监控。

所有数据都在你的本地设备上解析和运行——**无任何云端服务器、无数据上报、无需注册账号**。

Agent Deck 同时支持 **简体中文** 与 **English** 用户。首次启动时会跟随系统语言，并在标题栏提供语言切换按钮，可随时在 `中文` 与 `English` 之间切换。

---

## 🚀 核心功能

### 📊 大模型用量统计 (LLM Usage)
实时监控你的 AI 编码习惯、Token 消耗以及 API 资费。
* **多源聚合：** 自动读取并计算 **Codex**、**Claude Code** 和 **Antigravity** 在本地产生的 Token 用量与成本支出（基于 [`tokscale`](https://www.npmjs.com/package/tokscale) 与 [`ccusage`](https://www.npmjs.com/package/ccusage)）。
* **用量热力图：** 提供类似 GitHub Contributions 的用量活跃热力图，直观展现过去 53 周你的 Vibecoding 编码频次。
* **项目排行：** 按项目维度排行，支持分页查看，快速识别最消耗 Token 的代码仓库。
* **模型明细：** 详细列出各个不同模型的调用成本比例，方便按需优化上下文。

### 🔋 电池级配额监控与账号切换 (Quota & Accounts)
随时掌握当前账号的上下文限制或余额，告别手动登录网页端查询。
* **配额电量条：** 针对当前计费周期、活动模型用量，提供电池样式百分比电量条。
* **无缝集成本地缓存：** 直接读取由 [cockpit-tools](https://github.com/jlcodes99/cockpit-tools) 缓存的本地配额数据。
* **安全账号切换：** 一击秒切不同的 Codex 账号，底层采用原子性读写与验证逻辑重写本地 `auth.json`，确保极速与安全。

### 🧩 统一 Agent Skills 管理 (Skills)
在统一面板内配置并扩展你的 Agent 能力。
* **自动扫描：** 自动搜索并索引 **Claude Code**、**Claude Desktop** 及 **Codex** 存放的 personal、plugin 和 system 技能文件。
* **在线编辑：** 直接在界面中查看、编辑并修改任何 Skill 的实现代码与允许调用的工具列表。
* **快捷管理：** 快速开启/禁用某些特定的技能，或直接一键删除或在资源管理器中打开其所在目录。
* **一键预设市场：** 内置精选的优质起手 Skill（提交助手、代码审查、PR 描述、测试编写、代码库讲解、调试助手），一键把可直接编辑的 `SKILL.md` 写入你选择的 Agent。

<p align="center"><img src="docs/skills-market.png" alt="Skills 预设市场" width="760"/></p>

### 🔌 MCP 服务器管理 (MCP)
在一个界面里集中管理所有 Agent 的 Model Context Protocol 服务器。
* **跨客户端：** 统一读写 **Claude Code**（`~/.claude.json`）、**Codex**（`~/.codex/config.toml`）与**反重力**的 MCP 配置，JSON 与 TOML 由适配层透明处理。
* **完整增删改：** 新增、编辑、启用/禁用、删除 `stdio` 与远程（HTTP）服务器，含 `env` 与请求头。
* **跨客户端复制：** 一键把某个可用的服务器定义复制到另一个 Agent（自动备份）。
* **一键预设市场：** 精选「写配置即用」的优质 MCP 服务器（filesystem、git、fetch、memory、sequential-thinking、GitHub、Playwright、Context7、time），离线内置。安装只写入所选客户端的配置，绝不执行任何安装命令。

<p align="center"><img src="docs/mcp-market.png" alt="MCP 预设市场" width="760"/></p>

### 🔍 跨 Agent 会话历史 (Sessions)
再也不会遗失曾经讨论过的技术方案或调试记录。
* **全文检索：** 支持跨 Claude Code 与 Codex 的历史对话记录全文搜索。
* **富文本渲染：** 精美还原 markdown 对话渲染，提供极佳的开发者 Transcript 阅读体验。
* **一键续写：** 选中历史会话后，可一键在原项目目录中拉起终端，继续开启新的一轮 Agent 对话。

### 🎛️ 项目指挥台 (Projects)
高效管理本地的开发仓库与 Agent 模板配置。
* **Git 状态概览：** 自动扫描本地工作区，直观展现 Git 分支名、脏文件标记以及 ahead/behind 提交数。
* **提示词配置：** 针对每个项目，直接编辑核心智能体配置文件，如 `AGENTS.md`、`.mcp.json`、`CLAUDE.md`。
* **一键模板同步：** 快速将标准模板内容覆盖同步至多个项目，并在同步前自动对旧文件进行时间戳备份。

### 📝 内嵌 Markdown 查看器 (Markdown)
快捷预览本地文档。
* **极速渲染：** 选择本地任意 `.md` 文件即可直接在 Electron 窗口中预览。
* **本地图片支持：** 自动解析相对路径的本地图片并转化为 Base64 嵌入显示。

---

## 🔒 隐私与本地数据安全承诺

由于 Agent Deck 会读取由其他工具存储在本地磁盘的数据，我们制定了极佳的安全隐私机制：

* **OAuth 凭证不出本地：** 包含访问密钥的配置文件仅在 Electron 主进程中进行安全解析。仅有脱敏后的非敏感字段（如邮箱、套餐类型、百分比）会通过 IPC 传递至 React 渲染层。Token 绝不会暴露在 UI 代码中。
* **邮箱自动脱敏：** 开发者邮箱在跨越主进程至渲染进程时会自动进行打码脱敏（如 `dev***@domain.com`），防止在屏幕共享或截图时泄露敏感信息。可通过设置环境变量 `TOOL_MASTER_SHOW_EMAILS=1` 恢复全显。
* **安全的配置文件写入：** 文件修改完全限制在你的工作区目录内。每次覆盖更新文件时，系统会在同一目录下自动生成带时间戳的备份文件（`<filename>.bak-<timestamp>`），且写入前会先运行 JSON 格式验证，防止配置文件损坏。
* **零 telemetry 追踪：** 本应用不包含任何网络请求客户端，也不含埋点或上报机制。所有数据均来自你本地生成的缓存，绝对不联网上报。

---

## ⚙️ 路径与本地数据访问对照表

应用在运行时访问的系统路径如下（绝大部分为**只读**模式）：

| 目标文件/目录 | 用途 | 访问模式 |
|---|---|---|
| `~/.claude/projects/**.jsonl` | Claude Code 会话历史日志 | 只读 |
| `~/.codex/sessions/**.jsonl` | Codex 会话历史日志 | 只读 |
| `~/.claude/skills`, `~/.codex/skills` | Agent 技能文件的识别与更新编辑 | 读/写 |
| `%APPDATA%/Claude/.../skills-plugin/**` | Claude Desktop 技能文件 | 只读 |
| `~/.antigravity_cockpit/**` | cockpit-tools 账号配额数据缓存 | 只读 |
| `~/.codex/auth.json` | Codex 活动账号的凭证配置文件 | 读/写 |
| `<WORK_ROOT>/*`（默认 `~/projects`） | 扫描本地项目目录及同步 `AGENTS.md`/`.mcp.json` 等配置 | 读/写 |

---

## 🛠️ 开始使用

### 环境要求

* **操作系统：** Windows (已在 Windows 10/11 进行完整测试)
* **Node.js：** Node 20 LTS 的 v20.19+，或 v22.12+

### 安装与运行

1. 克隆代码仓库并安装依赖：
   ```bash
   git clone git@github.com:xiaozpp/agent-deck.git
   cd agent-deck
   npm install
   ```

2. 在开发模式下运行（启动 Vite 开发服务器并拉起 Electron 窗口）：
   ```bash
   npm start
   ```

3. 打包出绿色的免安装 Windows 客户端（`.exe`）：
   ```bash
   npm run package:win
   ```

4. 运行完整代码质量校验（包含 linter、单元测试、TS 编译、生产包编译检测）：
   ```bash
   npm run check
   ```

### 环境变量配置

支持通过配置以下环境变量来改变客户端行为：

| 环境变量名 | 默认值 | 用途说明 |
|---|---|---|
| `TOOL_MASTER_WORK_ROOT` | `~/projects` | 项目指挥台扫描本地开发项目的根目录路径。 |
| `TOOL_MASTER_SHOW_EMAILS` | (未设置) | 设置为 `1` 时，将在界面中完整显示用户邮箱而不进行脱敏打码。 |
| `CCUSAGE_BIN` / `TOKSCALE_BIN` | (自动寻找) | 用以覆盖默认的用量监控二进制命令路径。 |

---

## 📁 目录结构

```
├── config/
│   └── tools.json              # 已登记的工具元配置
├── electron/
│   ├── main.cjs                # Electron 主进程，挂载各 IPC 处理函数
│   ├── preload.cjs             # 上下文桥接，提供 window.toolMaster 安全方法
│   ├── windowPolicy.cjs        # 开发环境窗口策略配置
│   └── services/
│       ├── accountsService.cjs # Codex 账户切换核心逻辑
│       ├── markdownService.cjs # Base64 本地图片转化与 markdown 解析
│       ├── projectsService.cjs # 项目目录扫描及模板同步服务
│       ├── quotaService.cjs    # 读取并解析本地配额缓存
│       ├── sessionsService.cjs # 会话历史文件解析与全文检索
│       ├── skillsService.cjs   # Agent 技能文件的扫描与 CRUD 逻辑
│       └── usageService.cjs    # 运行用量工具并统计折算消费
├── src/
│   ├── App.tsx                 # 界面 React 核心组件
│   ├── toolApi.ts              # 前端调用 window.toolMaster IPC 的封装层
│   ├── types.ts                # 前后端共享的 TS 模型定义
│   └── index.css               # 主体样式表
└── tests/                      # 单元测试目录
```

---

## 🤝 参与贡献

欢迎提交 PR！请确保你提交的代码在处理用户凭证时严格遵循 **No Spread** 机制（即只把安全的非敏感字段通过 Electron 的 IPC 传递给渲染层，千万不要直接序列化或传播包含 Token 对象的实体）。

## 📄 开源协议

本项目采用 [MIT 协议](./LICENSE) 进行开源。

*声明：Agent Deck 属于独立开源辅助工具，不与 Anthropic、OpenAI、Google 或 cockpit-tools 等官方机构存在任何商业利益或从属关系。*
