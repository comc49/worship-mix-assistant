import { MuteGroupId, Role, TextSetting } from '../model';
import { add, num } from './builders';
import { DcaDefinition, EnsembleRule, GroupBusDefinition, SendEffectDefinition } from './types';

/** Roles that play the part of a kick drum. */
export const KICK_LIKE_ROLES: Role[] = ['kick', 'electronicDrums', 'cajon'];
export const DRUM_ROLES: Role[] = ['electronicDrums', 'kick', 'snare', 'hiHat', 'toms', 'overheads', 'cajon'];
export const VOCAL_ROLES: Role[] = ['leadVocal', 'harmonyVocal'];

// ---------------------------------------------------------------------------
// Ensemble rules: rules that depend on who else is in the band.
// ---------------------------------------------------------------------------

export const ENSEMBLE_RULES: EnsembleRule[] = [
  {
    id: 'kickAndBassLanes',
    title: 'Kick and bass share the low end',
    links: [...KICK_LIKE_ROLES, 'bassGuitar'],
    requiresOneOfEach: [KICK_LIKE_ROLES, ['bassGuitar']],
    arrangementAdvice: 'Ask the bassist to lock their notes to the kick pattern. Two parts playing together sound like one strong low end.',
    adjustments: [],
    removeSubSendFrom: [],
    why: 'Kick and bass live in the same range. The kick usually owns 60 to 80 Hz and the bass 80 to 120 Hz; neither is cut by default, because the app has not heard them.',
  },
  {
    id: 'keysLeaveRoomForBass',
    title: 'Keys leave the low notes to the bass guitar',
    links: ['keys', 'bassGuitar'],
    requiresOneOfEach: [['keys'], ['bassGuitar']],
    arrangementAdvice: 'Ask the keys player to play the left hand higher, or leave it out, while the bass guitar is playing.',
    adjustments: [
      { targetRoles: ['keys'], adjustment: add('lowCutHz', 20, 'A bass guitar is in the band, so the keys do not need to carry the low end.') },
    ],
    removeSubSendFrom: [],
    why: 'A piano left hand and a bass guitar in the same octave turn the low end to mud.',
  },
  {
    id: 'keysAndGuitarsLanes',
    title: 'Keys and electric guitar share the middle',
    links: ['keys', 'electricGuitar'],
    requiresOneOfEach: [['keys'], ['electricGuitar']],
    arrangementAdvice: 'Ask the keys and the electric guitar to play in different registers: when one plays low chords, the other plays higher.',
    adjustments: [],
    removeSubSendFrom: [],
    why: 'Both fill the same middle range. Separating them by arrangement works better than any EQ.',
  },
  {
    id: 'acousticUnderLeadVocal',
    title: 'Acoustic guitar leaves room for the lead vocal',
    links: ['acousticGuitar', 'leadVocal'],
    requiresOneOfEach: [['acousticGuitar'], ['leadVocal']],
    arrangementAdvice: 'Ask the guitarist to strum more simply during verses so the words stay clear.',
    adjustments: [],
    removeSubSendFrom: [],
    why: 'The body of an acoustic guitar sits right where the vocal\'s warmth is.',
  },
  {
    id: 'acousticInFullBand',
    title: 'Acoustic guitar is rhythm in a full band',
    links: ['acousticGuitar', 'bassGuitar', ...KICK_LIKE_ROLES],
    requiresOneOfEach: [['acousticGuitar'], ['bassGuitar'], ['kick', 'electronicDrums']],
    arrangementAdvice: 'With bass and drums playing, the acoustic guitar\'s job is rhythm and sparkle, not fullness.',
    adjustments: [
      { targetRoles: ['acousticGuitar'], adjustment: add('lowCutHz', 20, 'Bass and drums carry the low end, so the acoustic guitar does not need its own.') },
    ],
    removeSubSendFrom: [],
    why: 'In a full band the acoustic guitar\'s lows only crowd the bass.',
  },
  {
    id: 'padUnderKeys',
    title: 'Pad sits under the keys',
    links: ['padSynth', 'keys'],
    requiresOneOfEach: [['padSynth'], ['keys']],
    arrangementAdvice: 'Ask the pad player to hold fewer notes, and higher, while the keys are playing chords.',
    adjustments: [
      { targetRoles: ['padSynth'], adjustment: add('lowCutHz', 30, 'The keys already fill the lower middle.') },
      { targetRoles: ['padSynth'], adjustment: add('levelDb', -2, 'With keys playing, the pad is only glue.') },
    ],
    removeSubSendFrom: [],
    why: 'Pad and keys together stack up low-mids quickly.',
  },
  {
    id: 'oneOwnerOfTheLowEnd',
    title: 'Only one bass instrument owns the low end',
    links: ['synthBass', 'bassGuitar'],
    requiresOneOfEach: [['synthBass'], ['bassGuitar']],
    arrangementAdvice: 'Ask the band to decide, song by song, whether the bass guitar or the synth bass plays the low notes. Not both.',
    adjustments: [
      { targetRoles: ['synthBass'], adjustment: add('lowCutHz', 50, 'The bass guitar owns the low end, so the synth bass is cut higher.') },
      { targetRoles: ['synthBass'], adjustment: add('levelDb', -3, 'The synth bass supports the bass guitar.') },
    ],
    removeSubSendFrom: ['synthBass'],
    why: 'Two bass sources playing different low notes cancel and boom unpredictably. By default the bass guitar owns the low end.',
  },
];

// ---------------------------------------------------------------------------
// Effects, in priority order.
// ---------------------------------------------------------------------------

export const SEND_EFFECTS: SendEffectDefinition[] = [
  {
    id: 'vocalPlate',
    label: 'Vocal plate',
    family: 'plateReverb',
    priority: 1,
    time: num(1.6, 1.0, 2.4, 's', 'A medium plate adds sustain to voices without a long tail.', 'The tail should be gone before the next phrase starts.'),
    timeNote: '',
    timeLimit: { floor: 0.8, ceiling: 2.6, why: 'Shorter sounds like a small room; longer washes out the words.' },
    why: 'The one reverb every band needs: it gives the vocals sustain and blends harmonies.',
    listenFor: 'Mute the return: the vocals should sound drier and closer, not obviously different.',
  },
  {
    id: 'tempoDelay',
    label: 'Tempo delay',
    family: 'delay',
    priority: 2,
    time: null,
    timeNote: 'Tap the tempo of each song so the repeats land on the quarter note. Keep feedback low: two or three repeats.',
    timeLimit: null,
    why: 'A quiet delay on the lead vocal fills gaps without the wash of more reverb.',
    listenFor: 'If you can clearly hear repeats in a fast song, mute it for that song.',
  },
  {
    id: 'hall',
    label: 'Hall',
    family: 'hallReverb',
    priority: 3,
    time: num(2.2, 1.4, 3.0, 's', 'A hall gives keys and acoustic guitar a sense of space.', 'It should sound like one room, not an effect.'),
    timeNote: '',
    timeLimit: { floor: 1.0, ceiling: 3.2, why: 'Longer than this turns into wash in any worship room.' },
    why: 'Instruments that are plugged in directly have no room sound of their own.',
    listenFor: 'Mute the return: instruments should sound drier, not obviously different.',
  },
  {
    id: 'drumRoom',
    label: 'Drum room',
    family: 'roomReverb',
    priority: 4,
    time: num(0.8, 0.4, 1.2, 's', 'A short room makes snare and toms sound bigger without a tail.', 'You should hear size, not reverb.'),
    timeNote: '',
    timeLimit: { floor: 0.3, ceiling: 1.2, why: 'A longer drum reverb blurs the groove.' },
    why: 'Sampled or close-miked drums can sound small and dry.',
    listenFor: 'Mute the return: the snare should sound smaller.',
  },
];

export const DE_ESSER = {
  id: 'deEsser' as const,
  label: 'De-esser on the lead vocal',
  priority: 1,
  why: 'Compression and bright mics make "s" sounds sharp. A de-esser turns down only those moments.',
  listenFor: 'Sharp "s" sounds soften. If the singer starts to lisp, it is doing too much.',
};

// ---------------------------------------------------------------------------
// Group layout defaults.
// ---------------------------------------------------------------------------

export const DCA_DEFINITIONS: DcaDefinition[] = [
  { id: 'leadVocal', label: 'Lead Vocal', holdsFxReturns: false, why: 'The one fader you ride all service.' },
  { id: 'harmonyVocals', label: 'Harmony Vocals', holdsFxReturns: false, why: 'Moves all harmonies together under the lead.' },
  { id: 'lowEnd', label: 'Low End', holdsFxReturns: false, why: 'Kick and bass together: push this into a climax instead of pushing everything.' },
  { id: 'energy', label: 'Energy', holdsFxReturns: false, why: 'The sources that lift a chorus: snare, toms, cymbals and electric guitar.' },
  { id: 'keysAndPads', label: 'Keys and Pads', holdsFxReturns: false, why: 'Pull this down when the vocal is buried.' },
  { id: 'guitars', label: 'Guitars', holdsFxReturns: false, why: 'Acoustic and electric guitars together.' },
  { id: 'drums', label: 'Drums', holdsFxReturns: false, why: 'Every drum channel on one fader.' },
  { id: 'fxReturns', label: 'FX Returns', holdsFxReturns: true, why: 'One fader to pull all reverb and delay down between songs or when someone speaks.' },
];

export const GROUP_BUS_DEFINITIONS: GroupBusDefinition[] = [
  { id: 'vocals', label: 'Vocals', priority: 1, preferredWidth: 'stereo', monoIsAcceptable: true, why: 'One place to control all vocals together.' },
  { id: 'drums', label: 'Drums', priority: 2, preferredWidth: 'stereo', monoIsAcceptable: false, why: 'One place to control the whole kit, keeping its stereo spread.' },
  { id: 'guitars', label: 'Guitars', priority: 3, preferredWidth: 'stereo', monoIsAcceptable: true, why: 'One place to control the guitars.' },
  { id: 'keys', label: 'Keys', priority: 4, preferredWidth: 'stereo', monoIsAcceptable: false, why: 'One place to control keys and pads, keeping their stereo spread.' },
];

export const MUTE_GROUP_DEFINITIONS: { id: MuteGroupId; label: string; why: string }[] = [
  { id: 'allBand', label: 'All Band', why: 'Silences every instrument at once, for prayer or a spoken section.' },
  { id: 'allVocals', label: 'All Vocals', why: 'Silences every vocal mic at once when singers leave the stage.' },
  { id: 'allFx', label: 'All FX', why: 'Kills reverb and delay instantly when someone speaks.' },
];

// ---------------------------------------------------------------------------
// House principles: always-on rules, shown in the app.
// ---------------------------------------------------------------------------

export const HOUSE_PRINCIPLES: string[] = [
  'Arrangement beats EQ. If two sources fight, first ask who should play less, before any fader or EQ move.',
  'Establish kick and bass first. Do not high-pass and thin everything out before the low-end foundation is solid.',
  'In a reverberant room, fewer simultaneous sources beats lower faders.',
  'Set the ceiling first: set fader positions at the loudest moment of the loudest song, then work backward.',
  'Ride up into a climax with the Low End and Energy DCAs instead of pushing everything.',
  'Main bus: a limiter for protection, with the compressor off. Over-compressing the main bus flattens builds.',
];

// ---------------------------------------------------------------------------
// Monitor, subwoofer, stream and main bus rules.
// ---------------------------------------------------------------------------

export const WEDGE_VOCAL_GAIN_REDUCTION_CAP_DB = 6;

export const MONITOR_RULES = {
  wedgeCapWhy: 'Wedges are in use. The compressed vocal reaches the wedges, and every dB of compression lowers the level at which feedback starts, so vocal gain reduction is capped at 6 dB.',
  wedgeNoMakeup: {
    value: 'None (leave makeup gain at 0)',
    why: 'With wedges, makeup gain raises the quiet moments in the monitors too, which is when feedback starts.',
    listenFor: 'The vocal may seem slightly quieter with the compressor in. Use the fader to make it up, not makeup gain.',
  } satisfies TextSetting,
  wedgePreFaderWhy: 'Monitor sends are pre-fader, so moving a channel fader for the room does not change what the musician hears.',
  inEarWhy: 'In-ears do not feed back into the mics, so the vocal compression cap is lifted.',
  mixedWhy: 'Some wedges are on stage, so the wedge limits apply to everyone.',
  wedgeCompressionNote: 'With wedges, compression on a vocal also reaches the wedge unless the monitor send is taken before the compressor.',
  inEarCompressionNote: 'With in-ears, it does not matter for feedback whether the monitor send is taken before or after the compressor.',
};

export const CLICK_WITH_WEDGES_WARNING =
  'Click: wedges are on stage, so the click is not sent to any monitor mix. A click in a wedge is heard by the room. Give it only to players on in-ears or headphones, by hand.';

export const SUBWOOFER_RULES = {
  ownBusWhy: 'The subwoofer has its own feed. Only kick, bass guitar and synth bass are sent to it, so nothing else can make the low end muddy.',
  mainThroughCrossoverWhy: 'The subwoofer is fed from the main mix through a crossover, so there is no sub send. The channel low cuts do the work of keeping other sources out of the sub.',
};

export const STREAM_DIFFERENCES: TextSetting[] = [
  { value: 'Start the stream mix from post-fader sends at 0 dB, so it follows your room mix', why: 'The stream then needs only corrections, not a second full mix.', listenFor: 'On headphones, the stream should be a complete mix on its own.' },
  { value: 'Vocals 2 to 3 dB higher than in the room', why: 'The room adds the congregation\'s singing and the direct sound of the stage. The stream has neither.', listenFor: 'Every word clear on a phone speaker.' },
  { value: 'Acoustic drums, cymbals and guitar amps higher than in the room', why: 'Loud stage sources are turned down in the room mix because the room already hears them directly.', listenFor: 'On headphones the kit should sound complete.' },
  { value: 'More reverb than in the room', why: 'The stream has no room sound, so a mix that is right in the room sounds dry online.', listenFor: 'Voices should not sound like they are in a closet.' },
  { value: 'Check the stream on headphones, never by listening to the room', why: 'What you hear in the room is not what the stream gets.', listenFor: 'Balance and loudness between songs and speech.' },
];

export const MAIN_BUS_RULES = {
  limiter: {
    value: 'On, set so it only catches accidents',
    why: 'A limiter protects the speakers and ears from a dropped mic or a sudden spike.',
    listenFor: 'It should show no reduction in normal playing, and only 1 to 2 dB at the very loudest moment.',
  } satisfies TextSetting,
  compressor: {
    value: 'Off',
    why: 'Over-compressing the main bus flattens builds: the chorus cannot get bigger than the verse.',
    listenFor: 'Choruses should feel bigger than verses.',
  } satisfies TextSetting,
  eq: {
    value: 'Flat. Do not touch the system EQ',
    why: 'The system EQ was set for the room and the speakers. Mix problems are fixed on channels.',
    listenFor: 'Nothing to check.',
  } satisfies TextSetting,
};
