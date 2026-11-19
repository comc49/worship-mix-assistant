import { AdviceLine, TroubleshootingNode, TroubleshootingTree } from '../knowledge/troubleshooting/types';
import { evaluateCondition } from './conditions';
import { ResolvedControl, ResolvedNode, ResolvedTree, TroubleshootContext } from './context';
import { resolveControl, ResolvedText, resolveText } from './tokens';

/**
 * resolveTree(tree, context) returns the tree as the mixer should see it right now:
 *  - nodes whose `when` condition does not hold are skipped (the walk goes to `otherwise`);
 *  - during a service, rehearsal-only nodes are hidden:
 *      a hidden check is skipped through its `duringService` node, or its `no` node;
 *      a hidden fix is replaced by its `duringService` node, or by a "do this after the service" note;
 *  - every {token} is replaced with the band's, the plan's and the console's own words.
 * Every path of the result still ends in a fix or an ask-for-help node.
 */

/** The text shown in place of a rehearsal-only fix that has no safe alternative. */
export const DEFERRED_FIX_TEXT =
  'The fix for this needs a change that is not safe while people are listening. For now, get through the service with small fader moves only. Afterwards, switch to Rehearsal and work through this problem again to see the full fix.';

/** Marks the id of a generated "after the service" note, so it never clashes with a real node id. */
const DEFERRED_SUFFIX = '@afterService';

type Destination = { kind: 'node'; nodeId: string } | { kind: 'deferredFix'; nodeId: string };

function getNode(tree: TroubleshootingTree, nodeId: string): TroubleshootingNode {
  const node = tree.nodes[nodeId];
  if (node === undefined) {
    throw new Error(`Troubleshooting tree "${tree.id}" points at a node that does not exist: "${nodeId}"`);
  }
  return node;
}

/**
 * Follows conditions and service-hiding from one node id until it lands on a node the mixer
 * may see. The `seen` set guards against a data mistake that would loop forever.
 */
function findDestination(tree: TroubleshootingTree, startNodeId: string, context: TroubleshootContext): Destination {
  const seen = new Set<string>();
  let nodeId = startNodeId;

  while (!seen.has(nodeId)) {
    seen.add(nodeId);
    const node = getNode(tree, nodeId);

    if (node.when !== undefined && !evaluateCondition(node.when.condition, context)) {
      nodeId = node.when.otherwise;
      continue;
    }

    const hiddenNow = context.situation === 'service' && node.safety === 'rehearsalOnly';
    if (!hiddenNow) {
      return { kind: 'node', nodeId };
    }

    if (node.kind === 'check') {
      nodeId = node.duringService ?? node.no;
      continue;
    }
    if (node.kind === 'fix') {
      if (node.duringService === undefined) {
        return { kind: 'deferredFix', nodeId };
      }
      nodeId = node.duringService;
      continue;
    }
    // An ask-for-help node is always safe by its type, so this line is never reached.
    return { kind: 'node', nodeId };
  }

  throw new Error(`Troubleshooting tree "${tree.id}" loops while skipping hidden steps at "${nodeId}"`);
}

function destinationId(destination: Destination): string {
  if (destination.kind === 'deferredFix') {
    return destination.nodeId + DEFERRED_SUFFIX;
  }
  return destination.nodeId;
}

function hasUnverified(controls: ResolvedControl[]): boolean {
  return controls.some((control) => !control.verified);
}

function buildDeferredFix(id: string): ResolvedNode {
  return {
    kind: 'fix',
    id,
    text: DEFERRED_FIX_TEXT,
    arrangementAdvice: null,
    safety: 'safeDuringService',
    inlineControls: [],
    controlRefs: [],
    checkOnConsole: false,
    deferredUntilAfterService: true,
  };
}

/**
 * Resolves a fix's arrangement advice. A list keeps only the lines whose condition holds for
 * this band, so the advice never names an instrument the band does not have.
 */
function resolveAdvice(advice: string | AdviceLine[] | undefined, context: TroubleshootContext): ResolvedText | null {
  if (advice === undefined) {
    return null;
  }
  if (typeof advice === 'string') {
    return resolveText(advice, context);
  }
  const shownLines: string[] = [];
  for (const line of advice) {
    if (line.when !== undefined && !evaluateCondition(line.when, context)) {
      continue;
    }
    shownLines.push(line.text);
  }
  if (shownLines.length === 0) {
    return null;
  }
  return resolveText(shownLines.join(' '), context);
}

export function resolveTree(tree: TroubleshootingTree, context: TroubleshootContext): ResolvedTree {
  const resolvedNodes: Record<string, ResolvedNode> = {};
  const entry = findDestination(tree, tree.entryNodeId, context);
  const queue: Destination[] = [entry];

  while (queue.length > 0) {
    const destination = queue.shift();
    if (destination === undefined) {
      break;
    }
    const id = destinationId(destination);
    if (resolvedNodes[id] !== undefined) {
      continue;
    }

    if (destination.kind === 'deferredFix') {
      resolvedNodes[id] = buildDeferredFix(id);
      continue;
    }

    const node = getNode(tree, destination.nodeId);

    if (node.kind === 'check') {
      const action = resolveText(node.action, context);
      const question = resolveText(node.question, context);
      const yes = findDestination(tree, node.yes, context);
      const no = findDestination(tree, node.no, context);
      const inlineControls = [...action.controls, ...question.controls];
      resolvedNodes[id] = {
        kind: 'check',
        id,
        action: action.text,
        question: question.text,
        yes: destinationId(yes),
        no: destinationId(no),
        safety: node.safety,
        looksOnly: node.looksOnly === true,
        inlineControls,
        checkOnConsole: hasUnverified(inlineControls) || action.needsConsoleCheck || question.needsConsoleCheck,
      };
      queue.push(yes, no);
      continue;
    }

    if (node.kind === 'fix') {
      const text = resolveText(node.text, context);
      const advice = resolveAdvice(node.arrangementAdvice, context);
      const inlineControls = advice === null ? text.controls : [...text.controls, ...advice.controls];
      const controlRefs: ResolvedControl[] = [];
      for (const key of node.controlRefs) {
        const control = resolveControl(context.profile, key);
        if (control !== null) {
          controlRefs.push(control);
        }
      }
      resolvedNodes[id] = {
        kind: 'fix',
        id,
        text: text.text,
        arrangementAdvice: advice === null ? null : advice.text,
        safety: node.safety,
        inlineControls,
        controlRefs,
        checkOnConsole: hasUnverified(inlineControls) || hasUnverified(controlRefs) || text.needsConsoleCheck,
        deferredUntilAfterService: false,
      };
      continue;
    }

    const helpText = resolveText(node.text, context);
    resolvedNodes[id] = {
      kind: 'askForHelp',
      id,
      text: helpText.text,
      safety: node.safety,
      inlineControls: helpText.controls,
      checkOnConsole: hasUnverified(helpText.controls) || helpText.needsConsoleCheck,
    };
  }

  return {
    id: tree.id,
    symptom: tree.symptom,
    group: tree.group,
    targetPicker: tree.targetPicker,
    entryNodeId: destinationId(entry),
    nodes: resolvedNodes,
  };
}
