import { isLibraryUrl } from '../core/audio/song-library';
import { ConsoleId } from '../core/consoles';
import { MicModelId, MonitorType, Reverberance, ROLES, SKILL_LEVELS, SourceConnection, SubwooferFeed, VOICE_RANGES } from '../core/model';
import { MixSituation } from './stored-state';

/**
 * Checks that a saved state or a backup file has the shape the app expects, value by value.
 * A backup file can come from anywhere, and a state with a wrong shape makes the app fail on
 * every start, so nothing is loaded unless all of it passes.
 *
 * Each list below is written as a Record over the union type, so adding a value to the type
 * without adding it here is a compile error.
 */

const CONNECTIONS: Record<SourceConnection, true> = {
  dynamicMic: true,
  condenserMic: true,
  monoDi: true,
  stereoDi: true,
  modelerDirect: true,
  drumModuleStereoPair: true,
  drumModuleSeparateOutputs: true,
};
const MIC_MODELS: Record<MicModelId, true> = { sm58: true, beta58a: true, e835: true, e935: true, condenserHandheld: true, other: true };
const REVERBERANCES: Record<Reverberance, true> = { live: true, neutral: true, dry: true };
const MONITOR_TYPES: Record<MonitorType, true> = { wedges: true, inEars: true, mixed: true };
const SUBWOOFER_FEEDS: Record<SubwooferFeed, true> = { ownBus: true, mainThroughCrossover: true };
const CONSOLE_IDS: Record<ConsoleId, true> = { x32: true, wingCompact: true };
const SITUATIONS: Record<MixSituation, true> = { rehearsal: true, service: true };

/** Longest text the app accepts for a name or id. Far more than any real one. */
const MAX_TEXT_LENGTH = 200;
const MAX_LIST_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_TEXT_LENGTH;
}

function isList(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length <= MAX_LIST_LENGTH;
}

function isOneOf(value: unknown, allowed: Record<string, true>): boolean {
  return typeof value === 'string' && Object.hasOwn(allowed, value);
}

function isListed(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === 'string' && allowed.includes(value);
}

function isRealNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVocalDetails(value: unknown): boolean {
  if (value === null) {
    return true;
  }
  if (!isRecord(value)) {
    return false;
  }
  return isListed(value['voiceRange'], VOICE_RANGES) && isOneOf(value['micModel'], MIC_MODELS) && isText(value['micModelFreeText']);
}

function isMemberRole(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isListed(value['role'], ROLES) &&
    isListed(value['skill'], SKILL_LEVELS) &&
    isOneOf(value['connection'], CONNECTIONS) &&
    isVocalDetails(value['vocal'])
  );
}

function isBandMember(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const roles = value['roles'];
  return isText(value['id']) && isText(value['name']) && isList(roles) && roles.every(isMemberRole);
}

function isBand(value: unknown): boolean {
  return isList(value) && value.every(isBandMember);
}

function isRoom(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const target = value['loudnessTargetDba'];
  return (
    isText(value['id']) &&
    isText(value['name']) &&
    isOneOf(value['reverberance'], REVERBERANCES) &&
    typeof value['constantLowFrequencyNoise'] === 'boolean' &&
    isRealNumber(value['audienceSize']) &&
    (target === null || isRealNumber(target))
  );
}

function isTemplate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return isText(value['id']) && isText(value['name']) && isBand(value['band']);
}

function isServiceSetup(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const mixCount = value['monitorMixCount'];
  const mixCountIsUsable = isRealNumber(mixCount) && Number.isInteger(mixCount) && mixCount >= 0 && mixCount <= 64;
  return (
    isOneOf(value['monitorType'], MONITOR_TYPES) &&
    mixCountIsUsable &&
    typeof value['separateStreamMix'] === 'boolean' &&
    isOneOf(value['subwooferFeed'], SUBWOOFER_FEEDS)
  );
}

function isStepIdList(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 5000 && value.every(isText);
}

function isCheckedStepIds(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return isStepIdList(value['x32']) && isStepIdList(value['wingCompact']);
}

function isLibraryAddress(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return value === '' || isLibraryUrl(value);
}

/**
 * Returns null when every part of the state is usable, or a sentence naming the first part
 * that is not. Call it on the state after missing fields were filled in with defaults.
 */
export function findStoredStateProblem(state: Record<string, unknown>): string | null {
  const rooms = state['rooms'];
  if (!isList(rooms) || rooms.length === 0 || !rooms.every(isRoom)) {
    return 'its rooms are missing or damaged';
  }
  if (!isText(state['selectedRoomId'])) {
    return 'its selected room is damaged';
  }
  if (!isOneOf(state['consoleId'], CONSOLE_IDS)) {
    return 'it names a console this app does not know';
  }
  if (!isServiceSetup(state['serviceSetup'])) {
    return 'its monitor and service setup is damaged';
  }
  if (!isBand(state['band'])) {
    return 'its band is damaged';
  }
  const templates = state['templates'];
  if (!isList(templates) || !templates.every(isTemplate)) {
    return 'its saved lineups are damaged';
  }
  if (!isCheckedStepIds(state['checkedStepIds'])) {
    return 'its checked steps are damaged';
  }
  if (!isOneOf(state['situation'], SITUATIONS)) {
    return 'its rehearsal or service setting is damaged';
  }
  if (typeof state['storageNoticeDismissed'] !== 'boolean' || typeof state['installPromptDismissed'] !== 'boolean') {
    return 'its notice settings are damaged';
  }
  const lastBackup = state['lastBackupIso'];
  if (lastBackup !== null && !isText(lastBackup)) {
    return 'its last backup date is damaged';
  }
  if (!isLibraryAddress(state['labLibraryUrl'])) {
    return 'its song library address is not a web address';
  }
  return null;
}
