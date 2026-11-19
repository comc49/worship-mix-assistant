import { MONITOR_RULES, STREAM_DIFFERENCES } from '../rules';
import { TroubleshootingTree } from './types';

/**
 * "A musician cannot hear themselves" and "Stream mix sounds different from the room".
 * Both repeat the monitor and stream rules from src/app/core/knowledge/rules.ts.
 */

// STREAM_DIFFERENCES, by position in rules.ts.
const STREAM_FOLLOWS_ROOM = STREAM_DIFFERENCES[0];
const STREAM_VOCALS_HIGHER = STREAM_DIFFERENCES[1];
const STREAM_STAGE_SOURCES_HIGHER = STREAM_DIFFERENCES[2];
const STREAM_MORE_REVERB = STREAM_DIFFERENCES[3];
const STREAM_ON_HEADPHONES = STREAM_DIFFERENCES[4];

export const CANNOT_HEAR_TREE: TroubleshootingTree = {
  id: 'cannotHear',
  symptom: 'A musician cannot hear themselves',
  group: 'monitorsAndStream',
  targetPicker: 'channel',
  needsOneOfEach: [],
  entryNodeId: 'whatIsMissing',
  nodes: {
    whatIsMissing: {
      kind: 'check',
      action: 'Ask {targetMember} what exactly is missing: only themselves, or everything.',
      question: 'Is their whole monitor silent or very quiet?',
      yes: 'mixMasterLook',
      no: 'sendLook',
      safety: 'safeDuringService',
    },
    // The whole monitor is missing.
    mixMasterLook: {
      kind: 'check',
      action: 'Look at the master of their monitor mix: its fader and its mute.',
      question: 'Is it down or muted?',
      yes: 'fixMixMaster',
      no: 'stageEndLook',
      safety: 'safeDuringService',
    },
    fixMixMaster: {
      kind: 'fix',
      text: 'Unmute it and bring it up slowly while {targetMember} signals to you. Stop at the first hint of ringing.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    stageEndLook: {
      kind: 'check',
      action: 'Check their end on stage: the wedge is powered and plugged in, or the in-ear pack is switched on, turned up and has a good battery.',
      question: 'Did you find something off, flat or unplugged?',
      yes: 'fixStageEnd',
      no: 'helpMonitorPath',
      safety: 'safeDuringService',
    },
    fixStageEnd: {
      kind: 'fix',
      text: 'Pull the master of that monitor mix down before you plug anything in or switch it on. Fix what you found, then bring the master up slowly.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    helpMonitorPath: {
      kind: 'askForHelp',
      text: 'The mix is up on the console and the monitor is switched on, but nothing arrives. The fault is in between: an output, a cable or an amplifier. Ask the tech lead.',
      safety: 'safeDuringService',
    },
    // Only their own channel is missing.
    sendLook: {
      kind: 'check',
      action: 'Select {target} and look at its send to their monitor mix ({control:sendsScreen}).',
      question: 'Is that send down or switched off?',
      yes: 'fixSendUp',
      no: 'tapLook',
      safety: 'safeDuringService',
    },
    fixSendUp: {
      kind: 'fix',
      text: 'Bring that send up 2 to 3 dB at a time while {targetMember} signals to you. Your console sheet starts a musician\'s own channel at 0 dB in their own mix.',
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen'],
    },
    tapLook: {
      kind: 'check',
      action: 'Look at where that send is taken from. For a monitor it should be: {control:monitorSendTap}.',
      question: 'Is it set that way?',
      yes: 'othersDown',
      no: 'fixSendTap',
      safety: 'safeDuringService',
    },
    fixSendTap: {
      kind: 'fix',
      text: `Set that send to: {control:monitorSendTap}. ${MONITOR_RULES.wedgePreFaderWhy}`,
      safety: 'rehearsalOnly',
      risky: ['routing'],
      controlRefs: ['monitorSendTap', 'sendsScreen'],
      duringService: 'fixSendFollowsFader',
    },
    fixSendFollowsFader: {
      kind: 'fix',
      text: 'Right now their monitor follows your channel fader: every move you make for the room changes what they hear. Changing that is not safe while people are listening. For now, bring the send up to make up for it ({control:sendsScreen}), and avoid big fader moves on that channel. Correct it at the next rehearsal.',
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen'],
    },
    othersDown: {
      kind: 'check',
      action: 'Turn something else down before you turn them up. In their monitor mix, turn the loudest other instrument down 3 dB.',
      question: 'Can they hear themselves now?',
      yes: 'fixLessOfTheRest',
      no: 'fixOwnSendWedge',
      safety: 'safeDuringService',
    },
    fixLessOfTheRest: {
      kind: 'fix',
      text: 'Leave it there. Taking things out of a monitor mix keeps the stage quieter than adding more, and a quieter stage makes the room mix clearer too.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    fixOwnSendWedge: {
      kind: 'fix',
      when: { condition: { kind: 'wedgesInUse' }, otherwise: 'fixOwnSendInEars' },
      arrangementAdvice: 'Ask {targetMember} to stand closer to their wedge, and turn the wedge so it points at their ears and not at their knees.',
      text: `Raise their own send 2 dB at a time, and stop at the first hint of ringing. ${MONITOR_RULES.wedgeCapWhy}`,
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen'],
    },
    fixOwnSendInEars: {
      kind: 'fix',
      arrangementAdvice: 'Ask {targetMember} to check that both earpieces seal well. An earpiece that does not seal loses its low end and makes everything sound far away.',
      text: `Raise their own send 2 to 3 dB at a time until they signal that it is enough. ${MONITOR_RULES.inEarWhy}`,
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen'],
    },
  },
};

export const STREAM_DIFFERENT_TREE: TroubleshootingTree = {
  id: 'streamDifferent',
  symptom: 'Stream mix sounds different from the room',
  group: 'monitorsAndStream',
  targetPicker: 'none',
  needsOneOfEach: [],
  entryNodeId: 'headphones',
  nodes: {
    fixNoStreamMix: {
      kind: 'fix',
      text: `Your setup has no separate stream mix, so the stream gets a copy of the room mix. It will sound different: ${STREAM_VOCALS_HIGHER.why} Nothing on the console fixes that safely right now. To change it, switch on the separate stream mix on the Setup screen and build it at a rehearsal.`,
      safety: 'safeDuringService',
      controlRefs: [],
    },
    headphones: {
      kind: 'check',
      when: { condition: { kind: 'streamMixEnabled' }, otherwise: 'fixNoStreamMix' },
      action: `Listen to the stream mix on headphones. ${STREAM_ON_HEADPHONES.value}: ${STREAM_ON_HEADPHONES.why}`,
      question: 'Is every voice and instrument there in the stream mix?',
      yes: 'vocalsListen',
      no: 'streamSendLook',
      safety: 'safeDuringService',
    },
    streamSendLook: {
      kind: 'check',
      action: 'Select the channel that is missing and look at its send to the stream mix ({control:sendsScreen}).',
      question: 'Is that send down or switched off?',
      yes: 'fixStreamSendUp',
      no: 'helpStreamPath',
      safety: 'safeDuringService',
    },
    fixStreamSendUp: {
      kind: 'fix',
      text: `Bring that send up to 0 dB. ${STREAM_FOLLOWS_ROOM.value}. ${STREAM_FOLLOWS_ROOM.why}`,
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen'],
    },
    helpStreamPath: {
      kind: 'askForHelp',
      text: 'The send is up but the channel does not reach the stream. Ask the tech lead, or whoever runs the stream, to check what the stream receives.',
      safety: 'safeDuringService',
    },
    vocalsListen: {
      kind: 'check',
      action: `Listen to the words on the stream. Aim for: ${STREAM_VOCALS_HIGHER.listenFor}`,
      question: 'Are the vocals too quiet on the stream?',
      yes: 'fixStreamVocals',
      no: 'dryListen',
      safety: 'safeDuringService',
    },
    fixStreamVocals: {
      kind: 'fix',
      text: `In the stream mix: ${STREAM_VOCALS_HIGHER.value}. ${STREAM_VOCALS_HIGHER.why} Raise the vocal sends to the stream ({control:sendsScreen}), not the channel faders.`,
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen'],
    },
    dryListen: {
      kind: 'check',
      action: 'Listen to the space around the voices on the stream.',
      question: 'Does the stream sound dry, like a small closed room?',
      yes: 'fixStreamReverb',
      no: 'stageSourcesListen',
      safety: 'safeDuringService',
    },
    fixStreamReverb: {
      kind: 'fix',
      text: `In the stream mix: ${STREAM_MORE_REVERB.value}. ${STREAM_MORE_REVERB.why} Raise the sends from the effect returns to the stream mix a little at a time. ${STREAM_MORE_REVERB.listenFor}`,
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen', 'fxScreen'],
    },
    stageSourcesListen: {
      kind: 'check',
      action: 'Listen for the sources that are loud on stage: drums, cymbals and guitar amplifiers.',
      question: 'Are they too quiet on the stream?',
      yes: 'fixStreamStageSources',
      no: 'followLook',
      safety: 'safeDuringService',
    },
    fixStreamStageSources: {
      kind: 'fix',
      text: `In the stream mix: ${STREAM_STAGE_SOURCES_HIGHER.value}. ${STREAM_STAGE_SOURCES_HIGHER.why} ${STREAM_STAGE_SOURCES_HIGHER.listenFor}`,
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen'],
    },
    followLook: {
      kind: 'check',
      action: 'Move one channel fader for the room and listen to the stream.',
      question: 'Does the stream follow your fader move?',
      yes: 'fixStreamIsDifferentOnPurpose',
      no: 'fixStreamPostFader',
      safety: 'safeDuringService',
    },
    fixStreamPostFader: {
      kind: 'fix',
      text: `${STREAM_FOLLOWS_ROOM.value}. ${STREAM_FOLLOWS_ROOM.why} Set the stream sends to post-fader on the sends screen ({control:sendsScreen}).`,
      safety: 'rehearsalOnly',
      risky: ['routing'],
      controlRefs: ['sendsScreen'],
      duringService: 'fixStreamByHand',
    },
    fixStreamByHand: {
      kind: 'fix',
      text: 'The stream does not follow your room mix, and changing that is not safe while people are listening. For now, after every big move for the room, check the stream on headphones and make the same move on its send. Correct it at the next rehearsal.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    fixStreamIsDifferentOnPurpose: {
      kind: 'fix',
      text: `The stream mix is complete and follows the room. It is meant to sound a little different. Keep checking it on headphones. Listen for: ${STREAM_ON_HEADPHONES.listenFor}`,
      safety: 'safeDuringService',
      controlRefs: [],
    },
  },
};
