import assert from "node:assert/strict";
import test from "node:test";
import { advancePartyCycle, turnIdentityMatches, type PartyCycleState } from "./game-logic.js";

const players = ["Khaled", "Lord", "Sara", "Noor"];

function initialState(questionDistributionMode: "same" | "different", party = players): PartyCycleState {
  return {
    questionDistributionMode,
    roundNumber: 1,
    actionNumber: 1,
    questionId: "question-24",
    playerOrder: party,
    usedQuestionIds: ["question-24"],
    servedQuestionIds: questionDistributionMode === "same"
      ? Object.fromEntries(party.map((name) => [name, ["question-24"]]))
      : { [party[0]!]: ["question-24"] },
  };
}

function nextQuestion(state: PartyCycleState, questionId: string): PartyCycleState {
  let current = state;
  while (current.actionNumber < current.playerOrder.length) current = advancePartyCycle(current);
  return advancePartyCycle(current, questionId);
}

test("shared mode gives 2 and 4 players the same question", () => {
  for (const party of [players.slice(0, 2), players]) {
  let state = initialState("same", party);
  const seen = [state.questionId];
  for (let turn = 2; turn <= party.length; turn += 1) {
    state = advancePartyCycle(state);
    seen.push(state.questionId);
  }
  assert.deepEqual(seen, Array(party.length).fill("question-24"));
  assert.equal(state.actionNumber, party.length);

  state = advancePartyCycle(state, "question-25");
  assert.equal(state.questionId, "question-25");
  assert.equal(state.roundNumber, 2);
  assert.equal(state.actionNumber, 1);
  }
});

test("different mode gives 2 and 4 players unique questions in every cycle", () => {
  for (const party of [players.slice(0, 2), players]) {
    let state = initialState("different", party);
    const seen = [state.questionId];
    for (let turn = 2; turn <= party.length; turn += 1) {
      state = advancePartyCycle(state, `question-${23 + turn}`);
      seen.push(state.questionId);
    }
    assert.equal(new Set(seen).size, party.length);
    party.forEach((name, index) => assert.deepEqual(state.servedQuestionIds[name], [seen[index]]));
    state = advancePartyCycle(state, "next-cycle-question");
    assert.equal(state.roundNumber, 2);
    assert.equal(state.actionNumber, 1);
  }
});

test("stable question IDs are never repeated for any nickname", () => {
  let state = initialState("same");
  state = nextQuestion(state, "question-25");
  state = nextQuestion(state, "question-26");

  for (const name of players) {
    assert.deepEqual(state.servedQuestionIds[name], ["question-24", "question-25", "question-26"]);
    assert.equal(new Set(state.servedQuestionIds[name]).size, 3);
  }
  assert.throws(() => nextQuestion(state, "question-24"), /already been served/);
});

test("rapid stale submissions cannot be attributed to the next player turn", () => {
  const lordTurn = { roundNumber: 1, actionNumber: 2, questionId: "question-24" };
  const saraTurn = { roundNumber: 1, actionNumber: 3, questionId: "question-24" };
  assert.equal(turnIdentityMatches(lordTurn, lordTurn), true);
  assert.equal(turnIdentityMatches(saraTurn, lordTurn), false);
});

test("50 different-mode advances never repeat for any player", () => {
  let state = initialState("different");

  for (let advance = 1; advance <= 50; advance += 1) {
    state = advancePartyCycle(state, `stress-question-${advance}`);
  }

  assert.equal(state.usedQuestionIds.length, 51);
  assert.equal(new Set(state.usedQuestionIds).size, 51);
  for (const name of players) {
    const playerHistory = state.servedQuestionIds[name] || [];
    assert.equal(new Set(playerHistory).size, playerHistory.length, `${name} received a repeated question`);
  }
});

test("persisted room history survives refresh and reconnect", () => {
  let state = initialState("different");
  for (let advance = 1; advance <= 25; advance += 1) {
    state = advancePartyCycle(state, `before-reconnect-${advance}`);
  }

  // A reconnect reloads the same persisted games row; model that boundary with
  // a JSON round-trip so no in-memory identity can hide a history reset.
  state = JSON.parse(JSON.stringify(state)) as PartyCycleState;
  for (let advance = 26; advance <= 50; advance += 1) {
    state = advancePartyCycle(state, `after-reconnect-${advance}`);
  }

  assert.equal(new Set(state.usedQuestionIds).size, 51);
  assert.throws(
    () => advancePartyCycle(state, "before-reconnect-10"),
    /already been served/,
  );
});

test("category exhaustion stops instead of recycling an old question", () => {
  const state = initialState("different", players.slice(0, 2));

  assert.throws(() => advancePartyCycle(state), /category exhausted/);
  assert.throws(() => advancePartyCycle(state, "question-24"), /already been served/);
  assert.deepEqual(state.usedQuestionIds, ["question-24"]);
  assert.deepEqual(state.servedQuestionIds.Khaled, ["question-24"]);
});
