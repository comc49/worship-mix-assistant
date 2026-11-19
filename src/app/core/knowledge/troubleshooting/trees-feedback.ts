import { MONITOR_RULES } from '../rules';
import { ConsoleFactKey } from '../../consoles/console-profile';
import { TroubleshootingNode, TroubleshootingTree } from './types';

/**
 * Feedback. The three trees share one order, which is a safety rule:
 *   1. Mute the channel first.
 *   2. With wedges on stage, check that member's monitor send before the main mix, because the
 *      channel fader does not change a pre-fader send.
 *   3. Identify the frequency.
 *   4. Cut narrow.
 * The frequency is always searched with a CUT. Turning a band up to find a ring is never suggested.
 * Only the listening hints and the frequency ranges differ between the three trees.
 */

interface FeedbackBand {
  id: string;
  symptom: string;
  /** How the mixer recognizes this kind of feedback. */
  soundsLike: string;
  /** The range to sweep, in words. */
  sweepRange: string;
  /** Where to place the first cut when there is no time to sweep. */
  typicalStart: string;
  /** The cheap thing to look at before any EQ. */
  cheapCheckAction: string;
  cheapCheckQuestion: string;
  cheapFix: string;
  /** The console facts the cheap fix touches. */
  cheapFixControlRefs: ConsoleFactKey[];
  /** A hint about the usual cause on stage. */
  stageAdvice: string;
}

function buildFeedbackTree(band: FeedbackBand): TroubleshootingTree {
  const nodes: Record<string, TroubleshootingNode> = {
    muteFirst: {
      kind: 'check',
      action: `${band.soundsLike} Mute {target} now. If you do not know which channel it is, mute the open mics one at a time, starting with the one nearest a speaker.`,
      question: 'Did the ringing stop when a channel was muted?',
      yes: 'wedgeTest',
      no: 'fixPullEverything',
      safety: 'safeDuringService',
    },
    fixPullEverything: {
      kind: 'fix',
      text: 'Pull the main fader down 6 dB right away, and the monitor mix masters too if you can reach them. When the ringing has stopped, bring them back slowly and stop about 3 dB below where it started. If it returns, ask for help.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    wedgeTest: {
      kind: 'check',
      when: { condition: { kind: 'wedgesInUse' }, otherwise: 'cheapCheck' },
      action: 'Find out whether the ring is in a wedge before you touch the main mix. Pull the channel fader all the way down. Keep a finger on the mute button, then unmute the channel for a second or two. If it starts to ring, mute it again at once. The fader does not change what a pre-fader monitor send feeds to the wedge.',
      question: 'Did the ringing start again with the fader down?',
      yes: 'fixWedgeSend',
      no: 'cheapCheck',
      safety: 'safeDuringService',
    },
    fixWedgeSend: {
      kind: 'fix',
      arrangementAdvice: band.stageAdvice,
      text: `The ring is in a wedge, not in the room. Keep the channel muted while you work. Open the sends of that channel ({control:sendsScreen}) and turn its send down 3 dB to the monitor mix of the wedge nearest that mic. If you are not sure which mix that is, turn its send down 3 dB to every monitor mix. Unmute for a second or two with a finger on mute. If it still rings, mute again and take off another 3 dB. When it stays quiet, bring the channel fader back up for the room. ${MONITOR_RULES.wedgeCompressionNote}`,
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen'],
    },
    cheapCheck: {
      kind: 'check',
      action: band.cheapCheckAction,
      question: band.cheapCheckQuestion,
      yes: 'fixCheap',
      no: 'sweepWithACut',
      safety: 'safeDuringService',
    },
    fixCheap: {
      kind: 'fix',
      arrangementAdvice: band.stageAdvice,
      text: `${band.cheapFix} Then unmute and bring the fader up slowly, stopping 3 dB below where it rang.`,
      safety: 'safeDuringService',
      controlRefs: band.cheapFixControlRefs,
    },
    sweepWithACut: {
      kind: 'check',
      action: `Identify the frequency. Bring the fader up slowly until the ringing just starts, and stop there. Open the EQ ({control:eqScreen}), make one band narrow, cut it by 6 dB, and move it slowly through ${band.sweepRange}. Search with the cut. Never turn a band up to find a ring.`,
      question: 'Did the ringing stop at one spot?',
      yes: 'fixNarrowCut',
      no: 'fixLowerLevel',
      safety: 'rehearsalOnly',
      duringService: 'fixServiceCut',
    },
    fixNarrowCut: {
      kind: 'fix',
      arrangementAdvice: band.stageAdvice,
      text: 'Leave the narrow cut at that spot and make it only as deep as it needs to be: try 3 to 4 dB. Write the frequency down, because the same mic in the same place will ring there again.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    fixLowerLevel: {
      kind: 'fix',
      arrangementAdvice: band.stageAdvice,
      text: 'No single cut stops it, so the channel is simply too loud for where the mic stands. Take the cut out again, and run the channel 3 dB lower than where it rang.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    fixServiceCut: {
      kind: 'fix',
      arrangementAdvice: band.stageAdvice,
      text: `Unmute and bring the fader back to about 3 dB below where it rang. If it still rings there, open the EQ ({control:eqScreen}), make one band narrow, cut it by 3 dB at ${band.typicalStart}, and nudge it a little either way until the ring goes. Search with the cut only. Find the exact frequency at the next rehearsal.`,
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
  };

  return {
    id: band.id,
    symptom: band.symptom,
    group: 'feedback',
    targetPicker: 'channelOrGroup',
    needsOneOfEach: [],
    entryNodeId: 'muteFirst',
    nodes,
  };
}

export const FEEDBACK_LOW_TREE: TroubleshootingTree = buildFeedbackTree({
  id: 'feedbackLow',
  symptom: 'Feedback: low ringing',
  soundsLike: 'A low ring is a held note that hums or booms and slowly grows.',
  sweepRange: '100 to 300 Hz',
  typicalStart: 'about 200 Hz',
  cheapCheckAction: 'With the channel still muted, look at its low cut ({control:lowCutName}) and compare it with your console sheet.',
  cheapCheckQuestion: 'Is the low cut off, or set lower than the sheet says?',
  cheapFix: 'Switch the low cut on and set it to the value on your console sheet ({control:lowCutScreen}). A low ring often starts below the notes the source really needs.',
  cheapFixControlRefs: ['lowCutName', 'lowCutScreen'],
  stageAdvice: 'Between songs, ask the musician to move the mic or the instrument away from the wedge. An acoustic guitar facing a wedge rings on its own body note.',
});

export const FEEDBACK_MID_TREE: TroubleshootingTree = buildFeedbackTree({
  id: 'feedbackMid',
  symptom: 'Feedback: mid howl',
  soundsLike: 'A mid howl is a hollow "ooh" or "aah" tone that swells.',
  sweepRange: '300 Hz to 2 kHz',
  typicalStart: 'about 800 Hz',
  cheapCheckAction: 'With the channel still muted, look at how the singer holds the mic.',
  cheapCheckQuestion: 'Is a hand wrapped around the head of the mic, or is the mic pointing at a wedge?',
  cheapFix: 'Ask the singer to hold the mic by its body and to point the back of the mic at the wedge. A hand around the head of a mic makes it pick up from every side.',
  cheapFixControlRefs: [],
  stageAdvice: 'Between songs, ask the singer to hold the mic by its body, close to the mouth, with its back toward the wedge.',
});

export const FEEDBACK_HIGH_TREE: TroubleshootingTree = buildFeedbackTree({
  id: 'feedbackHigh',
  symptom: 'Feedback: high squeal',
  soundsLike: 'A high squeal is a thin whistle that appears fast.',
  sweepRange: '2 to 8 kHz',
  typicalStart: 'about 3 kHz',
  cheapCheckAction: 'With the channel still muted, open its compressor ({control:compScreen}) and look at how much it reduces and at its makeup setting.',
  cheapCheckQuestion: 'Is it set to reduce more than the sheet says, or is makeup turned up?',
  cheapFix: `Bring the compressor back to the reduction on your console sheet and set makeup to 0. ${MONITOR_RULES.wedgeNoMakeup.why}`,
  cheapFixControlRefs: ['compScreen', 'compParamNames'],
  stageAdvice: 'Between songs, ask the singer to stay behind the main speakers and to keep the mic close to the mouth. A mic held far away needs more level, and that is where a squeal starts.',
});
