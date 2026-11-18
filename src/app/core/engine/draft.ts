import { InstrumentProfile, Limit, NumDefault } from '../knowledge';
import {
  BandMember,
  IfYouHear,
  MemberRole,
  NumericSetting,
  ParamKey,
  PlanWarning,
  ProvenanceStep,
  SuggestedCut,
  TextSetting,
  Unit,
} from '../model';

/**
 * Working state of the pipeline. A draft collects every change to a value without applying it,
 * so the final step can apply them in one documented order and write the provenance trail.
 *
 * Combination rule (docs/DECISIONS.md): offsets add in pipeline order, then context ceilings
 * and floors clamp, then the musical limit clamps last.
 */

export interface DraftOffset {
  source: string;
  amount: number;
  why: string;
}

export interface DraftBound {
  source: string;
  amount: number;
  why: string;
}

export interface ParamDraft {
  baseline: NumDefault;
  baselineLabel: string;
  offsets: DraftOffset[];
  ceilings: DraftBound[];
  floors: DraftBound[];
  musicalLimit: Limit | null;
}

export interface ChannelDraft {
  id: string;
  member: BandMember;
  memberRole: MemberRole;
  profile: InstrumentProfile;
  stereo: boolean;
  params: Partial<Record<ParamKey, ParamDraft>>;
  suggestedCuts: SuggestedCut[];
  ifYouHear: IfYouHear[];
  makeupGain: TextSetting | null;
  sendToSubBus: boolean;
  mixerNotes: string[];
  coachingNotes: string[];
}

export function createParamDraft(baseline: NumDefault, baselineLabel: string): ParamDraft {
  return { baseline, baselineLabel, offsets: [], ceilings: [], floors: [], musicalLimit: null };
}

/** Adds an offset to a channel's parameter. Does nothing when the channel has no such parameter. */
export function addOffset(channel: ChannelDraft, param: ParamKey, offset: DraftOffset): void {
  const draft = channel.params[param];
  if (draft === undefined) {
    return;
  }
  draft.offsets.push(offset);
}

export function addCeiling(channel: ChannelDraft, param: ParamKey, bound: DraftBound): void {
  const draft = channel.params[param];
  if (draft === undefined) {
    return;
  }
  draft.ceilings.push(bound);
}

export function addFloor(channel: ChannelDraft, param: ParamKey, bound: DraftBound): void {
  const draft = channel.params[param];
  if (draft === undefined) {
    return;
  }
  draft.floors.push(bound);
}

function roundForUnit(value: number, unit: Unit): number {
  if (unit === 'Hz') {
    return Math.round(value / 5) * 5;
  }
  if (unit === 's') {
    return Math.round(value * 10) / 10;
  }
  if (unit === 'ms') {
    return Math.round(value);
  }
  // dB and ratio: half steps.
  return Math.round(value * 2) / 2;
}

export function formatValue(value: number, unit: Unit): string {
  if (unit === ':1') {
    return `${value}:1`;
  }
  return `${value} ${unit}`;
}

function formatSignedAmount(amount: number, unit: Unit): string {
  const sign = amount >= 0 ? '+' : '-';
  const size = Math.abs(amount);
  if (unit === ':1') {
    return `${sign}${size} on the ratio`;
  }
  return `${sign}${size} ${unit}`;
}

export interface ResolvedParam {
  setting: NumericSetting;
  warnings: string[];
}

/**
 * Applies the combination rule to one parameter and writes its provenance trail.
 * `label` is used in warning text, for example "Low cut".
 */
export function resolveParam(draft: ParamDraft, label: string): ResolvedParam {
  const unit = draft.baseline.unit;
  const provenance: ProvenanceStep[] = [];
  const warnings: string[] = [];

  let value = draft.baseline.value;
  provenance.push({
    source: 'Baseline',
    description: `${draft.baselineLabel}: ${formatValue(value, unit)}`,
    valueAfter: value,
  });

  // 1. Offsets add, in pipeline order.
  for (const offset of draft.offsets) {
    value = value + offset.amount;
    provenance.push({
      source: offset.source,
      description: `${formatSignedAmount(offset.amount, unit)}. ${offset.why}`,
      valueAfter: value,
    });
  }

  // 2. Context ceilings and floors clamp.
  for (const bound of draft.ceilings) {
    if (value > bound.amount) {
      value = bound.amount;
      provenance.push({
        source: bound.source,
        description: `Held at ${formatValue(bound.amount, unit)}. ${bound.why}`,
        valueAfter: value,
      });
    }
  }
  for (const bound of draft.floors) {
    if (value < bound.amount) {
      value = bound.amount;
      provenance.push({
        source: bound.source,
        description: `Held at ${formatValue(bound.amount, unit)}. ${bound.why}`,
        valueAfter: value,
      });
    }
  }

  // 3. The musical limit clamps last and is reported as a warning.
  const limit = draft.musicalLimit;
  if (limit !== null) {
    let clampedTo: number | null = null;
    if (value > limit.ceiling) {
      clampedTo = limit.ceiling;
    }
    if (value < limit.floor) {
      clampedTo = limit.floor;
    }
    if (clampedTo !== null) {
      const wanted = formatValue(roundForUnit(value, unit), unit);
      value = clampedTo;
      provenance.push({
        source: 'Musical limit',
        description: `Held at ${formatValue(clampedTo, unit)}. ${limit.why}`,
        valueAfter: value,
      });
      warnings.push(`${label}: the adjustments added up to ${wanted}, held at ${formatValue(clampedTo, unit)}. ${limit.why}`);
    }
  }

  const rounded = roundForUnit(value, unit);
  if (provenance.length > 0) {
    provenance[provenance.length - 1].valueAfter = rounded;
  }

  // The usable range always contains the recommended value.
  const rangeMin = Math.min(draft.baseline.min, rounded);
  const rangeMax = Math.max(draft.baseline.max, rounded);

  const setting: NumericSetting = {
    value: rounded,
    unit,
    range: { min: rangeMin, max: rangeMax },
    why: draft.baseline.why,
    listenFor: draft.baseline.listenFor,
    provenance,
  };
  return { setting, warnings };
}

export function toPlanWarnings(channelId: string | null, roleLabel: string, messages: string[]): PlanWarning[] {
  return messages.map((message) => ({ channelId, message: `${roleLabel}: ${message}` }));
}
