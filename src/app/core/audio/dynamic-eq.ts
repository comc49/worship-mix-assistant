import { toDb } from './dynamics';
import { bandPassFilter, peakingFilter } from './filters';

/**
 * A single-band dynamic EQ, written to the parameter definitions of the WING's Triple DEQ and its
 * single-band "Dynamic EQ" (manual section 11.1): Threshold, Ratio, Attack, Release, Gain as
 * "the maximum gain adjustment", Freq, Q and the Above/Below switch.
 *
 * It is an EQ band whose gain moves by itself: it listens to how loud the sound is in its own
 * frequency range, and only then cuts or boosts there. The four combinations are in the manual:
 *   negative Gain + Above: turns the band down when it gets loud (downward compressor)
 *   negative Gain + Below: turns the band down when it is quiet (downward expander)
 *   positive Gain + Below: turns the band up when it is quiet (upward compressor)
 *   positive Gain + Above: turns the band up when it gets loud (upward expander)
 *
 * A teaching model, not Behringer's code.
 */

export type DynamicEqMode = 'above' | 'below';

export interface DynamicEqSettings {
  frequencyHz: number;
  q: number;
  /** The most the band will ever cut (negative) or boost (positive). */
  gainDb: number;
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  mode: DynamicEqMode;
}

export interface DynamicEqResult {
  output: Float32Array;
  /** The gain the band is applying at each sample, in dB. Negative is a cut. */
  bandGainDb: Float32Array;
}

/** The band's gain is recalculated this often. Short enough to be smooth, long enough to be fast. */
const BLOCK_SAMPLES = 32;
const DETECTOR_FALL_MS = 15;

function smoothingFor(timeMs: number, sampleRate: number): number {
  const samples = (timeMs / 1000) * sampleRate;
  if (samples < 1) {
    return 0;
  }
  return Math.exp(-1 / samples);
}

/**
 * How much of the Gain is wanted for a level in the band, before attack and release.
 * "At a 2:1 ratio, every 2 dB past the threshold results in only a 1 dB change at output.
 * The maximum gain adjustment is determined by the Gain parameter."
 */
export function dynamicEqTargetGainDb(bandLevelDb: number, settings: DynamicEqSettings): number {
  const pastThreshold = settings.mode === 'above' ? bandLevelDb - settings.thresholdDb : settings.thresholdDb - bandLevelDb;
  if (pastThreshold <= 0 || settings.gainDb === 0) {
    return 0;
  }
  const amount = Math.min(Math.abs(settings.gainDb), pastThreshold * (1 - 1 / settings.ratio));
  return settings.gainDb < 0 ? -amount : amount;
}

export function runDynamicEq(input: Float32Array, sampleRate: number, settings: DynamicEqSettings): DynamicEqResult {
  const output = new Float32Array(input.length);
  const bandGainDb = new Float32Array(input.length);

  // The detector hears only the band's own frequency range.
  const detectorFilter = bandPassFilter(settings.frequencyHz, settings.q, sampleRate);
  const detectorFall = smoothingFor(DETECTOR_FALL_MS, sampleRate);
  const attack = smoothingFor(settings.attackMs, sampleRate);
  const release = smoothingFor(settings.releaseMs, sampleRate);

  // Filter memory for the detector and for the band itself.
  let dx1 = 0;
  let dx2 = 0;
  let dy1 = 0;
  let dy2 = 0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  let bandPeak = 0;
  let gain = 0;
  let band = peakingFilter(settings.frequencyHz, 0, settings.q, sampleRate);

  for (let index = 0; index < input.length; index = index + 1) {
    const x0 = input[index];

    // 1. Measure how loud the band is right now.
    const detected = detectorFilter.b0 * x0 + detectorFilter.b1 * dx1 + detectorFilter.b2 * dx2 - detectorFilter.a1 * dy1 - detectorFilter.a2 * dy2;
    dx2 = dx1;
    dx1 = x0;
    dy2 = dy1;
    dy1 = detected;
    const magnitude = Math.abs(detected);
    bandPeak = magnitude > bandPeak ? magnitude : bandPeak * detectorFall;

    // 2. Move the gain toward what is wanted: with the attack time when it grows, the release time when it shrinks.
    const target = dynamicEqTargetGainDb(toDb(bandPeak), settings);
    const isGrowing = Math.abs(target) > Math.abs(gain);
    const smoothing = isGrowing ? attack : release;
    gain = target + smoothing * (gain - target);

    // 3. Every few samples, rebuild the band's filter for the new gain.
    if (index % BLOCK_SAMPLES === 0) {
      band = peakingFilter(settings.frequencyHz, gain, settings.q, sampleRate);
    }

    // 4. Run the sample through the band.
    const y0 = band.b0 * x0 + band.b1 * x1 + band.b2 * x2 - band.a1 * y1 - band.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;

    bandGainDb[index] = gain;
    output[index] = y0;
  }
  return { output, bandGainDb };
}

/** The largest change the band made, as a positive number of dB. */
export function findLargestBandChangeDb(bandGainDb: Float32Array): number {
  let largest = 0;
  for (const value of bandGainDb) {
    const size = Math.abs(value);
    if (size > largest) {
      largest = size;
    }
  }
  return largest;
}
