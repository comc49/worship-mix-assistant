import { Role } from '../model';
import { skillAdd } from './builders';
import { SkillDescriptions, SkillModifier } from './types';

/**
 * What changes at beginner and at advanced. Intermediate is the baseline with no modifier.
 * Skill changes dynamics, level and low cut. It never chooses tonal EQ.
 *
 * Privacy: the tip for the player and the notes for the mixer are written once per role, on the
 * 'beginner' entry, and the engine shows them for EVERY player of that role whatever their rating.
 * A note that appeared only for some ratings would let a reader work out a named person's rating.
 */

const STEREO_KIT = ['electronicDrums.stereo'];
const SEPARATE_KICK_SNARE = ['electronicDrums.kick', 'electronicDrums.snare'];

function drumPieceModifiers(role: Role, hasCompressor: boolean): SkillModifier[] {
  const beginnerAdjustments = [skillAdd('levelDb', -2, 'Uneven hits are less exposed at a slightly lower level.')];
  const advancedAdjustments = [];
  if (hasCompressor) {
    beginnerAdjustments.push(skillAdd('compRatio', 1, 'Hit strength varies a lot, so a firmer ratio evens it out.'));
    beginnerAdjustments.push(skillAdd('compGainReductionDb', 2, 'More reduction on the hardest hits.'));
    advancedAdjustments.push(skillAdd('compGainReductionDb', -1, 'An even player needs less control; let the dynamics through.'));
  }
  return [
    {
      role,
      level: 'beginner',
      why: 'A newer drummer hits unevenly and often too hard, so this drum is controlled more and starts lower.',
      adjustments: beginnerAdjustments,
      coaching: 'Play to the room, not to the kit: the loudest hit should be a choice, not the default.',
      mixerNotes: [],
    },
    {
      role,
      level: 'advanced',
      why: 'A consistent drummer controls their own dynamics, so the console does less.',
      adjustments: advancedAdjustments,
    },
  ];
}

export const SKILL_MODIFIERS: SkillModifier[] = [
  {
    role: 'leadVocal',
    level: 'beginner',
    why: 'Mic distance and volume vary a lot, so the compressor does more and the mixer rides the fader.',
    adjustments: [
      skillAdd('compRatio', 1, 'Volume changes a lot from phrase to phrase.'),
      skillAdd('compGainReductionDb', 2, 'More reduction on the loudest phrases.'),
    ],
    coaching: 'Keep the mic one fist from your mouth, and keep it there when you get louder.',
    mixerNotes: [{ text: 'Keep a finger on this fader and ride it: push up quiet phrases, pull back loud ones.', onlyProfileIds: [] }],
  },
  {
    role: 'leadVocal',
    level: 'advanced',
    why: 'They control their own dynamics. Heavy compression would flatten them.',
    adjustments: [
      skillAdd('compRatio', -1, 'A lighter ratio keeps their dynamics.'),
      skillAdd('compGainReductionDb', -1, 'Less reduction is needed.'),
    ],
  },
  {
    role: 'harmonyVocal',
    level: 'beginner',
    why: 'Volume and pitch are less steady, so the voice is controlled more and tucked a little lower in the blend.',
    adjustments: [
      skillAdd('compRatio', 1, 'Volume changes a lot from phrase to phrase.'),
      skillAdd('compGainReductionDb', 2, 'More reduction on the loudest phrases.'),
      skillAdd('levelDb', -2, 'A harmony that wanders is less exposed slightly lower in the blend.'),
      skillAdd('fxSend.vocalPlate', 2, 'A little more shared reverb helps the voice blend.'),
    ],
    coaching: 'Keep the mic one fist from your mouth, and listen for the lead vocal in your monitor to blend with.',
    mixerNotes: [],
  },
  {
    role: 'harmonyVocal',
    level: 'advanced',
    why: 'They blend by ear and control their own volume.',
    adjustments: [
      skillAdd('compRatio', -0.5, 'A lighter ratio keeps their dynamics.'),
      skillAdd('compGainReductionDb', -1, 'Less reduction is needed.'),
    ],
  },
  {
    role: 'bassGuitar',
    level: 'beginner',
    why: 'Note volume is uneven, which makes the whole low end unsteady.',
    adjustments: [
      skillAdd('compRatio', 2, 'Uneven notes need a firmer ratio.'),
      skillAdd('compGainReductionDb', 2, 'More reduction on the loudest notes.'),
    ],
    coaching: 'Aim for every note at the same strength. Playing a little softer overall makes that easier.',
    mixerNotes: [{ text: 'If single notes boom, it is usually uneven playing, not EQ. Check the compressor is working before cutting lows.', onlyProfileIds: [] }],
  },
  {
    role: 'bassGuitar',
    level: 'advanced',
    why: 'They play evenly and use dynamics on purpose.',
    adjustments: [
      skillAdd('compRatio', -1, 'A gentler ratio lets their dynamics through.'),
      skillAdd('compGainReductionDb', -2, 'Less reduction is needed.'),
    ],
  },
  {
    role: 'synthBass',
    level: 'beginner',
    why: 'Patch levels and velocity vary more.',
    adjustments: [skillAdd('compGainReductionDb', 1, 'A little more control over level differences.'), skillAdd('levelDb', -1, 'A slightly lower start keeps surprises out of the low end.')],
    coaching: 'Check that your bass patches are all at a similar volume.',
    mixerNotes: [],
  },
  {
    role: 'synthBass',
    level: 'advanced',
    why: 'Patches are levelled and played evenly.',
    adjustments: [skillAdd('compGainReductionDb', -1, 'Less control is needed.')],
  },
  {
    role: 'acousticGuitar',
    level: 'beginner',
    why: 'Strumming strength varies a lot between sections.',
    adjustments: [
      skillAdd('compRatio', 1, 'Hard strums are much louder than picked parts.'),
      skillAdd('compGainReductionDb', 2, 'More reduction on hard strums.'),
      skillAdd('levelDb', -1, 'A slightly lower start keeps hard strums off the vocal.'),
    ],
    coaching: 'Strum lighter than feels natural. The PA makes it big.',
    mixerNotes: [],
  },
  {
    role: 'acousticGuitar',
    level: 'advanced',
    why: 'They control their own dynamics with their right hand.',
    adjustments: [skillAdd('compGainReductionDb', -1, 'Less reduction keeps their dynamics.')],
  },
  {
    role: 'electricGuitar',
    level: 'beginner',
    why: 'Volume jumps between patches, so the compressor acts like a limiter that only catches the loud ones.',
    adjustments: [
      skillAdd('compRatio', 6, 'A limiter-style ratio only affects the patches that are too loud.'),
      skillAdd('compAttackMs', -15, 'A fast attack catches a loud patch immediately.'),
      skillAdd('compGainReductionDb', 2, 'On the loudest patch only. Normal patches should show almost none.'),
      skillAdd('levelDb', -1, 'A slightly lower start leaves room for a loud patch.'),
    ],
    coaching: 'Set every patch to the same volume at home, with the lead patch only a little louder.',
    mixerNotes: [{ text: 'Watch for volume jumps when the guitarist changes sounds, and ride the fader between songs.', onlyProfileIds: [] }],
  },
  {
    role: 'electricGuitar',
    level: 'advanced',
    why: 'Patches are levelled and dynamics are deliberate.',
    adjustments: [skillAdd('compGainReductionDb', -1, 'Less control is needed.')],
  },
  {
    role: 'keys',
    level: 'beginner',
    why: 'A busy left hand collides with the bass guitar, and big chords jump out.',
    adjustments: [
      skillAdd('lowCutHz', 30, 'Clears the left hand out of the bass guitar\'s range. Only applied when a bass guitar is in the band.', { requiresRolesInBand: ['bassGuitar'] }),
      skillAdd('levelDb', -2, 'A lower start keeps a busy part from covering the band. Only applied when a bass guitar is in the band.', { requiresRolesInBand: ['bassGuitar'] }),
      skillAdd('compRatio', 0.5, 'Big chords jump out.'),
      skillAdd('compGainReductionDb', 1, 'A little more control on big chords.'),
    ],
    coaching: 'When the bass guitar is playing, leave the low notes to them: play your left hand higher, or leave it out.',
    mixerNotes: [],
  },
  {
    role: 'keys',
    level: 'advanced',
    why: 'They leave space for the bass and control their own dynamics.',
    adjustments: [skillAdd('compGainReductionDb', -1, 'Less control keeps their dynamics.')],
  },
  {
    role: 'padSynth',
    level: 'beginner',
    why: 'Pads get held too loud and too long.',
    adjustments: [skillAdd('levelDb', -2, 'A lower start keeps a held pad from clouding the mix.')],
    coaching: 'A pad should be felt more than heard. If you can clearly hear it on stage, it is probably too loud.',
    mixerNotes: [],
  },
  {
    role: 'padSynth',
    level: 'advanced',
    why: 'They ride their own volume with the song.',
    adjustments: [skillAdd('levelDb', 1, 'Their swells can be trusted, so the pad can start a little higher.')],
  },
  {
    role: 'electronicDrums',
    level: 'beginner',
    why: 'Hit strength is uneven. How much the console can help depends on how the module is connected.',
    adjustments: [
      skillAdd('levelDb', -2, 'A conservative level keeps uneven hits from dominating.'),
      skillAdd('compGainReductionDb', 1, 'Only a little more: the whole kit shares this compressor, and more makes the kick pump the cymbals.', { onlyProfileIds: STEREO_KIT }),
      skillAdd('compAttackMs', 10, 'A slower attack keeps the compressor from grabbing every hit.', { onlyProfileIds: STEREO_KIT }),
      skillAdd('compRatio', 1, 'Uneven kick and snare hits need a firmer ratio.', { onlyProfileIds: SEPARATE_KICK_SNARE }),
      skillAdd('compGainReductionDb', 2, 'More reduction on the hardest hits.', { onlyProfileIds: SEPARATE_KICK_SNARE }),
    ],
    coaching: 'Aim for even hits. In the module, check the kick and snare are balanced and the pad sensitivity suits how hard you play.',
    mixerNotes: [
      { text: 'Uneven kick and snare cannot be fixed on a stereo pair. Fix the balance and pad sensitivity in the module, and ask for a separate kick output.', onlyProfileIds: STEREO_KIT },
    ],
  },
  {
    role: 'electronicDrums',
    level: 'advanced',
    why: 'Hits are even and the module is balanced.',
    adjustments: [skillAdd('compGainReductionDb', -1, 'Less control lets their dynamics through.')],
  },
  ...drumPieceModifiers('kick', true),
  ...drumPieceModifiers('snare', true),
  ...drumPieceModifiers('hiHat', false),
  ...drumPieceModifiers('toms', false),
  ...drumPieceModifiers('overheads', false),
  ...drumPieceModifiers('cajon', true),
  {
    role: 'backingTracks',
    level: 'beginner',
    why: 'Tracks are pre-produced, so the operator\'s skill does not change the sound.',
    adjustments: [],
    coaching: 'Check every track is at a similar volume before the service.',
    mixerNotes: [],
  },
  {
    role: 'backingTracks',
    level: 'advanced',
    why: 'Tracks are pre-produced, so the operator\'s skill does not change the sound.',
    adjustments: [],
  },
  {
    role: 'click',
    level: 'beginner',
    why: 'A click is a machine. Skill does not apply.',
    adjustments: [],
    coaching: 'Start the click before counting in, every time.',
    mixerNotes: [],
  },
  {
    role: 'click',
    level: 'advanced',
    why: 'A click is a machine. Skill does not apply.',
    adjustments: [],
  },
];

const DRUM_DESCRIPTIONS = {
  beginner: 'Hit strength changes a lot, and it gets loud',
  intermediate: 'Mostly even, gets louder when excited',
  advanced: 'Even hits, plays to the room',
};

const OPERATOR_DESCRIPTIONS = {
  beginner: 'Still learning the setup',
  intermediate: 'Runs it reliably',
  advanced: 'Has levels prepared in advance',
};

/** Behavior descriptions that let a volunteer choose a level without judging a friend. */
export const SKILL_DESCRIPTIONS: SkillDescriptions[] = [
  { role: 'leadVocal', beginner: 'Volume and mic distance change a lot', intermediate: 'Mostly steady, drifts on loud parts', advanced: 'Controls their own dynamics and mic technique' },
  { role: 'harmonyVocal', beginner: 'Volume and mic distance change a lot', intermediate: 'Mostly steady, drifts on loud parts', advanced: 'Blends by ear and controls their own volume' },
  { role: 'acousticGuitar', beginner: 'Strums much harder in loud sections', intermediate: 'Mostly even strumming', advanced: 'Controls volume with their playing' },
  { role: 'electricGuitar', beginner: 'Volume jumps when they change sounds', intermediate: 'Sounds are mostly at a similar volume', advanced: 'All sounds are levelled, plays for the song' },
  { role: 'bassGuitar', beginner: 'Some notes are much louder than others', intermediate: 'Mostly even notes', advanced: 'Even notes, uses dynamics on purpose' },
  { role: 'synthBass', beginner: 'Sounds differ a lot in volume', intermediate: 'Sounds are mostly at a similar volume', advanced: 'All sounds are levelled' },
  { role: 'keys', beginner: 'Plays a lot with both hands all the time', intermediate: 'Leaves some space, sometimes busy down low', advanced: 'Leaves the low notes to the bass and plays for the song' },
  { role: 'padSynth', beginner: 'Holds pads at one volume throughout', intermediate: 'Adjusts volume between songs', advanced: 'Swells and fades with the song' },
  { role: 'electronicDrums', ...DRUM_DESCRIPTIONS },
  { role: 'kick', ...DRUM_DESCRIPTIONS },
  { role: 'snare', ...DRUM_DESCRIPTIONS },
  { role: 'hiHat', ...DRUM_DESCRIPTIONS },
  { role: 'toms', ...DRUM_DESCRIPTIONS },
  { role: 'overheads', ...DRUM_DESCRIPTIONS },
  { role: 'cajon', ...DRUM_DESCRIPTIONS },
  { role: 'backingTracks', ...OPERATOR_DESCRIPTIONS },
  { role: 'click', ...OPERATOR_DESCRIPTIONS },
];

/** The tip and mixer notes for a role. The same for every player of the role, whatever their rating. */
export function findRoleNotes(role: Role): { coaching: string; mixerNotes: { text: string; onlyProfileIds: string[] }[] } {
  const entry = SKILL_MODIFIERS.find((modifier) => modifier.role === role && modifier.level === 'beginner');
  if (entry === undefined) {
    return { coaching: '', mixerNotes: [] };
  }
  return { coaching: entry.coaching ?? '', mixerNotes: entry.mixerNotes ?? [] };
}
