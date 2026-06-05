import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

import {
  ccusageRangeArgs,
  buildAntigravityCacheLines,
  combineCcusageReports,
  normalizeClient,
  rangeArgs,
  tokscaleClientValue,
} from "../electron/services/usageService.cjs";
import { extractImageReferences, readMarkdownFile } from "../electron/services/markdownService.cjs";

test("usage helpers normalize clients and ranges", () => {
  assert.equal(normalizeClient("claude"), "claude");
  assert.equal(normalizeClient("antigravity"), "antigravity");
  assert.equal(normalizeClient("all"), "all");
  assert.equal(normalizeClient("unknown"), "codex");
  assert.equal(tokscaleClientValue("all"), "codex,claude,antigravity");
  assert.deepEqual(rangeArgs({ range: "week" }), ["--week"]);
  assert.deepEqual(rangeArgs({ range: "all" }), []);
  assert.deepEqual(ccusageRangeArgs({ range: "all" }), []);
  assert.deepEqual(ccusageRangeArgs({ range: "custom", since: "2026-05-01", until: "2026-05-28" }), [
    "--since",
    "2026-05-01",
    "--until",
    "2026-05-28",
  ]);
});

test("combines ccusage reports without losing totals", () => {
  const report = combineCcusageReports([
    { daily: [{ date: "2026-05-27" }], totals: { inputTokens: 10, outputTokens: 20, costUSD: 0.5 } },
    { daily: [{ date: "2026-05-28" }], totals: { inputTokens: 2, outputTokens: 3, totalCost: 1.25 } },
  ]);

  assert.equal(report.daily.length, 2);
  assert.equal(report.totals.inputTokens, 12);
  assert.equal(report.totals.outputTokens, 23);
  assert.equal(report.totals.costUSD, 1.75);
});

test("combineCcusageReports tolerates null/empty/malformed inputs", () => {
  // these are the shapes that flow in when ccusage fails or returns nothing
  assert.doesNotThrow(() => combineCcusageReports(undefined));
  assert.doesNotThrow(() => combineCcusageReports(null));
  assert.doesNotThrow(() => combineCcusageReports([]));
  const r = combineCcusageReports([null, {}, { totals: {} }, { daily: null }]);
  assert.equal(r.daily.length, 0);
  assert.equal(r.totals.inputTokens, 0);
  assert.equal(r.totals.costUSD, 0);
  // a real report mixed with junk still sums correctly
  const r2 = combineCcusageReports([null, { daily: [{ date: "d" }], totals: { inputTokens: 5, costUSD: 1 } }]);
  assert.equal(r2.daily.length, 1);
  assert.equal(r2.totals.inputTokens, 5);
  assert.equal(r2.totals.costUSD, 1);
});

test("antigravity cache uses log turns instead of protobuf file size", () => {
  const logContent = [
    JSON.stringify({
      type: "USER_INPUT",
      created_at: "2026-05-28T10:00:00Z",
      content: "Build a small dashboard.",
    }),
    JSON.stringify({
      type: "PLANNER_RESPONSE",
      created_at: "2026-05-28T10:00:05Z",
      content: "I will inspect the project and update the UI.",
      tool_calls: [{ name: "read_file", args: { path: "src/App.tsx" } }],
    }),
    JSON.stringify({
      type: "USER_INPUT",
      created_at: "2026-05-28T10:05:00Z",
      content: "Now verify it.",
    }),
    JSON.stringify({
      type: "PLANNER_RESPONSE",
      created_at: "2026-05-28T10:05:08Z",
      content: "Verification completed.",
    }),
  ].join("\n");

  const lines = buildAntigravityCacheLines({
    sessionId: "session-1",
    logContent,
    pbSize: 4_000_000,
    fallbackTimestamp: Date.parse("2026-05-28T10:10:00Z"),
  });

  const usage = lines.map((line) => JSON.parse(line)).filter((row) => row.type === "usage");
  const totalTokens = usage.reduce((sum, row) => sum + row.input + row.output + row.cacheRead, 0);

  assert.equal(usage.length, 2);
  assert.equal(usage[0].timestamp, Date.parse("2026-05-28T10:00:00Z"));
  assert.equal(usage[1].timestamp, Date.parse("2026-05-28T10:05:00Z"));
  assert.ok(totalTokens < 5_000, `expected log-sized token estimate, got ${totalTokens}`);
});

test("markdown reader embeds local images and preserves content", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-md-"));
  const imagePath = path.join(dir, "image.svg");
  const markdownPath = path.join(dir, "demo.md");
  fs.writeFileSync(imagePath, "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>", "utf8");
  fs.writeFileSync(markdownPath, "# Demo\n\n![chart](image.svg)\n", "utf8");

  const refs = extractImageReferences("![chart](image.svg)\n<img src=\"./image.svg\">");
  assert.deepEqual(refs, ["image.svg", "./image.svg"]);

  const manifest = readMarkdownFile(markdownPath);
  assert.equal(manifest.name, "demo.md");
  assert.match(manifest.content, /# Demo/);
  assert.match(manifest.images["image.svg"], /^data:image\/svg\+xml;base64,/);
});
