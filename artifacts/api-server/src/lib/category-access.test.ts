import assert from "node:assert/strict";
import test from "node:test";
import type { Account } from "./accounts.js";
import { canUseTrialCategory } from "./category-access.js";

const trial = ["A", "B", "C"];

test("trial hosts can use only trial categories", () => {
  const host = { role: "host", fullAccess: false } as Account;
  assert.equal(canUseTrialCategory(host, "A", trial), true);
  assert.equal(canUseTrialCategory(host, "D", trial), false);
});

test("paid hosts can use every category", () => {
  const host = { role: "host", fullAccess: true } as Account;
  assert.equal(canUseTrialCategory(host, "D", trial), true);
});

test("participants cannot unlock paid categories", () => {
  const participant = { role: "participant" } as Account;
  assert.equal(canUseTrialCategory(participant, "D", trial), false);
});
