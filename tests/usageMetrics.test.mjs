import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "src", "modules", "usage", "usageMetrics.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const metrics = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

test("usage metrics merge project rows by client and workspace", () => {
  const rows = metrics.mergeProjects([
    { client: "codex", workspaceLabel: "agent-deck", model: "gpt-5", input: 10, output: 5, cost: 1, messageCount: 2 },
    { client: "codex", workspaceLabel: "agent-deck", model: "gpt-5-mini", input: 3, output: 7, cost: 2, messageCount: 1 },
    { client: "claude", workspaceLabel: "other", model: "sonnet", input: 1, output: 1, cost: 0.5, messageCount: 1 },
  ]);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].workspaceLabel, "agent-deck");
  assert.equal(rows[0].input, 13);
  assert.equal(rows[0].output, 12);
  assert.equal(rows[0].cost, 3);
  assert.equal(rows[0].messageCount, 3);
  assert.equal(rows[0].model, "gpt-5, gpt-5-mini");
});

test("usage metrics group same local project across clients", () => {
  const rows = metrics.mergeProjects([
    { client: "codex", workspaceLabel: "Tool", displayPath: "D:\\work\\agent-deck", cost: 1, messageCount: 1 },
    { client: "claude", workspaceLabel: "Tool", displayPath: "d:/work/agent-deck/", cost: 2, messageCount: 3 },
  ]);

  const groups = metrics.groupProjects(rows, true);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].cost, 3);
  assert.deepEqual(groups[0].clients.sort(), ["claude", "codex"]);
  assert.equal(groups[0].children.length, 2);
});

test("usage metrics aggregate daily ccusage and hourly fallback data", () => {
  const days = metrics.aggregateDays(
    {
      ccusage: {
        daily: [{ date: "2026-05-01", costUSD: 4, inputTokens: 10, outputTokens: 5 }],
      },
    },
    [
      { hour: "2026-05-01T12", cost: 99 },
      { hour: "2026-05-02T08", cost: 3 },
    ],
  );

  assert.deepEqual(days, [
    { date: "2026-05-01", cost: 4, tokens: 15 },
    { date: "2026-05-02", cost: 3, tokens: 0 },
  ]);
});

test("totalValue ignores ccusage zeros and uses the fallback", () => {
  // ccusage often returns a totals object full of zeros; those must not shadow
  // the tokscale-derived fallback (regression: 总 Token showed 0).
  const report = { ccusage: { totals: { inputTokens: 0, totalTokens: 0 } } };
  assert.equal(metrics.totalValue(report, ["inputTokens"], 6600), 6600);
  // but a real positive ccusage value still wins
  const report2 = { ccusage: { totals: { inputTokens: 1234 } } };
  assert.equal(metrics.totalValue(report2, ["inputTokens"], 9999), 1234);
});

test("aggregateDays builds days from hourly when ccusage is empty", () => {
  // The real-world failure: ccusage.daily empty, all usage only in hourly,
  // multiple hourly buckets on the same day, carrying input/output tokens.
  const days = metrics.aggregateDays(
    { ccusage: { daily: [] } },
    [
      { hour: "2026-06-01 00:00", cost: 21.9, input: 5621, output: 26536 },
      { hour: "2026-06-01 05:00", cost: 17.7, input: 838, output: 15874 },
      { hour: "2026-06-01 06:00", cost: 6.1, input: 23796, output: 8200 },
    ],
  );
  assert.equal(days.length, 1);
  assert.equal(days[0].date, "2026-06-01");
  assert.ok(Math.abs(days[0].cost - 45.7) < 0.001, `cost should sum to 45.7, got ${days[0].cost}`);
  assert.equal(days[0].tokens, 5621 + 26536 + 838 + 15874 + 23796 + 8200);
});

test("usage metrics build chart data by selected granularity", () => {
  const days = [
    { date: "2026-05-03", cost: 2, tokens: 10 },
    { date: "2026-05-04", cost: 3, tokens: 20 },
  ];

  const hourly = [
    { hour: "2026-05-04T08", cost: 1 },
    { hour: "2026-05-04T08", cost: 2 },
  ];

  const today = metrics.buildUsageChartData({ range: "today", granularity: "day", hourly, days });
  assert.equal(today.length, 24);
  assert.equal(today[8].cost, 3);

  const weekly = metrics.buildUsageChartData({ range: "all", granularity: "week", hourly, days });
  assert.deepEqual(weekly, [{ label: "05-03周", cost: 5 }]);
});
