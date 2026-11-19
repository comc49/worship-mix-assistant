import { ResolvedNode, ResolvedTree } from './context';

/**
 * The step-by-step walk through a resolved tree. The walk is a pure function of the tree and the
 * list of answers given so far, so "Back" is "drop the last answer" and "Start over" is "no answers".
 */

export type WalkAnswer = 'yes' | 'no';

export interface TrailEntry {
  nodeId: string;
  action: string;
  question: string;
  answer: WalkAnswer;
}

export interface WalkState {
  /** The step to show now: a check to answer, or the fix / ask-for-help the walk ended on. */
  current: ResolvedNode;
  /** The checks answered so far, oldest first. */
  trail: TrailEntry[];
}

export function walkTree(tree: ResolvedTree, answers: WalkAnswer[]): WalkState {
  const trail: TrailEntry[] = [];
  let current: ResolvedNode = tree.nodes[tree.entryNodeId];

  for (const answer of answers) {
    if (current.kind !== 'check') {
      // The tree changed under the answers (for example the situation was switched). Stop here.
      break;
    }
    trail.push({ nodeId: current.id, action: current.action, question: current.question, answer });
    const nextNodeId = answer === 'yes' ? current.yes : current.no;
    current = tree.nodes[nextNodeId];
  }

  return { current, trail };
}
