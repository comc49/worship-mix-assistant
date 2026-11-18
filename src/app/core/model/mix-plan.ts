import { Role, SourceConnection } from './band';

/**
 * The console-neutral mix plan. Nothing in this file may name a console,
 * a console screen or a console-specific effect model.
 */

export type Unit = 'Hz' | 'dB' | 'ms' | 's' | ':1';

/** One step in the story of how a value got to where it is. */
export interface ProvenanceStep {
  /** Where the step came from, for example "Baseline", "Skill", "Room", "Monitors", "Ensemble", "Musical limit". */
  source: string;
  /** Plain-language description, for example "+20 Hz for the live room". */
  description: string;
  /** The value after this step. */
  valueAfter: number;
}

export interface NumericSetting {
  value: number;
  unit: Unit;
  /** The usable range a mixer can move within. */
  range: { min: number; max: number };
  why: string;
  listenFor: string;
  provenance: ProvenanceStep[];
}

export interface TextSetting {
  value: string;
  why: string;
  listenFor: string;
}

export interface ProcedureSetting {
  steps: string[];
  why: string;
  listenFor: string;
}

/** Parameters that modifiers and limits can address on a channel. */
export type ParamKey =
  | 'lowCutHz'
  | 'gateRangeDb'
  | 'gateAttackMs'
  | 'gateHoldMs'
  | 'gateReleaseMs'
  | 'compRatio'
  | 'compAttackMs'
  | 'compReleaseMs'
  | 'compGainReductionDb'
  | 'levelDb'
  | 'monitorSendDb'
  | 'fxSend.vocalPlate'
  | 'fxSend.tempoDelay'
  | 'fxSend.hall'
  | 'fxSend.drumRoom';

export type SendEffectId = 'vocalPlate' | 'tempoDelay' | 'hall' | 'drumRoom';
export type InsertEffectId = 'deEsser';
export type EffectFamily = 'plateReverb' | 'hallReverb' | 'roomReverb' | 'delay' | 'deEsser';

export type DcaId =
  | 'leadVocal'
  | 'harmonyVocals'
  | 'lowEnd'
  | 'energy'
  | 'keysAndPads'
  | 'guitars'
  | 'drums'
  | 'fxReturns';

export type MuteGroupId = 'allBand' | 'allVocals' | 'allFx';
export type GroupBusId = 'vocals' | 'drums' | 'guitars' | 'keys';

export interface SuggestedCut {
  /** Always optional: the app has never heard the source. */
  label: string;
  frequencyHz: number;
  gainDb: number;
  q: 'narrow' | 'medium' | 'wide';
  why: string;
  listenFor: string;
}

export interface IfYouHear {
  hear: string;
  tryThis: string;
}

export interface GatePlan {
  thresholdProcedure: TextSetting;
  rangeDb: NumericSetting;
  attackMs: NumericSetting;
  holdMs: NumericSetting;
  releaseMs: NumericSetting;
}

export interface CompressorPlan {
  ratio: NumericSetting;
  attackMs: NumericSetting;
  releaseMs: NumericSetting;
  /** Target gain reduction on loud passages. The mixer lowers the threshold until the meter shows this. */
  gainReductionDb: NumericSetting;
  makeupGain: TextSetting;
}

export interface FxSendPlan {
  effectId: SendEffectId;
  levelDb: NumericSetting;
}

export interface MonitorSendPlan {
  mixId: string;
  levelDb: NumericSetting;
}

export interface ChannelPlan {
  id: string;
  /** Role-based label, for example "Lead vocal". Never contains a skill level. */
  roleLabel: string;
  memberId: string;
  memberName: string;
  role: Role;
  /** Which knowledge-base profile produced this channel. */
  profileId: string;
  connection: SourceConnection;
  stereo: boolean;
  gainStaging: ProcedureSetting;
  polarity: TextSetting;
  /** null means leave the low cut off. */
  lowCut: NumericSetting | null;
  suggestedCuts: SuggestedCut[];
  ifYouHear: IfYouHear[];
  gate: GatePlan | null;
  compressor: CompressorPlan | null;
  /** Fader starting point relative to where the blend naturally puts this source. */
  level: NumericSetting;
  pan: TextSetting;
  fxSends: FxSendPlan[];
  monitorSends: MonitorSendPlan[];
  dcaIds: DcaId[];
  /** True when the channel sits in two DCAs, so two DCA moves add together. */
  inMultipleDcas: boolean;
  muteGroupIds: MuteGroupId[];
  /** The group bus this channel would like to go through, if the console can afford it. */
  groupBusId: GroupBusId | null;
  sendToSubBus: boolean;
  /** False for sources that must never reach the room (the click). */
  routeToMain: boolean;
  /** Notes for the mixer about this channel (for example "ride the fader"). */
  mixerNotes: string[];
  /** Notes the mixer can pass on to the musician. */
  coachingNotes: string[];
}

export interface EffectWish {
  id: SendEffectId | InsertEffectId;
  label: string;
  family: EffectFamily;
  priority: number;
  why: string;
  listenFor: string;
  /** Reverb decay or delay time. null when it does not apply. */
  timeSeconds: NumericSetting | null;
  timeNote: string;
  /** For insert effects: the channel it sits on. */
  insertOnChannelId: string | null;
  /** For send effects: the channels that feed it. */
  fedByChannelIds: string[];
}

export interface GroupBusWish {
  id: GroupBusId;
  label: string;
  priority: number;
  preferredWidth: 'mono' | 'stereo';
  /** True when a mono bus is an acceptable fallback on a console with mono buses. */
  monoIsAcceptable: boolean;
  memberChannelIds: string[];
  processingNotes: string[];
  why: string;
}

export interface DcaPlan {
  id: DcaId;
  label: string;
  memberChannelIds: string[];
  /** True for the DCA that holds effect returns; the adapter fills in the members. */
  holdsFxReturns: boolean;
  why: string;
}

export interface MuteGroupPlan {
  id: MuteGroupId;
  label: string;
  memberChannelIds: string[];
  holdsFxReturns: boolean;
  why: string;
}

export interface MonitorMixPlan {
  id: string;
  label: string;
  forMemberNames: string[];
  preFader: boolean;
  why: string;
}

export interface MainBusPlan {
  limiter: TextSetting;
  compressor: TextSetting;
  eq: TextSetting;
}

export interface SubwooferPlan {
  feed: 'ownBus' | 'mainThroughCrossover';
  sendChannelIds: string[];
  why: string;
}

export interface StreamPlan {
  enabled: boolean;
  differences: TextSetting[];
}

export interface SoundcheckStep {
  title: string;
  detail: string;
}

export interface PlanWarning {
  channelId: string | null;
  message: string;
}

export interface MonitorGuidance {
  monitorType: 'wedges' | 'inEars' | 'mixed';
  /** Plain-language note on what compression means for the monitors in this setup. */
  compressionNote: string;
  why: string;
  ringOutRequired: boolean;
}

export interface MixPlan {
  channels: ChannelPlan[];
  sendEffects: EffectWish[];
  insertEffects: EffectWish[];
  groupBuses: GroupBusWish[];
  dcas: DcaPlan[];
  muteGroups: MuteGroupPlan[];
  monitorMixes: MonitorMixPlan[];
  monitorGuidance: MonitorGuidance;
  mainBus: MainBusPlan;
  subwoofer: SubwooferPlan;
  stream: StreamPlan;
  soundcheck: SoundcheckStep[];
  loudnessTargetDba: number | null;
  housePrinciples: string[];
  ensembleAdvice: string[];
  warnings: PlanWarning[];
}
