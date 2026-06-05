import test from "node:test";
import assert from "node:assert/strict";

import { shouldOpenDevTools } from "../electron/windowPolicy.cjs";

test("devtools stay closed by default and require an explicit opt-in", () => {
  assert.equal(shouldOpenDevTools({}), false);
  assert.equal(shouldOpenDevTools({ TOOL_MASTER_OPEN_DEVTOOLS: "0" }), false);
  assert.equal(shouldOpenDevTools({ TOOL_MASTER_OPEN_DEVTOOLS: "1" }), true);
});
