import {
  applyFilters,
  BiquadCoefficients,
  filterGainDb,
  highShelfFilter,
  LowCutSlope,
  lowCutStages,
  lowShelfFilter,
  peakingFilter,
} from './filters';

/**
 * A channel EQ laid out like the WING EQ in the manual (section 11.1): a LO CUT with a selectable
 * slope, a low shelf (L), parametric bands with GAIN, FREQ and Q, and a high shelf (H).
 * The WING has four parametric bands between its shelves; this lab has two, which is enough to practise on.
 */

export interface EqSettings {
  lowCutOn: boolean;
  lowCutHz: number;
  lowCutSlope: LowCutSlope;
  lowShelfHz: number;
  lowShelfGainDb: number;
  mid1Hz: number;
  mid1GainDb: number;
  mid1Q: number;
  mid2Hz: number;
  mid2GainDb: number;
  mid2Q: number;
  highShelfHz: number;
  highShelfGainDb: number;
}

/** Every filter stage the settings turn into, in the order the signal passes through them. */
export function buildEqStages(settings: EqSettings, sampleRate: number): BiquadCoefficients[] {
  const stages: BiquadCoefficients[] = [];
  if (settings.lowCutOn) {
    stages.push(...lowCutStages(settings.lowCutHz, settings.lowCutSlope, sampleRate));
  }
  // A band at 0 dB does nothing, so it is left out.
  if (settings.lowShelfGainDb !== 0) {
    stages.push(lowShelfFilter(settings.lowShelfHz, settings.lowShelfGainDb, sampleRate));
  }
  if (settings.mid1GainDb !== 0) {
    stages.push(peakingFilter(settings.mid1Hz, settings.mid1GainDb, settings.mid1Q, sampleRate));
  }
  if (settings.mid2GainDb !== 0) {
    stages.push(peakingFilter(settings.mid2Hz, settings.mid2GainDb, settings.mid2Q, sampleRate));
  }
  if (settings.highShelfGainDb !== 0) {
    stages.push(highShelfFilter(settings.highShelfHz, settings.highShelfGainDb, sampleRate));
  }
  return stages;
}

export function runEq(input: Float32Array, sampleRate: number, settings: EqSettings): Float32Array {
  const stages = buildEqStages(settings, sampleRate);
  if (stages.length === 0) {
    return new Float32Array(input);
  }
  return applyFilters(input, stages);
}

/** The EQ curve: how many dB the whole EQ boosts or cuts each of the given frequencies. */
export function eqResponseDb(settings: EqSettings, frequenciesHz: number[], sampleRate: number): number[] {
  const stages = buildEqStages(settings, sampleRate);
  return frequenciesHz.map((frequencyHz) => {
    let totalDb = 0;
    for (const stage of stages) {
      totalDb = totalDb + filterGainDb(stage, frequencyHz, sampleRate);
    }
    return totalDb;
  });
}
