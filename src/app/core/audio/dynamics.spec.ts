import {
  CompressorSettings,
  compressorTargetReductionDb,
  findMaximum,
  fromDb,
  GATE_RATIO,
  GateSettings,
  gateTargetReductionDb,
  measurePeakDb,
  measureRmsDb,
  runCompressor,
  runGate,
} from './dynamics';
import { generatePracticeSound, PRACTICE_SAMPLE_RATE, PRACTICE_SOUNDS } from './practice-sounds';

const SAMPLE_RATE = 48000;

const COMPRESSOR: CompressorSettings = {
  thresholdDb: -20,
  ratio: 4,
  kneeDb: 0,
  attackMs: 10,
  holdMs: 0,
  releaseMs: 100,
  makeupGainDb: 0,
  detector: 'peak',
};

const GATE: GateSettings = {
  thresholdDb: -30,
  ratio: GATE_RATIO,
  rangeDb: 40,
  attackMs: 1,
  holdMs: 50,
  releaseMs: 100,
  accentPercent: 0,
};

/** A constant level, like a held DC "tone", so the detector reads exactly that level. */
function steady(levelDb: number, seconds: number): Float32Array {
  return new Float32Array(Math.round(seconds * SAMPLE_RATE)).fill(fromDb(levelDb));
}

function join(...parts: Float32Array[]): Float32Array {
  const total = parts.reduce((length, part) => length + part.length, 0);
  const joined = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset = offset + part.length;
  }
  return joined;
}

function at(seconds: number): number {
  return Math.round(seconds * SAMPLE_RATE);
}

describe('compressor', () => {
  it('reduces a level above the threshold by (over) x (1 - 1/ratio) once it has settled', () => {
    // -8 dB is 12 dB over a -20 dB threshold. At 4:1 that leaves 3 dB over, so 9 dB of reduction.
    const result = runCompressor(steady(-8, 1), SAMPLE_RATE, COMPRESSOR);
    expect(result.gainReductionDb[result.gainReductionDb.length - 1]).toBeCloseTo(9, 1);
    expect(measurePeakDb(result.output.slice(at(0.9)))).toBeCloseTo(-17, 1);
  });

  it('does nothing below the threshold', () => {
    const result = runCompressor(steady(-30, 0.5), SAMPLE_RATE, COMPRESSOR);
    expect(findMaximum(result.gainReductionDb)).toBe(0);
  });

  it('ATTACK: applies about two-thirds of the wanted reduction in the attack time', () => {
    const result = runCompressor(steady(-8, 0.5), SAMPLE_RATE, { ...COMPRESSOR, attackMs: 20 });
    const afterAttackTime = result.gainReductionDb[at(0.02)];
    expect(afterAttackTime / 9).toBeGreaterThan(0.6);
    expect(afterAttackTime / 9).toBeLessThan(0.7);
  });

  it('RELEASE: restores about two-thirds of the reduction in the release time', () => {
    const input = join(steady(-8, 0.5), steady(-40, 0.5));
    const result = runCompressor(input, SAMPLE_RATE, { ...COMPRESSOR, releaseMs: 100 });
    const whenLoudStops = result.gainReductionDb[at(0.5) - 1];
    // The detector itself takes a moment to see the level has dropped, so allow a little slack.
    const afterReleaseTime = result.gainReductionDb[at(0.5 + 0.1 + 0.03)];
    expect(whenLoudStops).toBeCloseTo(9, 1);
    expect(afterReleaseTime / whenLoudStops).toBeGreaterThan(0.2);
    expect(afterReleaseTime / whenLoudStops).toBeLessThan(0.45);
  });

  it('HOLD: keeps the reduction for the hold time before the release starts', () => {
    const input = join(steady(-8, 0.5), steady(-40, 0.5));
    const withHold = runCompressor(input, SAMPLE_RATE, { ...COMPRESSOR, holdMs: 200 });
    const withoutHold = runCompressor(input, SAMPLE_RATE, COMPRESSOR);
    const checkAt = at(0.5 + 0.15);
    expect(withHold.gainReductionDb[checkAt]).toBeCloseTo(9, 1);
    expect(withoutHold.gainReductionDb[checkAt]).toBeLessThan(4);
  });

  it('KNEE: starts reducing gently before the threshold and meets the hard-knee line after it', () => {
    const soft = { ...COMPRESSOR, kneeDb: 12 };
    expect(compressorTargetReductionDb(-23, COMPRESSOR)).toBe(0);
    expect(compressorTargetReductionDb(-23, soft)).toBeGreaterThan(0);
    expect(compressorTargetReductionDb(-20, soft)).toBeLessThan(compressorTargetReductionDb(-17, soft));
    // Well above the knee both give the same answer.
    expect(compressorTargetReductionDb(-8, soft)).toBeCloseTo(compressorTargetReductionDb(-8, COMPRESSOR), 5);
  });

  it('GAIN: makeup gain raises the whole output by that many dB', () => {
    const plain = runCompressor(steady(-8, 0.5), SAMPLE_RATE, COMPRESSOR);
    const withMakeup = runCompressor(steady(-8, 0.5), SAMPLE_RATE, { ...COMPRESSOR, makeupGainDb: 6 });
    expect(measureRmsDb(withMakeup.output) - measureRmsDb(plain.output)).toBeCloseTo(6, 3);
  });

  it('a higher ratio reduces more, and the output never contains a bad number', () => {
    const bass = generatePracticeSound('unevenBass', SAMPLE_RATE);
    const gentle = runCompressor(bass, SAMPLE_RATE, { ...COMPRESSOR, ratio: 2 });
    const firm = runCompressor(bass, SAMPLE_RATE, { ...COMPRESSOR, ratio: 8 });
    expect(findMaximum(firm.gainReductionDb)).toBeGreaterThan(findMaximum(gentle.gainReductionDb));
    expect(firm.output.every((sample) => Number.isFinite(sample))).toBe(true);
  });

  it('evens out the uneven bass: the gap between loud and quiet notes gets smaller', () => {
    const bass = generatePracticeSound('unevenBass', SAMPLE_RATE);
    const result = runCompressor(bass, SAMPLE_RATE, { ...COMPRESSOR, thresholdDb: -24, ratio: 6, attackMs: 5 });
    const loudNote = (samples: Float32Array) => measureRmsDb(samples.slice(at(0), at(0.5)));
    const quietNote = (samples: Float32Array) => measureRmsDb(samples.slice(at(1.5), at(2)));
    const gapBefore = loudNote(bass) - quietNote(bass);
    const gapAfter = loudNote(result.output) - quietNote(result.output);
    expect(gapAfter).toBeLessThan(gapBefore - 3);
  });
});

describe('gate', () => {
  it('starts closed and turns a signal below the threshold down by RANGE', () => {
    const result = runGate(steady(-50, 0.5), SAMPLE_RATE, GATE);
    expect(result.gainReductionDb[at(0.4)]).toBeCloseTo(40, 3);
    expect(measurePeakDb(result.output.slice(at(0.3)))).toBeCloseTo(-90, 1);
  });

  it('opens fully for a signal above the threshold, within a few attack times', () => {
    const result = runGate(steady(-10, 0.2), SAMPLE_RATE, GATE);
    expect(result.gainReductionDb[at(0.02)]).toBeLessThan(0.1);
  });

  it('HOLD then RELEASE: stays open for the hold time, then closes over the release time', () => {
    const input = join(steady(-10, 0.2), steady(-60, 0.6));
    const result = runGate(input, SAMPLE_RATE, { ...GATE, holdMs: 100, releaseMs: 50 });
    // The detector needs a little time to see the level drop, then the hold time runs.
    expect(result.gainReductionDb[at(0.2 + 0.05)]).toBeLessThan(0.5);
    expect(result.gainReductionDb[at(0.2 + 0.5)]).toBeGreaterThan(38);
  });

  it('RANGE limits how far it closes', () => {
    const result = runGate(steady(-60, 0.5), SAMPLE_RATE, { ...GATE, rangeDb: 12 });
    expect(findMaximum(result.gainReductionDb)).toBeCloseTo(12, 3);
  });

  it('RATIO: as an expander it reduces in proportion, as a gate all at once', () => {
    const expander = { ...GATE, ratio: 2 };
    // 5 dB under the threshold at 2:1 is 5 dB of reduction; the gate gives the full range.
    expect(gateTargetReductionDb(-35, expander)).toBeCloseTo(5, 5);
    expect(gateTargetReductionDb(-35, GATE)).toBe(40);
    expect(gateTargetReductionDb(-90, expander)).toBe(40);
    expect(gateTargetReductionDb(-20, expander)).toBe(0);
  });

  it('ACCENT briefly boosts the gain when the gate opens', () => {
    const input = join(steady(-60, 0.1), steady(-10, 0.3));
    const plain = runGate(input, SAMPLE_RATE, { ...GATE, attackMs: 0 });
    const accented = runGate(input, SAMPLE_RATE, { ...GATE, attackMs: 0, accentPercent: 100 });
    const justAfterOpening = at(0.1) + 20;
    expect(Math.abs(accented.output[justAfterOpening])).toBeGreaterThan(Math.abs(plain.output[justAfterOpening]) * 1.5);
    // The boost is gone a little later.
    expect(accented.output[at(0.35)]).toBeCloseTo(plain.output[at(0.35)], 3);
  });

  it('cleans the gaps of the snare mic with bleed without losing the snare hits', () => {
    const snare = generatePracticeSound('snareWithBleed', SAMPLE_RATE);
    const result = runGate(snare, SAMPLE_RATE, { ...GATE, thresholdDb: -14, rangeDb: 30, holdMs: 80, releaseMs: 120 });
    // Beat 2 (1.0 s) is a hi-hat with no snare: it should be much quieter. Beat 3 (1.5 s) is a snare hit.
    const gapBefore = measureRmsDb(snare.slice(at(1.0), at(1.05)));
    const gapAfter = measureRmsDb(result.output.slice(at(1.0), at(1.05)));
    expect(gapAfter).toBeLessThan(gapBefore - 12);
    const hitBefore = measurePeakDb(snare.slice(at(1.5), at(1.6)));
    const hitAfter = measurePeakDb(result.output.slice(at(1.5), at(1.6)));
    expect(hitAfter).toBeGreaterThan(hitBefore - 1.5);
  });
});

describe('practice sounds', () => {
  it('are the same every time, four seconds long, and peak at about -3 dB', () => {
    for (const sound of PRACTICE_SOUNDS) {
      const first = generatePracticeSound(sound.id);
      const second = generatePracticeSound(sound.id);
      expect(first.length, sound.id).toBe(PRACTICE_SAMPLE_RATE * 4);
      expect(Array.from(first.slice(0, 2000)), sound.id).toEqual(Array.from(second.slice(0, 2000)));
      expect(measurePeakDb(first), sound.id).toBeCloseTo(-3.1, 0);
      expect(first.every((sample) => Number.isFinite(sample)), sound.id).toBe(true);
    }
  });
});
