import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

test("MCP module lives outside the root App component", () => {
  const modulePath = path.join(root, "src", "modules", "mcp", "McpModule.tsx");
  const editorPath = path.join(root, "src", "modules", "mcp", "McpEditorPanel.tsx");
  const marketPath = path.join(root, "src", "modules", "mcp", "McpMarket.tsx");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(modulePath), true);
  assert.equal(fs.existsSync(editorPath), true);
  assert.equal(fs.existsSync(marketPath), true);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/modules\/mcp\/McpModule"/);
});

test("usage module lives outside the root App component", () => {
  const modulePath = path.join(root, "src", "modules", "usage", "UsageModule.tsx");
  const metricsPath = path.join(root, "src", "modules", "usage", "usageMetrics.ts");
  const lineChartPath = path.join(root, "src", "modules", "usage", "LineChart.tsx");
  const quotaPanelPath = path.join(root, "src", "modules", "usage", "QuotaPanel.tsx");
  const projectRankingPath = path.join(root, "src", "modules", "usage", "ProjectRankingPanel.tsx");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(modulePath), true);
  assert.equal(fs.existsSync(metricsPath), true);
  assert.equal(fs.existsSync(lineChartPath), true);
  assert.equal(fs.existsSync(quotaPanelPath), true);
  assert.equal(fs.existsSync(projectRankingPath), true);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/modules\/usage\/UsageModule"/);
});

test("skills module lives outside the root App component", () => {
  const modulePath = path.join(root, "src", "modules", "skills", "SkillsModule.tsx");
  const editorPath = path.join(root, "src", "modules", "skills", "SkillEditor.tsx");
  const marketPath = path.join(root, "src", "modules", "skills", "SkillMarket.tsx");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(modulePath), true);
  assert.equal(fs.existsSync(editorPath), true);
  assert.equal(fs.existsSync(marketPath), true);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/modules\/skills\/SkillsModule"/);
});

test("projects module lives outside the root App component", () => {
  const modulePath = path.join(root, "src", "modules", "projects", "ProjectsModule.tsx");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(modulePath), true);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/modules\/projects\/ProjectsModule"/);
});

test("sessions module lives outside the root App component", () => {
  const modulePath = path.join(root, "src", "modules", "sessions", "SessionsModule.tsx");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(modulePath), true);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/modules\/sessions\/SessionsModule"/);
});

test("markdown module lives outside the root App component", () => {
  const modulePath = path.join(root, "src", "modules", "markdown", "MarkdownModule.tsx");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(modulePath), true);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/modules\/markdown\/MarkdownModule"/);
});

test("tool manager module lives outside the root App component", () => {
  const modulePath = path.join(root, "src", "modules", "tools", "ToolManagerModule.tsx");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(modulePath), true);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/modules\/tools\/ToolManagerModule"/);
});

test("home module and module registry live outside the root App component", () => {
  const homePath = path.join(root, "src", "modules", "home", "HomeModule.tsx");
  const registryPath = path.join(root, "src", "modules", "moduleRegistry.ts");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(homePath), true);
  assert.equal(fs.existsSync(registryPath), true);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/modules\/home\/HomeModule"/);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/modules\/moduleRegistry"/);
});

test("app shell helper components live outside the root App component", () => {
  const errorBoundaryPath = path.join(root, "src", "components", "ErrorBoundary.tsx");
  const windowButtonPath = path.join(root, "src", "components", "WindowButton.tsx");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(errorBoundaryPath), true);
  assert.equal(fs.existsSync(windowButtonPath), true);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/components\/ErrorBoundary"/);
  assert.match(fs.readFileSync(appPath, "utf8"), /from "\.\/components\/WindowButton"/);
});

test("app shell exposes Chinese and English language support", () => {
  const i18nPath = path.join(root, "src", "i18n.tsx");
  const mainPath = path.join(root, "src", "main.tsx");
  const appPath = path.join(root, "src", "App.tsx");

  assert.equal(fs.existsSync(i18nPath), true);
  assert.match(fs.readFileSync(mainPath, "utf8"), /<LanguageProvider>/);
  assert.match(fs.readFileSync(appPath, "utf8"), /className="language-switch"/);
  assert.match(fs.readFileSync(i18nPath, "utf8"), /export type Language = "zh" \| "en"/);
});

test("Antigravity usage parsing lives outside the aggregate usage service", () => {
  const servicePath = path.join(root, "electron", "services", "usageService.cjs");
  const antigravityPath = path.join(root, "electron", "services", "usage", "antigravityUsage.cjs");

  assert.equal(fs.existsSync(antigravityPath), true);
  assert.match(fs.readFileSync(servicePath, "utf8"), /require\("\.\/usage\/antigravityUsage\.cjs"\)/);
});
