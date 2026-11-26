import assert from "node:assert/strict";
import test from "node:test";
import { hasActiveSession } from "./session-time.ts";

test("permanent test access works without credit or an expiry, even in the far future", () => {
  assert.equal(hasActiveSession({ permanentTestAccess: true, activeSessionEndsAt: null }, Date.parse("2100-01-01")), true);
  assert.equal(hasActiveSession({ permanentTestAccess: true, activeSessionEndsAt: "2000-01-01" }), true);
});

test("ordinary hosts still need an unexpired session", () => {
  const now = Date.parse("2026-11-26T12:00:00Z");
  assert.equal(hasActiveSession({ permanentTestAccess: false, activeSessionEndsAt: null }, now), false);
  assert.equal(hasActiveSession({ activeSessionEndsAt: "2026-11-26T12:00:00Z" }, now), false);
  assert.equal(hasActiveSession({ activeSessionEndsAt: "2026-11-26T12:00:01Z" }, now), true);
});
