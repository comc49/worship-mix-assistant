/**
 * Input side of the domain: who is in the band, the room and the service setup.
 * Everything here is plain data that the storage service can save as JSON.
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export const SKILL_LEVELS: readonly SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

export type Role =
  | 'leadVocal'
  | 'harmonyVocal'
  | 'acousticGuitar'
  | 'electricGuitar'
  | 'bassGuitar'
  | 'synthBass'
  | 'keys'
  | 'padSynth'
  | 'electronicDrums'
  | 'kick'
  | 'snare'
  | 'hiHat'
  | 'toms'
  | 'overheads'
  | 'cajon'
  | 'backingTracks'
  | 'click';

export const ROLES: readonly Role[] = [
  'leadVocal',
  'harmonyVocal',
  'acousticGuitar',
  'electricGuitar',
  'bassGuitar',
  'synthBass',
  'keys',
  'padSynth',
  'electronicDrums',
  'kick',
  'snare',
  'hiHat',
  'toms',
  'overheads',
  'cajon',
  'backingTracks',
  'click',
];

export type SourceConnection =
  | 'dynamicMic'
  | 'condenserMic'
  | 'monoDi'
  | 'stereoDi'
  | 'modelerDirect'
  | 'drumModuleStereoPair'
  | 'drumModuleSeparateOutputs';

export type VoiceRange = 'low' | 'medium' | 'high';

export const VOICE_RANGES: readonly VoiceRange[] = ['low', 'medium', 'high'];

/** A short list of common vocal mics. 'other' uses the free-text field. */
export type MicModelId = 'sm58' | 'beta58a' | 'e835' | 'e935' | 'condenserHandheld' | 'other';

export interface VocalDetails {
  voiceRange: VoiceRange;
  micModel: MicModelId;
  /** Only used when micModel is 'other'. */
  micModelFreeText: string;
}

export interface MemberRole {
  role: Role;
  skill: SkillLevel;
  connection: SourceConnection;
  /** Present for vocal roles only. */
  vocal: VocalDetails | null;
}

export interface BandMember {
  id: string;
  name: string;
  roles: MemberRole[];
}

export type Reverberance = 'live' | 'neutral' | 'dry';

export interface Room {
  id: string;
  name: string;
  /** 'neutral' means no room modifiers apply. */
  reverberance: Reverberance;
  constantLowFrequencyNoise: boolean;
  audienceSize: number;
  loudnessTargetDba: number | null;
}

export type MonitorType = 'wedges' | 'inEars' | 'mixed';
export type SubwooferFeed = 'ownBus' | 'mainThroughCrossover';

export interface ServiceSetup {
  monitorType: MonitorType;
  monitorMixCount: number;
  separateStreamMix: boolean;
  subwooferFeed: SubwooferFeed;
}

export function isVocalRole(role: Role): boolean {
  return role === 'leadVocal' || role === 'harmonyVocal';
}
