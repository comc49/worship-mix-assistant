import {
  DcaId,
  GroupBusId,
  IfYouHear,
  ParamKey,
  ProcedureSetting,
  Reverberance,
  Role,
  SendEffectId,
  SkillLevel,
  SourceConnection,
  SuggestedCut,
  TextSetting,
  Unit,
  VoiceRange,
} from '../model';

/** One default value with its usable range and its reason. */
export interface NumDefault {
  value: number;
  min: number;
  max: number;
  unit: Unit;
  why: string;
  listenFor: string;
}

/**
 * An explicit change to a baseline value.
 * - 'add' moves the value by `amount` (may be negative).
 * - 'ceiling' and 'floor' are context limits (for example the wedge cap on vocal compression).
 * Combination rule (docs/DECISIONS.md): all 'add' offsets are summed onto the baseline in pipeline
 * order, then context ceilings and floors clamp, then the musical limits clamp last.
 */
export interface Adjustment {
  param: ParamKey;
  kind: 'add' | 'ceiling' | 'floor';
  amount: number;
  why: string;
}

export type StereoRule = 'always' | 'never' | 'whenConnectionIsStereo';

export interface InstrumentProfile {
  id: string;
  role: Role;
  label: string;
  connections: SourceConnection[];
  stereo: StereoRule;
  /** Position in the standard patch order: drums, bass, guitars, keys, pads, vocals. */
  patchOrder: number;
  gainStaging: ProcedureSetting;
  polarity: TextSetting;
  /** Every numeric setting of the channel. A missing key means the setting does not exist for this source. */
  params: Partial<Record<ParamKey, NumDefault>>;
  /** Present only when the profile has gate params. */
  gateThreshold: TextSetting | null;
  /** Present only when the profile has compressor params. */
  makeupGain: TextSetting | null;
  /** Reason shown when there is no gate. */
  noGateWhy: string;
  /** Reason shown when there is no compressor. */
  noCompressorWhy: string;
  suggestedCuts: SuggestedCut[];
  ifYouHear: IfYouHear[];
  pan: TextSetting;
  dcas: DcaId[];
  groupBus: GroupBusId | null;
  sendToSubBus: boolean;
  routeToMain: boolean;
  mixerNotes: string[];
}

export interface SkillAdjustment extends Adjustment {
  /** Only apply to these profiles. Empty means every profile of the role. */
  onlyProfileIds: string[];
  /** Only apply when every one of these roles is in the band. */
  requiresRolesInBand: Role[];
}

export interface SkillModifier {
  role: Role;
  level: Exclude<SkillLevel, 'intermediate'>;
  why: string;
  adjustments: SkillAdjustment[];
  /**
   * A tip the mixer can pass to the musician. Written on the 'beginner' entry only, and shown
   * for every player of the role whatever their rating (see findRoleNotes).
   */
  coaching?: string;
  /** Notes for the mixer, under the same rule. `onlyProfileIds` empty means every profile of the role. */
  mixerNotes?: { text: string; onlyProfileIds: string[] }[];
}

export interface SkillDescriptions {
  role: Role;
  beginner: string;
  intermediate: string;
  advanced: string;
}

export interface RoomRoleModifier {
  why: string;
  adjustments: Adjustment[];
}

export interface RoomModifierSet {
  reverberance: Exclude<Reverberance, 'neutral'>;
  summary: string;
  byRole: Record<Role, RoomRoleModifier>;
  effectTime: Record<SendEffectId, { addSeconds: number; ceilingSeconds: number | null; why: string }>;
  groupBusNotes: string[];
}

export interface Limit {
  floor: number;
  ceiling: number;
  why: string;
}

export interface VocalLowCutLimit {
  voiceRange: VoiceRange;
  baselineHz: number;
  floor: number;
  ceiling: number;
  suggestedMudCutHz: number;
  why: string;
}

export interface MicModel {
  id: string;
  label: string;
  kind: 'dynamic' | 'condenser';
  lowCutOffsetHz: number;
  suggestedCut: SuggestedCut | null;
  ifYouHear: IfYouHear[];
  wedgeNote: string;
  why: string;
}

export interface EnsembleRule {
  id: string;
  title: string;
  /** The roles this rule links. Tests use this to know which channels a change may touch. */
  links: Role[];
  /** The rule fires when at least one role from every inner list is in the band. */
  requiresOneOfEach: Role[][];
  /** Arrangement advice always comes first. */
  arrangementAdvice: string;
  adjustments: { targetRoles: Role[]; adjustment: Adjustment }[];
  /** Turns off the sub send on these roles (used when two sources would both own the low end). */
  removeSubSendFrom: Role[];
  why: string;
}

export interface SendEffectDefinition {
  id: SendEffectId;
  label: string;
  family: 'plateReverb' | 'hallReverb' | 'roomReverb' | 'delay';
  priority: number;
  time: NumDefault | null;
  timeNote: string;
  timeLimit: Limit | null;
  why: string;
  listenFor: string;
}

export interface DcaDefinition {
  id: DcaId;
  label: string;
  holdsFxReturns: boolean;
  why: string;
}

export interface GroupBusDefinition {
  id: GroupBusId;
  label: string;
  priority: number;
  preferredWidth: 'mono' | 'stereo';
  monoIsAcceptable: boolean;
  why: string;
}
