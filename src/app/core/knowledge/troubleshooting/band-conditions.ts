import { Role } from '../../model';
import { DRUM_ROLES, KICK_LIKE_ROLES, VOCAL_ROLES } from '../rules';
import { TreeCondition } from './types';

/**
 * Role lists and ready-made conditions the trees share, so a step that names an instrument
 * is only shown to a band that has it.
 */

export const BASS_ROLES: Role[] = ['bassGuitar', 'synthBass'];
export const KEYS_AND_PAD_ROLES: Role[] = ['keys', 'padSynth'];
export const GUITAR_ROLES: Role[] = ['acousticGuitar', 'electricGuitar'];
/** The members of the Low End DCA. */
export const LOW_END_ROLES: Role[] = ['kick', 'cajon', 'bassGuitar', 'synthBass'];
/** The members of the Energy DCA. */
export const ENERGY_ROLES: Role[] = ['electronicDrums', 'snare', 'toms', 'hiHat', 'overheads', 'electricGuitar'];
export { DRUM_ROLES, KICK_LIKE_ROLES, VOCAL_ROLES };

export const BAND_HAS_BASS: TreeCondition = { kind: 'anyRoleInBand', roles: BASS_ROLES };
export const BAND_HAS_NO_BASS: TreeCondition = { kind: 'not', condition: BAND_HAS_BASS };
export const BAND_HAS_KEYS: TreeCondition = { kind: 'roleInBand', role: 'keys' };
export const BAND_HAS_PAD: TreeCondition = { kind: 'roleInBand', role: 'padSynth' };
export const BAND_HAS_KEYS_OR_PAD: TreeCondition = { kind: 'anyRoleInBand', roles: KEYS_AND_PAD_ROLES };
export const BAND_HAS_GUITARS: TreeCondition = { kind: 'anyRoleInBand', roles: GUITAR_ROLES };
export const BAND_HAS_ELECTRIC_GUITAR: TreeCondition = { kind: 'roleInBand', role: 'electricGuitar' };
export const BAND_HAS_DRUMS: TreeCondition = { kind: 'anyRoleInBand', roles: DRUM_ROLES };
export const BAND_HAS_VOCALS: TreeCondition = { kind: 'anyRoleInBand', roles: VOCAL_ROLES };
export const BAND_HAS_LOW_END: TreeCondition = { kind: 'anyRoleInBand', roles: LOW_END_ROLES };
export const BAND_HAS_ENERGY: TreeCondition = { kind: 'anyRoleInBand', roles: ENERGY_ROLES };
