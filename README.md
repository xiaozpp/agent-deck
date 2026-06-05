# Agent Deck · Agent 指挥台

<p align="center">
  <img src="docs/screenshot.png" alt="Agent Deck Screenshot" width="800" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"/>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-Windows-blue.svg" alt="Platform: Windows">
  <img src="https://img.shields.io/badge/Version-v0.1.0--alpha-orange.svg" alt="Version: v0.1.0-alpha">
  <a href="https://github.com/xiaozpp/agent-deck/actions/workflows/ci.yml"><img src="https://github.com/xiaozpp/agent-deck/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <b>English</b> | <a href="README_zh.md">简体中文</a>
</p>

---

**Agent Deck** (Agent 指挥台) is a **local-first, privacy-focused** desktop control center designed for developers who live in AI coding agents like **Claude Code** and **Codex**. 

Instead of jumping between half a dozen CLI windows, terminal logs, and scattered config files, Agent Deck pulls all your agent state into a single cohesive UI: tracking model usage and costs, visualizing token windows, managing agent skills, searching conversation history, and checking workspace git branches.

Everything runs strictly on your machine — **no servers, no telemetry, no account required.**

Agent Deck supports both **English** and **Simplified Chinese** users. The UI follows your system language on first launch and includes a title-bar language switch so you can change between `English` and `中文` at any time.

---

## 🚀 Core Features

### 📊 LLM Usage Analytics (大模型用量)
Track your AI coding habits, token consumption, and API costs in real time.
* **Aggregated Stats:** Real-time cost, input/output tokens, and cache hits across **Codex**, **Claude Code**, and **Antigravity** (powered by [`tokscale`](https://www.npmjs.com/package/tokscale) + [`ccusage`](https://www.npmjs.com/package/ccusage)).
* **Interactive Heatmap:** A GitHub-style activity map showing your daily vibecoding intensity over the last 53 weeks.
* **Project Breakdown:** Identify which codebases are consuming the most tokens with pageable project rankings.
* **Model Analysis:** Detailed breakdown of cost-per-model to optimize your context usage.

### 🔋 Battery-style Quota Monitoring & Account Switching (账号配额)
Keep track of remaining context windows without manually checking dashboards.
* **Battery Bars:** Renders intuitive remaining percentage bars for active models and billing windows.
* **Local Cache Integration:** Reads directly from the local cache maintained by [cockpit-tools](https://github.com/jlcodes99/cockpit-tools).
* **Safe Account Switching:** Switch between signed-in Codex accounts with one click. It rewrites and validates your local `auth.json` atomically and securely.

### 🧩 Unified Agent Skills Manager (Skills 管理)
Manage your agent capabilities across different environments from one place.
* **Discovery:** Automatically indexes personal, plugin, and system skills for **Claude Code**, **Claude Desktop**, and **Codex**.
* **Direct Editing:** Review, edit, or toggle capabilities (enable/disable) for any workspace skill.
* **Asset Control:** Open file directories or delete unused skills instantly.
* **One-Click Marketplace:** A curated, offline shelf of high-quality starter skills (commit helper, code reviewer, PR writer, test writer, codebase explainer, debug assistant) — install writes a ready-to-edit `SKILL.md` into the agent you choose.

<p align="center"><img src="docs/skills-market.png" alt="Skills marketplace" width="760"/></p>

### 🔌 MCP Server Manager (MCP 管理)
Manage Model Context Protocol servers for every agent from one screen.
* **Cross-Client:** Read and write MCP server configs for **Claude Code** (`~/.claude.json`), **Codex** (`~/.codex/config.toml`), and **Antigravity** — JSON and TOML handled transparently behind an adapter layer.
* **Full CRUD:** Add, edit, enable/disable, or remove `stdio` and remote (HTTP) servers, including `env` and headers.
* **Duplicate Across Clients:** Copy a working server definition from one agent to another in one click (with automatic backups).
* **One-Click Marketplace:** A curated, offline shelf of the best "config-and-go" MCP servers (filesystem, git, fetch, memory, sequential-thinking, GitHub, Playwright, Context7, time). Install writes the config entry only — never runs an installer.

<p align="center"><img src="docs/mcp-market.png" alt="MCP marketplace" width="760"/></p>

### 🔍 Cross-Agent Session Timeline (会话历史)
Never lose a conversation or research thread.
* **Full-Text Search:** Search across all past chats and terminal sessions from both Claude Code and Codex.
* **Rich Markdown Render:** View complete conversation logs rendered in a clean developer transcript format.
* **Fast Resume:** Launch a fresh agent terminal session in the exact project directory with a single click.

### 🎛️ Workspace Command Center (项目指挥台)
Manage your coding repositories and agent prompt templates.
* **Git Overview:** Scan your local workspaces to view git branch names, dirty state indicator, and ahead/behind status.
* **Prompt Template Manager:** Edit critical agent prompts like `AGENTS.md`, `.mcp.json`, and `CLAUDE.md` per project.
* **One-Click Sync:** Distribute and overwrite standardized agent templates across multiple projects simultaneously (with automatic backups).

### 📝 Embedded Markdown Viewer (Markdown 查看器)
Preview developer docs locally.
* **Fast Rendering:** Select any markdown file and view it inside the Electron frame.
* **Local Images:** Fully resolves and embeds local image paths.

---

## 🔒 Security & Privacy Guarantees

Since Agent Deck accesses data files generated by other tools on your disk, security is our highest priority:

* **OAuth Tokens Remain Local:** Files containing access keys are parsed exclusively in the Electron main process. Only safe display fields (e.g. plan details, usage percentages) are passed across the IPC boundary to the renderer. Tokens never cross into React.
* **Automatic Email Masking:** Developer emails are automatically obfuscated at the IPC boundary (`dev***@domain.com`) to prevent accidental leaks during screen-sharing or presentation. Opt out anytime by setting `TOOL_MASTER_SHOW_EMAILS=1`.
* **Safe Config Writes:** File modifications are confined to your workspace root. Any config override automatically creates a timestamped backup copy (`<file>.bak-<timestamp>`) in the same folder. JSON validation is run prior to write.
* **Zero Telemetry:** The app has no network client of its own. All numbers are read locally; we do not phone home.

---

## ⚙️ Path & File Access Reference

Below is a reference of the paths Agent Deck accesses:

| Target File / Folder | Purpose | Mode |
|---|---|---|
| `~/.claude/projects/**.jsonl` | Claude Code session history | Read-only |
| `~/.codex/sessions/**.jsonl` | Codex session history | Read-only |
| `~/.claude/skills`, `~/.codex/skills` | Agent Skills discovery and editing | Read/Write |
| `%APPDATA%/Claude/.../skills-plugin/**` | Claude Desktop skills | Read-only |
| `~/.antigravity_cockpit/**` | cockpit-tools quota cache | Read-only |
| `~/.codex/auth.json` | Codex active account configuration | Read/Write |
| `<WORK_ROOT>/*` (default `~/projects`) | Project directories + `AGENTS.md`/`.mcp.json` | Read/Write |

---

## 🛠️ Getting Started

### Prerequisites

* **OS:** Windows (tested on Windows 10/11)
* **Node.js:** v20.19+ on Node 20 LTS, or v22.12+

### Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone git@github.com:xiaozpp/agent-deck.git
   cd agent-deck
   npm install
   ```

2. Run the application in development mode (launches Vite dev server + Electron window):
   ```bash
   npm start
   ```

3. Build a portable Windows executable (`.exe`):
   ```bash
   npm run package:win
   ```

4. Run all code quality checks (linter, unit tests, TypeScript compiler, production build compile):
   ```bash
   npm run check
   ```

### Configuration (Environment Variables)

Customize the app behavior using environment variables:

| Env Var | Default | Purpose |
|---|---|---|
| `TOOL_MASTER_WORK_ROOT` | `~/projects` | The directory scanned for local coding projects. |
| `TOOL_MASTER_SHOW_EMAILS` | (unset) | Set to `1` to show full account email addresses without masking. |
| `CCUSAGE_BIN` / `TOKSCALE_BIN` | (auto-resolved) | Custom paths to override default usage tracker binaries. |

### Local Marketplace Presets

The built-in MCP and Skill marketplaces are offline and bundled, but you can extend them without editing source code:

* `config/mcp-presets.json` — an array of MCP preset objects. Each object needs `id`, `name`, and `install`; optional fields like `title`, `author`, `category`, `runtime`, `transport`, `homepage`, and `needsConfig` are shown in the UI. Placeholders such as `${GITHUB_TOKEN}` are detected and prompted for before install.
* `config/skill-presets/*.md` — one local Skill preset per markdown file. Frontmatter can set `id`, `name`, `title`, `author`, `category`, and `description`; the remaining markdown becomes the `SKILL.md` body.

---

## 📁 Repository Structure

```
├── config/
│   └── tools.json              # Registered tool configurations
├── electron/
│   ├── main.cjs                # Main process, mounts IPC handlers
│   ├── preload.cjs             # Exposes safe IPC bridge functions
│   ├── windowPolicy.cjs        # Development environment policies
│   └── services/
│       ├── accountsService.cjs # Codex account switcher
│       ├── markdownService.cjs # Base64 image embedder & parser
│       ├── projectsService.cjs # Workspace scanner & template sync
│       ├── quotaService.cjs    # Reads cockpit-tools cache
│       ├── sessionsService.cjs # Session log parser and query helper
│       ├── skillsService.cjs   # Discover and modify agent skills
│       └── usageService.cjs    # Runs usage trackers & aggregates cost
├── src/
│   ├── App.tsx                 # Core UI React components
│   ├── toolApi.ts              # Frontend client for window.toolMaster IPC
│   ├── types.ts                # Shared TypeScript models
│   └── index.css               # Styling
└── tests/                      # Unit test suite
```

---

## 🤝 Contributing

Contributions are welcome — see **[CONTRIBUTING.md](./CONTRIBUTING.md)**. In
short: any code working with user credentials must follow the **No Spread** rule
(forward only an explicit allow-list of metadata fields through the Electron IPC
bridge, never serialize complete token objects), and file writes must be
confined + backed up + validated. `npm run check` must pass on every PR.

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

*Disclaimer: Agent Deck is an independent open-source tool and is not officially affiliated with Anthropic, OpenAI, Google, or cockpit-tools.*
