import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const svc = require("../electron/services/sessionsService.cjs");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agentdeck-sessions-"));
function writeJsonl(name, lines) {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n"), "utf8");
  return p;
}
test.after(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} });

// ── blocksToParts ───────────────────────────────────────────
test("blocksToParts handles string, blocks, and junk", () => {
  assert.deepEqual(svc._blocksToParts("user", "hello"), [{ role: "user", kind: "text", text: "hello" }]);
  assert.deepEqual(svc._blocksToParts("user", "   "), []); // whitespace-only dropped
  assert.deepEqual(svc._blocksToParts("user", null), []);
  assert.deepEqual(svc._blocksToParts("user", 42), []);

  const parts = svc._blocksToParts("assistant", [
    { type: "text", text: "hi" },
    { type: "thinking", thinking: "hmm" },
    { type: "tool_use", name: "Bash", input: { cmd: "ls" } },
    { type: "tool_result", content: [{ text: "ok" }] },
    null,
    { type: "unknown" },
    { type: "text" }, // no text -> skipped
  ]);
  assert.equal(parts.length, 4);
  assert.equal(parts[0].kind, "text");
  assert.equal(parts[1].kind, "thinking");
  assert.equal(parts[2].kind, "tool_use");
  assert.equal(parts[2].tool, "Bash");
  assert.equal(parts[3].kind, "tool_result");
  assert.equal(parts[3].text, "ok");
});

// ── parseClaudeSession ──────────────────────────────────────
test("parseClaudeSession: empty file returns null", () => {
  const p = writeJsonl("empty.jsonl", []);
  assert.equal(svc._parseClaudeSession(p, "enc"), null);
});

test("parseClaudeSession: malformed lines are skipped, valid ones parsed", () => {
  const p = writeJsonl("claude.jsonl", [
    "{ this is not json",
    { type: "ai-title", aiTitle: "AI picked title" },
    { type: "user", cwd: "D:\\work\\demo", gitBranch: "main", timestamp: "2026-06-01T00:00:00Z", message: { content: "first question" } },
    "garbage line \x00",
    { type: "assistant", timestamp: "2026-06-01T00:01:00Z", message: { content: [{ type: "text", text: "an answer" }] } },
  ]);
  const s = svc._parseClaudeSession(p, "enc");
  assert.ok(s, "should parse despite junk lines");
  assert.equal(s.source, "claude");
  assert.equal(s.title, "AI picked title"); // aiTitle wins over firstUser
  assert.equal(s.project, "demo");
  assert.equal(s.gitBranch, "main");
  assert.equal(s.messageCount, 2);
  assert.equal(s.preview, "first question");
  assert.ok(s.startedAt > 0 && s.updatedAt >= s.startedAt);
});

test("parseClaudeSession: title priority customTitle > aiTitle > firstUser", () => {
  const p = writeJsonl("titles.jsonl", [
    { type: "custom-title", customTitle: "My Custom" },
    { type: "ai-title", aiTitle: "AI Title" },
    { type: "user", message: { content: "the user text" } },
  ]);
  assert.equal(svc._parseClaudeSession(p, "x").title, "My Custom");
});

test("parseClaudeSession: HEAD git branch is ignored, fallback title used", () => {
  const p = writeJsonl("head.jsonl", [
    { type: "user", gitBranch: "HEAD", message: { content: "only user msg" } },
  ]);
  const s = svc._parseClaudeSession(p, "x");
  assert.equal(s.gitBranch, ""); // HEAD filtered out
  assert.equal(s.title, "only user msg");
});

test("parseClaudeSession: continuation prompt not used as title", () => {
  const p = writeJsonl("cont.jsonl", [
    { type: "user", message: { content: "This session is being continued from a previous conversation" } },
    { type: "user", message: { content: "real first question" } },
  ]);
  const s = svc._parseClaudeSession(p, "x");
  assert.equal(s.preview, "real first question");
});

// ── parseCodexSession ───────────────────────────────────────
test("parseCodexSession: parses meta + user/agent messages, skips env context", () => {
  const p = writeJsonl("rollout-x.jsonl", [
    { type: "session_meta", timestamp: "2026-06-01T00:00:00Z", payload: { id: "abc", cwd: "D:\\work\\proj", originator: "Codex Desktop", git: { branch: "dev" } } },
    { type: "event_msg", timestamp: "2026-06-01T00:00:01Z", payload: { type: "user_message", message: "<environment_context>noise</environment_context>" } },
    { type: "event_msg", timestamp: "2026-06-01T00:00:02Z", payload: { type: "user_message", message: "real question" } },
    { type: "event_msg", timestamp: "2026-06-01T00:00:03Z", payload: { type: "agent_message", message: "the answer" } },
    { type: "event_msg", payload: { type: "patch_apply_end", files: ["a.js"] } },
  ]);
  const s = svc._parseCodexSession(p);
  assert.ok(s);
  assert.equal(s.source, "codex");
  assert.equal(s.sessionId, "abc");
  assert.equal(s.project, "proj");
  assert.equal(s.gitBranch, "dev");
  assert.equal(s.title, "real question"); // env-context message skipped
  assert.equal(s.messageCount, 2); // user + agent (tool calls don't bump messageCount)
});

test("parseCodexSession: empty file returns null", () => {
  assert.equal(svc._parseCodexSession(writeJsonl("rollout-empty.jsonl", [])), null);
});

// ── listSessions / readSession (integration, real dirs may be empty) ──
test("listSessions returns a well-formed shape and never throws", () => {
  const r = svc.listSessions({ force: true });
  assert.ok(Array.isArray(r.sessions));
  assert.ok(r.counts && typeof r.counts.all === "number");
  assert.ok(r.available && typeof r.available.claude === "boolean");
  // search must not throw even with odd queries
  assert.doesNotThrow(() => svc.listSessions({ search: "zzz-no-match-xyz" }));
  assert.doesNotThrow(() => svc.listSessions({ source: "codex", search: "x" }));
});

test("readSession rejects out-of-tree and non-jsonl paths", () => {
  assert.throws(() => svc.readSession("C:\\Windows\\win.ini"));
  assert.throws(() => svc.readSession(path.join(os.homedir(), "..", "..", "etc", "passwd.jsonl")));
});
