import { cut, hear, num } from './builders';
import { InstrumentProfile, MicModel, VocalLowCutLimit } from './types';

/**
 * Vocal baselines. The low cut value here is the medium-voice value; the engine replaces it
 * with the voice-range value from VOCAL_LOW_CUT_BY_RANGE and adds the mic model's offset.
 */

const VOCAL_GAIN_STAGING = {
  steps: [
    'Ask the singer to sing the loudest chorus of the set, at performance volume, into the mic.',
    'Raise the preamp gain until the loudest notes peak around -12 dB on the channel meter.',
    'If any red light shows, turn the gain down until it does not.',
  ],
  why: 'Gain set on the loudest moment leaves room above it. Every compressor setting on this sheet assumes this gain.',
  listenFor: 'Clean loud notes with no crunch. Quiet verses will look low on the meter; that is fine.',
};

const VOCAL_IF_YOU_HEAR = [
  hear('Muddy or woolly', 'Cut 2 to 3 dB around 200 to 300 Hz, medium Q. Check the mic is not touching the lips.'),
  hear('Boxy, like singing in a cardboard box', 'Cut 2 to 4 dB around 300 to 500 Hz, medium Q.'),
  hear('Nasal or honky', 'Cut 2 to 3 dB around 800 Hz to 1.2 kHz, medium Q.'),
  hear('Harsh or piercing on loud notes', 'Cut 2 to 3 dB around 2.5 to 4 kHz, wide Q. Do not boost anything first.'),
  hear('Sharp "s" and "t" sounds', 'Use the de-esser if one is loaded. Otherwise cut 2 dB around 6 to 8 kHz, medium Q.'),
  hear('Thin, no body', 'Lower the low cut by 20 Hz first. Only then consider removing a cut around 200 to 300 Hz.'),
  hear('Pops on "p" and "b"', 'Raise the low cut by 20 Hz and ask the singer to aim the mic slightly off to the side of the mouth.'),
  hear('Words get lost under the band', 'Before touching EQ: pull the keys and guitars DCAs down 2 dB. Then ride the vocal fader.'),
];

export const LEAD_VOCAL_PROFILE: InstrumentProfile = {
  id: 'leadVocal.mic',
  role: 'leadVocal',
  label: 'Lead vocal',
  connections: ['dynamicMic', 'condenserMic'],
  stereo: 'never',
  patchOrder: 600,
  gainStaging: VOCAL_GAIN_STAGING,
  polarity: { value: 'Normal', why: 'A single close mic has nothing to be out of phase with.', listenFor: 'Nothing to check.' },
  params: {
    lowCutHz: num(100, 80, 140, 'Hz', 'Removes handling noise, stage rumble and plosives below the voice.', 'Raise it until the voice just starts to thin, then back off 10 to 20 Hz.'),
    compRatio: num(3, 2, 4, ':1', 'A moderate ratio evens out phrases without sounding squashed.', 'If the voice sounds flat and lifeless, lower the ratio.'),
    compAttackMs: num(15, 10, 30, 'ms', 'Slow enough to let consonants through so words stay clear.', 'If words sound dull at the start, lengthen the attack.'),
    compReleaseMs: num(120, 80, 200, 'ms', 'Lets go between phrases without pumping.', 'If you hear the level "breathing" between words, lengthen the release.'),
    compGainReductionDb: num(4, 3, 6, 'dB', 'About 4 dB on loud phrases keeps the vocal on top without lifting stage noise much.', 'Loud phrases should sit in the mix instead of jumping out. Quiet phrases should show little or no reduction.'),
    levelDb: num(0, -3, 3, 'dB', 'The lead vocal is the reference. Everything else is balanced under it.', 'Every word should be understood from the back row.'),
    monitorSendDb: num(0, -10, 5, 'dB', 'Singers need themselves first in their own monitor.', 'Ask the singer, then raise in small steps. Loud wedges are the first cause of feedback.'),
    'fxSend.vocalPlate': num(-12, -20, -6, 'dB', 'A little plate adds sustain without pushing the voice back.', 'You should miss it when you mute it, not notice it when it is on.'),
    'fxSend.tempoDelay': num(-20, -30, -12, 'dB', 'A quiet delay fills gaps between phrases on slower songs.', 'If you can clearly hear repeats during fast songs, turn it down or mute the delay.'),
  },
  gateThreshold: null,
  makeupGain: { value: 'Match the bypassed level', why: 'Makeup gain restores what compression took away.', listenFor: 'Switching the compressor in and out should not change how loud the vocal seems.' },
  noGateWhy: 'A gate on a vocal chops quiet words and breaths. Mute the channel when the singer is not singing instead.',
  noCompressorWhy: '',
  suggestedCuts: [],
  ifYouHear: VOCAL_IF_YOU_HEAR,
  pan: { value: 'Center', why: 'Everyone in the room should hear the lead equally.', listenFor: 'Nothing to check.' },
  dcas: ['leadVocal'],
  groupBus: 'vocals',
  sendToSubBus: false,
  routeToMain: true,
  mixerNotes: [],
};

export const HARMONY_VOCAL_PROFILE: InstrumentProfile = {
  id: 'harmonyVocal.mic',
  role: 'harmonyVocal',
  label: 'Harmony vocal',
  connections: ['dynamicMic', 'condenserMic'],
  stereo: 'never',
  patchOrder: 610,
  gainStaging: VOCAL_GAIN_STAGING,
  polarity: { value: 'Normal', why: 'A single close mic has nothing to be out of phase with.', listenFor: 'Nothing to check.' },
  params: {
    lowCutHz: num(100, 80, 140, 'Hz', 'Harmony voices do not need low body; the lead carries it.', 'Raise it until the voice just starts to thin, then back off 10 to 20 Hz.'),
    compRatio: num(3, 2, 4, ':1', 'Even harmonies blend. Uneven ones poke out.', 'If the blend sounds lifeless, lower the ratio.'),
    compAttackMs: num(15, 10, 30, 'ms', 'Lets consonants through so the harmony lines up with the lead.', 'If words sound dull at the start, lengthen the attack.'),
    compReleaseMs: num(120, 80, 200, 'ms', 'Lets go between phrases without pumping.', 'If you hear the level "breathing", lengthen the release.'),
    compGainReductionDb: num(4, 3, 6, 'dB', 'About 4 dB on loud phrases keeps harmonies tucked under the lead.', 'No single harmony voice should jump out on loud notes.'),
    levelDb: num(-3, -8, 0, 'dB', 'Harmonies support the lead, so they start a few dB under it.', 'You should hear a blend, not three separate singers.'),
    monitorSendDb: num(0, -10, 5, 'dB', 'Singers need themselves first in their own monitor.', 'Ask the singer, then raise in small steps.'),
    'fxSend.vocalPlate': num(-12, -20, -6, 'dB', 'Shared reverb glues the harmony voices together.', 'You should miss it when you mute it, not notice it when it is on.'),
  },
  gateThreshold: null,
  makeupGain: { value: 'Match the bypassed level', why: 'Makeup gain restores what compression took away.', listenFor: 'Switching the compressor in and out should not change how loud the voice seems.' },
  noGateWhy: 'A gate on a vocal chops quiet words and breaths. Mute the channel when the singer is not singing instead.',
  noCompressorWhy: '',
  suggestedCuts: [],
  ifYouHear: VOCAL_IF_YOU_HEAR,
  pan: { value: 'Center, or slightly left and right if there are two or more harmony singers', why: 'A small spread separates harmonies from the lead without leaving half the room without them.', listenFor: 'From a side seat, you should still hear every harmony.' },
  dcas: ['harmonyVocals'],
  groupBus: 'vocals',
  sendToSubBus: false,
  routeToMain: true,
  mixerNotes: [],
};

/** Low cut and the optional "mud" cut depend on how low the voice goes. */
export const VOCAL_LOW_CUT_BY_RANGE: VocalLowCutLimit[] = [
  { voiceRange: 'low', baselineHz: 80, floor: 60, ceiling: 110, suggestedMudCutHz: 200, why: 'A low voice has real body down to about 90 Hz. A high low cut would thin it.' },
  { voiceRange: 'medium', baselineHz: 100, floor: 70, ceiling: 140, suggestedMudCutHz: 250, why: 'A medium voice has little useful energy below 100 Hz.' },
  { voiceRange: 'high', baselineHz: 120, floor: 80, ceiling: 170, suggestedMudCutHz: 300, why: 'A high voice sits well above 150 Hz, so the low cut can go higher and clear more rumble.' },
];

const NO_MIC_NOTES = { ifYouHear: [], suggestedCut: null };

export const MIC_MODELS: MicModel[] = [
  {
    id: 'sm58',
    label: 'Shure SM58',
    kind: 'dynamic',
    lowCutOffsetHz: 0,
    ...NO_MIC_NOTES,
    wedgeNote: 'Cardioid: put the wedge directly behind the mic, in line with the handle.',
    why: 'The reference mic these values assume.',
  },
  {
    id: 'beta58a',
    label: 'Shure Beta 58A',
    kind: 'dynamic',
    lowCutOffsetHz: 0,
    suggestedCut: null,
    ifYouHear: [hear('Bright or edgy compared with the other vocal mics', 'Cut 2 dB around 4 to 5 kHz, wide Q. This mic has a stronger presence lift.')],
    wedgeNote: 'Supercardioid: it rejects best at the sides of the back, not straight behind. Put the wedge off to one side behind the singer, not directly behind the mic.',
    why: 'Brighter than an SM58 and with a tighter pickup pattern.',
  },
  {
    id: 'e835',
    label: 'Sennheiser e835',
    kind: 'dynamic',
    lowCutOffsetHz: 0,
    ...NO_MIC_NOTES,
    wedgeNote: 'Cardioid: put the wedge directly behind the mic, in line with the handle.',
    why: 'Similar to an SM58 with a slightly more open top end.',
  },
  {
    id: 'e935',
    label: 'Sennheiser e935',
    kind: 'dynamic',
    lowCutOffsetHz: 0,
    ...NO_MIC_NOTES,
    wedgeNote: 'Cardioid: put the wedge directly behind the mic, in line with the handle.',
    why: 'A fuller, hotter-output cardioid dynamic. Expect to need less preamp gain.',
  },
  {
    id: 'condenserHandheld',
    label: 'Handheld condenser',
    kind: 'condenser',
    lowCutOffsetHz: 10,
    suggestedCut: null,
    ifYouHear: [hear('Feedback starts earlier than on the other vocal mics', 'Lower this singer\'s wedge send first. Condensers pick up more of the stage.')],
    wedgeNote: 'Condensers pick up more of the stage. Keep the wedge level lower than for a dynamic mic. Needs phantom power (rehearsal only).',
    why: 'More sensitive and more detailed, so it also hears more rumble and more stage sound.',
  },
  {
    id: 'other',
    label: 'Other',
    kind: 'dynamic',
    lowCutOffsetHz: 0,
    ...NO_MIC_NOTES,
    wedgeNote: 'Check the mic\'s pickup pattern to place the wedge in its quietest direction.',
    why: 'Unknown mic: the SM58 values are used as the starting point.',
  },
];

/** The optional "mud" cut every vocal gets, positioned by voice range. */
export function buildVocalMudCut(frequencyHz: number) {
  return cut(
    'Mud',
    frequencyHz,
    -2,
    'medium',
    'Close-held mics build up low-mids. A small cut here often clears the voice.',
    'Only keep it if the voice sounds clearer and not thinner with the cut in.',
  );
}
