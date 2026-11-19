import { DE_ESSER, MONITOR_RULES } from '../rules';
import { BAND_HAS_GUITARS, BAND_HAS_KEYS, BAND_HAS_KEYS_OR_PAD, VOCAL_ROLES } from './band-conditions';
import { ensembleAdvice } from './rule-text';
import { TroubleshootingTree } from './types';

/**
 * Vocal problems: buried, harsh or sibilant, pops or booms.
 * Order: what is in the way (arrangement and level) first, then mic technique, then EQ,
 * then compression last.
 */

export const VOCALS_BURIED_TREE: TroubleshootingTree = {
  id: 'vocalsBuried',
  symptom: 'Vocals buried',
  group: 'vocals',
  targetPicker: 'none',
  needsOneOfEach: [VOCAL_ROLES],
  entryNodeId: 'keysDown',
  nodes: {
    keysDown: {
      kind: 'check',
      when: { condition: BAND_HAS_KEYS_OR_PAD, otherwise: 'guitarsDown' },
      action: 'Pull the Keys and Pads DCA down 3 dB.',
      question: 'Can you hear the words now?',
      yes: 'fixKeysLower',
      no: 'guitarsDown',
      safety: 'safeDuringService',
    },
    fixKeysLower: {
      kind: 'fix',
      arrangementAdvice: [
        { text: 'Ask {member:keys} to play fewer notes, and higher or lower than the melody, while {member:leadVocal} sings.', when: BAND_HAS_KEYS },
        { text: 'A sung line needs space around it: whoever plays under it should play less.' },
      ],
      text: 'Leave the Keys and Pads DCA where it is now. Making room under a vocal works better than turning the vocal up.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    guitarsDown: {
      kind: 'check',
      when: { condition: BAND_HAS_GUITARS, otherwise: 'vocalUp' },
      action: 'Put everything back the way it was. Pull the Guitars DCA down 3 dB.',
      question: 'Can you hear the words now?',
      yes: 'fixGuitarsLower',
      no: 'vocalUp',
      safety: 'safeDuringService',
    },
    fixGuitarsLower: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('acousticUnderLeadVocal'),
      text: 'Leave the Guitars DCA where it is now during the verses, and bring it back up between the sung lines if the song needs it.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    vocalUp: {
      kind: 'check',
      action: 'Put everything back the way it was. Push the Lead Vocal DCA up 2 dB, and listen for the first hint of ringing.',
      question: 'Are the words clear now, with no ringing?',
      yes: 'fixRideVocal',
      no: 'micDistance',
      safety: 'safeDuringService',
    },
    fixRideVocal: {
      kind: 'fix',
      text: 'Keep it there, and keep a finger on the Lead Vocal DCA for the whole service: it is the one fader to ride. Push it for quiet lines and ease it back for loud ones.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    micDistance: {
      kind: 'check',
      action: 'Bring the DCA back if it started to ring. Watch {member:leadVocal} sing.',
      question: 'Is the mic further than a hand width from the mouth, or pointing away from it?',
      yes: 'fixMicCloser',
      no: 'eqCarve',
      safety: 'safeDuringService',
    },
    fixMicCloser: {
      kind: 'fix',
      arrangementAdvice: 'Between songs, ask {member:leadVocal} to hold the mic closer, pointing straight at the mouth. A closer mic gives much more voice before feedback starts.',
      text: 'Until then, push the Lead Vocal DCA only as far as it goes without ringing, and pull the instrument DCAs down 2 dB each.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    eqCarve: {
      kind: 'check',
      when: { condition: { kind: 'anyRoleInBand', roles: ['keys', 'electricGuitar', 'acousticGuitar'] }, otherwise: 'fixVocalCompressor' },
      action: 'Make room where the words are. On each instrument that plays chords under the voice, cut 2 dB, wide, around 3 kHz ({control:eqScreen}).',
      question: 'Are the words clearer?',
      yes: 'fixKeepCarve',
      no: 'fixVocalCompressor',
      safety: 'safeDuringService',
    },
    fixKeepCarve: {
      kind: 'fix',
      text: 'Keep those cuts. Cutting the instruments where the voice needs to be heard is safer than turning that range up on a live mic.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    fixVocalCompressor: {
      kind: 'fix',
      text: 'Take out any cut you just made, and look at the lead vocal compressor ({control:compScreen}). If it shows much more than {compReduction:leadVocal} of reduction on loud lines, the voice is being flattened: bring the compressor\'s {control:compParamNames.threshold} back up until it shows about that much. If it shows none at all, quiet lines get lost: bring it down until loud lines show about that much.',
      safety: 'safeDuringService',
      controlRefs: ['compScreen', 'compParamNames'],
    },
  },
};

export const VOCALS_HARSH_TREE: TroubleshootingTree = {
  id: 'vocalsHarsh',
  symptom: 'Vocals harsh or sibilant',
  group: 'vocals',
  targetPicker: 'none',
  needsOneOfEach: [VOCAL_ROLES],
  entryNodeId: 'sibilanceListen',
  nodes: {
    sibilanceListen: {
      kind: 'check',
      action: 'Listen to what exactly hurts in the vocal.',
      question: 'Is it mainly the sharp "s" and "t" sounds?',
      yes: 'deEsserLook',
      no: 'levelTest',
      safety: 'safeDuringService',
    },
    deEsserLook: {
      kind: 'check',
      action: 'Look at whether a de-esser is inserted on the lead vocal, and watch its meter on the "s" sounds.',
      question: 'Is a de-esser there and reacting to the "s" sounds?',
      yes: 'fixDeEsserMore',
      no: 'fixInsertDeEsser',
      safety: 'safeDuringService',
    },
    fixDeEsserMore: {
      kind: 'fix',
      text: `Turn the de-esser up a little at a time. ${DE_ESSER.listenFor}`,
      safety: 'safeDuringService',
      controlRefs: ['fxScreen'],
    },
    fixInsertDeEsser: {
      kind: 'fix',
      text: `Insert the de-esser on the lead vocal as your console sheet describes. On the {console}: {control:fxInsertProcedure} ${DE_ESSER.why}`,
      safety: 'rehearsalOnly',
      risky: ['routing'],
      controlRefs: ['fxInsertProcedure'],
      duringService: 'fixSibilanceEq',
    },
    fixSibilanceEq: {
      kind: 'fix',
      arrangementAdvice: 'Between songs, ask {member:leadVocal} to sing slightly across the mic instead of straight into it.',
      text: 'On that vocal, cut 2 to 3 dB, medium width, around 6 to 8 kHz ({control:eqScreen}), and move the cut a little until the "s" sounds soften. Stop before the voice turns dull.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    levelTest: {
      kind: 'check',
      action: 'Pull that vocal down 2 dB.',
      question: 'Is the harshness gone, with the words still clear?',
      yes: 'fixLeaveLower',
      no: 'presenceCut',
      safety: 'safeDuringService',
    },
    fixLeaveLower: {
      kind: 'fix',
      text: 'Leave it there. A voice that is a little too loud is heard as harsh.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    presenceCut: {
      kind: 'check',
      action: 'Put the fader back. On that vocal, cut 2 to 3 dB, medium width, around 3 kHz ({control:eqScreen}).',
      question: 'Is it easier to listen to?',
      yes: 'fixKeepPresenceCut',
      no: 'fixCompressorHarsh',
      safety: 'safeDuringService',
    },
    fixKeepPresenceCut: {
      kind: 'fix',
      text: 'Keep the cut, and make it only as deep as it needs to be. Check on a loud line that the words are still clear.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    fixCompressorHarsh: {
      kind: 'fix',
      text: `Take the cut out, and look at the compressor on that vocal ({control:compScreen}). Heavy compression makes a voice hard and brings the "s" sounds forward. Bring the compressor's {control:compParamNames.threshold} back up until loud lines show about {compReduction:leadVocal} of reduction. ${MONITOR_RULES.wedgeCompressionNote}`,
      safety: 'safeDuringService',
      controlRefs: ['compScreen', 'compParamNames'],
    },
  },
};

export const LEAD_VOCAL_POPS_TREE: TroubleshootingTree = {
  id: 'leadVocalPops',
  symptom: 'Lead vocal pops or booms',
  group: 'vocals',
  targetPicker: 'none',
  needsOneOfEach: [['leadVocal']],
  entryNodeId: 'lowCutLook',
  nodes: {
    lowCutLook: {
      kind: 'check',
      action: 'Look at the low cut ({control:lowCutName}) on the lead vocal.',
      question: 'Is it on, and close to {lowCut:leadVocal}?',
      yes: 'popListen',
      no: 'fixLowCutOn',
      safety: 'safeDuringService',
    },
    fixLowCutOn: {
      kind: 'fix',
      text: 'Switch the low cut on and set it to {lowCut:leadVocal} ({control:lowCutScreen}). That is the value on your console sheet for this voice.',
      safety: 'safeDuringService',
      controlRefs: ['lowCutName', 'lowCutScreen'],
    },
    popListen: {
      kind: 'check',
      action: 'Listen to when it happens.',
      question: 'Is it a short thump on "p" and "b" sounds?',
      yes: 'fixPops',
      no: 'lowCutUp',
      safety: 'safeDuringService',
    },
    fixPops: {
      kind: 'fix',
      arrangementAdvice: 'Between songs, ask {member:leadVocal} to sing slightly across the mic, or just over the top of it. A foam windscreen also helps.',
      text: 'Until then, raise the low cut by 10 to 20 Hz, staying inside the range on your console sheet ({control:lowCutScreen}).',
      safety: 'safeDuringService',
      controlRefs: ['lowCutScreen'],
    },
    lowCutUp: {
      kind: 'check',
      action: 'It is a boom, which a mic adds when it is held very close. Raise the low cut by 20 Hz, staying inside the range on your console sheet.',
      question: 'Is the boom gone, without the voice turning thin?',
      yes: 'fixKeepLowCut',
      no: 'boomCut',
      safety: 'safeDuringService',
    },
    fixKeepLowCut: {
      kind: 'fix',
      text: 'Keep the low cut there, and note the value for this singer for next time.',
      safety: 'safeDuringService',
      controlRefs: ['lowCutScreen'],
    },
    boomCut: {
      kind: 'check',
      action: 'Put the low cut back. On the lead vocal, cut 3 dB, medium width, around 200 Hz ({control:eqScreen}).',
      question: 'Is the boom gone?',
      yes: 'fixKeepBoomCut',
      no: 'fixBoomOnLoudNotes',
      safety: 'safeDuringService',
    },
    fixKeepBoomCut: {
      kind: 'fix',
      text: 'Keep the cut, and make it only as deep as it needs to be.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    fixBoomOnLoudNotes: {
      kind: 'fix',
      arrangementAdvice: 'Between songs, ask {member:leadVocal} to pull the mic back a little on the loudest notes, and to hold it by its body so handling noise stays out.',
      text: 'Take the cut out. If the boom is only on loud notes, check that the compressor is working ({control:compScreen}): loud lines should show about {compReduction:leadVocal} of reduction.',
      safety: 'safeDuringService',
      controlRefs: ['compScreen'],
    },
  },
};
