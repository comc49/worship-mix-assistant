/**
 * A compressor and a gate/expander written to follow the parameter definitions in the
 * WING user manual (section 11.2 Dynamics):
 *
 * - THR, RATIO and KNEE shape how much gain reduction is wanted for a given input level.
 * - ATTACK is "the time it takes to apply approximately two-thirds of the targeted gain reduction".
 * - HOLD is the "amount of time in ms until the release phase is engaged".
 * - RELEASE is the "time taken to restore approximately two-thirds of the applied gain reduction".
 * - The gate adds RANGE ("the maximum amount of gain reduction") and ACCENT ("briefly boosts
 *   the gain when the gate/expander opens").
 *
 * This is a teaching model, not Behringer's code: the manual defines what each control means,
 * not the exact curves, ranges or detector inside the console. It will not null against a real WING.
 *
 * Pure functions over sample arrays, with no browser audio API, so they can be unit tested.
 */

export type DetectorMode = 'peak' | 'rms';

export interface CompressorSettings {
  thresholdDb: number;
  /** 4 means 4:1. */
  ratio: number;
  /** Width in dB of the soft transition around the threshold. 0 is a hard knee. */
  kneeDb: number;
  attackMs: number;
  holdMs: number;
  releaseMs: number;
  makeupGainDb: number;
  detector: DetectorMode;
}

export interface GateSettings {
  thresholdDb: number;
  /** Below the threshold, every dB of input becomes this many dB of output. GATE_RATIO or more is a plain gate. */
  ratio: number;
  /** The most the gate will ever turn the signal down, in dB. */
  rangeDb: number;
  attackMs: number;
  holdMs: number;
  releaseMs: number;
  /** 0 to 100. How strongly the gain is briefly boosted when the gate opens. */
  accentPercent: number;
}

export interface DynamicsResult {
  output: Float32Array;
  /** Gain reduction per sample in dB. 6 means the signal is turned down by 6 dB at that moment. */
  gainReductionDb: Float32Array;
}

/** At or above this ratio the gate applies its full RANGE at once instead of a proportional amount. */
export const GATE_RATIO = 100;

const SILENCE_DB = -120;
/** The level detector lets go over this time, so it follows the loudness of a note and not each cycle of its wave. */
const DETECTOR_FALL_MS = 10;
const RMS_WINDOW_MS = 10;
const ACCENT_MAX_BOOST_DB = 6;
const ACCENT_DECAY_MS = 25;

export function toDb(linear: number): number {
  if (linear <= 0.000001) {
    return SILENCE_DB;
  }
  return 20 * Math.log10(linear);
}

export function fromDb(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * The smoothing factor for a one-pole filter that covers about two-thirds (63%) of the
 * distance to its target in `timeMs`. That matches the manual's wording for ATTACK and RELEASE.
 */
function smoothingFor(timeMs: number, sampleRate: number): number {
  const samples = (timeMs / 1000) * sampleRate;
  if (samples < 1) {
    return 0;
  }
  return Math.exp(-1 / samples);
}

/** Follows the level of a signal in dB, as a peak or as an RMS (average) reading. */
class LevelDetector {
  private peak = 0;
  private meanSquare = 0;
  private readonly peakFall: number;
  private readonly rmsSmoothing: number;

  constructor(
    private readonly mode: DetectorMode,
    sampleRate: number,
  ) {
    this.peakFall = smoothingFor(DETECTOR_FALL_MS, sampleRate);
    this.rmsSmoothing = smoothingFor(RMS_WINDOW_MS, sampleRate);
  }

  next(sample: number): number {
    if (this.mode === 'rms') {
      this.meanSquare = this.rmsSmoothing * this.meanSquare + (1 - this.rmsSmoothing) * sample * sample;
      return toDb(Math.sqrt(this.meanSquare));
    }
    const magnitude = Math.abs(sample);
    // Rises at once, falls slowly.
    this.peak = magnitude > this.peak ? magnitude : this.peak * this.peakFall;
    return toDb(this.peak);
  }
}

/**
 * How much gain reduction the compressor wants for an input level, before attack and release.
 * With a knee, the ratio grows gradually around the threshold instead of starting abruptly.
 */
export function compressorTargetReductionDb(levelDb: number, settings: CompressorSettings): number {
  const over = levelDb - settings.thresholdDb;
  const slope = 1 - 1 / settings.ratio;
  const knee = settings.kneeDb;

  if (knee > 0) {
    const belowKnee = over <= -knee / 2;
    if (belowKnee) {
      return 0;
    }
    const insideKnee = over < knee / 2;
    if (insideKnee) {
      const intoKnee = over + knee / 2;
      return (slope * intoKnee * intoKnee) / (2 * knee);
    }
  }
  if (over <= 0) {
    return 0;
  }
  return slope * over;
}

export function runCompressor(input: Float32Array, sampleRate: number, settings: CompressorSettings): DynamicsResult {
  const output = new Float32Array(input.length);
  const gainReductionDb = new Float32Array(input.length);
  const detector = new LevelDetector(settings.detector, sampleRate);
  const attack = smoothingFor(settings.attackMs, sampleRate);
  const release = smoothingFor(settings.releaseMs, sampleRate);
  const holdSamples = Math.round((settings.holdMs / 1000) * sampleRate);

  let reduction = 0;
  let holdRemaining = 0;

  for (let index = 0; index < input.length; index = index + 1) {
    const levelDb = detector.next(input[index]);
    const target = compressorTargetReductionDb(levelDb, settings);

    const needsMoreReduction = target > reduction;
    if (needsMoreReduction) {
      // Attack: move toward the wanted reduction, and restart the hold time.
      reduction = target + attack * (reduction - target);
      holdRemaining = holdSamples;
    } else if (holdRemaining > 0) {
      // Hold: keep the reduction where it is until the hold time has passed.
      holdRemaining = holdRemaining - 1;
    } else {
      // Release: let the gain come back.
      reduction = target + release * (reduction - target);
    }

    gainReductionDb[index] = reduction;
    output[index] = input[index] * fromDb(settings.makeupGainDb - reduction);
  }
  return { output, gainReductionDb };
}

/** How much gain reduction the gate wants for an input level, before attack, hold and release. */
export function gateTargetReductionDb(levelDb: number, settings: GateSettings): number {
  const below = settings.thresholdDb - levelDb;
  if (below <= 0) {
    return 0;
  }
  const isPlainGate = settings.ratio >= GATE_RATIO;
  if (isPlainGate) {
    // Noise gate: "an immediate, fixed gain reduction".
    return settings.rangeDb;
  }
  // Expander: "a proportional gain reduction", never more than RANGE.
  const proportional = below * (settings.ratio - 1);
  return Math.min(settings.rangeDb, proportional);
}

export function runGate(input: Float32Array, sampleRate: number, settings: GateSettings): DynamicsResult {
  const output = new Float32Array(input.length);
  const gainReductionDb = new Float32Array(input.length);
  const detector = new LevelDetector('peak', sampleRate);
  // On a gate, ATTACK is how fast the gain is restored (opening) and RELEASE how fast it is taken away (closing).
  const attack = smoothingFor(settings.attackMs, sampleRate);
  const release = smoothingFor(settings.releaseMs, sampleRate);
  const accentDecay = smoothingFor(ACCENT_DECAY_MS, sampleRate);
  const holdSamples = Math.round((settings.holdMs / 1000) * sampleRate);
  const accentBoostDb = (settings.accentPercent / 100) * ACCENT_MAX_BOOST_DB;

  // The gate starts closed, as it would on a silent channel.
  let reduction = gateTargetReductionDb(SILENCE_DB, settings);
  let holdRemaining = 0;
  let isOpen = false;
  let accent = 0;

  for (let index = 0; index < input.length; index = index + 1) {
    const levelDb = detector.next(input[index]);
    const target = gateTargetReductionDb(levelDb, settings);

    const shouldOpen = target < reduction;
    if (shouldOpen) {
      if (!isOpen && target === 0) {
        // The gate has just opened: start the accent boost.
        isOpen = true;
        accent = 1;
      }
      reduction = target + attack * (reduction - target);
      holdRemaining = holdSamples;
    } else if (holdRemaining > 0) {
      holdRemaining = holdRemaining - 1;
    } else {
      reduction = target + release * (reduction - target);
      if (target > 0) {
        isOpen = false;
      }
    }

    const boostDb = accentBoostDb * accent;
    accent = accent * accentDecay;

    gainReductionDb[index] = reduction;
    output[index] = input[index] * fromDb(boostDb - reduction);
  }
  return { output, gainReductionDb };
}

/** The average level of a signal in dB (RMS over the whole array). */
export function measureRmsDb(samples: Float32Array): number {
  if (samples.length === 0) {
    return SILENCE_DB;
  }
  let sumOfSquares = 0;
  for (const sample of samples) {
    sumOfSquares = sumOfSquares + sample * sample;
  }
  return toDb(Math.sqrt(sumOfSquares / samples.length));
}

export function measurePeakDb(samples: Float32Array): number {
  let peak = 0;
  for (const sample of samples) {
    const magnitude = Math.abs(sample);
    if (magnitude > peak) {
      peak = magnitude;
    }
  }
  return toDb(peak);
}

export function findMaximum(values: Float32Array): number {
  let maximum = 0;
  for (const value of values) {
    if (value > maximum) {
      maximum = value;
    }
  }
  return maximum;
}
