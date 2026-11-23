import { DynamicEqMode, DynamicEqSettings, runDynamicEq } from '../../core/audio/dynamic-eq';
import { CompressorSettings, DetectorMode, GateSettings, runCompressor, runGate } from '../../core/audio/dynamics';
import { EqSettings, eqResponseDb, runEq } from '../../core/audio/eq';
import { LOW_CUT_SLOPES, LowCutSlope } from '../../core/audio/filters';
import { PracticeSoundId } from '../../core/audio/practice-sounds';
import {
  COMPRESSOR_CONTROLS,
  COMPRESSOR_PRESETS,
  ControlSpec,
  DEFAULT_COMPRESSOR,
  DEFAULT_GATE,
  DYNAMIC_EQ_CONTROLS,
  EQ_CONTROLS,
  GATE_CONTROLS,
  GATE_PRESETS,
} from './lab-controls';

/**
 * The four processors of the Sound lab, described in one shape so the screen can treat them alike:
 * which sliders and switches each has, its starting values, its presets, and how to run it.
 *
 * The screen keeps a processor's settings as plain values (numbers for sliders, text for switches).
 * Each processor turns those into its own typed settings before running the tested code in core/audio.
 */

export type ProcessorId = 'compressor' | 'gate' | 'eq' | 'dynamicEq';

export type LabValues = Record<string, number | string>;

export interface ChoiceSpec {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface LabPreset {
  id: string;
  label: string;
  sound: PracticeSoundId;
  values: LabValues;
  listenFor: string;
}

export interface LabRun {
  output: Float32Array;
  /** How many dB the processor is changing the level at each sample, as a positive number. null when that has no meaning (a fixed EQ). */
  changeDb: Float32Array | null;
}

export interface LabProcessor {
  id: ProcessorId;
  label: string;
  controls: ControlSpec<string>[];
  choices: ChoiceSpec[];
  defaults: LabValues;
  presets: LabPreset[];
  defaultSound: PracticeSoundId;
  /** 'waveform' draws the sound before and after; 'curve' draws the EQ curve. */
  picture: 'waveform' | 'curve';
  /** What the moving line and meter show, for example "gain reduction". null when there is none. */
  changeName: string | null;
  /** The change that fills the whole meter. */
  changeScaleDb: number;
  /** The slider that "Match loudness" sets. null when the processor has no makeup gain. */
  makeupKey: string | null;
  run(input: Float32Array, sampleRate: number, values: LabValues): LabRun;
  /** The threshold to draw over the waveform, when it can be compared with the waveform. */
  thresholdDb(values: LabValues): number | null;
  /** The EQ curve at the given frequencies, for a 'curve' picture. */
  curveDb(values: LabValues, frequenciesHz: number[], sampleRate: number): number[] | null;
}

function readNumber(values: LabValues, key: string): number {
  const value = values[key];
  if (typeof value !== 'number') {
    throw new Error(`Lab value "${key}" should be a number.`);
  }
  return value;
}

function readText(values: LabValues, key: string): string {
  const value = values[key];
  if (typeof value !== 'string') {
    throw new Error(`Lab value "${key}" should be text.`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Compressor
// ---------------------------------------------------------------------------

function toCompressorSettings(values: LabValues): CompressorSettings {
  const detector: DetectorMode = readText(values, 'detector') === 'rms' ? 'rms' : 'peak';
  return {
    thresholdDb: readNumber(values, 'thresholdDb'),
    ratio: readNumber(values, 'ratio'),
    kneeDb: readNumber(values, 'kneeDb'),
    attackMs: readNumber(values, 'attackMs'),
    holdMs: readNumber(values, 'holdMs'),
    releaseMs: readNumber(values, 'releaseMs'),
    makeupGainDb: readNumber(values, 'makeupGainDb'),
    detector,
  };
}

const COMPRESSOR: LabProcessor = {
  id: 'compressor',
  label: 'Compressor',
  controls: COMPRESSOR_CONTROLS,
  choices: [{ key: 'detector', label: 'DETECTOR', options: [{ value: 'peak', label: 'PEAK' }, { value: 'rms', label: 'RMS' }] }],
  defaults: { ...DEFAULT_COMPRESSOR },
  presets: COMPRESSOR_PRESETS.map((preset) => ({ id: preset.id, label: preset.label, sound: preset.sound, values: { ...preset.settings }, listenFor: preset.listenFor })),
  defaultSound: 'unevenBass',
  picture: 'waveform',
  changeName: 'gain reduction',
  changeScaleDb: 24,
  makeupKey: 'makeupGainDb',
  run(input, sampleRate, values) {
    const result = runCompressor(input, sampleRate, toCompressorSettings(values));
    return { output: result.output, changeDb: result.gainReductionDb };
  },
  thresholdDb: (values) => readNumber(values, 'thresholdDb'),
  curveDb: () => null,
};

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

function toGateSettings(values: LabValues): GateSettings {
  return {
    thresholdDb: readNumber(values, 'thresholdDb'),
    ratio: readNumber(values, 'ratio'),
    rangeDb: readNumber(values, 'rangeDb'),
    attackMs: readNumber(values, 'attackMs'),
    holdMs: readNumber(values, 'holdMs'),
    releaseMs: readNumber(values, 'releaseMs'),
    accentPercent: readNumber(values, 'accentPercent'),
  };
}

const GATE: LabProcessor = {
  id: 'gate',
  label: 'Gate',
  controls: GATE_CONTROLS,
  choices: [],
  defaults: { ...DEFAULT_GATE },
  presets: GATE_PRESETS.map((preset) => ({ id: preset.id, label: preset.label, sound: preset.sound, values: { ...preset.settings }, listenFor: preset.listenFor })),
  defaultSound: 'snareWithBleed',
  picture: 'waveform',
  changeName: 'gain reduction',
  changeScaleDb: 60,
  makeupKey: null,
  run(input, sampleRate, values) {
    const result = runGate(input, sampleRate, toGateSettings(values));
    return { output: result.output, changeDb: result.gainReductionDb };
  },
  thresholdDb: (values) => readNumber(values, 'thresholdDb'),
  curveDb: () => null,
};

// ---------------------------------------------------------------------------
// Low cut and EQ
// ---------------------------------------------------------------------------

function toLowCutSlope(text: string): LowCutSlope {
  const found = LOW_CUT_SLOPES.find((slope) => String(slope) === text);
  return found ?? 12;
}

function toEqSettings(values: LabValues): EqSettings {
  return {
    lowCutOn: readText(values, 'lowCutOn') === 'on',
    lowCutHz: readNumber(values, 'lowCutHz'),
    lowCutSlope: toLowCutSlope(readText(values, 'lowCutSlope')),
    lowShelfHz: readNumber(values, 'lowShelfHz'),
    lowShelfGainDb: readNumber(values, 'lowShelfGainDb'),
    mid1Hz: readNumber(values, 'mid1Hz'),
    mid1GainDb: readNumber(values, 'mid1GainDb'),
    mid1Q: readNumber(values, 'mid1Q'),
    mid2Hz: readNumber(values, 'mid2Hz'),
    mid2GainDb: readNumber(values, 'mid2GainDb'),
    mid2Q: readNumber(values, 'mid2Q'),
    highShelfHz: readNumber(values, 'highShelfHz'),
    highShelfGainDb: readNumber(values, 'highShelfGainDb'),
  };
}

const DEFAULT_EQ: LabValues = {
  lowCutOn: 'off',
  lowCutHz: 100,
  lowCutSlope: '18',
  lowShelfHz: 120,
  lowShelfGainDb: 0,
  mid1Hz: 300,
  mid1GainDb: 0,
  mid1Q: 1.4,
  mid2Hz: 3000,
  mid2GainDb: 0,
  mid2Q: 1.4,
  highShelfHz: 8000,
  highShelfGainDb: 0,
};

const EQ_PRESETS: LabPreset[] = [
  {
    id: 'removeRumble',
    label: 'Low cut: remove the rumble',
    sound: 'voiceWithRumble',
    values: { ...DEFAULT_EQ, lowCutOn: 'on', lowCutHz: 110 },
    listenFor: 'Switch Bypass on and off. The low hum and the thump at the start of each phrase disappear, and the voice itself does not change. That is a low cut doing its job.',
  },
  {
    id: 'lowCutTooHigh',
    label: 'Low cut too high (thin)',
    sound: 'voiceWithRumble',
    values: { ...DEFAULT_EQ, lowCutOn: 'on', lowCutHz: 450 },
    listenFor: 'The rumble is gone, but so is the body of the voice: it sounds like a telephone. Slide LO CUT FREQ down until the voice is full again and the rumble is still gone.',
  },
  {
    id: 'slopes',
    label: 'Gentle or steep slope',
    sound: 'voiceWithRumble',
    values: { ...DEFAULT_EQ, lowCutOn: 'on', lowCutHz: 110, lowCutSlope: '6' },
    listenFor: 'At 6 dB per octave some rumble still gets through. Step LC SLOPE up to 12, 18 and 24 and hear it cut harder below the same frequency. Watch the curve get steeper.',
  },
  {
    id: 'findTheMud',
    label: 'Find the mud by sweeping a cut',
    sound: 'muddyMix',
    values: { ...DEFAULT_EQ, mid1Hz: 900, mid1GainDb: -8, mid1Q: 1.4 },
    listenFor: 'MID 1 is cutting 8 dB, but in the wrong place. Slide the MID 1 frequency down slowly. Somewhere around 250 to 300 Hz the mix suddenly clears. That is how you find a problem: sweep a cut, never a boost.',
  },
  {
    id: 'narrowOrWide',
    label: 'Narrow or wide (Q)',
    sound: 'muddyMix',
    values: { ...DEFAULT_EQ, mid1Hz: 280, mid1GainDb: -8, mid1Q: 8 },
    listenFor: 'The cut is in the right place but very narrow, so it barely helps. Slide Q down toward 1 and hear the mud clear as the band widens. Narrow is for one ringing note; wide is for tone.',
  },
  {
    id: 'tooMuchTop',
    label: 'Too much top end',
    sound: 'fullMix',
    values: { ...DEFAULT_EQ, highShelfHz: 5000, highShelfGainDb: 10 },
    listenFor: 'The cymbals and the hiss are pushed forward and it is tiring within seconds. Bring the high shelf GAIN back to 0. A boost also adds level, so it always sounds "better" at first.',
  },
];

const EQ: LabProcessor = {
  id: 'eq',
  label: 'Low cut and EQ',
  controls: EQ_CONTROLS,
  choices: [
    { key: 'lowCutOn', label: 'LO CUT', options: [{ value: 'on', label: 'ON' }, { value: 'off', label: 'OFF' }] },
    { key: 'lowCutSlope', label: 'LC SLOPE', options: LOW_CUT_SLOPES.map((slope) => ({ value: String(slope), label: `${slope}` })) },
  ],
  defaults: DEFAULT_EQ,
  presets: EQ_PRESETS,
  defaultSound: 'voiceWithRumble',
  picture: 'curve',
  changeName: null,
  changeScaleDb: 18,
  makeupKey: null,
  run(input, sampleRate, values) {
    return { output: runEq(input, sampleRate, toEqSettings(values)), changeDb: null };
  },
  thresholdDb: () => null,
  curveDb: (values, frequenciesHz, sampleRate) => eqResponseDb(toEqSettings(values), frequenciesHz, sampleRate),
};

// ---------------------------------------------------------------------------
// Dynamic EQ
// ---------------------------------------------------------------------------

function toDynamicEqSettings(values: LabValues): DynamicEqSettings {
  const mode: DynamicEqMode = readText(values, 'mode') === 'below' ? 'below' : 'above';
  return {
    frequencyHz: readNumber(values, 'frequencyHz'),
    q: readNumber(values, 'q'),
    gainDb: readNumber(values, 'gainDb'),
    thresholdDb: readNumber(values, 'thresholdDb'),
    ratio: readNumber(values, 'ratio'),
    attackMs: readNumber(values, 'attackMs'),
    releaseMs: readNumber(values, 'releaseMs'),
    mode,
  };
}

const DEFAULT_DYNAMIC_EQ: LabValues = {
  frequencyHz: 3000,
  q: 2,
  gainDb: -9,
  thresholdDb: -22,
  ratio: 4,
  attackMs: 5,
  releaseMs: 120,
  mode: 'above',
};

const DYNAMIC_EQ_PRESETS: LabPreset[] = [
  {
    id: 'harshWhenLoud',
    label: 'Harsh only when loud',
    sound: 'voiceHarshWhenLoud',
    values: { ...DEFAULT_DYNAMIC_EQ },
    listenFor: 'Watch the line: it stays flat through the quiet phrase and dips during the loud one. Switch Bypass on and off on the loud phrase and hear the bite come and go. The quiet phrase is untouched.',
  },
  {
    id: 'fixedCut',
    label: 'What a fixed EQ cut would do',
    sound: 'voiceHarshWhenLoud',
    values: { ...DEFAULT_DYNAMIC_EQ, thresholdDb: -60 },
    listenFor: 'With the threshold at the bottom the band cuts all the time, exactly like an ordinary EQ cut. The loud phrase is fixed, but the quiet phrase is now dull as well. Slide THRESHOLD back up to about -22 dB.',
  },
  {
    id: 'sharpS',
    label: 'Tame sharp "s" sounds',
    sound: 'voiceWithSharpS',
    values: { ...DEFAULT_DYNAMIC_EQ, frequencyHz: 7000, q: 1.5, gainDb: -12, thresholdDb: -26, ratio: 6, attackMs: 1, releaseMs: 60 },
    listenFor: 'The line dips only on the bursts of hiss. This is what a de-esser is: a dynamic EQ set high up, with a fast attack and release.',
  },
  {
    id: 'tooWide',
    label: 'Band too wide',
    sound: 'voiceHarshWhenLoud',
    values: { ...DEFAULT_DYNAMIC_EQ, q: 0.4, gainDb: -12 },
    listenFor: 'The band is so wide that the whole voice goes dull every time it reacts. Slide Q up toward 2 or 3 until only the harshness moves.',
  },
  {
    id: 'liftQuiet',
    label: 'Lift quiet parts (positive Gain + Below)',
    sound: 'unevenVoice',
    values: { ...DEFAULT_DYNAMIC_EQ, frequencyHz: 2500, q: 1.2, gainDb: 6, thresholdDb: -14, ratio: 3, attackMs: 20, releaseMs: 200, mode: 'below' },
    listenFor: 'Here the band boosts, and only while it is quiet: the soft phrase gets clearer, and the loud phrase is left alone so it does not turn harsh. Flip the switch to ABOVE to hear the opposite.',
  },
];

const DYNAMIC_EQ: LabProcessor = {
  id: 'dynamicEq',
  label: 'Dynamic EQ',
  controls: DYNAMIC_EQ_CONTROLS,
  choices: [{ key: 'mode', label: 'ABOVE / BELOW', options: [{ value: 'above', label: 'ABOVE' }, { value: 'below', label: 'BELOW' }] }],
  defaults: DEFAULT_DYNAMIC_EQ,
  presets: DYNAMIC_EQ_PRESETS,
  defaultSound: 'voiceHarshWhenLoud',
  picture: 'waveform',
  changeName: 'band change',
  changeScaleDb: 18,
  makeupKey: null,
  run(input, sampleRate, values) {
    const result = runDynamicEq(input, sampleRate, toDynamicEqSettings(values));
    const size = new Float32Array(result.bandGainDb.length);
    for (let index = 0; index < size.length; index = index + 1) {
      size[index] = Math.abs(result.bandGainDb[index]);
    }
    return { output: result.output, changeDb: size };
  },
  // The threshold is compared with the level inside the band, not with the whole waveform, so it is not drawn.
  thresholdDb: () => null,
  curveDb: () => null,
};

export const LAB_PROCESSORS: LabProcessor[] = [COMPRESSOR, GATE, EQ, DYNAMIC_EQ];

export function findProcessor(id: ProcessorId): LabProcessor {
  const found = LAB_PROCESSORS.find((processor) => processor.id === id);
  return found ?? COMPRESSOR;
}
