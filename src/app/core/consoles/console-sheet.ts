import { IfYouHear, ProvenanceStep } from '../model';
import { ConsoleFactKey, ConsoleId } from './console-profile';

/** The mix plan translated into one console's own terms, as ordered steps. */

export type Safety = 'rehearsalOnly' | 'safeDuringService';

export type SectionId =
  | 'protect'
  | 'patch'
  | 'gain'
  | 'lowCuts'
  | 'groups'
  | 'fx'
  | 'dynamics'
  | 'monitors'
  | 'main';

export interface StepDetail {
  /** The usable range, as text. null when the step has no numeric value. */
  range: string | null;
  why: string;
  listenFor: string;
  provenance: ProvenanceStep[];
}

export interface SheetStep {
  /** Stable id, used to remember checkboxes across reloads. */
  id: string;
  sectionId: SectionId;
  /** The channel or group this step belongs to, for grouping on screen. */
  subject: string;
  instruction: string;
  /** The one value to set. null for steps that are actions, not values. */
  value: string | null;
  /** Extra numbered actions inside the step (for example a gain staging procedure). */
  subSteps: string[];
  detail: StepDetail | null;
  safety: Safety;
  optional: boolean;
  /** Set when the step relies on a console fact the manual could not confirm. */
  checkOnConsole: string | null;
  /** The profile facts this step takes names or numbers from. */
  controlRefs: ConsoleFactKey[];
  effectName: string | null;
  fxSlot: number | null;
  busNumbers: number[];
}

export interface SheetSection {
  id: SectionId;
  title: string;
  /** One sentence on what the section achieves. */
  intro: string;
  steps: SheetStep[];
}

export type WarningKind = 'droppedWish' | 'clamp' | 'adaptation' | 'plan' | 'unverified';

export interface SheetWarning {
  kind: WarningKind;
  message: string;
}

export interface ChannelAssignment {
  channelId: string;
  /** One number for a mono channel, two for a linked stereo pair. */
  consoleChannels: number[];
  /** The physical input sockets the source plugs into. A stereo source always uses two. */
  inputSockets: number[];
  label: string;
  stereo: boolean;
}

export type BusPurpose = 'monitor' | 'sendEffect' | 'group' | 'stream' | 'subwoofer';

export interface BusAssignment {
  busNumbers: number[];
  purpose: BusPurpose;
  label: string;
  /** The plan id this bus serves (monitor mix id, effect id or group id). */
  planId: string;
}

export interface FxAssignment {
  slot: number;
  effectName: string;
  role: 'send' | 'insert';
  label: string;
  planId: string;
}

export interface ChannelReference {
  channelId: string;
  subject: string;
  ifYouHear: IfYouHear[];
  mixerNotes: string[];
  coachingNotes: string[];
}

export interface ConsoleSheet {
  consoleId: ConsoleId;
  consoleName: string;
  /** Shown once at the top of the sheet. */
  disclaimer: string;
  doNotTouch: string[];
  warnings: SheetWarning[];
  sections: SheetSection[];
  channelMap: ChannelAssignment[];
  busMap: BusAssignment[];
  fxMap: FxAssignment[];
  reference: ChannelReference[];
}

export type AdapterResult = { ok: true; sheet: ConsoleSheet } | { ok: false; errors: string[] };

export const SHEET_DISCLAIMER =
  'These are typical starting values, not measurements of this room. Set them, then listen: your ears decide.';
