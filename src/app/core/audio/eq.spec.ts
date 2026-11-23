import { dynamicEqTargetGainDb, DynamicEqSettings, findLargestBandChangeDb, runDynamicEq } from './dynamic-eq';
import { measureRmsDb } from './dynamics';
import { EqSettings, eqResponseDb, runEq } from './eq';
import { applyFilter, bandPassFilter, LOW_CUT_SLOPES } from './filters';

const SAMPLE_RATE = 48000;

const FLAT: EqSettings = {
  lowCutOn: false,
  lowCutHz: 100,
  lowCutSlope: 12,
  lowShelfHz: 120,
  lowShelfGainDb: 0,
  mid1Hz: 300,
  mid1GainDb: 0,
  mid1Q: 1,
  mid2Hz: 3000,
  mid2GainDb: 0,
  mid2Q: 1,
  highShelfHz: 8000,
  highShelfGainDb: 0,
};

function sine(frequencyHz: number, levelDb: number, seconds: number): Float32Array {
  const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  const amplitude = Math.pow(10, levelDb / 20);
  for (let index = 0; index < samples.length; index = index + 1) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * frequencyHz * index) / SAMPLE_RATE);
  }
  return samples;
}

/** The level change a process makes to a steady tone, measured after it has settled. */
function changeDb(before: Float32Array, after: Float32Array): number {
  const from = Math.round(before.length / 2);
  return measureRmsDb(after.slice(from)) - measureRmsDb(before.slice(from));
}

describe('EQ', () => {
  it('does nothing when every band is at 0 dB and the low cut is off', () => {
    const tone = sine(1000, -12, 0.2);
    expect(Array.from(runEq(tone, SAMPLE_RATE, FLAT).slice(0, 500))).toEqual(Array.from(tone.slice(0, 500)));
    expect(eqResponseDb(FLAT, [50, 1000, 10000], SAMPLE_RATE)).toEqual([0, 0, 0]);
  });

  it('LO CUT: is 3 dB down at its frequency and falls at the chosen slope per octave below it', () => {
    for (const slope of LOW_CUT_SLOPES) {
      const settings = { ...FLAT, lowCutOn: true, lowCutHz: 200, lowCutSlope: slope };
      const [atCutoff, twoOctavesDown, threeOctavesDown, farAbove] = eqResponseDb(settings, [200, 50, 25, 4000], SAMPLE_RATE);
      expect(atCutoff, `${slope} at cutoff`).toBeCloseTo(-3, 0);
      // Between two and three octaves below, one more octave costs about `slope` dB.
      expect(twoOctavesDown - threeOctavesDown, `${slope} per octave`).toBeCloseTo(slope, 0);
      expect(farAbove, `${slope} above`).toBeCloseTo(0, 0);
    }
  });

  it('LO CUT: what you hear matches the curve', () => {
    const settings = { ...FLAT, lowCutOn: true, lowCutHz: 200, lowCutSlope: 24 as const };
    const rumble = sine(50, -12, 0.5);
    const voice = sine(1000, -12, 0.5);
    expect(changeDb(rumble, runEq(rumble, SAMPLE_RATE, settings))).toBeLessThan(-40);
    expect(changeDb(voice, runEq(voice, SAMPLE_RATE, settings))).toBeCloseTo(0, 1);
  });

  it('a parametric band cuts by its GAIN at its FREQ and leaves distant frequencies alone', () => {
    const settings = { ...FLAT, mid1Hz: 300, mid1GainDb: -6, mid1Q: 2 };
    const [atCenter, farBelow, farAbove] = eqResponseDb(settings, [300, 40, 6000], SAMPLE_RATE);
    expect(atCenter).toBeCloseTo(-6, 1);
    expect(Math.abs(farBelow)).toBeLessThan(0.3);
    expect(Math.abs(farAbove)).toBeLessThan(0.3);
    const tone = sine(300, -12, 0.5);
    expect(changeDb(tone, runEq(tone, SAMPLE_RATE, settings))).toBeCloseTo(-6, 1);
  });

  it('Q: a higher Q makes the band narrower', () => {
    const wide = eqResponseDb({ ...FLAT, mid1Hz: 1000, mid1GainDb: -6, mid1Q: 0.5 }, [1500], SAMPLE_RATE)[0];
    const narrow = eqResponseDb({ ...FLAT, mid1Hz: 1000, mid1GainDb: -6, mid1Q: 6 }, [1500], SAMPLE_RATE)[0];
    expect(wide).toBeLessThan(-3);
    expect(narrow).toBeGreaterThan(-1);
  });

  it('shelves boost or cut everything beyond their frequency', () => {
    const settings = { ...FLAT, lowShelfHz: 120, lowShelfGainDb: 6, highShelfHz: 8000, highShelfGainDb: -6 };
    const [deepLow, middle, top] = eqResponseDb(settings, [25, 1000, 19000], SAMPLE_RATE);
    expect(deepLow).toBeCloseTo(6, 0);
    expect(Math.abs(middle)).toBeLessThan(0.5);
    expect(top).toBeCloseTo(-6, 0);
  });
});

describe('dynamic EQ', () => {
  const HARSH_TAMER: DynamicEqSettings = {
    frequencyHz: 3000,
    q: 2,
    gainDb: -9,
    thresholdDb: -30,
    ratio: 4,
    attackMs: 5,
    releaseMs: 100,
    mode: 'above',
  };

  it('works out the wanted gain from Threshold, Ratio, Gain and Above/Below', () => {
    // 8 dB over the threshold at 4:1 wants 6 dB of change.
    expect(dynamicEqTargetGainDb(-22, HARSH_TAMER)).toBeCloseTo(-6, 5);
    // Far over the threshold, the change stops at Gain: "the maximum gain adjustment".
    expect(dynamicEqTargetGainDb(0, HARSH_TAMER)).toBe(-9);
    expect(dynamicEqTargetGainDb(-40, HARSH_TAMER)).toBe(0);
    // Below: acts when the band is quieter than the threshold. Positive Gain boosts.
    const liftQuiet = { ...HARSH_TAMER, mode: 'below' as const, gainDb: 6 };
    expect(dynamicEqTargetGainDb(-38, liftQuiet)).toBeCloseTo(6, 5);
    expect(dynamicEqTargetGainDb(-20, liftQuiet)).toBe(0);
  });

  it('cuts the band only when the band itself is loud', () => {
    const loudInBand = sine(3000, -10, 0.5);
    const quietInBand = sine(3000, -45, 0.5);
    expect(changeDb(loudInBand, runDynamicEq(loudInBand, SAMPLE_RATE, HARSH_TAMER).output)).toBeLessThan(-7);
    expect(changeDb(quietInBand, runDynamicEq(quietInBand, SAMPLE_RATE, HARSH_TAMER).output)).toBeCloseTo(0, 1);
  });

  it('ignores loud sound outside its band, which is what makes it different from a compressor', () => {
    const loudBass = sine(80, -6, 0.5);
    const result = runDynamicEq(loudBass, SAMPLE_RATE, HARSH_TAMER);
    expect(findLargestBandChangeDb(result.bandGainDb)).toBeLessThan(0.5);
    expect(changeDb(loudBass, result.output)).toBeCloseTo(0, 1);
  });

  it('leaves the rest of the sound alone while it cuts its band', () => {
    // A loud 3 kHz tone and a 200 Hz tone together: only the 3 kHz part should drop.
    const high = sine(3000, -10, 0.5);
    const low = sine(200, -10, 0.5);
    const both = high.map((sample, index) => sample + low[index]);
    const output = runDynamicEq(both, SAMPLE_RATE, HARSH_TAMER).output;
    const lowPart = (signal: Float32Array) => applyFilter(signal, bandPassFilter(200, 4, SAMPLE_RATE));
    const highPart = (signal: Float32Array) => applyFilter(signal, bandPassFilter(3000, 4, SAMPLE_RATE));
    expect(changeDb(lowPart(both), lowPart(output))).toBeCloseTo(0, 0);
    expect(changeDb(highPart(both), highPart(output))).toBeLessThan(-6);
  });

  it('never produces a bad number', () => {
    const tone = sine(3000, -3, 0.3);
    const extreme = { ...HARSH_TAMER, q: 8, gainDb: -18, attackMs: 0.1, releaseMs: 5 };
    expect(runDynamicEq(tone, SAMPLE_RATE, extreme).output.every((sample) => Number.isFinite(sample))).toBe(true);
  });
});
