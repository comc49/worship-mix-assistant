import { ConsoleFactKey, ConsoleProfile } from '../consoles/console-profile';
import { WING_COMPACT_PROFILE } from '../consoles/wing-compact-profile';
import { X32_PROFILE } from '../consoles/x32-profile';
import { buildMixPlan } from '../engine';
import { SYMPTOM_GROUPS, TROUBLESHOOTING_TREES } from '../knowledge/troubleshooting';
import { RiskyChange, TroubleshootingNode, TroubleshootingTree } from '../knowledge/troubleshooting/types';
import { BandMember, Role, Room, ServiceSetup } from '../model';
import {
  FIXTURE_DRY_ROOM,
  FIXTURE_FULL_BAND,
  FIXTURE_IN_EARS,
  FIXTURE_LIVE_ROOM,
  FIXTURE_NEUTRAL_ROOM,
  FIXTURE_STRIPPED_BAND,
  FIXTURE_WEDGES,
} from '../testing/fixtures';
import { ResolvedNode, ResolvedTree, TroubleshootContext, TroubleshootSituation, TroubleTarget } from './context';
import { isTreeRelevant } from './conditions';
import { resolveTree } from './resolver';
import { buildTroubleshootingReviewMarkdown } from './review';
import { listTargetOptions } from './targets';
import { walkTree } from './walker';

const PROFILES: ConsoleProfile[] = [X32_PROFILE, WING_COMPACT_PROFILE];
const SITUATIONS: TroubleshootSituation[] = ['rehearsal', 'service'];
const ROOMS: Room[] = [FIXTURE_LIVE_ROOM, FIXTURE_DRY_ROOM, FIXTURE_NEUTRAL_ROOM];
const STREAM_AND_OWN_SUB: ServiceSetup = { ...FIXTURE_WEDGES, separateStreamMix: true, subwooferFeed: 'ownBus' };
const SETUPS: ServiceSetup[] = [FIXTURE_WEDGES, FIXTURE_IN_EARS, STREAM_AND_OWN_SUB];
const ACOUSTIC_KIT_BAND: BandMember[] = [
  ...FIXTURE_FULL_BAND,
  { id: 'm-kick', name: 'Kick player', roles: [{ role: 'kick', skill: 'intermediate', connection: 'dynamicMic', vocal: null }] },
];
const BANDS: BandMember[][] = [FIXTURE_FULL_BAND, FIXTURE_STRIPPED_BAND, ACOUSTIC_KIT_BAND, []];

const SKILL_WORDS = /beginner|intermediate|advanced/i;
const UNRESOLVED_TOKEN = /\{[^}]*\}/;
const SOLO_IN_PLACE = /solo[\s-]*in[\s-]*place|\bSIP\b/i;
/** Solo-in-place may only ever be named as something to avoid. Telling the mixer to use it is forbidden. */
const ENABLE_SOLO_IN_PLACE = /\b(enable|switch on|turn on|switch to|select|choose|use|set)\b[^.]{0,40}(solo[\s-]*in[\s-]*place|\bSIP\b)/i;
const SOLO_CAUTION = /make sure the console is not in a solo-in-place mode/i;
const SOLO_RULED_OUT = /this console has no solo-in-place mode/i;
const PRESSES_SOLO = /\bsolo button\b/i;
/** Wording that tells the mixer to CHANGE phantom power, as opposed to looking at it or reporting it. */
const CHANGE_PHANTOM = /\b(switch|turn|put)\b[^.]{0,40}(phantom|48 ?V)[^.]{0,20}\bon\b/i;

/** Wording that must never be reachable while a service is running. */
const FORBIDDEN_DURING_SERVICE: { name: string; pattern: RegExp }[] = [
  { name: 'raising gain', pattern: /\b(raise|increase|turn up|add|more|push|bring up|boost)\b[^.]{0,40}\bgain\b(?! reduction)/i },
  { name: 'routing changes', pattern: /\brouting\b|\bre-?route|\bpatch|\breassign|\bassign the channel/i },
  { name: 'scene loads', pattern: /\bscenes?\b|\bsnapshots?\b/i },
  { name: 'using solo-in-place', pattern: ENABLE_SOLO_IN_PLACE },
];

/** Console facts whose only use is a change that is not allowed during a service. */
const REHEARSAL_ONLY_FACTS: ConsoleFactKey[] = ['phantomPower', 'saveScene', 'setBusAsGroup', 'removeChannelFromMain', 'fxInsertProcedure'];

interface Scenario {
  label: string;
  context: TroubleshootContext;
}

function buildScenarios(): Scenario[] {
  const scenarios: Scenario[] = [];
  for (const band of BANDS) {
    for (const room of ROOMS) {
      for (const serviceSetup of SETUPS) {
        const plan = buildMixPlan(band, room, serviceSetup);
        const firstChannel = plan.channels[0];
        const targets: (TroubleTarget | null)[] = [null, { kind: 'group', dcaId: 'harmonyVocals' }];
        if (firstChannel !== undefined) {
          targets.push({ kind: 'channel', channelId: firstChannel.id });
        }
        for (const profile of PROFILES) {
          for (const situation of SITUATIONS) {
            for (const target of targets) {
              scenarios.push({
                label: `${band.length} members, ${room.name}, ${serviceSetup.monitorType}, ${profile.name}, ${situation}, target ${target?.kind ?? 'none'}`,
                context: { band, room, serviceSetup, plan, profile, situation, target },
              });
            }
          }
        }
      }
    }
  }
  return scenarios;
}

const SCENARIOS = buildScenarios();

function textsOf(node: ResolvedNode): string[] {
  if (node.kind === 'check') {
    return [node.action, node.question];
  }
  if (node.kind === 'fix') {
    const texts = [node.text, ...node.controlRefs.map((control) => control.text)];
    if (node.arrangementAdvice !== null) {
      texts.push(node.arrangementAdvice);
    }
    return texts;
  }
  return [node.text];
}

/**
 * The node's own wording with the console's control names taken out. The safety wording rules
 * apply to what the tree says, not to a console label such as "ROUTING, SOURCES".
 */
function wordingWithoutControlNames(node: ResolvedNode): string {
  const ownTexts = node.kind === 'fix' ? [node.text, node.arrangementAdvice ?? ''] : textsOf(node);
  let wording = ownTexts.join(' ');
  for (const control of node.inlineControls) {
    wording = wording.split(control.text).join('');
  }
  return wording;
}

/** Every path from the entry must end in a fix or ask-for-help node. Returns the number of paths. */
function countPaths(tree: ResolvedTree, nodeId: string, pathSoFar: string[]): number {
  const node = tree.nodes[nodeId];
  if (node === undefined) {
    throw new Error(`${tree.id}: missing resolved node "${nodeId}" after ${pathSoFar.join(' > ')}`);
  }
  if (pathSoFar.includes(nodeId)) {
    throw new Error(`${tree.id}: cycle through "${nodeId}" after ${pathSoFar.join(' > ')}`);
  }
  if (node.kind !== 'check') {
    return 1;
  }
  const nextPath = [...pathSoFar, nodeId];
  return countPaths(tree, node.yes, nextPath) + countPaths(tree, node.no, nextPath);
}

function rawEdges(node: TroubleshootingNode): string[] {
  const edges: string[] = [];
  if (node.kind === 'check') {
    edges.push(node.yes, node.no);
  }
  if (node.kind !== 'askForHelp' && node.duringService !== undefined) {
    edges.push(node.duringService);
  }
  if (node.when !== undefined) {
    edges.push(node.when.otherwise);
  }
  return edges;
}

function assertNoCycle(tree: TroubleshootingTree, nodeId: string, pathSoFar: string[]): void {
  if (pathSoFar.includes(nodeId)) {
    throw new Error(`${tree.id}: cycle through "${nodeId}" after ${pathSoFar.join(' > ')}`);
  }
  const node = tree.nodes[nodeId];
  if (node === undefined) {
    throw new Error(`${tree.id}: "${nodeId}" does not exist (after ${pathSoFar.join(' > ')})`);
  }
  for (const next of rawEdges(node)) {
    assertNoCycle(tree, next, [...pathSoFar, nodeId]);
  }
}

function riskyChangesOf(node: TroubleshootingNode): RiskyChange[] {
  if (node.kind === 'askForHelp') {
    return [];
  }
  return node.risky ?? [];
}

function rawTextOf(node: TroubleshootingNode): string {
  if (node.kind === 'check') {
    return `${node.action} ${node.question}`;
  }
  if (node.kind === 'fix') {
    const advice = node.arrangementAdvice;
    if (advice === undefined) {
      return node.text;
    }
    const adviceText = typeof advice === 'string' ? advice : advice.map((line) => line.text).join(' ');
    return `${node.text} ${adviceText}`;
  }
  return node.text;
}

function isLooksOnlyCheck(node: TroubleshootingNode | ResolvedNode): boolean {
  return node.kind === 'check' && node.looksOnly === true;
}

function findTree(treeId: string): TroubleshootingTree {
  const tree = TROUBLESHOOTING_TREES.find((entry) => entry.id === treeId);
  if (tree === undefined) {
    throw new Error(`No tree "${treeId}"`);
  }
  return tree;
}

function contextFor(band: BandMember[], room: Room, serviceSetup: ServiceSetup, profile: ConsoleProfile, situation: TroubleshootSituation): TroubleshootContext {
  return { band, room, serviceSetup, plan: buildMixPlan(band, room, serviceSetup), profile, situation, target: null };
}

function memberNameForRole(band: BandMember[], role: Role): string {
  const member = band.find((entry) => entry.roles.some((memberRole) => memberRole.role === role));
  if (member === undefined) {
    throw new Error(`The fixture band has nobody on ${role}`);
  }
  return member.name;
}

describe('troubleshooting trees (raw data)', () => {
  it('covers every symptom in the brief', () => {
    const ids = TROUBLESHOOTING_TREES.map((tree) => tree.id);
    const required = [
      'noSound',
      'feedbackLow',
      'feedbackMid',
      'feedbackHigh',
      'muddy',
      'harsh',
      'thin',
      'vocalsBuried',
      'vocalsHarsh',
      'leadVocalPops',
      'bassBoomy',
      'bassInaudible',
      'kickNoPunch',
      'guitarTooLoud',
      'guitarThin',
      'guitarHarsh',
      'keysFightGuitars',
      'keysFightBass',
      'tooLoud',
      'chorusNoLift',
      'humOrBuzz',
      'distortion',
      'cannotHear',
      'streamDifferent',
    ];
    for (const id of required) {
      expect(ids, `missing tree ${id}`).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('puts every tree in a group that the picker shows', () => {
    const groupIds = SYMPTOM_GROUPS.map((group) => group.id);
    for (const tree of TROUBLESHOOTING_TREES) {
      expect(groupIds).toContain(tree.group);
    }
  });

  it('has no cycle and no dangling node id in any tree', () => {
    for (const tree of TROUBLESHOOTING_TREES) {
      for (const nodeId of Object.keys(tree.nodes)) {
        assertNoCycle(tree, nodeId, []);
      }
    }
  });

  it('can reach every node from the entry', () => {
    for (const tree of TROUBLESHOOTING_TREES) {
      const reached = new Set<string>();
      const queue: string[] = [tree.entryNodeId];
      while (queue.length > 0) {
        const nodeId = queue.shift() as string;
        if (reached.has(nodeId)) {
          continue;
        }
        reached.add(nodeId);
        queue.push(...rawEdges(tree.nodes[nodeId]));
      }
      const unreachable = Object.keys(tree.nodes).filter((nodeId) => !reached.has(nodeId));
      expect(unreachable, `${tree.id}: unreachable nodes`).toEqual([]);
    }
  });

  it('gives every node a safety flag, and every check one action and one question', () => {
    for (const tree of TROUBLESHOOTING_TREES) {
      for (const [nodeId, node] of Object.entries(tree.nodes)) {
        expect(['safeDuringService', 'rehearsalOnly'], `${tree.id}.${nodeId}`).toContain(node.safety);
        if (node.kind === 'check') {
          expect(node.action.length, `${tree.id}.${nodeId} action`).toBeGreaterThan(0);
          expect(node.question.trim().endsWith('?'), `${tree.id}.${nodeId} question`).toBe(true);
          expect(node.question.split('?').length, `${tree.id}.${nodeId} asks one question`).toBe(2);
        }
      }
    }
  });

  it('makes every risky change rehearsal only, except turning gain down', () => {
    for (const tree of TROUBLESHOOTING_TREES) {
      for (const [nodeId, node] of Object.entries(tree.nodes)) {
        const risky = riskyChangesOf(node);
        const riskyOtherThanGainDown = risky.filter((change) => change !== 'gainDown');
        if (riskyOtherThanGainDown.length > 0) {
          expect(node.safety, `${tree.id}.${nodeId}`).toBe('rehearsalOnly');
        }
      }
    }
  });

  it('only lets a safe node touch the preamp gain to turn it down, and never the rehearsal-only controls', () => {
    for (const tree of TROUBLESHOOTING_TREES) {
      for (const [nodeId, node] of Object.entries(tree.nodes)) {
        if (node.safety === 'rehearsalOnly') {
          continue;
        }
        // Looking is always safe: a looks-only check may name any control, because it changes nothing.
        if (isLooksOnlyCheck(node)) {
          expect(node.kind === 'check' && node.risky, `${tree.id}.${nodeId}`).toBeUndefined();
          continue;
        }
        const rawText = rawTextOf(node);
        expect(CHANGE_PHANTOM.test(rawText), `${tree.id}.${nodeId} changes phantom power`).toBe(false);
        const listedKeys: ConsoleFactKey[] = node.kind === 'fix' ? node.controlRefs : [];
        for (const key of REHEARSAL_ONLY_FACTS) {
          expect(rawText.includes(`{control:${key}`), `${tree.id}.${nodeId} names ${key}`).toBe(false);
          expect(listedKeys, `${tree.id}.${nodeId} lists ${key}`).not.toContain(key);
        }
        const touchesGain = rawText.includes('{control:preampGain') || listedKeys.includes('preampGain');
        if (touchesGain) {
          expect(riskyChangesOf(node), `${tree.id}.${nodeId}`).toEqual(['gainDown']);
        }
      }
    }
  });

  it('never types a console control name into tree text', () => {
    // Words that only exist as labels on one of the two consoles.
    const consoleWords = /\bLO CUT\b|\bLC FREQ\b|\bTHR\b|\bdyn tab\b|\bBUS\/MATRIX\b|\bINS 1\b|\bHome screen\b|\bencoder\b|\bPRE FDR\b/;
    for (const tree of TROUBLESHOOTING_TREES) {
      for (const [nodeId, node] of Object.entries(tree.nodes)) {
        expect(consoleWords.test(rawTextOf(node)), `${tree.id}.${nodeId}`).toBe(false);
      }
    }
  });

  it('never types solo-in-place into a tree: the caution comes from the {soloCaution} token on every step that presses solo', () => {
    let stepsThatPressSolo = 0;
    for (const tree of TROUBLESHOOTING_TREES) {
      for (const [nodeId, node] of Object.entries(tree.nodes)) {
        const rawText = rawTextOf(node);
        expect(SOLO_IN_PLACE.test(rawText), `${tree.id}.${nodeId}`).toBe(false);
        expect(/does not change what the room hears/i.test(rawText), `${tree.id}.${nodeId} claims solo is harmless`).toBe(false);
        if (PRESSES_SOLO.test(rawText)) {
          stepsThatPressSolo = stepsThatPressSolo + 1;
          expect(rawText.includes('{soloCaution}'), `${tree.id}.${nodeId}`).toBe(true);
        }
      }
    }
    expect(stepsThatPressSolo).toBe(3);
  });

  it('says which instruments each instrument-specific tree needs', () => {
    expect(findTree('bassBoomy').needsOneOfEach).toEqual([['bassGuitar', 'synthBass']]);
    expect(findTree('bassInaudible').needsOneOfEach).toEqual([['bassGuitar', 'synthBass']]);
    expect(findTree('guitarTooLoud').needsOneOfEach).toEqual([['electricGuitar']]);
    expect(findTree('guitarThin').needsOneOfEach).toEqual([['electricGuitar']]);
    expect(findTree('guitarHarsh').needsOneOfEach).toEqual([['electricGuitar']]);
    expect(findTree('keysFightGuitars').needsOneOfEach).toEqual([['keys'], ['acousticGuitar', 'electricGuitar']]);
    expect(findTree('keysFightBass').needsOneOfEach).toEqual([['keys'], ['bassGuitar', 'synthBass']]);
    expect(findTree('kickNoPunch').needsOneOfEach).toEqual([['kick', 'electronicDrums', 'cajon']]);
    expect(findTree('muddy').needsOneOfEach).toEqual([]);
  });
});

describe('resolveTree', () => {
  it('ends every path in a fix or an ask-for-help node, in every scenario', () => {
    expect(SCENARIOS.length).toBeGreaterThan(100);
    for (const scenario of SCENARIOS) {
      for (const tree of TROUBLESHOOTING_TREES) {
        const resolved = resolveTree(tree, scenario.context);
        const paths = countPaths(resolved, resolved.entryNodeId, []);
        expect(paths, `${tree.id} in ${scenario.label}`).toBeGreaterThan(0);
      }
    }
  });

  it('leaves no unresolved token and no skill word in any resolved text', () => {
    for (const scenario of SCENARIOS) {
      for (const tree of TROUBLESHOOTING_TREES) {
        const resolved = resolveTree(tree, scenario.context);
        for (const node of Object.values(resolved.nodes)) {
          for (const text of textsOf(node)) {
            const where = `${tree.id}.${node.id} in ${scenario.label}: ${text}`;
            expect(text.length, where).toBeGreaterThan(0);
            expect(UNRESOLVED_TOKEN.test(text), where).toBe(false);
            expect(SKILL_WORDS.test(text), where).toBe(false);
          }
          const wording = wordingWithoutControlNames(node);
          expect(ENABLE_SOLO_IN_PLACE.test(wording), `${tree.id}.${node.id} in ${scenario.label}`).toBe(false);
          expect(/does not change what the room hears/i.test(wording) && !SOLO_RULED_OUT.test(wording), `${tree.id}.${node.id} claims solo is harmless`).toBe(false);
          if (PRESSES_SOLO.test(wording)) {
            expect(SOLO_CAUTION.test(wording) || SOLO_RULED_OUT.test(wording), `${tree.id}.${node.id} in ${scenario.label}`).toBe(true);
          }
        }
      }
    }
  });

  it('resolves every console control a fix names to a fact of that console, with non-empty text', () => {
    for (const profile of PROFILES) {
      const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
      const context: TroubleshootContext = { band: FIXTURE_FULL_BAND, room: FIXTURE_LIVE_ROOM, serviceSetup: FIXTURE_WEDGES, plan, profile, situation: 'rehearsal', target: null };
      for (const tree of TROUBLESHOOTING_TREES) {
        const resolved = resolveTree(tree, context);
        for (const [nodeId, rawNode] of Object.entries(tree.nodes)) {
          if (rawNode.kind !== 'fix') {
            continue;
          }
          for (const key of rawNode.controlRefs) {
            expect(Object.keys(profile.facts), `${tree.id}.${nodeId}: ${key} on ${profile.name}`).toContain(key);
          }
          const resolvedNode = resolved.nodes[nodeId];
          if (resolvedNode === undefined || resolvedNode.kind !== 'fix') {
            continue;
          }
          expect(resolvedNode.controlRefs.length, `${tree.id}.${nodeId} on ${profile.name}`).toBe(rawNode.controlRefs.length);
          for (const control of resolvedNode.controlRefs) {
            expect(control.text.trim().length).toBeGreaterThan(0);
            expect(control.label).not.toBe(control.key);
          }
        }
      }
    }
  });

  it('flags a step "check on your console" when it names an unverified fact', () => {
    const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const base = { band: FIXTURE_FULL_BAND, room: FIXTURE_LIVE_ROOM, serviceSetup: FIXTURE_WEDGES, plan, situation: 'rehearsal' as const, target: null };
    const distortion = TROUBLESHOOTING_TREES.find((tree) => tree.id === 'distortion') as TroubleshootingTree;

    // Preamp gain is verified on the X32 and unverified on the WING Compact.
    const onX32 = resolveTree(distortion, { ...base, profile: X32_PROFILE }).nodes['fixGainDown'];
    const onWing = resolveTree(distortion, { ...base, profile: WING_COMPACT_PROFILE }).nodes['fixGainDown'];
    expect(onX32.checkOnConsole).toBe(false);
    expect(onWing.checkOnConsole).toBe(true);

    for (const scenario of SCENARIOS) {
      for (const tree of TROUBLESHOOTING_TREES) {
        for (const node of Object.values(resolveTree(tree, scenario.context).nodes)) {
          const listed = node.kind === 'fix' ? node.controlRefs : [];
          const anyUnverified = [...node.inlineControls, ...listed].some((control) => !control.verified);
          const carriesSoloCaution = SOLO_CAUTION.test(textsOf(node).join(' '));
          expect(node.checkOnConsole, `${tree.id}.${node.id} in ${scenario.label}`).toBe(anyUnverified || carriesSoloCaution);
        }
      }
    }
  });

  it('shows nothing that is rehearsal only, and no forbidden suggestion, during a service', () => {
    const serviceScenarios = SCENARIOS.filter((scenario) => scenario.context.situation === 'service');
    for (const scenario of serviceScenarios) {
      for (const tree of TROUBLESHOOTING_TREES) {
        const resolved = resolveTree(tree, scenario.context);
        for (const node of Object.values(resolved.nodes)) {
          const where = `${tree.id}.${node.id} in ${scenario.label}`;
          expect(node.safety, where).toBe('safeDuringService');
          const wording = wordingWithoutControlNames(node);
          for (const forbidden of FORBIDDEN_DURING_SERVICE) {
            expect(forbidden.pattern.test(wording), `${where} suggests ${forbidden.name}: ${wording}`).toBe(false);
          }
          if (isLooksOnlyCheck(node)) {
            continue;
          }
          expect(CHANGE_PHANTOM.test(wording), `${where} changes phantom power: ${wording}`).toBe(false);
          if (node.kind !== 'askForHelp') {
            expect(/phantom|48 ?V/i.test(wording), `${where} mentions phantom power: ${wording}`).toBe(false);
          }
          for (const control of node.inlineControls) {
            expect(REHEARSAL_ONLY_FACTS, where).not.toContain(control.key);
          }
        }
      }
    }
  });

  it('only names the preamp gain during a service on the "turn it down" fix for a clipping input', () => {
    const serviceScenarios = SCENARIOS.filter((scenario) => scenario.context.situation === 'service');
    for (const scenario of serviceScenarios) {
      for (const tree of TROUBLESHOOTING_TREES) {
        for (const node of Object.values(resolveTree(tree, scenario.context).nodes)) {
          const listed = node.kind === 'fix' ? node.controlRefs : [];
          const namesGain = [...node.inlineControls, ...listed].some((control) => control.key === 'preampGain');
          if (namesGain && isLooksOnlyCheck(node)) {
            expect(`${tree.id}.${node.id}`).toBe('noSound.gainLook');
            continue;
          }
          if (namesGain) {
            expect(`${tree.id}.${node.id}`).toBe('distortion.fixGainDown');
            expect(textsOf(node).join(' ')).toMatch(/gain of that input down/i);
          }
        }
      }
    }
  });

  it('never suggests turning a band up to find feedback during a service, and mutes before anything else', () => {
    const feedbackTrees = TROUBLESHOOTING_TREES.filter((tree) => tree.group === 'feedback');
    expect(feedbackTrees.length).toBe(3);
    const serviceScenarios = SCENARIOS.filter((scenario) => scenario.context.situation === 'service');
    for (const scenario of serviceScenarios) {
      for (const tree of feedbackTrees) {
        const resolved = resolveTree(tree, scenario.context);
        const entry = resolved.nodes[resolved.entryNodeId];
        expect(entry.kind).toBe('check');
        expect(textsOf(entry).join(' ')).toMatch(/\bmute\b/i);
        for (const node of Object.values(resolved.nodes)) {
          expect(/boost/i.test(textsOf(node).join(' ')), `${tree.id}.${node.id}`).toBe(false);
        }
      }
    }
  });

  it('checks the monitor send before the main mix when wedges are in use, and skips that with in-ears', () => {
    const tree = TROUBLESHOOTING_TREES.find((entry) => entry.id === 'feedbackMid') as TroubleshootingTree;
    const base = { band: FIXTURE_FULL_BAND, room: FIXTURE_LIVE_ROOM, profile: X32_PROFILE, situation: 'service' as const, target: null };
    const withWedges = resolveTree(tree, { ...base, serviceSetup: FIXTURE_WEDGES, plan: buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES) });
    const withInEars = resolveTree(tree, { ...base, serviceSetup: FIXTURE_IN_EARS, plan: buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_IN_EARS) });

    const afterMuteWithWedges = walkTree(withWedges, ['yes']).current;
    expect(afterMuteWithWedges.id).toBe('wedgeTest');
    const afterMuteWithInEars = walkTree(withInEars, ['yes']).current;
    expect(afterMuteWithInEars.id).toBe('cheapCheck');
    expect(withInEars.nodes['wedgeTest']).toBeUndefined();
  });

  it('hides the rehearsal-only sweep during a service and shows the safe cut instead', () => {
    const tree = TROUBLESHOOTING_TREES.find((entry) => entry.id === 'feedbackHigh') as TroubleshootingTree;
    const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_IN_EARS);
    const base = { band: FIXTURE_FULL_BAND, room: FIXTURE_LIVE_ROOM, serviceSetup: FIXTURE_IN_EARS, plan, profile: X32_PROFILE, target: null };

    const rehearsal = walkTree(resolveTree(tree, { ...base, situation: 'rehearsal' }), ['yes', 'no']);
    expect(rehearsal.current.id).toBe('sweepWithACut');
    expect(rehearsal.current.safety).toBe('rehearsalOnly');

    const service = walkTree(resolveTree(tree, { ...base, situation: 'service' }), ['yes', 'no']);
    expect(service.current.id).toBe('fixServiceCut');
    expect(service.current.kind).toBe('fix');
  });

  it('replaces a rehearsal-only fix that has no safe alternative with an "after the service" note', () => {
    const tree: TroubleshootingTree = {
      id: 'testTree',
      symptom: 'Test',
      group: 'wholeMix',
      targetPicker: 'none',
      needsOneOfEach: [],
      entryNodeId: 'look',
      nodes: {
        look: { kind: 'check', action: 'Look.', question: 'Is it off?', yes: 'riskyFix', no: 'hiddenCheck', safety: 'safeDuringService' },
        riskyFix: { kind: 'fix', text: 'Do the risky thing.', safety: 'rehearsalOnly', controlRefs: [], risky: ['routing'] },
        hiddenCheck: { kind: 'check', action: 'Try.', question: 'Better?', yes: 'riskyFix', no: 'help', safety: 'rehearsalOnly' },
        help: { kind: 'askForHelp', text: 'Ask.', safety: 'safeDuringService' },
      },
    };
    const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const context: TroubleshootContext = { band: FIXTURE_FULL_BAND, room: FIXTURE_LIVE_ROOM, serviceSetup: FIXTURE_WEDGES, plan, profile: X32_PROFILE, situation: 'service', target: null };
    const resolved = resolveTree(tree, context);

    const afterYes = walkTree(resolved, ['yes']).current;
    expect(afterYes.kind).toBe('fix');
    expect(afterYes.kind === 'fix' && afterYes.deferredUntilAfterService).toBe(true);
    expect(afterYes.safety).toBe('safeDuringService');
    expect(afterYes.kind === 'fix' && afterYes.text).not.toContain('risky');

    // The hidden check is skipped through its "no" path.
    const afterNo = walkTree(resolved, ['no']).current;
    expect(afterNo.kind).toBe('askForHelp');
  });

  it('uses the room: a live room starts "muddy" with the number of sources, a dry room starts "thin" with low cuts', () => {
    const muddy = TROUBLESHOOTING_TREES.find((entry) => entry.id === 'muddy') as TroubleshootingTree;
    const thin = TROUBLESHOOTING_TREES.find((entry) => entry.id === 'thin') as TroubleshootingTree;
    const contextFor = (room: Room): TroubleshootContext => ({
      band: FIXTURE_FULL_BAND,
      room,
      serviceSetup: FIXTURE_WEDGES,
      plan: buildMixPlan(FIXTURE_FULL_BAND, room, FIXTURE_WEDGES),
      profile: X32_PROFILE,
      situation: 'service',
      target: null,
    });

    expect(resolveTree(muddy, contextFor(FIXTURE_LIVE_ROOM)).entryNodeId).toBe('liveSourceCount');
    expect(walkTree(resolveTree(muddy, contextFor(FIXTURE_LIVE_ROOM)), ['no']).current.id).toBe('liveLowMidCuts');
    expect(resolveTree(muddy, contextFor(FIXTURE_DRY_ROOM)).entryNodeId).toBe('lowCutLook');

    expect(resolveTree(thin, contextFor(FIXTURE_DRY_ROOM)).entryNodeId).toBe('dryLowCutLook');
    expect(walkTree(resolveTree(thin, contextFor(FIXTURE_DRY_ROOM)), ['no']).current.id).toBe('dryReverbLook');
    expect(resolveTree(thin, contextFor(FIXTURE_LIVE_ROOM)).entryNodeId).toBe('lowEndTest');
  });

  it('uses the band: "bass boomy" checks uneven playing and compression before EQ when that is likely', () => {
    const tree = TROUBLESHOOTING_TREES.find((entry) => entry.id === 'bassBoomy') as TroubleshootingTree;
    const steadyBand: BandMember[] = FIXTURE_FULL_BAND.map((member) => ({
      ...member,
      roles: member.roles.map((memberRole) => ({ ...memberRole, skill: 'advanced' as const })),
    }));
    const contextFor = (band: BandMember[]): TroubleshootContext => ({
      band,
      room: FIXTURE_LIVE_ROOM,
      serviceSetup: FIXTURE_WEDGES,
      plan: buildMixPlan(band, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES),
      profile: X32_PROFILE,
      situation: 'rehearsal',
      target: null,
    });

    // The fixture's bass is at the lowest skill level.
    const likely = resolveTree(tree, contextFor(FIXTURE_FULL_BAND));
    expect(walkTree(likely, ['yes']).current.id).toBe('unevenListen');
    expect(walkTree(likely, ['yes', 'yes']).current.id).toBe('compressorLookFirst');

    const unlikely = resolveTree(tree, contextFor(steadyBand));
    expect(walkTree(unlikely, ['yes']).current.id).toBe('lowCutLook');
    expect(unlikely.nodes['unevenListen']).toBeUndefined();
  });

  it('fills in member names, plan values and console names', () => {
    const tree = TROUBLESHOOTING_TREES.find((entry) => entry.id === 'bassBoomy') as TroubleshootingTree;
    const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const base = { band: FIXTURE_FULL_BAND, room: FIXTURE_LIVE_ROOM, serviceSetup: FIXTURE_WEDGES, plan, situation: 'rehearsal' as const, target: null };

    const onX32 = resolveTree(tree, { ...base, profile: X32_PROFILE });
    const lowCutOnX32 = onX32.nodes['lowCutLook'];
    expect(lowCutOnX32.kind === 'check' && lowCutOnX32.action).toContain('Low Cut');
    expect(lowCutOnX32.kind === 'check' && lowCutOnX32.question).toContain('35 Hz');

    const onWing = resolveTree(tree, { ...base, profile: WING_COMPACT_PROFILE });
    const lowCutOnWing = onWing.nodes['lowCutLook'];
    expect(lowCutOnWing.kind === 'check' && lowCutOnWing.action).toContain('LO CUT');

    const compressorFix = onX32.nodes['fixCompressorFirst'];
    const bassistName = memberNameForRole(FIXTURE_FULL_BAND, 'bassGuitar');
    expect(compressorFix.kind === 'fix' && compressorFix.arrangementAdvice).toContain(`ask ${bassistName} to aim`);
    expect(compressorFix.kind === 'fix' && compressorFix.text).toContain('7 dB');

    // With nobody on bass, the text falls back to a role word.
    const emptyPlan = buildMixPlan([], FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const emptyBand = resolveTree(tree, { ...base, band: [], plan: emptyPlan, profile: X32_PROFILE });
    const fallbackFix = emptyBand.nodes['fixCompressorLast'];
    expect(fallbackFix.kind === 'fix' && fallbackFix.arrangementAdvice).toContain('ask the bassist to aim');
  });

  it('names the picked channel, and offers groups only where the tree allows them', () => {
    const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const leadVocal = plan.channels.find((channel) => channel.role === 'leadVocal');
    expect(leadVocal).toBeDefined();
    const target: TroubleTarget = { kind: 'channel', channelId: leadVocal?.id ?? '' };
    const noSound = TROUBLESHOOTING_TREES.find((entry) => entry.id === 'noSound') as TroubleshootingTree;
    const context: TroubleshootContext = { band: FIXTURE_FULL_BAND, room: FIXTURE_LIVE_ROOM, serviceSetup: FIXTURE_WEDGES, plan, profile: X32_PROFILE, situation: 'service', target };
    const entry = resolveTree(noSound, context).nodes['muteState'];
    expect(entry.kind === 'check' && entry.action).toContain('the lead vocal channel (Vocalist A)');

    expect(listTargetOptions('none', plan)).toEqual([]);
    const channelOptions = listTargetOptions('channel', plan);
    expect(channelOptions.length).toBe(plan.channels.length);
    const withGroups = listTargetOptions('channelOrGroup', plan);
    expect(withGroups.length).toBeGreaterThan(channelOptions.length);
    for (const option of withGroups) {
      expect(SKILL_WORDS.test(option.label)).toBe(false);
    }
  });
});

describe('walkTree', () => {
  const tree = TROUBLESHOOTING_TREES.find((entry) => entry.id === 'distortion') as TroubleshootingTree;
  const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
  const context: TroubleshootContext = { band: FIXTURE_FULL_BAND, room: FIXTURE_LIVE_ROOM, serviceSetup: FIXTURE_WEDGES, plan, profile: X32_PROFILE, situation: 'service', target: null };
  const resolved = resolveTree(tree, context);

  it('starts at the entry with an empty trail', () => {
    const state = walkTree(resolved, []);
    expect(state.current.id).toBe('inputMeter');
    expect(state.trail).toEqual([]);
  });

  it('records the trail, and going back is dropping the last answer', () => {
    const state = walkTree(resolved, ['no', 'no']);
    expect(state.current.id).toBe('compressorLook');
    expect(state.trail.map((entry) => entry.answer)).toEqual(['no', 'no']);
    expect(state.trail[0].question).toContain('?');

    const back = walkTree(resolved, ['no']);
    expect(back.current.id).toBe('headphones');
  });

  it('stops at a fix and ignores answers given after it', () => {
    const state = walkTree(resolved, ['yes', 'yes', 'no']);
    expect(state.current.id).toBe('fixGainDown');
    expect(state.trail.length).toBe(1);
  });
});

describe('troubleshooting review document', () => {
  it('lists every tree and never contains a skill word or an unresolved token', () => {
    const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    for (const profile of PROFILES) {
      const markdown = buildTroubleshootingReviewMarkdown({ band: FIXTURE_FULL_BAND, room: FIXTURE_LIVE_ROOM, serviceSetup: FIXTURE_WEDGES, plan, profile, situation: 'rehearsal', target: null });
      for (const tree of TROUBLESHOOTING_TREES) {
        expect(markdown).toContain(`### ${tree.symptom}`);
      }
      expect(SKILL_WORDS.test(markdown)).toBe(false);
      expect(UNRESOLVED_TOKEN.test(markdown)).toBe(false);
    }
  });
});

describe('accuracy review fixes', () => {
  it('noSound during a service looks at phantom power and gain before it blames the mic, DI or input', () => {
    const tree = findTree('noSound');
    for (const profile of PROFILES) {
      const resolved = resolveTree(tree, contextFor(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES, profile, 'service'));

      // Not muted, no meter movement, nothing found on stage.
      const phantomLook = walkTree(resolved, ['no', 'no', 'no']).current;
      expect(phantomLook.id).toBe('phantomLook');
      expect(phantomLook.safety).toBe('safeDuringService');
      expect(phantomLook.kind === 'check' && phantomLook.looksOnly).toBe(true);

      const phantomOff = walkTree(resolved, ['no', 'no', 'no', 'yes']).current;
      expect(phantomOff.kind).toBe('askForHelp');
      expect(phantomOff.kind === 'askForHelp' && phantomOff.text).toMatch(/Phantom power is off.*Tell the tech lead.*Do not change it yourself during the service/);

      const gainLook = walkTree(resolved, ['no', 'no', 'no', 'no']).current;
      expect(gainLook.id).toBe('gainLook');
      expect(gainLook.kind === 'check' && gainLook.looksOnly).toBe(true);

      const gainDown = walkTree(resolved, ['no', 'no', 'no', 'no', 'yes']).current;
      expect(gainDown.kind).toBe('askForHelp');
      expect(gainDown.kind === 'askForHelp' && gainDown.text).toMatch(/gain is all the way down.*Do not change it yourself during the service/);

      // helpNoSignal is only reachable after both looks.
      const lastStep = walkTree(resolved, ['no', 'no', 'no', 'no', 'no', 'no']);
      expect(lastStep.current.id).toBe('helpNoSignal');
      expect(lastStep.trail.map((entry) => entry.nodeId)).toEqual(['muteState', 'inputMeter', 'sourceLook', 'phantomLook', 'gainLook', 'cableSwap']);

      expect(resolved.nodes['fixPhantom']).toBeUndefined();
      expect(resolved.nodes['fixGain']).toBeUndefined();
    }
  });

  it('noSound in rehearsal still offers the phantom and gain fixes, mutes before the source check, and names where to look for the main assignment', () => {
    const tree = findTree('noSound');
    for (const profile of PROFILES) {
      const resolved = resolveTree(tree, contextFor(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES, profile, 'rehearsal'));
      expect(walkTree(resolved, ['no', 'no', 'no', 'yes']).current.id).toBe('fixPhantom');
      const fixGain = walkTree(resolved, ['no', 'no', 'no', 'no', 'yes']).current;
      expect(fixGain.id).toBe('fixGain');
      expect(fixGain.kind === 'fix' && fixGain.text).toMatch(/Raise it slowly: wedges and in-ears follow the gain, not the fader/);

      const sourceLook = resolved.nodes['sourceLook'];
      expect(sourceLook.kind === 'check' && sourceLook.action.startsWith('Mute the channel first.')).toBe(true);

      const mainAssignLook = resolved.nodes['mainAssignLook'];
      expect(mainAssignLook.kind === 'check' && mainAssignLook.looksOnly).toBe(true);
      expect(mainAssignLook.inlineControls.map((control) => control.key)).toEqual(['removeChannelFromMain']);
      expect(mainAssignLook.kind === 'check' && mainAssignLook.action).toMatch(/Only look: do not press anything/);

      const helpAfterConsole = resolved.nodes['helpAfterConsole'];
      expect(helpAfterConsole.kind === 'askForHelp' && helpAfterConsole.text).not.toMatch(/amplifier|speaker/i);
      expect(helpAfterConsole.kind === 'askForHelp' && helpAfterConsole.text).toMatch(/group bus.*insert.*pan/);
    }
  });

  it('every solo step warns about solo-in-place, shows the console\'s own description, and carries the check-on-console flag', () => {
    const soloSteps: { treeId: string; nodeId: string }[] = [
      { treeId: 'distortion', nodeId: 'headphones' },
      { treeId: 'guitarThin', nodeId: 'headphones' },
      { treeId: 'guitarHarsh', nodeId: 'headphones' },
    ];
    for (const profile of PROFILES) {
      // Neither console has a verified "no solo-in-place" fact, so both must show the caution.
      const soloFact = profile.facts.soloInPlaceExists;
      const ruledOut = soloFact.source.status === 'verified' && soloFact.value === false;
      expect(ruledOut).toBe(false);

      for (const soloStep of soloSteps) {
        for (const situation of SITUATIONS) {
          const resolved = resolveTree(findTree(soloStep.treeId), contextFor(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES, profile, situation));
          const node = resolved.nodes[soloStep.nodeId];
          expect(node.kind).toBe('check');
          const action = node.kind === 'check' ? node.action : '';
          expect(action).toMatch(SOLO_CAUTION);
          expect(action).toMatch(/solo mutes everything else in the room/);
          expect(action).toContain(String(profile.facts.soloBehavior.value));
          expect(action).not.toMatch(/does not change what the room hears\.? ?$/);
          expect(node.checkOnConsole).toBe(true);
          expect(ENABLE_SOLO_IN_PLACE.test(wordingWithoutControlNames(node))).toBe(false);
        }
      }
    }
  });

  it('drops the solo caution only for a console with a verified "no solo-in-place" fact', () => {
    const profileWithoutSip: ConsoleProfile = {
      ...X32_PROFILE,
      facts: {
        ...X32_PROFILE.facts,
        soloInPlaceExists: { value: false, source: { status: 'verified', manual: 'Test manual', section: 'Test', page: 1, quote: 'test', note: '' } },
      },
    };
    const resolved = resolveTree(findTree('distortion'), contextFor(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES, profileWithoutSip, 'service'));
    const node = resolved.nodes['headphones'];
    expect(node.kind === 'check' && node.action).toMatch(SOLO_RULED_OUT);
    expect(node.kind === 'check' && node.action).not.toMatch(SOLO_CAUTION);
    expect(node.checkOnConsole).toBe(false);
  });

  it('offers a band only the trees for instruments it has, and offers an empty band everything', () => {
    const relevantIds = (band: BandMember[]): string[] => TROUBLESHOOTING_TREES.filter((tree) => isTreeRelevant(tree, band)).map((tree) => tree.id);

    expect(relevantIds([]).length).toBe(TROUBLESHOOTING_TREES.length);
    expect(relevantIds(FIXTURE_FULL_BAND).length).toBe(TROUBLESHOOTING_TREES.length);

    // The stripped band: a singer with an acoustic guitar, a cajon and keys.
    const strippedIds = relevantIds(FIXTURE_STRIPPED_BAND);
    for (const hiddenId of ['bassBoomy', 'bassInaudible', 'keysFightBass', 'guitarTooLoud', 'guitarThin', 'guitarHarsh']) {
      expect(strippedIds, hiddenId).not.toContain(hiddenId);
    }
    for (const shownId of ['kickNoPunch', 'keysFightGuitars', 'vocalsBuried', 'muddy', 'noSound', 'feedbackMid', 'cannotHear']) {
      expect(strippedIds, shownId).toContain(shownId);
    }
  });

  it('never mentions a bass guitar, a pad player or a drum module to the stripped band', () => {
    const absentInstrumentWords = /bass guitar|\bbassist\b|\bbass fader\b|pad player|drum module|electric guitarist|\bthe pad\b(?! switch)/i;
    const relevantTrees = TROUBLESHOOTING_TREES.filter((tree) => isTreeRelevant(tree, FIXTURE_STRIPPED_BAND));
    const problems = new Set<string>();
    for (const profile of PROFILES) {
      for (const situation of SITUATIONS) {
        for (const room of ROOMS) {
          for (const serviceSetup of SETUPS) {
            const context = contextFor(FIXTURE_STRIPPED_BAND, room, serviceSetup, profile, situation);
            for (const tree of relevantTrees) {
              for (const node of Object.values(resolveTree(tree, context).nodes)) {
                const wording = wordingWithoutControlNames(node);
                if (absentInstrumentWords.test(wording)) {
                  problems.add(`${tree.id}.${node.id}: ${wording}`);
                }
              }
            }
          }
        }
      }
    }
    expect([...problems]).toEqual([]);
  });

  it('gives a cajon band its own "kick has no punch" branch', () => {
    const resolved = resolveTree(findTree('kickNoPunch'), contextFor(FIXTURE_STRIPPED_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES, X32_PROFILE, 'service'));
    expect(resolved.entryNodeId).toBe('cajonMicLook');
    const entry = resolved.nodes['cajonMicLook'];
    expect(entry.kind === 'check' && entry.action).toMatch(/sound hole at the back/);

    // Mic is in the right place, low cut matches the sheet: no bass in this band, so straight to the EQ cut.
    const eqStep = walkTree(resolved, ['yes', 'no']).current;
    expect(eqStep.id).toBe('cajonEq');
    expect(eqStep.kind === 'check' && eqStep.action).toMatch(/300 to 400 Hz/);
    expect(resolved.nodes['cajonBassTest']).toBeUndefined();
    expect(resolved.nodes['moduleBassTest']).toBeUndefined();
    expect(resolved.nodes['fixKickInsideModule']).toBeUndefined();

    // The full fixture band plays an electronic kit: it gets the drum module branch, with the bass test.
    const fullBand = resolveTree(findTree('kickNoPunch'), contextFor(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES, X32_PROFILE, 'rehearsal'));
    expect(fullBand.entryNodeId).toBe('moduleBassTest');
    expect(fullBand.nodes['cajonMicLook']).toBeUndefined();
  });

  it('skips the steps of the general trees that name an instrument the band does not have', () => {
    const noKeysNoBass: BandMember[] = [FIXTURE_FULL_BAND[0]];
    const context = contextFor(noKeysNoBass, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES, X32_PROFILE, 'service');

    const muddy = resolveTree(findTree('muddy'), context);
    expect(muddy.entryNodeId).toBe('liveLowMidCuts');
    expect(muddy.nodes['liveSourceCount']).toBeUndefined();
    expect(muddy.nodes['bassTest']).toBeUndefined();
    expect(muddy.nodes['keysTest']).toBeUndefined();

    const vocalsBuried = resolveTree(findTree('vocalsBuried'), context);
    expect(vocalsBuried.entryNodeId).toBe('guitarsDown');
    expect(vocalsBuried.nodes['keysDown']).toBeUndefined();

    const thin = resolveTree(findTree('thin'), context);
    expect(thin.nodes['fixFillTheMiddle']).toBeUndefined();
    expect(thin.nodes['fixFillWithReverb']).toBeDefined();
  });

  it('reads naturally on both consoles when it names a compressor or gate control', () => {
    const onX32 = resolveTree(findTree('bassBoomy'), contextFor(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES, X32_PROFILE, 'rehearsal'));
    const onWing = resolveTree(findTree('bassBoomy'), contextFor(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES, WING_COMPACT_PROFILE, 'rehearsal'));
    const x32Fix = onX32.nodes['fixCompressorFirst'];
    const wingFix = onWing.nodes['fixCompressorFirst'];
    expect(x32Fix.kind === 'fix' && x32Fix.text).toContain(`the compressor's ${X32_PROFILE.facts.compParamNames.value.threshold} down`);
    expect(wingFix.kind === 'fix' && wingFix.text).toContain(`the compressor's ${WING_COMPACT_PROFILE.facts.compParamNames.value.threshold} down`);

    // No doubled word such as "threshold (threshold (1st encoder))", and no raw property name in the list.
    for (const scenario of SCENARIOS) {
      for (const tree of TROUBLESHOOTING_TREES) {
        for (const node of Object.values(resolveTree(tree, scenario.context).nodes)) {
          for (const text of textsOf(node)) {
            expect(/\b(threshold|attack|ratio|release) \(\1\b/i.test(text), `${tree.id}.${node.id}: ${text}`).toBe(false);
            expect(/makeupGain|: threshold \(/.test(text), `${tree.id}.${node.id}: ${text}`).toBe(false);
          }
        }
      }
    }
  });
});
