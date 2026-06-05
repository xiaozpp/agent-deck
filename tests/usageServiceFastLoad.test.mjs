import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const servicePath = path.join(root, "electron", "services", "usageService.cjs");

function runUsageReport(query) {
  const script = `
    const childProcess = require("node:child_process");
    const calls = [];
    childProcess.execFile = (_command, args, _options, callback) => {
      calls.push(args.join(" "));
      const joined = args.join(" ");
      const payload = joined.includes("clients")
        ? { clients: [] }
        : joined.includes("daily")
          ? { daily: [], totals: {} }
          : joined.includes("hourly")
            ? { entries: [] }
            : { entries: [], totalCost: 0, totalInput: 0, totalOutput: 0, totalCacheRead: 0, totalMessages: 0 };
      callback(null, JSON.stringify(payload), "");
    };
    const svc = require(${JSON.stringify(servicePath)});
    svc.buildUsageReport(${JSON.stringify(query)})
      .then((report) => process.stdout.write(JSON.stringify({ calls, report })))
      .catch((error) => {
        console.error(error && error.stack || error);
        process.exit(1);
      });
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("usage report skips ccusage on the default fast refresh", () => {
  const { calls, report } = runUsageReport({ client: "all", range: "month", provider: "combined" });

  assert.equal(report.ccusage, null);
  assert.equal(calls.length, 3);
  assert.equal(calls.some((call) => call.includes("ccusage")), false);
});

test("usage report runs ccusage only on forced refresh", () => {
  const { calls } = runUsageReport({ client: "all", range: "month", provider: "combined", force: true });

  assert.equal(calls.some((call) => call.includes("ccusage") && call.includes("codex daily")), true);
  assert.equal(calls.some((call) => call.includes("ccusage") && call.includes("claude daily")), true);
});
