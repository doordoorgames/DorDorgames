import type { Account } from "./accounts.js";

export const TRIAL_CATEGORY_LIMIT = 3;

export const TFADHLOON_TRIAL_CATEGORIES = [
  "Kuwaiti Girls",
  "Islamic Things",
  "Everything",
] as const;

export function hasFullCategoryAccess(account: Account | undefined): boolean {
  return account?.role === "host" && account.fullAccess;
}

export function canUseTrialCategory(
  account: Account | undefined,
  category: string,
  trialCategories: readonly string[],
): boolean {
  return hasFullCategoryAccess(account) || trialCategories.includes(category);
}
