import assert from "node:assert/strict";
import test from "node:test";
import { hasActiveSession } from "./session-time.js";
import type { Host } from "./store.js";

function host(activeSessionEndsAt: string | null): Host {
  return { activeSessionEndsAt } as Host;
}

test("a host session remains active until its fixed end time", () => {
  assert.equal(hasActiveSession(host("2026-10-24T12:30:00.000Z"), Date.parse("2026-10-24T12:29:59.000Z")), true);
});

test("a host session expires at the exact end time", () => {
  assert.equal(hasActiveSession(host("2026-10-24T12:30:00.000Z"), Date.parse("2026-10-24T12:30:00.000Z")), false);
  assert.equal(hasActiveSession(host(null), Date.now()), false);
});
