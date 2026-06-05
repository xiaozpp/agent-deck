import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadTools, getToolById, resolveToolTarget } from "../electron/toolRegistry.cjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

test("loads the two starter tools in display order", () => {
  const tools = loadTools(rootDir);

  assert.deepEqual(
    tools.map((tool) => tool.id),
    ["codex-usage", "markdown-viewer"],
  );
  assert.equal(tools[0].name, "大模型用量");
  assert.equal(tools[1].category, "文档工具");
  assert.equal(tools[1].requiresFile, true);
});

test("resolves executable targets relative to the toolbox root", () => {
  const tools = loadTools(rootDir);
  const codexUsage = getToolById(tools, "codex-usage");
  const target = resolveToolTarget(rootDir, codexUsage);

  assert.equal(target.cwd, rootDir);
  assert.equal(target.command, path.resolve(rootDir, "codex-usage"));
  assert.deepEqual(target.args, []);
});

test("keeps future tool metadata extensible", () => {
  const tools = loadTools(rootDir);
  const markdown = getToolById(tools, "markdown-viewer");

  assert.equal(markdown.launch.kind, "module");
  assert.match(markdown.description, /Markdown/);
  assert.ok(markdown.tags.includes("文档"));
});
