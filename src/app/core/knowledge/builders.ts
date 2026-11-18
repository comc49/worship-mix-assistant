import { IfYouHear, ParamKey, SuggestedCut, Unit } from '../model';
import { Adjustment, NumDefault, SkillAdjustment } from './types';

/** Small constructors that keep the data files readable. They add no logic. */

export function num(
  value: number,
  min: number,
  max: number,
  unit: Unit,
  why: string,
  listenFor: string,
): NumDefault {
  return { value, min, max, unit, why, listenFor };
}

export function add(param: ParamKey, amount: number, why: string): Adjustment {
  return { param, kind: 'add', amount, why };
}

export function ceiling(param: ParamKey, amount: number, why: string): Adjustment {
  return { param, kind: 'ceiling', amount, why };
}

export function skillAdd(
  param: ParamKey,
  amount: number,
  why: string,
  options: { onlyProfileIds?: string[]; requiresRolesInBand?: SkillAdjustment['requiresRolesInBand'] } = {},
): SkillAdjustment {
  return {
    param,
    kind: 'add',
    amount,
    why,
    onlyProfileIds: options.onlyProfileIds ?? [],
    requiresRolesInBand: options.requiresRolesInBand ?? [],
  };
}

export function cut(
  label: string,
  frequencyHz: number,
  gainDb: number,
  q: SuggestedCut['q'],
  why: string,
  listenFor: string,
): SuggestedCut {
  return { label, frequencyHz, gainDb, q, why, listenFor };
}

export function hear(hearText: string, tryThis: string): IfYouHear {
  return { hear: hearText, tryThis };
}
