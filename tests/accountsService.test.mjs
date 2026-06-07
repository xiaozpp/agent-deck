import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

// accountsService performs the most sensitive write in the app (moving OAuth
// tokens into ~/.codex/auth.json). Its security contract:
//   - auth.json is rebuilt from a strict field allow-list (no blind copy), so
//     extra fields in the cockpit cache never leak into auth.json
//   - the previous auth.json is backed up first
//   - the return value never contains token material
// These tests pin that contract down.

const root = path.resolve(import.meta.dirname, "..");
const servicePath = path.join(root, "electron", "services", "accountsService.cjs");

// Build a sandbox HOME with a cockpit cache + a "current" auth.json, then run
// switchCodexAccount in a child process whose homedir points at the sandbox.
function setupHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-acct-"));
  const codex = path.join(home, ".codex");
  const cockpit = path.join(home, ".antigravity_cockpit");
  const accounts = path.join(cockpit, "codex_accounts");
  fs.mkdirSync(codex, { recursive: true });
  fs.mkdirSync(accounts, { recursive: true });

  // Existing/live account.
  fs.writeFileSync(path.join(codex, "auth.json"), JSON.stringify({
    OPENAI_API_KEY: "sk-live-key",
    tokens: { access_token: "OLD", account_id: "acc-OLD", id_token: "OLD", refresh_token: "OLD" },
  }), "utf8");

  // cockpit index + a stored target account that ALSO carries extra sensitive
  // junk both at top level and inside tokens — none of it may reach auth.json.
  fs.writeFileSync(path.join(cockpit, "codex_accounts.json"), JSON.stringify({
    current_account_id: "codex_old",
  }), "utf8");
  fs.writeFileSync(path.join(accounts, "codex_new1.json"), JSON.stringify({
    email: "victim@example.com",
    account_id: "acc-NEW",
    evil_top_secret: "MUST_NOT_LEAK_TOP",
    tokens: {
      access_token: "AT-NEW",
      id_token: "IT-NEW",
      refresh_token: "RT-NEW",
      account_id: "acc-NEW",
      extra_secret: "MUST_NOT_LEAK_NESTED",
    },
  }), "utf8");

  return { home, codex };
}

function runSwitch(home, targetId) {
  const script = `
    const svc = require(${JSON.stringify(servicePath)});
    const fs = require("node:fs"); const os = require("node:os"); const path = require("node:path");
    const res = svc.switchCodexAccount(${JSON.stringify(targetId)});
    const authPath = path.join(os.homedir(), ".codex", "auth.json");
    let written = null;
    try { written = JSON.parse(fs.readFileSync(authPath, "utf8")); } catch {}
    process.stdout.write(JSON.stringify({ res, written }));
  `;
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  delete env.CODEX_HOME; // let it derive from homedir
  const result = spawnSync(process.execPath, ["-e", script], { cwd: root, env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("account switch rebuilds auth.json from a strict allow-list", () => {
  const { home } = setupHome();
  const { res, written } = runSwitch(home, "codex_new1");

  assert.equal(res.ok, true, res.message);
  // tokens object contains EXACTLY the four allow-listed fields.
  assert.deepEqual(
    Object.keys(written.tokens).sort(),
    ["access_token", "account_id", "id_token", "refresh_token"],
  );
  assert.equal(written.tokens.access_token, "AT-NEW");
  assert.equal(written.tokens.account_id, "acc-NEW");
});

test("account switch never copies extra cockpit fields into auth.json", () => {
  const { home } = setupHome();
  const { written } = runSwitch(home, "codex_new1");

  const blob = JSON.stringify(written);
  assert.ok(!("evil_top_secret" in written), "top-level junk leaked");
  assert.ok(!("email" in written), "email leaked into auth.json");
  assert.ok(!("extra_secret" in written.tokens), "nested secret leaked");
  assert.ok(!blob.includes("MUST_NOT_LEAK"), "a blocked secret value leaked");
  // Top level is limited to the reconstructed shape.
  assert.deepEqual(Object.keys(written).sort(), ["OPENAI_API_KEY", "last_refresh", "tokens"]);
});

test("account switch backs up the previous auth.json and returns no tokens", () => {
  const { home, codex } = setupHome();
  const { res } = runSwitch(home, "codex_new1");

  assert.ok(res.backup, "expected a backup path");
  assert.ok(fs.existsSync(res.backup), "backup file should exist on disk");
  // The IPC-facing result must not carry token material.
  const blob = JSON.stringify(res);
  for (const secret of ["AT-NEW", "IT-NEW", "RT-NEW"]) {
    assert.ok(!blob.includes(secret), `result leaked token ${secret}`);
  }
  // Backup preserves the OLD credentials.
  const bak = JSON.parse(fs.readFileSync(res.backup, "utf8"));
  assert.equal(bak.tokens.access_token, "OLD");
  void codex;
});

test("account switch rejects an account with incomplete credentials", () => {
  const { home } = setupHome();
  const cockpit = path.join(home, ".antigravity_cockpit", "codex_accounts");
  // Missing id_token / refresh_token.
  fs.writeFileSync(path.join(cockpit, "codex_bad1.json"), JSON.stringify({
    account_id: "acc-BAD",
    tokens: { access_token: "AT-BAD", account_id: "acc-BAD" },
  }), "utf8");

  const { res } = runSwitch(home, "codex_bad1");
  assert.equal(res.ok, false);
});

test("account switch is unavailable without a cockpit cache", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-deck-acct-"));
  fs.mkdirSync(path.join(home, ".codex"), { recursive: true });
  const { res } = runSwitch(home, "codex_new1");
  assert.equal(res.ok, false);
});
