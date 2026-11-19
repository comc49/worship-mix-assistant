import { ConsoleFactKey, ConsoleProfile } from '../consoles/console-profile';
import { StepSafety, SymptomGroupId, TargetPicker } from '../knowledge/troubleshooting/types';
import { BandMember, DcaId, MixPlan, Room, ServiceSetup } from '../model';

/** Pure TypeScript only in this folder: no Angular imports. */

export type TroubleshootSituation = 'rehearsal' | 'service';

/** The channel or group the mixer pointed at. null means they did not pick one. */
export type TroubleTarget = { kind: 'channel'; channelId: string } | { kind: 'group'; dcaId: DcaId };

export interface TroubleshootContext {
  band: BandMember[];
  room: Room;
  serviceSetup: ServiceSetup;
  plan: MixPlan;
  profile: ConsoleProfile;
  situation: TroubleshootSituation;
  target: TroubleTarget | null;
}

/** One console fact as it appears in a resolved step. */
export interface ResolvedControl {
  key: ConsoleFactKey;
  /** Plain-language name of the fact, for example "Low cut". */
  label: string;
  /** The console's own wording. */
  text: string;
  /** False when the profile marks the fact UNVERIFIED. */
  verified: boolean;
}

export interface ResolvedCheck {
  kind: 'check';
  id: string;
  action: string;
  question: string;
  /** Ids of resolved nodes: conditions and hidden steps are already skipped. */
  yes: string;
  no: string;
  safety: StepSafety;
  /** Every console fact named in the text. */
  inlineControls: ResolvedControl[];
  checkOnConsole: boolean;
}

export interface ResolvedFix {
  kind: 'fix';
  id: string;
  text: string;
  arrangementAdvice: string | null;
  safety: StepSafety;
  inlineControls: ResolvedControl[];
  /** The fix's "where to find it" list. */
  controlRefs: ResolvedControl[];
  checkOnConsole: boolean;
  /** True when the real fix is rehearsal only and a service is running: the text is a "later" note. */
  deferredUntilAfterService: boolean;
}

export interface ResolvedAskForHelp {
  kind: 'askForHelp';
  id: string;
  text: string;
  safety: 'safeDuringService';
  inlineControls: ResolvedControl[];
  checkOnConsole: boolean;
}

export type ResolvedNode = ResolvedCheck | ResolvedFix | ResolvedAskForHelp;

export interface ResolvedTree {
  id: string;
  symptom: string;
  group: SymptomGroupId;
  targetPicker: TargetPicker;
  entryNodeId: string;
  /** Only the nodes that can be reached in this context. */
  nodes: Record<string, ResolvedNode>;
}
