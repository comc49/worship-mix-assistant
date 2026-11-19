import { TextSetting } from '../model';
import { cut, hear, num } from './builders';
import { InstrumentProfile } from './types';

const NO_GATE_DI = 'A direct source has no bleed from other instruments, so there is nothing for a gate to remove.';

const DI_GAIN_STAGING = {
  steps: [
    'Ask the player to play their loudest part of the set.',
    'Raise the preamp gain until the loudest moments peak around -12 dB on the channel meter.',
    'If any red light shows, turn the gain down until it does not.',
  ],
  why: 'Gain set on the loudest moment leaves room above it. The compressor settings on this sheet assume this gain.',
  listenFor: 'Clean loud notes with no crunch.',
};

const NORMAL_POLARITY: TextSetting = {
  value: 'Normal',
  why: 'A single direct source has nothing to be out of phase with.',
  listenFor: 'Nothing to check.',
};

const CENTER_PAN: TextSetting = {
  value: 'Center',
  why: 'Low and rhythmic sources belong in the middle so every seat hears them the same.',
  listenFor: 'Nothing to check.',
};

const STEREO_PAN: TextSetting = {
  value: 'Left and right at about 9 and 3 o\'clock if stereo, center if mono',
  why: 'Full hard-left and hard-right leaves the side seats with half the instrument.',
  listenFor: 'From a side seat, the instrument should still sound complete.',
};

const MATCH_BYPASS: TextSetting = {
  value: 'Switch the compressor off and on, and raise the makeup gain until both sound equally loud',
  why: 'Makeup gain restores what compression took away.',
  listenFor: 'Switching the compressor in and out should not change how loud the source seems.',
};

export const BASS_GUITAR_PROFILE: InstrumentProfile = {
  id: 'bassGuitar.di',
  role: 'bassGuitar',
  label: 'Bass guitar',
  connections: ['monoDi', 'modelerDirect', 'dynamicMic'],
  stereo: 'never',
  patchOrder: 200,
  gainStaging: DI_GAIN_STAGING,
  polarity: NORMAL_POLARITY,
  params: {
    lowCutHz: num(35, 30, 50, 'Hz', 'Removes only the sub-rumble below the lowest bass note. The foundation stays.', 'The bass should lose nothing you can hear. If it gets smaller, lower the cut.'),
    compRatio: num(4, 3, 6, ':1', 'Bass notes vary a lot in volume. A firm ratio keeps the low end steady.', 'Every note should sit at about the same level.'),
    compAttackMs: num(25, 15, 40, 'ms', 'Lets the pluck of each note through before clamping.', 'If the bass loses its punch, lengthen the attack.'),
    compReleaseMs: num(150, 100, 250, 'ms', 'Recovers between notes without pumping.', 'If the level swells after each note, lengthen the release.'),
    compGainReductionDb: num(5, 3, 8, 'dB', 'About 5 dB on the loudest notes evens the line out.', 'Loud notes should stop jumping out. The bass should still breathe.'),
    levelDb: num(0, -4, 3, 'dB', 'Kick and bass are set first; the rest of the band is built on them.', 'You should feel the bass with the kick, not hear it as a separate boom.'),
    monitorSendDb: num(-5, -15, 3, 'dB', 'Bass carries on stage by itself; monitors need little of it.', 'Ask the player.'),
  },
  gateThreshold: null,
  makeupGain: MATCH_BYPASS,
  noGateWhy: NO_GATE_DI,
  noCompressorWhy: '',
  suggestedCuts: [
    cut('Low-mid mud', 250, -2, 'medium', 'Bass DIs often build up here and mask the vocal\'s body.', 'Keep it only if the mix sounds clearer with it in.'),
  ],
  ifYouHear: [
    hear('Boomy, one note louder than the rest', 'First ask the player to play that note softer. Then cut 3 dB around 80 to 120 Hz, medium Q, sweeping to find it.'),
    hear('Cannot hear which note is being played', 'Boost 2 dB around 700 Hz to 1 kHz, wide Q, instead of turning the bass up.'),
    hear('Clacky string noise', 'Cut 2 to 3 dB around 2 to 3 kHz, medium Q.'),
    hear('Bass and kick blur together', 'Decide which one owns 60 to 80 Hz. Cut the other one 2 to 3 dB there.'),
  ],
  pan: CENTER_PAN,
  dcas: ['lowEnd'],
  groupBus: null,
  sendToSubBus: true,
  routeToMain: true,
  mixerNotes: [],
};

export const SYNTH_BASS_PROFILE: InstrumentProfile = {
  id: 'synthBass.di',
  role: 'synthBass',
  label: 'Synth bass',
  connections: ['monoDi', 'stereoDi'],
  stereo: 'whenConnectionIsStereo',
  patchOrder: 210,
  gainStaging: DI_GAIN_STAGING,
  polarity: NORMAL_POLARITY,
  params: {
    lowCutHz: num(30, 25, 50, 'Hz', 'Removes only inaudible sub-rumble.', 'The synth bass should lose nothing you can hear.'),
    compRatio: num(3, 2, 4, ':1', 'Synth bass is already fairly even; this only catches patch differences.', 'Different patches should sit at a similar level.'),
    compAttackMs: num(25, 15, 40, 'ms', 'Lets the start of each note through.', 'If notes lose their front edge, lengthen the attack.'),
    compReleaseMs: num(150, 100, 250, 'ms', 'Recovers between notes.', 'If the level swells after each note, lengthen the release.'),
    compGainReductionDb: num(3, 2, 6, 'dB', 'Light control is enough on a synth.', 'Loud patches should not jump out.'),
    levelDb: num(0, -4, 3, 'dB', 'Part of the low-end foundation.', 'Felt with the kick, not booming over it.'),
    monitorSendDb: num(-5, -15, 3, 'dB', 'Low end carries on stage by itself.', 'Ask the player.'),
  },
  gateThreshold: null,
  makeupGain: MATCH_BYPASS,
  noGateWhy: NO_GATE_DI,
  noCompressorWhy: '',
  suggestedCuts: [],
  ifYouHear: [
    hear('Boomy or overwhelming', 'Turn the channel down before using EQ. Then cut 3 dB around 60 to 100 Hz.'),
    hear('Inaudible on small speakers', 'Ask the player for a patch with more mid harmonics instead of boosting lows.'),
  ],
  pan: CENTER_PAN,
  dcas: ['lowEnd'],
  groupBus: null,
  sendToSubBus: true,
  routeToMain: true,
  mixerNotes: [],
};

export const ACOUSTIC_GUITAR_DI_PROFILE: InstrumentProfile = {
  id: 'acousticGuitar.di',
  role: 'acousticGuitar',
  label: 'Acoustic guitar',
  connections: ['monoDi', 'stereoDi', 'modelerDirect'],
  stereo: 'whenConnectionIsStereo',
  patchOrder: 300,
  gainStaging: DI_GAIN_STAGING,
  polarity: NORMAL_POLARITY,
  params: {
    lowCutHz: num(90, 70, 140, 'Hz', 'An acoustic guitar in a band is rhythm and sparkle. Its lows only crowd the bass and kick.', 'Raise it until the guitar starts to sound small when played alone, then back off a little.'),
    compRatio: num(3, 2, 4, ':1', 'Strumming and picking differ a lot in volume.', 'Picked parts should stay audible; hard strums should not jump out.'),
    compAttackMs: num(20, 10, 30, 'ms', 'Keeps the pick attack that gives the guitar its rhythm.', 'If strums sound dull, lengthen the attack.'),
    compReleaseMs: num(150, 100, 250, 'ms', 'Recovers between strums.', 'If the level pumps with the strumming, lengthen the release.'),
    compGainReductionDb: num(3, 2, 6, 'dB', 'About 3 dB on hard strums.', 'Hard strums should sit in the mix instead of covering the vocal.'),
    levelDb: num(-2, -8, 2, 'dB', 'Supports the vocal in a full band.', 'You should hear the rhythm of the strumming, under the vocal.'),
    monitorSendDb: num(0, -10, 5, 'dB', 'The player needs to hear their own playing.', 'Ask the player.'),
    'fxSend.hall': num(-18, -26, -10, 'dB', 'A touch of hall takes the dryness off a pickup.', 'You should miss it when muted, not notice it when on.'),
  },
  gateThreshold: null,
  makeupGain: MATCH_BYPASS,
  noGateWhy: NO_GATE_DI,
  noCompressorWhy: '',
  suggestedCuts: [
    cut('Body boom', 200, -2, 'medium', 'Pickups exaggerate the body resonance of the guitar.', 'Keep it only if the guitar sounds tighter and not thinner.'),
  ],
  ifYouHear: [
    hear('Boomy or humming on certain notes', 'Cut 3 dB around 150 to 250 Hz, medium Q, sweeping to find it.'),
    hear('Plastic, "quacky" pickup sound', 'Cut 2 to 3 dB around 1 to 1.5 kHz, medium Q.'),
    hear('Harsh strumming', 'Cut 2 dB around 3 to 5 kHz, wide Q.'),
    hear('Fights the vocal', 'Ask the guitarist to play more simply under the verses before reaching for EQ.'),
  ],
  pan: CENTER_PAN,
  dcas: ['guitars'],
  groupBus: 'guitars',
  sendToSubBus: false,
  routeToMain: true,
  mixerNotes: [],
};

export const ACOUSTIC_GUITAR_MIC_PROFILE: InstrumentProfile = {
  ...ACOUSTIC_GUITAR_DI_PROFILE,
  id: 'acousticGuitar.mic',
  connections: ['dynamicMic', 'condenserMic'],
  stereo: 'never',
  gainStaging: {
    steps: [
      'Point the mic at the 12th fret, a hand\'s width away, not at the sound hole.',
      'Ask the player to strum their loudest part.',
      'Raise the preamp gain until the loudest strums peak around -12 dB.',
    ],
    why: 'A mic pointed at the sound hole is boomy and feeds back first.',
    listenFor: 'A balanced guitar sound with no boom.',
  },
  params: {
    ...ACOUSTIC_GUITAR_DI_PROFILE.params,
    lowCutHz: num(100, 80, 140, 'Hz', 'An open mic on a guitar also hears the stage rumble.', 'Raise it until the guitar starts to sound small, then back off a little.'),
    monitorSendDb: num(-6, -15, 0, 'dB', 'A miked acoustic guitar feeds back easily through a stage monitor.', 'Raise in small steps and stop at the first ring.'),
  },
  noGateWhy: 'A gate would chop quiet picked passages. Mute the channel between songs instead.',
};

const ELECTRIC_IF_YOU_HEAR = [
  hear('Harsh or fizzy', 'Cut 2 to 3 dB around 3 to 4 kHz, wide Q. If it is still fizzy, add a high cut around 8 kHz.'),
  hear('Thin', 'Lower the low cut by 20 Hz. Then ask the player to check the patch, because thin usually comes from the patch.'),
  hear('Too loud on some songs, too quiet on others', 'Ask the player to level their patches. Until then, ride the fader song by song.'),
  hear('Fights the keys', 'Ask one of them to move to a different register before using EQ.'),
];

export const ELECTRIC_GUITAR_MODELER_PROFILE: InstrumentProfile = {
  id: 'electricGuitar.modeler',
  role: 'electricGuitar',
  label: 'Electric guitar',
  connections: ['modelerDirect', 'monoDi', 'stereoDi'],
  stereo: 'whenConnectionIsStereo',
  patchOrder: 310,
  gainStaging: {
    steps: [
      'Ask the player to switch to their loudest patch (usually the lead or heaviest sound) and play.',
      'Raise the preamp gain until that patch peaks around -12 dB on the channel meter.',
      'Then check the quietest patch is still clearly above the noise.',
    ],
    why: 'A modeler\'s patches differ in volume. Gain is set on the loudest one.',
    listenFor: 'No clipping on the loudest patch.',
  },
  polarity: NORMAL_POLARITY,
  params: {
    lowCutHz: num(90, 70, 120, 'Hz', 'Electric guitar has nothing useful below the low E string\'s body. Lows here only crowd the bass.', 'Raise it until palm-muted chords lose weight, then back off.'),
    compRatio: num(2, 1.5, 4, ':1', 'Distorted and modeled guitar is already compressed. This only catches peaks.', 'It should be nearly invisible.'),
    compAttackMs: num(20, 5, 30, 'ms', 'Keeps the pick attack.', 'If clean parts sound dull, lengthen the attack.'),
    compReleaseMs: num(150, 100, 250, 'ms', 'Recovers between chords.', 'If the level pumps, lengthen the release.'),
    compGainReductionDb: num(2, 1, 6, 'dB', 'Light control only.', 'Loud patches should not leap out of the mix.'),
    levelDb: num(-2, -8, 2, 'dB', 'Electric guitar adds energy under the vocal.', 'Present in the choruses, never covering words.'),
    monitorSendDb: num(0, -10, 5, 'dB', 'With a modeler there is no amp on stage, so the player hears themselves only through the monitor.', 'Ask the player.'),
  },
  gateThreshold: null,
  makeupGain: MATCH_BYPASS,
  noGateWhy: 'A modeler has no bleed and has its own noise gate. A second gate on the console chops sustained notes.',
  noCompressorWhy: '',
  suggestedCuts: [],
  ifYouHear: ELECTRIC_IF_YOU_HEAR,
  pan: STEREO_PAN,
  dcas: ['guitars', 'energy'],
  groupBus: 'guitars',
  sendToSubBus: false,
  routeToMain: true,
  mixerNotes: [],
};

export const ELECTRIC_GUITAR_AMP_PROFILE: InstrumentProfile = {
  ...ELECTRIC_GUITAR_MODELER_PROFILE,
  id: 'electricGuitar.amp',
  connections: ['dynamicMic', 'condenserMic'],
  stereo: 'never',
  gainStaging: {
    steps: [
      'Put the mic close to the speaker grille, halfway between the center and the edge of the speaker cone.',
      'Ask the player to play their loudest sound.',
      'Raise the preamp gain until it peaks around -12 dB on the channel meter.',
    ],
    why: 'The center of the cone is harsh and the edge is dull. Halfway is a safe start.',
    listenFor: 'No clipping. If it is harsh, move the mic toward the edge before using EQ.',
  },
  params: {
    ...ELECTRIC_GUITAR_MODELER_PROFILE.params,
    lowCutHz: num(100, 80, 130, 'Hz', 'A close amp mic adds low thump that crowds the bass.', 'Raise it until palm-muted chords lose weight, then back off.'),
    monitorSendDb: num(-10, -20, 0, 'dB', 'The amp is already on stage.', 'Only add it for players who stand far from the amp.'),
  },
  noGateWhy: 'A gate cuts off sustained notes and swells. If the amp hisses between songs, mute the channel.',
  pan: CENTER_PAN,
};

export const KEYS_PROFILE: InstrumentProfile = {
  id: 'keys.di',
  role: 'keys',
  label: 'Keys',
  connections: ['stereoDi', 'monoDi'],
  stereo: 'whenConnectionIsStereo',
  patchOrder: 400,
  gainStaging: DI_GAIN_STAGING,
  polarity: NORMAL_POLARITY,
  params: {
    lowCutHz: num(60, 40, 120, 'Hz', 'Clears sub-rumble while keeping the piano\'s left hand. Band context raises it when a bass guitar is present.', 'Raise it until the piano loses warmth when played alone, then back off.'),
    compRatio: num(2, 1.5, 3, ':1', 'Keyboards are fairly even already. Light control only.', 'It should be nearly invisible.'),
    compAttackMs: num(30, 15, 50, 'ms', 'Keeps the hammer attack of piano sounds.', 'If the piano sounds dull, lengthen the attack.'),
    compReleaseMs: num(200, 120, 300, 'ms', 'Slow release keeps sustained chords steady.', 'If chords swell after being played, lengthen the release.'),
    compGainReductionDb: num(2, 1, 4, 'dB', 'Just enough to hold back big chords.', 'Big chords should not jump out; quiet intros should stay natural.'),
    levelDb: num(-2, -8, 2, 'dB', 'Keys fill the middle under the vocal.', 'Supports the song without covering words.'),
    monitorSendDb: num(0, -10, 5, 'dB', 'A keyboard makes no sound on stage, so the player hears themselves only through the monitor.', 'Ask the player. Singers often want keys for pitch.'),
    'fxSend.hall': num(-20, -28, -12, 'dB', 'A little hall helps piano sounds sit in the room.', 'You should miss it when muted, not notice it when on.'),
  },
  gateThreshold: null,
  makeupGain: MATCH_BYPASS,
  noGateWhy: NO_GATE_DI,
  noCompressorWhy: '',
  suggestedCuts: [
    cut('Low-mid buildup', 300, -2, 'wide', 'Piano patches are thick here and mask the vocal\'s body.', 'Keep it only if the vocal gets clearer with it in.'),
  ],
  ifYouHear: [
    hear('Muddy under the band', 'First ask the player to play less with the left hand. Then raise the low cut by 20 Hz.'),
    hear('Fights the guitars', 'Ask one of them to move up or down an octave before using EQ.'),
    hear('Harsh on bright patches', 'Cut 2 dB around 2.5 to 4 kHz, wide Q.'),
    hear('Thin when the band drops out', 'Lower the low cut by 20 Hz for that song.'),
  ],
  pan: STEREO_PAN,
  dcas: ['keysAndPads'],
  groupBus: 'keys',
  sendToSubBus: false,
  routeToMain: true,
  mixerNotes: [],
};

export const PAD_PROFILE: InstrumentProfile = {
  id: 'padSynth.di',
  role: 'padSynth',
  label: 'Pad',
  connections: ['stereoDi', 'monoDi'],
  stereo: 'whenConnectionIsStereo',
  patchOrder: 500,
  gainStaging: DI_GAIN_STAGING,
  polarity: NORMAL_POLARITY,
  params: {
    lowCutHz: num(120, 80, 200, 'Hz', 'A pad is atmosphere. Its low end only clouds the bass and the room.', 'Raise it until the pad stops muddying the low end.'),
    levelDb: num(-5, -12, 0, 'dB', 'A pad should be felt more than heard.', 'You should notice it mostly when it stops.'),
    monitorSendDb: num(-3, -12, 3, 'dB', 'The player needs to hear it, but pads fill a monitor quickly.', 'Ask the player.'),
    'fxSend.hall': num(-22, -30, -14, 'dB', 'Pads already carry their own space.', 'More reverb here quickly becomes wash.'),
  },
  gateThreshold: null,
  makeupGain: null,
  noGateWhy: NO_GATE_DI,
  noCompressorWhy: 'Pads have no sudden peaks. A compressor would only bring up their level over time.',
  suggestedCuts: [
    cut('Low-mid cloud', 300, -3, 'wide', 'Sustained pads stack up low-mids that cover everything else.', 'The mix should open up with the cut in.'),
  ],
  ifYouHear: [
    hear('The whole mix sounds cloudy', 'Pull the pad down 3 dB before touching anything else.'),
    hear('Pad swells too loud', 'Ask the player to use their volume pedal, or ride the fader down.'),
  ],
  pan: STEREO_PAN,
  dcas: ['keysAndPads'],
  groupBus: 'keys',
  sendToSubBus: false,
  routeToMain: true,
  mixerNotes: [],
};

export const BACKING_TRACKS_PROFILE: InstrumentProfile = {
  id: 'backingTracks.di',
  role: 'backingTracks',
  label: 'Backing tracks',
  connections: ['stereoDi', 'monoDi'],
  stereo: 'whenConnectionIsStereo',
  patchOrder: 550,
  gainStaging: {
    steps: [
      'Play the loudest section of the loudest track.',
      'Raise the gain until it peaks around -12 dB on the channel meter.',
    ],
    why: 'Tracks are already mixed and loud. They need less gain than a live source.',
    listenFor: 'No clipping.',
  },
  polarity: NORMAL_POLARITY,
  params: {
    lowCutHz: num(30, 20, 60, 'Hz', 'Tracks are already mixed. Only inaudible sub-rumble is removed.', 'Nothing audible should change.'),
    levelDb: num(-4, -12, 0, 'dB', 'Tracks support the live band, not the other way round.', 'The live players should always be louder than the tracks.'),
    monitorSendDb: num(-3, -12, 3, 'dB', 'Players need the tracks to stay together.', 'Ask the band.'),
  },
  gateThreshold: null,
  makeupGain: null,
  noGateWhy: NO_GATE_DI,
  noCompressorWhy: 'Tracks are already compressed in production.',
  suggestedCuts: [],
  ifYouHear: [
    hear('Tracks cover the live band', 'Turn the tracks down. Do not turn the band up.'),
    hear('Low end doubles up with the live bass', 'Raise the low cut on the tracks to 100 Hz for that song.'),
  ],
  pan: STEREO_PAN,
  dcas: [],
  groupBus: null,
  sendToSubBus: false,
  routeToMain: true,
  mixerNotes: ['Backing tracks are not in a DCA. Ride them on their own fader.'],
};

export const CLICK_PROFILE: InstrumentProfile = {
  id: 'click.di',
  role: 'click',
  label: 'Click',
  connections: ['monoDi', 'stereoDi'],
  stereo: 'never',
  patchOrder: 560,
  gainStaging: {
    steps: ['Start the click and raise the gain until it peaks around -12 dB on the channel meter.'],
    why: 'The click only goes to monitors.',
    listenFor: 'No clipping.',
  },
  polarity: NORMAL_POLARITY,
  params: {
    levelDb: num(0, -10, 0, 'dB', 'The channel fader is not used: the click never goes to the main mix.', 'You must never hear the click in the room.'),
    monitorSendDb: num(0, -10, 6, 'dB', 'Players set how much click they need.', 'Ask the drummer first.'),
  },
  gateThreshold: null,
  makeupGain: null,
  noGateWhy: NO_GATE_DI,
  noCompressorWhy: 'A click needs no processing.',
  suggestedCuts: [],
  ifYouHear: [hear('Click audible in the room', 'Check the click channel is not assigned to the main mix, the sub or the stream.')],
  pan: CENTER_PAN,
  dcas: [],
  groupBus: null,
  sendToSubBus: false,
  routeToMain: false,
  mixerNotes: ['The click never goes to the main mix or to a wedge: the room would hear it. It goes only to in-ears or headphones.'],
};
