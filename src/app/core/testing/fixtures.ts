import { buildRegularLineup, DEFAULT_ROOMS, DEFAULT_SERVICE_SETUP } from '../knowledge';
import { BandMember, Room, ServiceSetup } from '../model';

/** Test fixtures. Placeholder names only: never put a real volunteer's name in a committed file. */

export const FIXTURE_FULL_BAND: BandMember[] = buildRegularLineup();

export const FIXTURE_LIVE_ROOM: Room = DEFAULT_ROOMS[0];
export const FIXTURE_DRY_ROOM: Room = DEFAULT_ROOMS[1];

export const FIXTURE_NEUTRAL_ROOM: Room = {
  id: 'room-neutral',
  name: 'Neutral room',
  reverberance: 'neutral',
  constantLowFrequencyNoise: false,
  audienceSize: 100,
  loudnessTargetDba: null,
};

export const FIXTURE_WEDGES: ServiceSetup = DEFAULT_SERVICE_SETUP;

export const FIXTURE_IN_EARS: ServiceSetup = { ...DEFAULT_SERVICE_SETUP, monitorType: 'inEars' };

/** Stripped set: Vocalist A with acoustic guitar, cajon, keys. */
export const FIXTURE_STRIPPED_BAND: BandMember[] = [
  FIXTURE_FULL_BAND[0],
  { id: 'm-cajon', name: 'Player I', roles: [{ role: 'cajon', skill: 'intermediate', connection: 'dynamicMic', vocal: null }] },
  FIXTURE_FULL_BAND[3],
];

export const FIXTURE_NAMES: string[] = ['Vocalist A', 'Vocalist B', 'Vocalist C', 'Player D', 'Player E', 'Player F', 'Player G', 'Player H'];
