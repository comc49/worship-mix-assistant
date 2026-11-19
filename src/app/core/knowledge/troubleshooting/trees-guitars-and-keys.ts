import { HOUSE_PRINCIPLES } from '../rules';
import { ensembleAdvice } from './rule-text';
import { TroubleshootingTree } from './types';

/**
 * Electric guitar (too loud, too thin, too harsh) and keys fighting the guitars or the bass.
 * Whenever two sources overlap, the first technical fix comes with arrangement advice.
 */

const PRINCIPLE_ARRANGEMENT_BEATS_EQ = HOUSE_PRINCIPLES[0];

export const GUITAR_TOO_LOUD_TREE: TroubleshootingTree = {
  id: 'guitarTooLoud',
  symptom: 'Electric guitar too loud',
  group: 'guitarsAndKeys',
  targetPicker: 'none',
  entryNodeId: 'stageTest',
  nodes: {
    stageTest: {
      kind: 'check',
      action: 'Pull the electric guitar fader all the way down for a moment.',
      question: 'Is the guitar still loud in the room?',
      yes: 'fixStageSound',
      no: 'faderLower',
      safety: 'safeDuringService',
    },
    fixStageSound: {
      kind: 'fix',
      arrangementAdvice: 'The room hears the guitar straight from the stage. Between songs, ask {member:electricGuitar} to turn the amplifier down or to aim it at their own ears, not at the seats.',
      text: 'Leave the guitar fader low, and turn the guitar down in the monitor mixes that carry it ({control:sendsScreen}), 3 dB at a time.',
      safety: 'safeDuringService',
      controlRefs: ['sendsScreen'],
    },
    faderLower: {
      kind: 'check',
      action: 'Bring the fader back to 3 dB below where it was.',
      question: 'Does the guitar sit in the mix for the whole song?',
      yes: 'fixLeaveLower',
      no: 'biteCut',
      safety: 'safeDuringService',
    },
    fixLeaveLower: {
      kind: 'fix',
      text: 'Leave it there. The electric guitar sits in the Guitars DCA and the Energy DCA, so a move on either one moves it.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    biteCut: {
      kind: 'check',
      action: 'On the electric guitar, cut 2 dB, wide, around 3 kHz ({control:eqScreen}). A guitar often sounds too loud only in that range.',
      question: 'Does it sit better now?',
      yes: 'fixKeepBiteCut',
      no: 'compressorLook',
      safety: 'safeDuringService',
    },
    fixKeepBiteCut: {
      kind: 'fix',
      text: 'Keep the cut. That range is also where the words of the vocal are heard, so the vocal gets clearer too.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    compressorLook: {
      kind: 'check',
      action: 'Take the cut out. Open the guitar compressor ({control:compScreen}) and watch its reduction meter when the loud part comes.',
      question: 'Does it show about {compReduction:electricGuitar} of reduction on the loud parts?',
      yes: 'fixRideGuitar',
      no: 'fixGuitarCompressor',
      safety: 'safeDuringService',
    },
    fixGuitarCompressor: {
      kind: 'fix',
      arrangementAdvice: 'Between songs, ask {member:electricGuitar} to match the levels of their sounds, so the lead sound is only a little louder than the rhythm sound.',
      text: 'Lower the compressor threshold ({control:compParamNames.threshold}) until the loud parts show about {compReduction:electricGuitar} of reduction.',
      safety: 'safeDuringService',
      controlRefs: ['compScreen', 'compParamNames'],
    },
    fixRideGuitar: {
      kind: 'fix',
      arrangementAdvice: 'Between songs, ask {member:electricGuitar} to match the levels of their sounds, so the lead sound is only a little louder than the rhythm sound.',
      text: 'The compressor is doing its part, so the jumps are too big for it. Keep a finger on the guitar fader and pull it back 3 dB when the loud sound comes in.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
  },
};

export const GUITAR_THIN_TREE: TroubleshootingTree = {
  id: 'guitarThin',
  symptom: 'Electric guitar too thin',
  group: 'guitarsAndKeys',
  targetPicker: 'none',
  entryNodeId: 'lowCutLook',
  nodes: {
    lowCutLook: {
      kind: 'check',
      action: 'Look at the low cut ({control:lowCutName}) on the electric guitar.',
      question: 'Is it set clearly higher than {lowCut:electricGuitar}?',
      yes: 'fixLowCutBack',
      no: 'headphones',
      safety: 'safeDuringService',
    },
    fixLowCutBack: {
      kind: 'fix',
      text: 'Bring the low cut back to {lowCut:electricGuitar} ({control:lowCutScreen}), the value on your console sheet.',
      safety: 'safeDuringService',
      controlRefs: ['lowCutName', 'lowCutScreen'],
    },
    headphones: {
      kind: 'check',
      action: 'Listen to the guitar alone on headphones with its solo button. Solo is only for judging the source: it does not change what the room hears.',
      question: 'Is it thin in the headphones too?',
      yes: 'fixThinSource',
      no: 'eqLook',
      safety: 'safeDuringService',
    },
    fixThinSource: {
      kind: 'fix',
      arrangementAdvice: 'The sound is thin before it reaches the console. Ask {member:electricGuitar} to check that the speaker cabinet simulation is switched on in their sound, and to choose a fuller one. A direct guitar signal without it sounds thin and fizzy.',
      text: 'No EQ on the console can add what the source does not send. Until the sound is changed, lift 2 dB, wide, around 200 to 250 Hz ({control:eqScreen}).',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    eqLook: {
      kind: 'check',
      action: 'Open the guitar EQ ({control:eqScreen}) and look between 150 and 500 Hz.',
      question: 'Is there a cut deeper than 3 dB in that range?',
      yes: 'fixEqShallower',
      no: 'fixBodyLift',
      safety: 'safeDuringService',
    },
    fixEqShallower: {
      kind: 'fix',
      text: 'Make that cut shallower, 1 dB at a time, until the guitar has body again.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    fixBodyLift: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('keysAndGuitarsLanes'),
      text: 'The guitar is fine alone but thin in the mix, so something else is filling its range. Push the guitar 1 to 2 dB and lift 2 dB, wide, around 200 to 250 Hz ({control:eqScreen}).',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
  },
};

export const GUITAR_HARSH_TREE: TroubleshootingTree = {
  id: 'guitarHarsh',
  symptom: 'Electric guitar too harsh',
  group: 'guitarsAndKeys',
  targetPicker: 'none',
  entryNodeId: 'levelTest',
  nodes: {
    levelTest: {
      kind: 'check',
      action: 'Pull the electric guitar fader down 3 dB.',
      question: 'Is the harshness gone, with the guitar still heard?',
      yes: 'fixLeaveLower',
      no: 'headphones',
      safety: 'safeDuringService',
    },
    fixLeaveLower: {
      kind: 'fix',
      text: 'Leave it there. It was a level problem, not a tone problem.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    headphones: {
      kind: 'check',
      action: 'Put the fader back. Listen to the guitar alone on headphones with its solo button. Solo is only for judging the source: it does not change what the room hears.',
      question: 'Is it harsh or fizzy in the headphones too?',
      yes: 'harshCut',
      no: 'fixHarshInTheRoom',
      safety: 'safeDuringService',
    },
    fixHarshInTheRoom: {
      kind: 'fix',
      text: 'The source is fine, so the harshness comes from level in the room. Pull the Energy DCA down 2 dB: the guitar and the cymbals add up in the same range.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    harshCut: {
      kind: 'check',
      action: 'On the electric guitar, cut 3 dB, wide, around 3 kHz ({control:eqScreen}).',
      question: 'Is it easier to listen to?',
      yes: 'fixKeepHarshCut',
      no: 'fixHarshSource',
      safety: 'safeDuringService',
    },
    fixKeepHarshCut: {
      kind: 'fix',
      arrangementAdvice: 'Between songs, ask {member:electricGuitar} to turn the treble or presence of their sound down a little, so the fix is made at the source.',
      text: 'Keep the cut, only as deep as it needs to be.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    fixHarshSource: {
      kind: 'fix',
      arrangementAdvice: 'Ask {member:electricGuitar} to use less distortion and less treble in their sound, and to check that the speaker cabinet simulation is switched on.',
      text: 'Keep the 3 kHz cut, and turn down everything above 6 kHz by 3 dB with a high shelf ({control:eqScreen}). Fizz lives up there, and a guitar needs very little of it.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
  },
};

export const KEYS_FIGHT_GUITARS_TREE: TroubleshootingTree = {
  id: 'keysFightGuitars',
  symptom: 'Keys fight the guitars',
  group: 'guitarsAndKeys',
  targetPicker: 'none',
  entryNodeId: 'keysTest',
  nodes: {
    keysTest: {
      kind: 'check',
      action: 'Pull the keys fader down 4 dB for a moment.',
      question: 'Can you hear the guitar part clearly now?',
      yes: 'fixSeparateRegisters',
      no: 'padTest',
      safety: 'safeDuringService',
    },
    fixSeparateRegisters: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('keysAndGuitarsLanes'),
      text: 'Leave the keys 2 dB lower than they were. If they still cover the guitar, cut 2 dB, wide, around 500 Hz on the keys ({control:eqScreen}), so the guitar has the middle.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    padTest: {
      kind: 'check',
      when: { condition: { kind: 'roleInBand', role: 'padSynth' }, otherwise: 'lowMidCut' },
      action: 'Put the keys back. Pull the pad fader down 5 dB for a moment.',
      question: 'Are the keys and the guitar easier to tell apart now?',
      yes: 'fixPadLower',
      no: 'lowMidCut',
      safety: 'safeDuringService',
    },
    fixPadLower: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('padUnderKeys'),
      text: 'The pad is filling the space between them. Leave it 3 dB lower: a pad should be missed when it is muted, not heard when it plays.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    lowMidCut: {
      kind: 'check',
      action: 'Put everything back. On the keys, cut 2 to 3 dB, wide, around 300 Hz ({control:eqScreen}).',
      question: 'Are the two easier to tell apart?',
      yes: 'fixKeepLowMidCut',
      no: 'fixArrangementOnly',
      safety: 'safeDuringService',
    },
    fixKeepLowMidCut: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('keysAndGuitarsLanes'),
      text: 'Keep the cut on the keys. It is the optional low-mid cut from your console sheet.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    fixArrangementOnly: {
      kind: 'fix',
      arrangementAdvice: `${PRINCIPLE_ARRANGEMENT_BEATS_EQ} ${ensembleAdvice('keysAndGuitarsLanes')}`,
      text: 'Take the cut out. Faders and EQ cannot separate two parts that play the same notes in the same rhythm. Until the band changes the parts, choose one to lead in each song and run the other 3 dB lower.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
  },
};

export const KEYS_FIGHT_BASS_TREE: TroubleshootingTree = {
  id: 'keysFightBass',
  symptom: 'Keys fight the bass',
  group: 'guitarsAndKeys',
  targetPicker: 'none',
  entryNodeId: 'lowCutLook',
  nodes: {
    lowCutLook: {
      kind: 'check',
      action: 'Look at the low cut ({control:lowCutName}) on the keys.',
      question: 'Is it on, and close to {lowCut:keys}?',
      yes: 'keysTest',
      no: 'fixKeysLowCut',
      safety: 'safeDuringService',
    },
    fixKeysLowCut: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('keysLeaveRoomForBass'),
      text: 'Switch the keys low cut on and set it to {lowCut:keys} ({control:lowCutScreen}). It keeps the left hand out of the range the bass needs.',
      safety: 'safeDuringService',
      controlRefs: ['lowCutName', 'lowCutScreen'],
    },
    keysTest: {
      kind: 'check',
      action: 'Pull the keys fader down 4 dB for a moment.',
      question: 'Is the bass line clear now?',
      yes: 'fixLeftHand',
      no: 'padTest',
      safety: 'safeDuringService',
    },
    fixLeftHand: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('keysLeaveRoomForBass'),
      text: 'Leave the keys 2 dB lower, and raise the keys low cut by 20 Hz, staying inside the range on your console sheet ({control:lowCutScreen}).',
      safety: 'safeDuringService',
      controlRefs: ['lowCutScreen'],
    },
    padTest: {
      kind: 'check',
      when: { condition: { kind: 'roleInBand', role: 'padSynth' }, otherwise: 'fixOneOwner' },
      action: 'Put the keys back. Pull the pad fader down 5 dB for a moment.',
      question: 'Is the bass line clear now?',
      yes: 'fixPadLowNotes',
      no: 'fixOneOwner',
      safety: 'safeDuringService',
    },
    fixPadLowNotes: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('padUnderKeys'),
      text: 'The pad is holding low notes under the bass. Leave it 3 dB lower and check that its low cut is on and near {lowCut:padSynth} ({control:lowCutScreen}).',
      safety: 'safeDuringService',
      controlRefs: ['lowCutScreen'],
    },
    fixOneOwner: {
      kind: 'fix',
      arrangementAdvice: `${ensembleAdvice('oneOwnerOfTheLowEnd')} ${ensembleAdvice('keysLeaveRoomForBass')}`,
      text: 'Put everything back. On the keys, cut 3 dB, wide, around 100 to 200 Hz ({control:eqScreen}), so only the bass plays down there.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
  },
};
