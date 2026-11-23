import { ConsoleId } from '../core/consoles';
import { DEFAULT_CONSOLE_BY_ROOM, DEFAULT_ROOMS, DEFAULT_SERVICE_SETUP, buildRegularLineup } from '../core/knowledge';
import { BandMember, Room, ServiceSetup } from '../core/model';

/** Everything the app saves. One versioned object, owned by the storage service. */

export const CURRENT_SCHEMA_VERSION = 1;

export interface RosterTemplate {
  id: string;
  name: string;
  band: BandMember[];
}

export type MixSituation = 'rehearsal' | 'service';

export interface StoredState {
  schemaVersion: number;
  rooms: Room[];
  selectedRoomId: string;
  consoleId: ConsoleId;
  serviceSetup: ServiceSetup;
  band: BandMember[];
  templates: RosterTemplate[];
  /** Checked sheet steps, per console, so progress survives a reload. */
  checkedStepIds: Record<ConsoleId, string[]>;
  situation: MixSituation;
  storageNoticeDismissed: boolean;
  installPromptDismissed: boolean;
  lastBackupIso: string | null;
  /** Address of the Sound lab's song library file (library.json on a file host). Empty when none. */
  labLibraryUrl: string;
}

export function createDefaultState(): StoredState {
  const firstRoom = DEFAULT_ROOMS[0];
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    rooms: DEFAULT_ROOMS.map((room) => ({ ...room })),
    selectedRoomId: firstRoom.id,
    consoleId: DEFAULT_CONSOLE_BY_ROOM[firstRoom.id] ?? 'x32',
    serviceSetup: { ...DEFAULT_SERVICE_SETUP },
    band: [],
    templates: [{ id: 'template-example', name: 'Example lineup (placeholder names)', band: buildRegularLineup() }],
    checkedStepIds: { x32: [], wingCompact: [] },
    situation: 'rehearsal',
    storageNoticeDismissed: false,
    installPromptDismissed: false,
    lastBackupIso: null,
    labLibraryUrl: '',
  };
}
