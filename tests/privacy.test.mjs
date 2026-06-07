import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

// The whole privacy promise rests on emails being masked before they cross IPC.
// SHOW_EMAILS is read once at module load, so we exercise it in child processes
// with controlled env rather than in-process.

const root = path.resolve(import.meta.dirname, "..");
const privacyPath = path.join(root, "electron", "services", "privacy.cjs");

const CASES = [
  "alice.dev@example.com",
  "bob@host.com",
  "test@host.com",
  "longer@host.com",
  "notanemail",
  "",
];

function runMask(env) {
  const script = `
    const { maskEmail, SHOW_EMAILS } = require(${JSON.stringify(privacyPath)});
    const cases = ${JSON.stringify(CASES)}.concat([null]);
    process.stdout.write(JSON.stringify({ SHOW_EMAILS, out: cases.map((c) => maskEmail(c)) }));
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: root,
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("privacy masks emails by default (no opt-out env)", () => {
  const env = { ...process.env };
  delete env.TOOL_MASTER_SHOW_EMAILS;
  const { SHOW_EMAILS, out } = runMask(env);

  assert.equal(SHOW_EMAILS, false);
  assert.deepEqual(out, [
    "ali***ev@example.com", // long local -> first 3 + last 2 kept
    "b***@host.com",        // local length <= 4 -> only first char kept
    "t***@host.com",
    "lon***er@host.com",
    "notanemail",           // no "@" -> returned unchanged
    "",                     // empty -> empty
    "",                     // null -> empty string, never undefined
  ]);
});

test("privacy never leaks the raw local part of a real email when masking", () => {
  const env = { ...process.env };
  delete env.TOOL_MASTER_SHOW_EMAILS;
  const { out } = runMask(env);
  // The full local-part "alice.dev" must not survive masking.
  assert.ok(!out[0].includes("alice.dev"));
  assert.ok(out[0].includes("@example.com"));
});

test("privacy shows full emails only when explicitly opted in", () => {
  const { SHOW_EMAILS, out } = runMask({ ...process.env, TOOL_MASTER_SHOW_EMAILS: "1" });

  assert.equal(SHOW_EMAILS, true);
  assert.deepEqual(out, [...CASES, ""]); // null still normalizes to ""
});
