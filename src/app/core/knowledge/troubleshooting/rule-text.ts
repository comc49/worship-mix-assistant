import { ENSEMBLE_RULES } from '../rules';

/**
 * The arrangement advice of an ensemble rule, so the trees repeat the knowledge base's own
 * wording instead of a second copy of it.
 */
export function ensembleAdvice(ruleId: string): string {
  const rule = ENSEMBLE_RULES.find((entry) => entry.id === ruleId);
  if (rule === undefined) {
    throw new Error(`No ensemble rule with id "${ruleId}"`);
  }
  return rule.arrangementAdvice;
}
