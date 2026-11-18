import { EffectFamily } from '../model';

/**
 * What a console can do. Every fact carries either the manual passage it was read from or an
 * UNVERIFIED flag. Console facts are never written from memory (see docs/console-sources.md,
 * which is generated from these profiles).
 */

export type ConsoleId = 'x32' | 'wingCompact';

export interface VerifiedSource {
  status: 'verified';
  manual: string;
  section: string;
  page: number | null;
  /** A few words of the sentence the fact was taken from. */
  quote: string;
  note: string;
}

export interface UnverifiedSource {
  status: 'unverified';
  /** What was searched for and what is still unknown. */
  note: string;
}

export interface Fact<T> {
  value: T;
  source: VerifiedSource | UnverifiedSource;
}

export interface NumberRange {
  min: number;
  max: number;
}

export interface GateParamNames {
  threshold: string;
  range: string;
  attack: string;
  hold: string;
  release: string;
}

export interface CompParamNames {
  threshold: string;
  ratio: string;
  attack: string;
  release: string;
  makeupGain: string;
}

export type StereoHandling = 'native' | 'linkAdjacentPair';
export type FxReturnStyle = 'dedicatedReturnChannels' | 'busIsTheReturn';

export interface ConsoleFacts {
  inputChannelCount: Fact<number>;
  auxChannelCount: Fact<number>;
  stereoChannels: Fact<StereoHandling>;
  stereoLinkPairRule: Fact<string | null>;
  stereoBuses: Fact<StereoHandling>;
  mixBusCount: Fact<number>;
  matrixCount: Fact<number>;
  mainBuses: Fact<string[]>;
  dcaCount: Fact<number>;
  muteGroupCount: Fact<number>;

  fxSlotCount: Fact<number>;
  /** Slots that can host a send effect. */
  fxSendCapableSlots: Fact<number[]>;
  fxInsertOnlySlots: Fact<number[]>;
  /** Slots that accept reverbs and delays. */
  fxReverbDelaySlots: Fact<number[]>;
  fxReturnStyle: Fact<FxReturnStyle>;
  /** Buses wired to the send-capable FX slots by default, in slot order. null when the console has no such default. */
  fxDefaultFeedBuses: Fact<number[] | null>;
  fxScreen: Fact<string>;
  fxInsertProcedure: Fact<string>;

  sendTapPoints: Fact<string[]>;
  /** The tap to choose for a pre-fader monitor send, by its on-console name. */
  monitorSendTap: Fact<string>;
  defaultSendTap: Fact<string | null>;
  preFaderSendIsAfterDynamics: Fact<boolean | null>;
  muteCutsPreFaderSends: Fact<boolean | null>;
  sendsScreen: Fact<string>;

  soloBehavior: Fact<string>;
  soloInPlaceExists: Fact<boolean | null>;
  subwooferFeedOptions: Fact<string[]>;

  channelEqBandCount: Fact<number>;
  busEqBandCount: Fact<number>;
  eqScreen: Fact<string>;
  eqModels: Fact<string[]>;

  lowCutName: Fact<string>;
  lowCutRangeHz: Fact<NumberRange | null>;
  lowCutScreen: Fact<string>;

  gateScreen: Fact<string>;
  gateParamNames: Fact<GateParamNames>;
  gateRangeDbRange: Fact<NumberRange | null>;

  compScreen: Fact<string>;
  compParamNames: Fact<CompParamNames>;
  /** The ratio values the compressor offers, when it offers fixed steps. */
  compRatioValues: Fact<number[] | null>;
  compressorModels: Fact<string[]>;

  reverbEffects: Fact<string[]>;
  delayEffects: Fact<string[]>;
  deEsserEffects: Fact<string[]>;
  limiterEffects: Fact<string[]>;

  setBusAsGroup: Fact<string>;
  removeChannelFromMain: Fact<string>;
  saveScene: Fact<string[]>;
  nameChannel: Fact<string[]>;
  assignDca: Fact<string[]>;
  assignMuteGroup: Fact<string[]>;
  phantomPower: Fact<string>;
  preampGain: Fact<string>;
  polarity: Fact<string>;
  mainBusProcessing: Fact<string>;
}

export type ConsoleFactKey = keyof ConsoleFacts;

export interface ConsoleProfile {
  id: ConsoleId;
  name: string;
  manualTitle: string;
  facts: ConsoleFacts;
  /** The effect to load for each family. Each name must appear in the matching effects list in `facts`. */
  effectChoice: Record<EffectFamily, string>;
}

export function isVerified(fact: Fact<unknown>): boolean {
  return fact.source.status === 'verified';
}
