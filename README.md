# Agent Deck · Agent 指挥台

<p align="center">
  <img src="docs/demo.gif" alt="Agent Deck demo" width="820" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"/>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-Windows-blue.svg" alt="Platform: Windows">
  <img src="https://img.shields.io/badge/Version-v0.1.7-orange.svg" alt="Version: v0.1.7">
  <a href="https://github.com/xiaozpp/Agent-Deck/actions/workflows/ci.yml"><img src="https://github.com/xiaozpp/Agent-Deck/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="https://github.com/xiaozpp/Agent-Deck/releases/latest"><img src="https://img.shields.io/github/v/release/xiaozpp/Agent-Deck?label=%E2%AC%87%20Download%20for%20Windows&logo=windows&color=2ea44f" alt="Download for Windows"></a>
</p>

<p align="center">
  <b>English</b> | <a href="README_zh.md">简体中文</a>
</p>

---

> **See where your tokens go, find any past agent conversation, and keep your project context in order — all on your own machine, never phoning home.**

**Agent Deck** is a **local-first dashboard and memory layer** for developers who live in **Claude Code** and **Codex**. It reads the data these agents already leave on your disk and turns it into something you can actually *see and search*: cost analytics, a searchable history of every conversation, and one place to manage the prompts and config that steer your agents.

There are already solid tools for *switching accounts and providers* — e.g. [Cockpit Tools](https://github.com/jlcodes99/cockpit-tools) and [cc-switch](https://github.com/farion1231/cc-switch). Agent Deck deliberately does **not** try to win that race. It focuses on the things those tools *don't* do — and it does them with **no proxy, no cloud account, and zero telemetry**.

---

## 🪧 What makes it different

### 📊 Usage & cost analytics — *know where your tokens go*
The piece nobody else here builds: raw token logs turned into real insight, across **Codex**, **Claude Code**, and **Antigravity** (via [`tokscale`](https://www.npmjs.com/package/tokscale) + [`ccusage`](https://www.npmjs.com/package/ccusage)).
* Aggregated cost and input/output/cache tokens, a GitHub-style **53-week heatmap**, per-project rankings, and per-model cost breakdowns.
* Battery-style **remaining-quota bars** so a limit never surprises you.

<p align="center"><img src="docs/usage.png" alt="Usage analytics & quota" width="800"/></p>

### 🔍 Session memory — *search every conversation you've ever had*
Your agents forget. Agent Deck doesn't. It indexes **every Claude Code and Codex session** on your machine into one searchable timeline:
* **Full-text search** across titles, projects, and the full message bodies of past chats — with the matching snippet shown inline so you can see *why* a session matched.
* Clean transcript rendering, and **one-click resume** of a fresh session in the exact project directory.
* No other tool in this space does this — it's your private, cross-agent long-term memory.

### 🎛️ Project & prompt context — *manage what steers your agents*
* Scan local repos for branch, dirty state, and ahead/behind status.
* Edit each project's agent prompts (`AGENTS.md`, `.mcp.json`, `CLAUDE.md`) and **sync a standardized template across many projects at once** (with backups).

### 🔒 A read-only dashboard, not a proxy
This is the line in the sand that sets the architecture apart:
* **No proxy, no cloud sync, no telemetry, no account.** Agent Deck *reads* the files your agents already write — it never sits in the middle of your traffic.
* **Tokens never leave the main process.** Credential files are parsed only in Electron's main process; only safe display fields cross into the UI, and emails are masked by default.

---

## 🧰 Also included

Rounding out the cockpit. These overlap with dedicated tools — keep using whichever you prefer; Agent Deck just saves you a window.

* **🔋 Quota & account switching** — remaining-% bars from the local [Cockpit Tools](https://github.com/jlcodes99/cockpit-tools) cache, plus safe one-click Codex `auth.json` switching (atomic, backed up). *Agent Deck reads Cockpit's cache, so the two work well side by side.*
* **🔌 MCP server manager** — read/write MCP configs for Claude Code, Codex, and Antigravity (JSON + TOML), full CRUD, duplicate across clients, and an offline "config-and-go" marketplace that **never runs an installer**.
* **🧩 Agent Skills manager** — index, edit, and toggle skills for Claude Code, Claude Desktop, and Codex, with an offline starter marketplace.
* **📝 Markdown viewer** — preview local Markdown with images resolved.

<p align="center">
  <img src="docs/mcp-market.png" alt="MCP marketplace" width="390"/>
  <img src="docs/skills-market.png" alt="Skills marketplace" width="390"/>
</p>

---

## 🔒 Security & Privacy

Agent Deck reads data files produced by other tools on your disk, so security is the top priority:

* **OAuth tokens stay local.** Files with access keys are parsed exclusively in the Electron main process. Only safe display fields cross IPC into React — tokens never do.
* **Email masking by default.** Account emails are obfuscated at the IPC boundary (`dev***@domain.com`) so they don't leak during screen-sharing. Opt out with `TOOL_MASTER_SHOW_EMAILS=1`.
* **Safe config writes.** Writes are confined to your workspace root, create a timestamped `.bak-<timestamp>` first, and are JSON-validated before saving.
* **Zero telemetry.** The app has no network client of its own. Nothing is phoned home.

### Paths Agent Deck accesses

| Target | Purpose | Mode |
|---|---|---|
| `~/.claude/projects/**.jsonl` | Claude Code session history | Read-only |
| `~/.codex/sessions/**.jsonl` | Codex session history | Read-only |
| `~/.claude/skills`, `~/.codex/skills` | Agent Skills discovery & editing | Read/Write |
| `%APPDATA%/Claude/.../skills-plugin/**` | Claude Desktop skills | Read-only |
| `~/.antigravity_cockpit/**` | cockpit-tools quota cache | Read-only |
| `~/.codex/auth.json` | Codex active account | Read/Write |
| `<WORK_ROOT>/*` (default `~/projects`) | Project dirs + `AGENTS.md`/`.mcp.json`/`CLAUDE.md` | Read/Write |

---

## 🛠️ Getting Started

> **Platform:** Agent Deck is currently **Windows-only** — it is built and tested on Windows 10/11. The code itself is largely cross-platform, but macOS/Linux paths and packaging are not yet validated. See [Roadmap](#-roadmap).

### Download (recommended for most users)

Grab the latest portable `.exe` from the **[Releases page](https://github.com/xiaozpp/Agent-Deck/releases/latest)** — no installation, just run it.

> **Windows SmartScreen note:** the build is not code-signed yet, so Windows may show *"Windows protected your PC"* on first launch. Click **More info → Run anyway**. (The source is fully open here for anyone who wants to inspect or build it themselves.)

### Build from source

### Prerequisites
* **OS:** Windows 10 / 11
* **Node.js:** v20.19+ (Node 20 LTS) or v22.12+

### Run from source
```bash
git clone git@github.com:xiaozpp/Agent-Deck.git
cd Agent-Deck
npm install
npm start          # Vite dev server + Electron window
```

### Build a portable Windows .exe
```bash
npm run package:win
```

### Run all checks (tests + typecheck + production build + syntax)
```bash
npm run check
```

### Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `TOOL_MASTER_WORK_ROOT` | `~/projects` | Directory scanned for local coding projects. |
| `TOOL_MASTER_SHOW_EMAILS` | (unset) | Set to `1` to show full account emails (disable masking). |
| `CCUSAGE_BIN` / `TOKSCALE_BIN` | (auto) | Override paths to the usage-tracker binaries. |

### Extend the offline marketplaces (no source edits)
* `config/mcp-presets.json` — array of MCP presets (`id`, `name`, `install` required; `${VAR}` placeholders are prompted before install).
* `config/skill-presets/*.md` — one Skill preset per file; frontmatter sets metadata, the body becomes `SKILL.md`.

---

## 🗺️ Roadmap

* **macOS & Linux support** — the UI is web tech and most file access uses `os.homedir()`, so the groundwork is there. What's missing is platform-specific path mapping (e.g. `~/Library/Application Support/Claude` on macOS) and packaging. **Help wanted** — if you run macOS or Linux, contributions and testing are very welcome.
* Theming / dark mode.

---

## 🌐 Internationalization

The UI ships in **English** and **Simplified Chinese**. It follows your system language on first launch, and a title-bar switch (`中文` / `EN`) lets you change it anytime.

---

## 🤝 Contributing

Contributions are welcome — see **[CONTRIBUTING.md](./CONTRIBUTING.md)**. In short: any code touching user credentials must follow the **No Spread** rule (forward only an explicit allow-list of metadata fields across the IPC bridge; never serialize whole token objects), and file writes must be confined + backed up + validated. `npm run check` must pass on every PR.

## 📄 License

Licensed under the [MIT License](./LICENSE).

*Disclaimer: Agent Deck is an independent open-source tool and is not officially affiliated with Anthropic, OpenAI, Google, or cockpit-tools.*
