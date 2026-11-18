import { Role, SourceConnection } from '../model';
import {
  CAJON_PROFILE,
  EDRUMS_CYMBALS_PROFILE,
  EDRUMS_KICK_PROFILE,
  EDRUMS_SNARE_PROFILE,
  EDRUMS_STEREO_PROFILE,
  EDRUMS_TOMS_PROFILE,
  HI_HAT_PROFILE,
  KICK_PROFILE,
  OVERHEADS_PROFILE,
  SNARE_PROFILE,
  TOMS_PROFILE,
} from './profiles-drums';
import {
  ACOUSTIC_GUITAR_DI_PROFILE,
  ACOUSTIC_GUITAR_MIC_PROFILE,
  BACKING_TRACKS_PROFILE,
  BASS_GUITAR_PROFILE,
  CLICK_PROFILE,
  ELECTRIC_GUITAR_AMP_PROFILE,
  ELECTRIC_GUITAR_MODELER_PROFILE,
  KEYS_PROFILE,
  PAD_PROFILE,
  SYNTH_BASS_PROFILE,
} from './profiles-instruments';
import { HARMONY_VOCAL_PROFILE, LEAD_VOCAL_PROFILE } from './profiles-vocals';
import { InstrumentProfile } from './types';

export * from './types';
export * from './defaults';
export * from './limits';
export * from './profiles-vocals';
export * from './room-modifiers';
export * from './rules';
export * from './skill-modifiers';

export const INSTRUMENT_PROFILES: InstrumentProfile[] = [
  EDRUMS_STEREO_PROFILE,
  EDRUMS_KICK_PROFILE,
  EDRUMS_SNARE_PROFILE,
  EDRUMS_TOMS_PROFILE,
  EDRUMS_CYMBALS_PROFILE,
  KICK_PROFILE,
  SNARE_PROFILE,
  HI_HAT_PROFILE,
  TOMS_PROFILE,
  OVERHEADS_PROFILE,
  CAJON_PROFILE,
  BASS_GUITAR_PROFILE,
  SYNTH_BASS_PROFILE,
  ACOUSTIC_GUITAR_DI_PROFILE,
  ACOUSTIC_GUITAR_MIC_PROFILE,
  ELECTRIC_GUITAR_MODELER_PROFILE,
  ELECTRIC_GUITAR_AMP_PROFILE,
  KEYS_PROFILE,
  PAD_PROFILE,
  BACKING_TRACKS_PROFILE,
  CLICK_PROFILE,
  LEAD_VOCAL_PROFILE,
  HARMONY_VOCAL_PROFILE,
];

/**
 * The profiles a role produces for a connection. Usually one. Electronic drums with separate
 * outputs produce four (kick, snare, toms, cymbals).
 */
export function findProfiles(role: Role, connection: SourceConnection): InstrumentProfile[] {
  return INSTRUMENT_PROFILES.filter((profile) => {
    const roleMatches = profile.role === role;
    const connectionMatches = profile.connections.includes(connection);
    return roleMatches && connectionMatches;
  });
}

/** The connections that make sense for a role, in the order the roster screen offers them. */
export function connectionsForRole(role: Role): SourceConnection[] {
  const connections: SourceConnection[] = [];
  for (const profile of INSTRUMENT_PROFILES) {
    if (profile.role !== role) {
      continue;
    }
    for (const connection of profile.connections) {
      if (!connections.includes(connection)) {
        connections.push(connection);
      }
    }
  }
  return connections;
}
