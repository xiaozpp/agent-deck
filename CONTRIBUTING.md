# Contributing to Agent Deck

Thanks for your interest! Agent Deck is a local-first desktop control deck for
AI coding agents. Contributions are welcome — please keep the project's two
non-negotiables in mind.

## Two non-negotiables

1. **Privacy first.** This app reads sensitive local files (account tokens,
   conversation history). Any code that touches account data **must** forward an
   explicit allow-list of safe fields across IPC — never a `...spread` of an
   account object, and never a raw token. Emails are masked by default at the
   IPC boundary.
2. **Safe writes.** Anything that writes to a user file must (a) confine writes
   to an allowed root, (b) back up the original to `<file>.bak-<timestamp>`, and
   (c) validate before writing (e.g. JSON.parse for `.json`). See
   `electron/services/mcp/fileStore.cjs` and `accountsService.cjs` for the
   pattern.

## Development

```bash
npm install
npm start          # vite dev server + electron
npm run check      # tests + typecheck + build + syntax — must pass before a PR
```

- **Frontend:** one module per feature under `src/modules/<feature>/`. `App.tsx`
  is a thin shell (layout + routing); register new modules in
  `src/modules/moduleRegistry.ts`.
- **Backend:** a read-only/guarded service in `electron/services/`, an IPC
  handler in `electron/main.cjs`, a bridge line in `electron/preload.cjs`, and a
  type in `src/types.ts`.
- **Tests:** add a `tests/*.test.mjs` for new service logic. CI runs
  `npm run check` on every PR.

## Pull requests

- Keep PRs focused; one logical change per PR.
- `npm run check` must be green.
- Don't commit screenshots (`qa/`), build output (`dist/`), or user runtime data
  (`config/mcp-presets.json`, `config/skill-presets/`) — they're gitignored.
- Never include real tokens, emails, or machine-specific absolute paths.

## Scope

Agent Deck stays **local-only**: no servers, no telemetry, no network client of
its own. Features that require phoning home are out of scope. Reading additional
local agent data (new CLIs, new config formats) is very welcome.
