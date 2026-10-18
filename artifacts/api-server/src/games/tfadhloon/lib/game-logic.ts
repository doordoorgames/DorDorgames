export type PartyCycleState = {
  questionDistributionMode: "same" | "different";
  roundNumber: number;
  actionNumber: number;
  questionId: string;
  playerOrder: string[];
  usedQuestionIds: string[];
  servedQuestionIds: Record<string, string[]>;
};

export function advancePartyCycle(
  state: PartyCycleState,
  nextUnusedQuestionId?: string,
): PartyCycleState {
  const nextAction = state.actionNumber + 1;
  if (nextAction <= state.playerOrder.length) {
    if (state.questionDistributionMode === "same") return { ...state, actionNumber: nextAction };
    if (!nextUnusedQuestionId) throw new Error("Question category exhausted");
    if (state.usedQuestionIds.includes(nextUnusedQuestionId)) throw new Error("Question ID has already been served");
    const nextPlayer = state.playerOrder[nextAction - 1]!;
    return {
      ...state,
      actionNumber: nextAction,
      questionId: nextUnusedQuestionId,
      usedQuestionIds: [...state.usedQuestionIds, nextUnusedQuestionId],
      servedQuestionIds: {
        ...state.servedQuestionIds,
        [nextPlayer]: [...(state.servedQuestionIds[nextPlayer] || []), nextUnusedQuestionId],
      },
    };
  }
  if (!nextUnusedQuestionId) throw new Error("Question category exhausted");
  if (state.usedQuestionIds.includes(nextUnusedQuestionId)) {
    throw new Error("Question ID has already been served");
  }

  return {
    ...state,
    roundNumber: state.roundNumber + 1,
    actionNumber: 1,
    questionId: nextUnusedQuestionId,
    usedQuestionIds: [...state.usedQuestionIds, nextUnusedQuestionId],
    servedQuestionIds: state.questionDistributionMode === "same"
      ? Object.fromEntries(state.playerOrder.map((name) => [name, [...(state.servedQuestionIds[name] || []), nextUnusedQuestionId]]))
      : { ...state.servedQuestionIds, [state.playerOrder[0]!]: [...(state.servedQuestionIds[state.playerOrder[0]!] || []), nextUnusedQuestionId] },
  };
}

export function turnIdentityMatches(
  current: Pick<PartyCycleState, "roundNumber" | "actionNumber" | "questionId">,
  submitted: Pick<PartyCycleState, "roundNumber" | "actionNumber" | "questionId">,
): boolean {
  return current.roundNumber === submitted.roundNumber
    && current.actionNumber === submitted.actionNumber
    && current.questionId === submitted.questionId;
}

