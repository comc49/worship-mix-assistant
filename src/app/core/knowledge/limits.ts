import { ParamKey, VoiceRange } from '../model';
import { VOCAL_LOW_CUT_BY_RANGE } from './profiles-vocals';
import { InstrumentProfile, Limit } from './types';

/**
 * Musical limits: a floor and a ceiling per profile and parameter that no combination of
 * modifiers may cross. They protect the foundation when skill and room modifiers stack.
 *
 * Where a profile and parameter are not listed here, the limit is that parameter's usable
 * range from the profile (its min and max).
 */
export const EXPLICIT_LIMITS: Record<string, Partial<Record<ParamKey, Limit>>> = {
  'leadVocal.mic': {
    compRatio: { floor: 1.5, ceiling: 5, why: 'Above 5:1 a lead vocal sounds squashed and lifts stage noise between phrases.' },
    compGainReductionDb: { floor: 2, ceiling: 8, why: 'More than 8 dB of reduction on a vocal raises feedback risk and flattens the song.' },
  },
  'harmonyVocal.mic': {
    compRatio: { floor: 1.5, ceiling: 5, why: 'Above 5:1 the blend sounds squashed.' },
    compGainReductionDb: { floor: 2, ceiling: 8, why: 'More than 8 dB of reduction raises feedback risk.' },
    levelDb: { floor: -8, ceiling: 0, why: 'Harmonies never start above the lead vocal.' },
  },
  'bassGuitar.di': {
    lowCutHz: { floor: 30, ceiling: 60, why: 'Above 60 Hz the bass guitar starts to lose its fundamental notes.' },
    compRatio: { floor: 2, ceiling: 8, why: 'Above 8:1 the bass loses all movement.' },
    compGainReductionDb: { floor: 2, ceiling: 9, why: 'More than 9 dB makes the bass sound choked.' },
  },
  'synthBass.di': {
    lowCutHz: { floor: 25, ceiling: 90, why: 'When a bass guitar owns the low end the synth bass can be cut higher, but never above 90 Hz.' },
  },
  'keys.di': {
    lowCutHz: { floor: 40, ceiling: 150, why: 'Above 150 Hz a piano sounds like a toy.' },
  },
  'padSynth.di': {
    lowCutHz: { floor: 80, ceiling: 250, why: 'Above 250 Hz a pad loses its warmth entirely.' },
  },
  'acousticGuitar.di': {
    lowCutHz: { floor: 70, ceiling: 160, why: 'Above 160 Hz an acoustic guitar sounds thin even in a full band.' },
  },
  'acousticGuitar.mic': {
    lowCutHz: { floor: 80, ceiling: 160, why: 'Above 160 Hz an acoustic guitar sounds thin even in a full band.' },
  },
  'electricGuitar.modeler': {
    lowCutHz: { floor: 70, ceiling: 150, why: 'Above 150 Hz an electric guitar loses the weight of its chords.' },
    compRatio: { floor: 1.5, ceiling: 10, why: 'A limiter-style ratio is allowed here, because it only acts on loud patches.' },
  },
  'electricGuitar.amp': {
    lowCutHz: { floor: 80, ceiling: 150, why: 'Above 150 Hz an electric guitar loses the weight of its chords.' },
    compRatio: { floor: 1.5, ceiling: 10, why: 'A limiter-style ratio is allowed here, because it only acts on loud patches.' },
  },
  'electronicDrums.stereo': {
    lowCutHz: { floor: 20, ceiling: 40, why: 'The kick is inside this pair. A higher cut would thin the foundation.' },
    compGainReductionDb: { floor: 0, ceiling: 3, why: 'On a stereo kit the kick makes the cymbals pump above 3 dB of reduction.' },
  },
  'electronicDrums.kick': {
    lowCutHz: { floor: 20, ceiling: 40, why: 'A higher cut would thin the kick.' },
  },
  'kick.mic': {
    lowCutHz: { floor: 20, ceiling: 40, why: 'A higher cut would thin the kick.' },
  },
  'cajon.mic': {
    lowCutHz: { floor: 40, ceiling: 70, why: 'A higher cut would remove the cajon\'s bass hit.' },
  },
};

export function getMusicalLimit(
  profile: InstrumentProfile,
  param: ParamKey,
  voiceRange: VoiceRange | null,
): Limit | null {
  const isVocalLowCut = param === 'lowCutHz' && voiceRange !== null;
  if (isVocalLowCut) {
    const byRange = VOCAL_LOW_CUT_BY_RANGE.find((entry) => entry.voiceRange === voiceRange);
    if (byRange !== undefined) {
      return { floor: byRange.floor, ceiling: byRange.ceiling, why: byRange.why };
    }
  }

  const explicitForProfile = EXPLICIT_LIMITS[profile.id];
  if (explicitForProfile !== undefined) {
    const explicit = explicitForProfile[param];
    if (explicit !== undefined) {
      return explicit;
    }
  }

  const baseline = profile.params[param];
  if (baseline === undefined) {
    return null;
  }
  return { floor: baseline.min, ceiling: baseline.max, why: 'This is the edge of the usable range for this source.' };
}
