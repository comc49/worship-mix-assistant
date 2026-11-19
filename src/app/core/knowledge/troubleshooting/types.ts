import { ConsoleFactKey } from '../../consoles/console-profile';
import { Reverberance, Role } from '../../model';

/**
 * Troubleshooting decision trees as typed data.
 *
 * A tree is a set of nodes. The mixer starts at the entry node and answers yes or no until they
 * reach a fix or an "ask for help" node. Trees contain no code: anything that depends on the band,
 * the room, the monitors or the console is expressed as a `when` condition or as a {token} in the
 * text, and the pure resolver in src/app/core/troubleshooter turns that into what the mixer reads.
 *
 * TOKENS that tree text may contain:
 *   {console}                 the console's name
 *   {control:lowCutName}      the value of a console profile fact (any ConsoleFactKey)
 *   {control:compParamNames.threshold}   one named part of a fact that holds several names
 *   {member:bassGuitar}       the name(s) of whoever plays that role, or "the bassist" if nobody does
 *   {lowCut:bassGuitar}       the plan's current low cut for that role's channel
 *   {compReduction:bassGuitar} the plan's target gain reduction for that role's channel
 *   {target}                  the channel or group the mixer picked, or "the channel you suspect"
 *   {targetMember}            the musician behind the picked channel, or "the musician"
 *   {loudnessTarget}          the room's loudness target, or a neutral phrase when there is none
 *   {soloCaution}             the warning about solo-in-place that every "press solo" step must carry
 *
 * Console control names may ONLY reach the text through {control:...} tokens. Never type an X32
 * or WING control name into a tree.
 */

export type StepSafety = 'safeDuringService' | 'rehearsalOnly';

/**
 * Changes that are risky while people are listening. A node that makes one of these must say so.
 * Every one of them forces the node to be rehearsal only, except 'gainDown': turning the gain
 * DOWN on a clipping input is the one gain change allowed during a service.
 */
export type RiskyChange = 'gainUp' | 'gainDown' | 'phantomPower' | 'routing' | 'sceneLoad';

export type SymptomGroupId =
  | 'soundAndNoise'
  | 'feedback'
  | 'wholeMix'
  | 'vocals'
  | 'lowEnd'
  | 'guitarsAndKeys'
  | 'monitorsAndStream';

export interface SymptomGroup {
  id: SymptomGroupId;
  title: string;
}

/** What a tree asks the mixer to point at before it starts. */
export type TargetPicker = 'none' | 'channel' | 'channelOrGroup';

export type TreeCondition =
  | { kind: 'roomIs'; reverberance: Reverberance }
  | { kind: 'wedgesInUse' }
  | { kind: 'roleInBand'; role: Role }
  /** True when the band has at least one of these roles. */
  | { kind: 'anyRoleInBand'; roles: Role[] }
  /** True when someone playing this role is at the lowest skill level. Never shown in text. */
  | { kind: 'lowestSkill'; role: Role }
  | { kind: 'streamMixEnabled' }
  | { kind: 'subOnOwnBus' }
  /** True when every listed condition holds. */
  | { kind: 'allOf'; conditions: TreeCondition[] }
  | { kind: 'not'; condition: TreeCondition };

/** A node with a condition is only used when the condition holds. Otherwise the walk skips to `otherwise`. */
export interface NodeCondition {
  condition: TreeCondition;
  otherwise: string;
}

/** One sentence of arrangement advice that is only shown when its condition holds. */
export interface AdviceLine {
  text: string;
  when?: TreeCondition;
}

export interface CheckNode {
  kind: 'check';
  /** ONE thing to do or look at. */
  action: string;
  /** ONE yes/no question about the result. */
  question: string;
  yes: string;
  no: string;
  safety: StepSafety;
  when?: NodeCondition;
  /** Where a hidden rehearsal-only check skips to during a service. Defaults to the `no` node. */
  duringService?: string;
  risky?: RiskyChange[];
  /**
   * True when the step only LOOKS at a setting and changes nothing. Looking is always safe, so
   * only a looks-only check may name a control (phantom power, preamp gain, main assignment)
   * that must not be changed during a service.
   */
  looksOnly?: boolean;
}

export interface FixNode {
  kind: 'fix';
  text: string;
  /**
   * What to ask the band. Shown before the technical fix. A list is used when a sentence names
   * an instrument: each line is only shown when its condition holds for the current band.
   */
  arrangementAdvice?: string | AdviceLine[];
  safety: StepSafety;
  /** Console facts listed under the fix as "where to find it". */
  controlRefs: ConsoleFactKey[];
  when?: NodeCondition;
  /**
   * The safe node to show instead when this fix is rehearsal only and a service is running.
   * When absent, the resolver shows a "do this after the service" note.
   */
  duringService?: string;
  risky?: RiskyChange[];
}

export interface AskForHelpNode {
  kind: 'askForHelp';
  text: string;
  /** Asking is always safe. */
  safety: 'safeDuringService';
  when?: NodeCondition;
}

export type TroubleshootingNode = CheckNode | FixNode | AskForHelpNode;

export interface TroubleshootingTree {
  id: string;
  /** The title on the symptom button. */
  symptom: string;
  group: SymptomGroupId;
  targetPicker: TargetPicker;
  /**
   * The instruments this symptom is about. The band must have at least one role from EACH list.
   * An empty list means the symptom applies to any band.
   * Example: [['keys'], ['bassGuitar', 'synthBass']] needs keys AND some kind of bass.
   */
  needsOneOfEach: Role[][];
  entryNodeId: string;
  nodes: Record<string, TroubleshootingNode>;
}
