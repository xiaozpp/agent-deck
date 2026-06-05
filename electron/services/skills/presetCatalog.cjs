// Curated, offline Skill presets — the Skills "marketplace" shelf.
//
// Each preset is a complete SKILL.md (frontmatter name/description + body)
// installed by writing it into the chosen agent's personal skills dir via the
// existing skillsService.createSkill path. Bodies are intentionally compact
// starting points (inspired by the well-known open skills like anthropics/
// skills) — the user can edit after install. Nothing is fetched from the
// network; everything is bundled.

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..", "..", "..");

const SKILL_PRESETS = [
  {
    id: "commit-helper",
    name: "commit-helper",
    title: "Commit Helper",
    author: "community",
    category: "Git",
    description: "Write clear, conventional Git commit messages from the staged diff.",
    body: [
      "# Commit Helper",
      "",
      "Use this skill when the user asks to commit changes or write a commit message.",
      "",
      "## Steps",
      "1. Run `git diff --cached` to read the staged changes (ask the user to stage first if nothing is staged).",
      "2. Group the changes by intent and pick a Conventional Commits type: feat, fix, refactor, docs, test, chore.",
      "3. Write a concise subject line (<= 72 chars), imperative mood, no trailing period.",
      "4. Add a short body explaining *why* when the change isn't obvious.",
      "5. Show the message and let the user confirm before committing.",
      "",
      "## Rules",
      "- One logical change per commit; suggest splitting if the diff mixes concerns.",
      "- Never include secrets or generated files in the summary.",
    ].join("\n"),
  },
  {
    id: "code-reviewer",
    name: "code-reviewer",
    title: "Code Reviewer",
    author: "community",
    category: "Quality",
    description: "Review the current diff for correctness, security, and simplicity.",
    body: [
      "# Code Reviewer",
      "",
      "Use this skill when asked to review changes or a pull request.",
      "",
      "## Focus order",
      "1. **Correctness** — logic errors, off-by-one, null/undefined, error handling, race conditions.",
      "2. **Security** — injection, path traversal, secrets in code, unsafe writes, missing validation.",
      "3. **Reuse & simplicity** — duplicated logic, dead code, simpler equivalents.",
      "4. **Tests** — is the change covered? Suggest the missing case.",
      "",
      "## Output",
      "- Group findings by severity (blocker / nit).",
      "- Quote the file and line, explain the issue, propose a concrete fix.",
      "- Praise what's genuinely good; keep it short.",
    ].join("\n"),
  },
  {
    id: "pr-description",
    name: "pr-description",
    title: "PR Description Writer",
    author: "community",
    category: "Git",
    description: "Draft a structured pull-request description from the branch's commits.",
    body: [
      "# PR Description Writer",
      "",
      "Use when the user wants a pull-request description.",
      "",
      "## Steps",
      "1. Run `git log <base>..HEAD --oneline` and `git diff <base>...HEAD --stat`.",
      "2. Summarize **what changed** and **why** in 2-4 sentences.",
      "3. Add sections: ## Summary, ## Changes (bulleted), ## Testing, ## Notes/Risks.",
      "4. Keep it skimmable; link issues if the branch name references one.",
    ].join("\n"),
  },
  {
    id: "test-writer",
    name: "test-writer",
    title: "Test Writer",
    author: "community",
    category: "Quality",
    description: "Generate focused unit tests for a function or module the user points to.",
    body: [
      "# Test Writer",
      "",
      "Use when asked to add or improve tests.",
      "",
      "## Steps",
      "1. Read the target function and detect the test framework already used in the repo.",
      "2. Cover: the happy path, boundary values, empty/null inputs, and one failure path.",
      "3. Match the existing test style and file naming; don't introduce a new framework.",
      "4. Make assertions specific; avoid snapshotting large blobs.",
      "5. Run the test command and confirm they pass before finishing.",
    ].join("\n"),
  },
  {
    id: "explain-codebase",
    name: "explain-codebase",
    title: "Explain This Codebase",
    author: "community",
    category: "Onboarding",
    description: "Produce a high-level map of an unfamiliar repo: entry points, modules, data flow.",
    body: [
      "# Explain This Codebase",
      "",
      "Use when the user is new to a repo and asks how it works.",
      "",
      "## Steps",
      "1. Read the README, package manifest, and top-level folders.",
      "2. Identify entry points (main, server, CLI) and the core modules.",
      "3. Trace one representative request/flow end to end.",
      "4. Output: a short architecture summary, a module table (path -> responsibility), and 'where to start reading'.",
      "5. Prefer concrete file paths over vague descriptions.",
    ].join("\n"),
  },
  {
    id: "debug-assistant",
    name: "debug-assistant",
    title: "Debug Assistant",
    author: "community",
    category: "Debugging",
    description: "Systematically isolate a bug from a stack trace or failing behavior.",
    body: [
      "# Debug Assistant",
      "",
      "Use when the user reports an error or unexpected behavior.",
      "",
      "## Method",
      "1. Reproduce: get the exact command/input and the full error + stack trace.",
      "2. Localize: map the top app frame in the trace to a file/line; read around it.",
      "3. Hypothesize: state the most likely cause in one sentence before changing code.",
      "4. Verify: add a targeted log/test to confirm, then fix the root cause (not the symptom).",
      "5. Confirm the fix and remove temporary debugging.",
    ].join("\n"),
  },
];

function parsePresetMarkdownContent(raw, fallbackName) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  const data = {};
  let body = raw;
  if (match) {
    body = match[2] || "";
    for (const line of match[1].split(/\r?\n/)) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      data[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  const name = data.name || fallbackName;
  return {
    id: data.id || name,
    name,
    title: data.title || name,
    author: data.author || "local",
    category: data.category || "Local",
    description: data.description || "",
    body,
  };
}

function parsePresetMarkdown(filePath) {
  return parsePresetMarkdownContent(
    fs.readFileSync(filePath, "utf8"),
    path.basename(filePath, path.extname(filePath)),
  );
}

function loadLocalSkillPresets() {
  const dir = path.join(projectRoot, "config", "skill-presets");
  try {
    return fs.readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".md"))
      .map((file) => parsePresetMarkdown(path.join(dir, file)));
  } catch (_) {
    return [];
  }
}

function skillPresetMarkdown(preset) {
  return [
    "---",
    `id: ${preset.id}`,
    `name: ${preset.name}`,
    `title: ${preset.title}`,
    `author: ${preset.author || "local"}`,
    `category: ${preset.category || "Local"}`,
    `description: ${preset.description || ""}`,
    "---",
    "",
    preset.body || "",
  ].join("\n");
}

function safePresetFileName(name) {
  return String(name || "skill-preset")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "skill-preset";
}

function splitPresetMarkdown(raw) {
  const parts = String(raw || "").split(/\r?\n\r?\n(?=---\r?\n)/g).map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [raw];
}

function importLocalSkillPresets(files) {
  const incoming = Array.isArray(files) ? files : [files];
  const dir = path.join(projectRoot, "config", "skill-presets");
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const item of incoming) {
    const raw = typeof item === "string" ? item : item?.content;
    const originalName = typeof item === "object" ? item.name : "";
    if (!raw) continue;
    for (const chunk of splitPresetMarkdown(raw)) {
      const preset = parsePresetMarkdownContent(chunk, path.basename(originalName, path.extname(originalName)));
      const name = safePresetFileName(preset.id || preset.name || originalName);
      fs.writeFileSync(path.join(dir, `${name}.md`), chunk.endsWith("\n") ? chunk : `${chunk}\n`, "utf8");
      count += 1;
    }
  }
  if (count === 0) throw new Error("No valid Skill presets found.");
  return { ok: true, count, dir };
}

function exportLocalSkillPresets() {
  const dir = path.join(projectRoot, "config", "skill-presets");
  return {
    dir,
    presets: loadLocalSkillPresets(),
  };
}

function allSkillPresets() {
  const map = new Map();
  for (const preset of SKILL_PRESETS) map.set(preset.id, preset);
  for (const preset of loadLocalSkillPresets()) map.set(preset.id, preset);
  return [...map.values()];
}

function listSkillPresets() {
  return allSkillPresets().map((p) => ({
    id: p.id,
    name: p.name,
    title: p.title,
    author: p.author,
    category: p.category,
    description: p.description,
    body: p.body,
  }));
}

function getSkillPreset(id) {
  return allSkillPresets().find((p) => p.id === id) || null;
}

module.exports = {
  SKILL_PRESETS,
  allSkillPresets,
  listSkillPresets,
  getSkillPreset,
  skillPresetMarkdown,
  importLocalSkillPresets,
  exportLocalSkillPresets,
};
