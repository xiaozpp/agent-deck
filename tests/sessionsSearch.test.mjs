import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const svc = require(path.join(root, "electron", "services", "sessionsService.cjs"));
const { _sessionMatch: sessionMatch, _snippetAround: snippetAround } = svc;

function fakeSession(extra = {}) {
  return {
    title: "Refactor the auth module",
    project: "my-app",
    _records: [
      { role: "user", parts: [{ kind: "text", text: "Please REVIEW the login flow carefully." }] },
      { role: "assistant", parts: [{ kind: "thinking", text: "considering the token refresh path" }] },
    ],
    ...extra,
  };
}

test("snippetAround centres on the match and preserves original case", () => {
  const long = "alpha beta gamma delta KEYWORD epsilon zeta eta theta iota kappa lambda";
  const snip = snippetAround(long, "keyword");
  assert.ok(snip.includes("KEYWORD"), "keeps original case");
  assert.ok(snip.includes("delta") && snip.includes("epsilon"), "includes surrounding context");
});

test("snippetAround adds ellipses only where it clipped", () => {
  const text = "x".repeat(80) + "NEEDLE" + "y".repeat(80);
  const snip = snippetAround(text, "needle");
  assert.ok(snip.startsWith("…") && snip.endsWith("…"), "clipped on both sides");

  const short = "find the NEEDLE now";
  assert.equal(snippetAround(short, "needle"), "find the NEEDLE now"); // no clipping
});

test("snippetAround returns null when the query is absent", () => {
  assert.equal(snippetAround("nothing here", "missing"), null);
});

test("sessionMatch prefers a body hit and reports role + snippet", () => {
  const m = sessionMatch(fakeSession(), "review");
  assert.equal(m.field, "body");
  assert.equal(m.role, "user");
  assert.ok(m.snippet.includes("REVIEW"));
});

test("sessionMatch matches thinking blocks too", () => {
  const m = sessionMatch(fakeSession(), "token refresh");
  assert.equal(m.field, "body");
  assert.equal(m.role, "assistant");
});

test("sessionMatch falls back to title then project", () => {
  // "auth" only appears in the title
  assert.deepEqual(sessionMatch(fakeSession(), "auth"), { field: "title" });
  // "my-app" only appears in the project
  assert.deepEqual(sessionMatch(fakeSession(), "my-app"), { field: "project" });
});

test("sessionMatch returns null when nothing matches", () => {
  assert.equal(sessionMatch(fakeSession(), "zzz-not-present"), null);
});
