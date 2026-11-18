import { BandMember, MemberRole, Role, Room, ServiceSetup, SkillLevel, SourceConnection, VoiceRange } from '../model';
import { num } from './builders';
import { NumDefault } from './types';

/**
 * Default data for our church. Items marked ASSUMED were chosen on 2026-11-18 because the brief's
 * brackets were unfilled. They are editable in the app. See CLAUDE.md "Our setup".
 */

export const DEFAULT_ROOMS: Room[] = [
  {
    id: 'room-a',
    name: 'Room A (warehouse)',
    reverberance: 'live',
    constantLowFrequencyNoise: true,
    audienceSize: 175,
    loudnessTargetDba: null, // ASSUMED: no target
  },
  {
    id: 'room-b',
    name: 'Room B (lecture hall)',
    reverberance: 'dry',
    constantLowFrequencyNoise: false,
    audienceSize: 80, // ASSUMED
    loudnessTargetDba: null, // ASSUMED: no target
  },
];

export type ConsoleId = 'x32' | 'wingCompact';

/** ASSUMED: X32 in Room A, WING Compact in Room B. */
export const DEFAULT_CONSOLE_BY_ROOM: Record<string, ConsoleId> = {
  'room-a': 'x32',
  'room-b': 'wingCompact',
};

export const DEFAULT_SERVICE_SETUP: ServiceSetup = {
  monitorType: 'wedges', // ASSUMED
  monitorMixCount: 4, // ASSUMED
  separateStreamMix: false, // ASSUMED
  subwooferFeed: 'mainThroughCrossover', // ASSUMED
};

/** The connection a role starts with when it is added in the roster screen. */
export const DEFAULT_CONNECTION_BY_ROLE: Record<Role, SourceConnection> = {
  leadVocal: 'dynamicMic',
  harmonyVocal: 'dynamicMic',
  acousticGuitar: 'monoDi',
  electricGuitar: 'modelerDirect',
  bassGuitar: 'monoDi',
  synthBass: 'monoDi',
  keys: 'stereoDi',
  padSynth: 'stereoDi',
  electronicDrums: 'drumModuleStereoPair',
  kick: 'dynamicMic',
  snare: 'dynamicMic',
  hiHat: 'condenserMic',
  toms: 'dynamicMic',
  overheads: 'condenserMic',
  cajon: 'dynamicMic',
  backingTracks: 'stereoDi',
  click: 'monoDi',
};

/**
 * What other people's monitor mixes get of a source by default, besides the player's own channel.
 * Anything not listed is added on request only: a full wedge mix is a loud, muddy stage.
 */
export const MONITOR_FOLDBACK_BY_ROLE: Partial<Record<Role, NumDefault>> = {
  leadVocal: num(-6, -15, 0, 'dB', 'Everyone follows the lead vocal.', 'Ask each musician; raise in small steps.'),
  keys: num(-10, -20, 0, 'dB', 'Singers use the keys for pitch.', 'Add only where someone asks for pitch reference.'),
  acousticGuitar: num(-12, -20, 0, 'dB', 'A rhythm and pitch reference for singers.', 'Add only where someone asks.'),
  electronicDrums: num(-8, -20, 0, 'dB', 'Electronic drums make no sound on stage, so everyone needs some for timing.', 'Ask each musician.'),
  click: num(-6, -20, 6, 'dB', 'Players who follow the click need it in their mix.', 'In-ears only. A click in a wedge is heard by the room.'),
  backingTracks: num(-8, -20, 0, 'dB', 'The band has to stay with the tracks.', 'Ask each musician.'),
};

export const ROLE_LABELS: Record<Role, string> = {
  leadVocal: 'Lead vocal',
  harmonyVocal: 'Harmony vocal',
  acousticGuitar: 'Acoustic guitar',
  electricGuitar: 'Electric guitar',
  bassGuitar: 'Bass guitar',
  synthBass: 'Synth bass',
  keys: 'Keys',
  padSynth: 'Pad / synth',
  electronicDrums: 'Electronic drums',
  kick: 'Kick (acoustic kit)',
  snare: 'Snare (acoustic kit)',
  hiHat: 'Hi-hat (acoustic kit)',
  toms: 'Tom (acoustic kit)',
  overheads: 'Overheads (acoustic kit)',
  cajon: 'Cajon',
  backingTracks: 'Backing tracks',
  click: 'Click',
};

export const CONNECTION_LABELS: Record<SourceConnection, string> = {
  dynamicMic: 'Dynamic mic',
  condenserMic: 'Condenser mic',
  monoDi: 'DI (mono)',
  stereoDi: 'DI (stereo)',
  modelerDirect: 'Modeler, direct',
  drumModuleStereoPair: 'Drum module, stereo pair',
  drumModuleSeparateOutputs: 'Drum module, separate outputs',
};

function vocalRole(role: 'leadVocal' | 'harmonyVocal', skill: SkillLevel, voiceRange: VoiceRange): MemberRole {
  return {
    role,
    skill,
    connection: 'dynamicMic',
    vocal: { voiceRange, micModel: 'sm58', micModelFreeText: '' },
  };
}

function instrumentRole(role: Role, skill: SkillLevel, connection: SourceConnection): MemberRole {
  return { role, skill, connection, vocal: null };
}

/**
 * The regular lineup, stored as the first template. Placeholder names on purpose.
 * Skills, mics and voice ranges are ASSUMED.
 */
export function buildRegularLineup(): BandMember[] {
  return [
    { id: 'm-vocalist-a', name: 'Vocalist A', roles: [vocalRole('leadVocal', 'intermediate', 'medium'), instrumentRole('acousticGuitar', 'intermediate', 'monoDi')] },
    { id: 'm-vocalist-b', name: 'Vocalist B', roles: [vocalRole('harmonyVocal', 'beginner', 'high')] },
    { id: 'm-vocalist-c', name: 'Vocalist C', roles: [vocalRole('harmonyVocal', 'advanced', 'low')] },
    { id: 'm-keys', name: 'Keys', roles: [instrumentRole('keys', 'beginner', 'stereoDi')] },
    { id: 'm-pad', name: 'Pad', roles: [instrumentRole('padSynth', 'intermediate', 'stereoDi')] },
    { id: 'm-electric', name: 'Electric guitar', roles: [instrumentRole('electricGuitar', 'intermediate', 'modelerDirect')] },
    { id: 'm-bass', name: 'Bass', roles: [instrumentRole('bassGuitar', 'beginner', 'monoDi')] },
    { id: 'm-drums', name: 'Drums', roles: [instrumentRole('electronicDrums', 'intermediate', 'drumModuleStereoPair')] },
  ];
}
