import { MixPlan } from '../model';
import { ConsoleId, ConsoleProfile } from './console-profile';
import { AdapterResult } from './console-sheet';
import { buildConsoleSheet } from './sheet-builder';
import { WING_COMPACT_PROFILE } from './wing-compact-profile';
import { X32_PROFILE } from './x32-profile';

export * from './console-profile';
export * from './console-sheet';
export { validateForConsole, describeChannel } from './allocation';
export { buildConsoleSheet } from './sheet-builder';
export { X32_PROFILE } from './x32-profile';
export { WING_COMPACT_PROFILE } from './wing-compact-profile';

export const CONSOLE_PROFILES: Record<ConsoleId, ConsoleProfile> = {
  x32: X32_PROFILE,
  wingCompact: WING_COMPACT_PROFILE,
};

export function toX32(mixPlan: MixPlan): AdapterResult {
  return buildConsoleSheet(mixPlan, X32_PROFILE);
}

export function toWingCompact(mixPlan: MixPlan): AdapterResult {
  return buildConsoleSheet(mixPlan, WING_COMPACT_PROFILE);
}

export function toConsole(consoleId: ConsoleId, mixPlan: MixPlan): AdapterResult {
  return buildConsoleSheet(mixPlan, CONSOLE_PROFILES[consoleId]);
}
