/**
 * Second-order ("biquad") filters, the building block of every EQ band and low cut.
 * The coefficient formulas are the standard ones from Robert Bristow-Johnson's "Audio EQ Cookbook".
 * Pure functions, so they can be unit tested without a browser.
 */

export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

const TWO_PI = Math.PI * 2;
const BUTTERWORTH_Q = Math.SQRT1_2;

function normalize(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number): BiquadCoefficients {
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** A bell-shaped boost or cut around a center frequency. */
export function peakingFilter(frequencyHz: number, gainDb: number, q: number, sampleRate: number): BiquadCoefficients {
  const amplitude = Math.pow(10, gainDb / 40);
  const omega = (TWO_PI * frequencyHz) / sampleRate;
  const alpha = Math.sin(omega) / (2 * q);
  const cosine = Math.cos(omega);
  return normalize(1 + alpha * amplitude, -2 * cosine, 1 - alpha * amplitude, 1 + alpha / amplitude, -2 * cosine, 1 - alpha / amplitude);
}

/** Boosts or cuts everything below the frequency. */
export function lowShelfFilter(frequencyHz: number, gainDb: number, sampleRate: number): BiquadCoefficients {
  const amplitude = Math.pow(10, gainDb / 40);
  const omega = (TWO_PI * frequencyHz) / sampleRate;
  const cosine = Math.cos(omega);
  const alpha = (Math.sin(omega) / 2) * Math.SQRT2;
  const root = 2 * Math.sqrt(amplitude) * alpha;
  return normalize(
    amplitude * (amplitude + 1 - (amplitude - 1) * cosine + root),
    2 * amplitude * (amplitude - 1 - (amplitude + 1) * cosine),
    amplitude * (amplitude + 1 - (amplitude - 1) * cosine - root),
    amplitude + 1 + (amplitude - 1) * cosine + root,
    -2 * (amplitude - 1 + (amplitude + 1) * cosine),
    amplitude + 1 + (amplitude - 1) * cosine - root,
  );
}

/** Boosts or cuts everything above the frequency. */
export function highShelfFilter(frequencyHz: number, gainDb: number, sampleRate: number): BiquadCoefficients {
  const amplitude = Math.pow(10, gainDb / 40);
  const omega = (TWO_PI * frequencyHz) / sampleRate;
  const cosine = Math.cos(omega);
  const alpha = (Math.sin(omega) / 2) * Math.SQRT2;
  const root = 2 * Math.sqrt(amplitude) * alpha;
  return normalize(
    amplitude * (amplitude + 1 + (amplitude - 1) * cosine + root),
    -2 * amplitude * (amplitude - 1 + (amplitude + 1) * cosine),
    amplitude * (amplitude + 1 + (amplitude - 1) * cosine - root),
    amplitude + 1 - (amplitude - 1) * cosine + root,
    2 * (amplitude - 1 - (amplitude + 1) * cosine),
    amplitude + 1 - (amplitude - 1) * cosine - root,
  );
}

/** A 12 dB per octave low cut (high-pass). */
export function highPassFilter(frequencyHz: number, q: number, sampleRate: number): BiquadCoefficients {
  const omega = (TWO_PI * frequencyHz) / sampleRate;
  const alpha = Math.sin(omega) / (2 * q);
  const cosine = Math.cos(omega);
  return normalize((1 + cosine) / 2, -(1 + cosine), (1 + cosine) / 2, 1 + alpha, -2 * cosine, 1 - alpha);
}

/** A 6 dB per octave low cut, written as a biquad whose second-order terms are zero. */
export function firstOrderHighPassFilter(frequencyHz: number, sampleRate: number): BiquadCoefficients {
  const k = Math.tan((Math.PI * frequencyHz) / sampleRate);
  const scale = 1 / (1 + k);
  return { b0: scale, b1: -scale, b2: 0, a1: (k - 1) * scale, a2: 0 };
}

/** Passes only a band around the center frequency. Used to listen to one part of a sound. */
export function bandPassFilter(frequencyHz: number, q: number, sampleRate: number): BiquadCoefficients {
  const omega = (TWO_PI * frequencyHz) / sampleRate;
  const alpha = Math.sin(omega) / (2 * q);
  const cosine = Math.cos(omega);
  return normalize(alpha, 0, -alpha, 1 + alpha, -2 * cosine, 1 - alpha);
}

export type LowCutSlope = 6 | 12 | 18 | 24;

export const LOW_CUT_SLOPES: LowCutSlope[] = [6, 12, 18, 24];

/**
 * The filter stages of a low cut at a given slope in dB per octave.
 * Steeper slopes are made by running several stages in a row.
 */
export function lowCutStages(frequencyHz: number, slope: LowCutSlope, sampleRate: number): BiquadCoefficients[] {
  if (slope === 6) {
    return [firstOrderHighPassFilter(frequencyHz, sampleRate)];
  }
  if (slope === 12) {
    return [highPassFilter(frequencyHz, BUTTERWORTH_Q, sampleRate)];
  }
  if (slope === 18) {
    return [firstOrderHighPassFilter(frequencyHz, sampleRate), highPassFilter(frequencyHz, 1, sampleRate)];
  }
  // 24 dB per octave: two stages with the Q values of a fourth-order Butterworth filter.
  return [highPassFilter(frequencyHz, 0.5412, sampleRate), highPassFilter(frequencyHz, 1.3066, sampleRate)];
}

/** Runs a signal through one filter and returns the result. */
export function applyFilter(input: Float32Array, coefficients: BiquadCoefficients): Float32Array {
  const output = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let index = 0; index < input.length; index = index + 1) {
    const x0 = input[index];
    const y0 = coefficients.b0 * x0 + coefficients.b1 * x1 + coefficients.b2 * x2 - coefficients.a1 * y1 - coefficients.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    output[index] = y0;
  }
  return output;
}

export function applyFilters(input: Float32Array, stages: BiquadCoefficients[]): Float32Array {
  let signal = input;
  for (const stage of stages) {
    signal = applyFilter(signal, stage);
  }
  return signal;
}

/** How much a filter boosts or cuts a given frequency, in dB. Used to draw the EQ curve. */
export function filterGainDb(coefficients: BiquadCoefficients, frequencyHz: number, sampleRate: number): number {
  const omega = (TWO_PI * frequencyHz) / sampleRate;
  const cos1 = Math.cos(omega);
  const sin1 = Math.sin(omega);
  const cos2 = Math.cos(2 * omega);
  const sin2 = Math.sin(2 * omega);

  const numeratorReal = coefficients.b0 + coefficients.b1 * cos1 + coefficients.b2 * cos2;
  const numeratorImaginary = -(coefficients.b1 * sin1 + coefficients.b2 * sin2);
  const denominatorReal = 1 + coefficients.a1 * cos1 + coefficients.a2 * cos2;
  const denominatorImaginary = -(coefficients.a1 * sin1 + coefficients.a2 * sin2);

  const numerator = numeratorReal * numeratorReal + numeratorImaginary * numeratorImaginary;
  const denominator = denominatorReal * denominatorReal + denominatorImaginary * denominatorImaginary;
  if (numerator <= 0 || denominator <= 0) {
    return -120;
  }
  return 10 * Math.log10(numerator / denominator);
}
