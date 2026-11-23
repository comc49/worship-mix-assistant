import { CompressorSettings, GATE_RATIO, GateSettings } from '../../core/audio/dynamics';
import { PracticeSoundId } from '../../core/audio/practice-sounds';

/**
 * The sliders of the lab and its presets. Control names follow the WING manual (THR, RATIO, KNEE,
 * ATTACK, HOLD, RELEASE, GAIN, RANGE, ACCENT). The ranges are this lab's own: the manual gives none.
 */

/** Slider positions run from 0 to this number; each control maps that onto its own range. */
export const SLIDER_STEPS = 1000;

export type ControlScale = 'linear' | 'logarithmic';

export interface ControlSpec<Key extends string> {
  key: Key;
  label: string;
  /** One line under the slider: what turning it does. */
  hint: string;
  min: number;
  max: number;
  scale: ControlScale;
  /** Values are rounded to a multiple of this. */
  step: number;
  unit: string;
  /** How many of the grid's six columns the slider takes. 3 is half the width. Left out means 3. */
  span?: 2 | 3 | 6;
}

export type CompressorControlKey = 'thresholdDb' | 'ratio' | 'kneeDb' | 'attackMs' | 'holdMs' | 'releaseMs' | 'makeupGainDb';
export type EqControlKey =
  | 'lowCutHz'
  | 'lowShelfHz'
  | 'lowShelfGainDb'
  | 'mid1Hz'
  | 'mid1GainDb'
  | 'mid1Q'
  | 'mid2Hz'
  | 'mid2GainDb'
  | 'mid2Q'
  | 'highShelfHz'
  | 'highShelfGainDb';
export type DynamicEqControlKey = 'frequencyHz' | 'q' | 'gainDb' | 'thresholdDb' | 'ratio' | 'attackMs' | 'releaseMs';
export type GateControlKey = 'thresholdDb' | 'ratio' | 'rangeDb' | 'attackMs' | 'holdMs' | 'releaseMs' | 'accentPercent';

export const COMPRESSOR_CONTROLS: ControlSpec<CompressorControlKey>[] = [
  { key: 'thresholdDb', label: 'THR', hint: 'Lower it and the compressor works on more of the sound.', min: -60, max: 0, scale: 'linear', step: 0.5, unit: 'dB' },
  { key: 'ratio', label: 'RATIO', hint: 'Higher holds loud moments back more firmly.', min: 1.1, max: 20, scale: 'logarithmic', step: 0.1, unit: ':1' },
  { key: 'kneeDb', label: 'KNEE', hint: 'Higher makes the compressor ease in around the threshold.', min: 0, max: 12, scale: 'linear', step: 1, unit: 'dB' },
  { key: 'attackMs', label: 'ATTACK', hint: 'Slower lets the start of each note through.', min: 0.1, max: 200, scale: 'logarithmic', step: 0.1, unit: 'ms' },
  { key: 'holdMs', label: 'HOLD', hint: 'How long it waits before it starts letting go.', min: 0, max: 500, scale: 'linear', step: 5, unit: 'ms' },
  { key: 'releaseMs', label: 'RELEASE', hint: 'Faster recovers sooner. Too fast and you hear pumping.', min: 5, max: 2000, scale: 'logarithmic', step: 1, unit: 'ms' },
  { key: 'makeupGainDb', label: 'GAIN', hint: 'Makeup gain: turns everything back up after compression.', min: -6, max: 18, scale: 'linear', step: 0.5, unit: 'dB' },
];

export const GATE_CONTROLS: ControlSpec<GateControlKey>[] = [
  { key: 'thresholdDb', label: 'THR', hint: 'How loud a hit must be to open the gate.', min: -70, max: 0, scale: 'linear', step: 0.5, unit: 'dB' },
  { key: 'ratio', label: 'RATIO', hint: 'Low is a gentle expander. All the way up is a plain gate.', min: 1.2, max: GATE_RATIO, scale: 'logarithmic', step: 0.1, unit: ':1' },
  { key: 'rangeDb', label: 'RANGE', hint: 'How far it turns the mic down when closed.', min: 3, max: 60, scale: 'linear', step: 1, unit: 'dB' },
  { key: 'attackMs', label: 'ATTACK', hint: 'How fast it opens. Slow loses the start of the hit.', min: 0.1, max: 50, scale: 'logarithmic', step: 0.1, unit: 'ms' },
  { key: 'holdMs', label: 'HOLD', hint: 'How long it stays open after the hit drops away.', min: 0, max: 500, scale: 'linear', step: 5, unit: 'ms' },
  { key: 'releaseMs', label: 'RELEASE', hint: 'How slowly it closes after the hold time.', min: 5, max: 2000, scale: 'logarithmic', step: 1, unit: 'ms' },
  { key: 'accentPercent', label: 'ACCENT', hint: 'A brief boost as it opens, to restore the start of the hit.', min: 0, max: 100, scale: 'linear', step: 5, unit: '%' },
];

/** Laid out like the EQ itself: the low cut on top, then one row per band. */
export const EQ_CONTROLS: ControlSpec<EqControlKey>[] = [
  { key: 'lowCutHz', label: 'LO CUT FREQ', hint: 'Everything below this is removed. Raise it until the sound just starts to thin, then back off.', min: 20, max: 1000, scale: 'logarithmic', step: 5, unit: 'Hz', span: 6 },
  { key: 'lowShelfHz', label: 'L (low shelf)', hint: '', min: 40, max: 500, scale: 'logarithmic', step: 5, unit: 'Hz', span: 3 },
  { key: 'lowShelfGainDb', label: 'GAIN', hint: '', min: -15, max: 15, scale: 'linear', step: 0.5, unit: 'dB', span: 3 },
  { key: 'mid1Hz', label: 'MID 1', hint: '', min: 80, max: 2000, scale: 'logarithmic', step: 5, unit: 'Hz', span: 2 },
  { key: 'mid1GainDb', label: 'GAIN', hint: '', min: -15, max: 15, scale: 'linear', step: 0.5, unit: 'dB', span: 2 },
  { key: 'mid1Q', label: 'Q', hint: '', min: 0.3, max: 10, scale: 'logarithmic', step: 0.1, unit: '', span: 2 },
  { key: 'mid2Hz', label: 'MID 2', hint: '', min: 500, max: 12000, scale: 'logarithmic', step: 10, unit: 'Hz', span: 2 },
  { key: 'mid2GainDb', label: 'GAIN', hint: '', min: -15, max: 15, scale: 'linear', step: 0.5, unit: 'dB', span: 2 },
  { key: 'mid2Q', label: 'Q', hint: '', min: 0.3, max: 10, scale: 'logarithmic', step: 0.1, unit: '', span: 2 },
  { key: 'highShelfHz', label: 'H (high shelf)', hint: '', min: 2000, max: 16000, scale: 'logarithmic', step: 50, unit: 'Hz', span: 3 },
  { key: 'highShelfGainDb', label: 'GAIN', hint: '', min: -15, max: 15, scale: 'linear', step: 0.5, unit: 'dB', span: 3 },
];

export const DYNAMIC_EQ_CONTROLS: ControlSpec<DynamicEqControlKey>[] = [
  { key: 'frequencyHz', label: 'FREQ', hint: 'Where the problem is.', min: 60, max: 12000, scale: 'logarithmic', step: 10, unit: 'Hz' },
  { key: 'q', label: 'Q', hint: 'Higher is a narrower band.', min: 0.3, max: 10, scale: 'logarithmic', step: 0.1, unit: '' },
  { key: 'gainDb', label: 'GAIN', hint: 'The most it will ever cut (negative) or boost (positive).', min: -18, max: 18, scale: 'linear', step: 0.5, unit: 'dB' },
  { key: 'thresholdDb', label: 'THRESHOLD', hint: 'How loud the band must get before it acts.', min: -60, max: 0, scale: 'linear', step: 0.5, unit: 'dB' },
  { key: 'ratio', label: 'RATIO', hint: 'How quickly the change grows past the threshold.', min: 1.1, max: 20, scale: 'logarithmic', step: 0.1, unit: ':1' },
  { key: 'attackMs', label: 'ATTACK', hint: 'How fast the change is applied.', min: 0.1, max: 200, scale: 'logarithmic', step: 0.1, unit: 'ms' },
  { key: 'releaseMs', label: 'RELEASE', hint: 'How fast the band goes back to flat.', min: 5, max: 2000, scale: 'logarithmic', step: 1, unit: 'ms', span: 6 },
];

function roundToStep(value: number, step: number): number {
  const rounded = Math.round(value / step) * step;
  // Avoid results like 0.30000000000000004.
  return Math.round(rounded * 1000) / 1000;
}

/** The value a slider position (0 to SLIDER_STEPS) stands for. */
export function positionToValue(position: number, spec: ControlSpec<string>): number {
  const fraction = Math.min(1, Math.max(0, position / SLIDER_STEPS));
  let value: number;
  if (spec.scale === 'logarithmic') {
    value = spec.min * Math.pow(spec.max / spec.min, fraction);
  } else {
    value = spec.min + (spec.max - spec.min) * fraction;
  }
  const rounded = roundToStep(value, spec.step);
  return Math.min(spec.max, Math.max(spec.min, rounded));
}

/** The slider position (0 to SLIDER_STEPS) that shows a value. */
export function valueToPosition(value: number, spec: ControlSpec<string>): number {
  const clamped = Math.min(spec.max, Math.max(spec.min, value));
  let fraction: number;
  if (spec.scale === 'logarithmic') {
    fraction = Math.log(clamped / spec.min) / Math.log(spec.max / spec.min);
  } else {
    fraction = (clamped - spec.min) / (spec.max - spec.min);
  }
  return Math.round(fraction * SLIDER_STEPS);
}

export function formatControlValue(value: number, spec: ControlSpec<string>): string {
  const isGateRatioAtMaximum = spec.key === 'ratio' && spec.max === GATE_RATIO && value >= GATE_RATIO;
  if (isGateRatioAtMaximum) {
    return 'GATE';
  }
  if (spec.unit === ':1') {
    return `${value}:1`;
  }
  if (spec.unit === '') {
    return `${value}`;
  }
  if (spec.unit === 'Hz' && value >= 1000) {
    return `${Math.round(value / 10) / 100} kHz`;
  }
  return `${value} ${spec.unit}`;
}

export interface CompressorPreset {
  id: string;
  label: string;
  sound: PracticeSoundId;
  settings: CompressorSettings;
  listenFor: string;
}

export interface GatePreset {
  id: string;
  label: string;
  sound: PracticeSoundId;
  settings: GateSettings;
  listenFor: string;
}

export const DEFAULT_COMPRESSOR: CompressorSettings = {
  thresholdDb: -20,
  ratio: 4,
  kneeDb: 0,
  attackMs: 20,
  holdMs: 0,
  releaseMs: 150,
  makeupGainDb: 0,
  detector: 'peak',
};

export const DEFAULT_GATE: GateSettings = {
  // Between the loudest bleed (about -13 dB) and the softest snare hit (about -6 dB) of the practice sound.
  thresholdDb: -10,
  ratio: GATE_RATIO,
  rangeDb: 30,
  attackMs: 0.5,
  holdMs: 80,
  releaseMs: 120,
  accentPercent: 0,
};

export const COMPRESSOR_PRESETS: CompressorPreset[] = [
  {
    id: 'evenBass',
    label: 'Even out the bass',
    sound: 'unevenBass',
    settings: { ...DEFAULT_COMPRESSOR, thresholdDb: -24, ratio: 4, attackMs: 25, releaseMs: 150 },
    listenFor: 'Switch Bypass on and off. Bypassed, the second and fourth notes almost disappear. Compressed, every note is closer to the same level. Then press "Match loudness" and compare again.',
  },
  {
    id: 'gentleVoice',
    label: 'Gentle on the voice',
    sound: 'unevenVoice',
    settings: { ...DEFAULT_COMPRESSOR, thresholdDb: -22, ratio: 3, attackMs: 15, releaseMs: 120 },
    listenFor: 'The loud phrase is held back and the quiet phrase is untouched. Watch the meter: it should only move on the loud phrase.',
  },
  {
    id: 'attackTooFast',
    label: 'Attack too fast (dull)',
    sound: 'drumLoop',
    settings: { ...DEFAULT_COMPRESSOR, thresholdDb: -18, ratio: 6, attackMs: 0.2, releaseMs: 120 },
    listenFor: 'The front of every kick and snare is flattened, so the loop loses its punch. Now slide ATTACK up to about 30 ms and hear the hits come back.',
  },
  {
    id: 'releaseTooFast',
    label: 'Release too fast (pumping)',
    sound: 'drumLoop',
    settings: { ...DEFAULT_COMPRESSOR, thresholdDb: -22, ratio: 8, attackMs: 2, releaseMs: 30 },
    listenFor: 'The hi-hat swells up between the drum hits: that breathing is "pumping". Slide RELEASE up to about 300 ms and it steadies.',
  },
  {
    id: 'squashed',
    label: 'Squashed',
    sound: 'unevenVoice',
    settings: { ...DEFAULT_COMPRESSOR, thresholdDb: -40, ratio: 12, attackMs: 1, releaseMs: 80, makeupGainDb: 10 },
    listenFor: 'Quiet and loud are now the same, and the life is gone. On a stage this much makeup gain is also what makes wedges feed back.',
  },
];

export const GATE_PRESETS: GatePreset[] = [
  {
    id: 'tightSnare',
    label: 'Clean up the snare mic',
    sound: 'snareWithBleed',
    settings: { ...DEFAULT_GATE },
    listenFor: 'Switch Bypass on and off. Bypassed, the hi-hat ticks all the way through. Gated, you hear it only while a snare hit holds the gate open.',
  },
  {
    id: 'thresholdTooHigh',
    label: 'Threshold too high',
    sound: 'kickWithBleed',
    settings: { ...DEFAULT_GATE, thresholdDb: -6, holdMs: 100 },
    listenFor: 'The soft kick hits are missing: they never reach the threshold. Lower THR until every kick opens the gate and the snare bleed still does not.',
  },
  {
    id: 'noHold',
    label: 'No hold, fast release (chopped)',
    sound: 'kickWithBleed',
    settings: { ...DEFAULT_GATE, thresholdDb: -12, holdMs: 0, releaseMs: 10 },
    listenFor: 'Each kick is cut off right after the click, so its low "thump" is gone. Raise HOLD to about 100 ms and RELEASE to about 150 ms.',
  },
  {
    id: 'slowAttack',
    label: 'Attack too slow',
    sound: 'snareWithBleed',
    settings: { ...DEFAULT_GATE, attackMs: 30 },
    listenFor: 'The crack at the start of each snare hit is lost, because the gate is still opening. Bring ATTACK back down, or try ACCENT.',
  },
  {
    id: 'gentleExpander',
    label: 'Gentle expander',
    sound: 'snareWithBleed',
    settings: { ...DEFAULT_GATE, ratio: 2, rangeDb: 12, releaseMs: 250 },
    listenFor: 'The bleed is turned down, not removed. This is more natural and more forgiving when the threshold is not perfect.',
  },
];
