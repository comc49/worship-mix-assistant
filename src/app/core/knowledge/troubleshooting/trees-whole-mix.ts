import { HOUSE_PRINCIPLES, MAIN_BUS_RULES } from '../rules';
import { ensembleAdvice } from './rule-text';
import { TroubleshootingTree } from './types';

/**
 * Problems with the mix as a whole: muddy, harsh, thin, too loud, chorus does not lift.
 * To test a cause, a group is pulled down for a moment: that changes what the room hears,
 * which a headphone solo does not.
 */

// HOUSE_PRINCIPLES, by position in src/app/core/knowledge/rules.ts.
const PRINCIPLE_ARRANGEMENT_BEATS_EQ = HOUSE_PRINCIPLES[0];
const PRINCIPLE_KICK_AND_BASS_FIRST = HOUSE_PRINCIPLES[1];
const PRINCIPLE_FEWER_SOURCES = HOUSE_PRINCIPLES[2];
const PRINCIPLE_CEILING_FIRST = HOUSE_PRINCIPLES[3];
const PRINCIPLE_RIDE_DCAS = HOUSE_PRINCIPLES[4];

export const MUDDY_TREE: TroubleshootingTree = {
  id: 'muddy',
  symptom: 'Mix is muddy',
  group: 'wholeMix',
  targetPicker: 'none',
  entryNodeId: 'liveSourceCount',
  nodes: {
    // In a live room, the number of sources and the low-mid buildup come first.
    liveSourceCount: {
      kind: 'check',
      when: { condition: { kind: 'roomIs', reverberance: 'live' }, otherwise: 'lowCutLook' },
      action: 'This room builds up low-mids by itself, so count what is playing at once. Pull the Keys and Pads DCA down 5 dB for a moment.',
      question: 'Does the mix clear up?',
      yes: 'fixFewerSources',
      no: 'liveLowMidCuts',
      safety: 'safeDuringService',
    },
    fixFewerSources: {
      kind: 'fix',
      arrangementAdvice: `${PRINCIPLE_FEWER_SOURCES} ${ensembleAdvice('padUnderKeys')} ${ensembleAdvice('keysLeaveRoomForBass')}`,
      text: 'Until the band can change the arrangement, leave the Keys and Pads DCA 2 to 3 dB lower than it was.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    liveLowMidCuts: {
      kind: 'check',
      action: 'Put the DCA back. Open the EQ ({control:eqScreen}) of the keys, then the pad, then the acoustic guitar, and on each one try the optional low-mid cut from your console sheet: 2 to 3 dB, wide, around 250 to 300 Hz. Listen after each one.',
      question: 'Is the mix clearer?',
      yes: 'fixKeepLowMidCuts',
      no: 'lowCutLook',
      safety: 'safeDuringService',
    },
    fixKeepLowMidCuts: {
      kind: 'fix',
      text: 'Keep the cuts that made a difference and take out the ones that did not. Do not cut the same frequency on every channel: that only makes the whole mix thin.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    // The general path, for every room.
    lowCutLook: {
      kind: 'check',
      action: 'Look at the low cut ({control:lowCutName}) on every channel except the kick and the bass, and compare with your console sheet.',
      question: 'Is a low cut switched off, or set clearly lower than the sheet says?',
      yes: 'fixLowCuts',
      no: 'bassTest',
      safety: 'safeDuringService',
    },
    fixLowCuts: {
      kind: 'fix',
      text: 'Set those low cuts to the values on your console sheet ({control:lowCutScreen}). Low cuts keep rumble from every mic and instrument out of the low end, where it adds up to mud.',
      safety: 'safeDuringService',
      controlRefs: ['lowCutName', 'lowCutScreen'],
    },
    bassTest: {
      kind: 'check',
      action: 'Pull the bass fader down 5 dB for a moment.',
      question: 'Does the mud clear?',
      yes: 'fixBassIsTheCause',
      no: 'keysTest',
      safety: 'safeDuringService',
    },
    fixBassIsTheCause: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('kickAndBassLanes'),
      text: 'The bass is the cause. Leave it 2 dB lower for now, then work through "Bass is boomy".',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    keysTest: {
      kind: 'check',
      when: { condition: { kind: 'roleInBand', role: 'keys' }, otherwise: 'reverbTest' },
      action: 'Put the bass back. Pull the Keys and Pads DCA down 5 dB for a moment.',
      question: 'Does the mud clear?',
      yes: 'fixKeysLowMids',
      no: 'reverbTest',
      safety: 'safeDuringService',
    },
    fixKeysLowMids: {
      kind: 'fix',
      arrangementAdvice: ensembleAdvice('keysLeaveRoomForBass'),
      text: 'Leave the Keys and Pads DCA 2 dB lower, and try the optional low-mid cut from your console sheet on the keys: 2 dB, wide, around 300 Hz ({control:eqScreen}).',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    reverbTest: {
      kind: 'check',
      action: 'Put everything back. Pull the FX Returns DCA all the way down for a moment.',
      question: 'Does the mix clear up?',
      yes: 'fixLessReverb',
      no: 'fixLowMidCuts',
      safety: 'safeDuringService',
    },
    fixLessReverb: {
      kind: 'fix',
      text: 'Bring the FX Returns DCA back up only as far as you need: start 6 dB lower than it was. Reverb that you can clearly hear in a full mix is usually too much.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    fixLowMidCuts: {
      kind: 'fix',
      arrangementAdvice: PRINCIPLE_ARRANGEMENT_BEATS_EQ,
      text: 'Open the EQ ({control:eqScreen}) and try the optional low-mid cuts from your console sheet, one channel at a time: 2 to 3 dB, wide, around 250 to 300 Hz, on keys, pad and acoustic guitar. Keep only the cuts you can hear helping.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
  },
};

export const HARSH_TREE: TroubleshootingTree = {
  id: 'harsh',
  symptom: 'Mix is harsh or painful',
  group: 'wholeMix',
  targetPicker: 'none',
  entryNodeId: 'energyTest',
  nodes: {
    energyTest: {
      kind: 'check',
      action: 'Pull the Energy DCA down 3 dB. It holds the cymbals, the snare and the electric guitar.',
      question: 'Is the pain gone?',
      yes: 'fixEnergyLower',
      no: 'vocalTest',
      safety: 'safeDuringService',
    },
    fixEnergyLower: {
      kind: 'fix',
      arrangementAdvice: 'If the cymbals or the electric guitar are loud on stage as well, ask the player to play them more gently. The console cannot turn down what the room hears directly.',
      text: 'Leave the Energy DCA where it is now. Ride it up only for the big moments, and bring it back afterwards.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    vocalTest: {
      kind: 'check',
      action: 'Put the Energy DCA back. Pull the Lead Vocal and Harmony Vocals DCAs down 3 dB for a moment.',
      question: 'Is the pain gone?',
      yes: 'fixVocalBite',
      no: 'keysTest',
      safety: 'safeDuringService',
    },
    fixVocalBite: {
      kind: 'fix',
      text: 'The vocals carry the harshness. Put the DCAs back, and on the loudest voice cut 2 dB, medium width, around 3 kHz ({control:eqScreen}). If that is not enough, work through "Vocals harsh or sibilant".',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    keysTest: {
      kind: 'check',
      when: { condition: { kind: 'roleInBand', role: 'keys' }, otherwise: 'fixOverallLevel' },
      action: 'Put the vocals back. Pull the Keys and Pads DCA down 3 dB for a moment.',
      question: 'Is the pain gone?',
      yes: 'fixKeysBright',
      no: 'fixOverallLevel',
      safety: 'safeDuringService',
    },
    fixKeysBright: {
      kind: 'fix',
      arrangementAdvice: 'Ask {member:keys} to choose a softer piano sound, or to play the right hand an octave lower.',
      text: 'Leave the Keys and Pads DCA 2 dB lower, and on the keys cut 2 dB, wide, around 2 to 3 kHz ({control:eqScreen}).',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen'],
    },
    fixOverallLevel: {
      kind: 'fix',
      text: `No single group is the cause, so it is the overall level: ears hear a mix that is too loud as harsh. Pull every DCA down by the same 2 to 3 dB, slowly. ${MAIN_BUS_RULES.eq.value}: ${MAIN_BUS_RULES.eq.why}`,
      safety: 'safeDuringService',
      controlRefs: [],
    },
  },
};

export const THIN_TREE: TroubleshootingTree = {
  id: 'thin',
  symptom: 'Mix is thin',
  group: 'wholeMix',
  targetPicker: 'none',
  entryNodeId: 'dryLowCutLook',
  nodes: {
    // In a dry room, low cuts and reverb come first.
    dryLowCutLook: {
      kind: 'check',
      when: { condition: { kind: 'roomIs', reverberance: 'dry' }, otherwise: 'lowEndTest' },
      action: 'This room adds no warmth of its own, so look at the low cuts first. Compare the low cut ({control:lowCutName}) on the vocals, guitars and keys with your console sheet.',
      question: 'Is a low cut set higher than the sheet says?',
      yes: 'fixLowCutsBack',
      no: 'dryReverbLook',
      safety: 'safeDuringService',
    },
    fixLowCutsBack: {
      kind: 'fix',
      text: 'Bring those low cuts back down to the values on your console sheet ({control:lowCutScreen}). A low cut that is too high removes the body of the source.',
      safety: 'safeDuringService',
      controlRefs: ['lowCutName', 'lowCutScreen'],
    },
    dryReverbLook: {
      kind: 'check',
      action: 'Look at the FX Returns DCA and the All FX mute group.',
      question: 'Is the FX Returns DCA down, or is All FX muted?',
      yes: 'fixReverbBack',
      no: 'lowEndTest',
      safety: 'safeDuringService',
    },
    fixReverbBack: {
      kind: 'fix',
      text: 'Unmute All FX and bring the FX Returns DCA up to 0 while the band plays. In a dry room the reverb is what makes voices and instruments sound full. Stop when you can just tell it is there.',
      safety: 'safeDuringService',
      controlRefs: ['fxScreen'],
    },
    // The general path, for every room.
    lowEndTest: {
      kind: 'check',
      action: 'Push the Low End DCA up 3 dB for a moment. It holds the kick and the bass.',
      question: 'Does the mix fill out?',
      yes: 'fixLowEndUp',
      no: 'subBusLook',
      safety: 'safeDuringService',
    },
    fixLowEndUp: {
      kind: 'fix',
      text: `Leave the Low End DCA 2 to 3 dB higher. ${PRINCIPLE_KICK_AND_BASS_FIRST}`,
      safety: 'safeDuringService',
      controlRefs: [],
    },
    subBusLook: {
      kind: 'check',
      when: { condition: { kind: 'subOnOwnBus' }, otherwise: 'subListen' },
      action: 'Put the DCA back. The subwoofer has its own feed, so look at the master fader and the mute of that feed.',
      question: 'Is the subwoofer feed down or muted?',
      yes: 'fixSubFeedUp',
      no: 'subListen',
      safety: 'safeDuringService',
    },
    fixSubFeedUp: {
      kind: 'fix',
      text: 'Unmute the subwoofer feed and bring its master up slowly while the kick and bass play, until the low end is felt but not booming.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    subListen: {
      kind: 'check',
      action: 'Walk to the subwoofer while the kick and the bass play.',
      question: 'Is sound coming out of the subwoofer?',
      yes: 'lowEqLook',
      no: 'helpSubSilent',
      safety: 'safeDuringService',
    },
    helpSubSilent: {
      kind: 'askForHelp',
      text: 'The subwoofer is silent while the kick and bass play. That is a problem with its power, its amplifier or its feed, not with your mix. Ask the tech lead.',
      safety: 'safeDuringService',
    },
    lowEqLook: {
      kind: 'check',
      action: 'Open the EQ ({control:eqScreen}) of the kick and of the bass and look below 200 Hz. Look at their low cuts too.',
      question: 'Is there a deep cut below 200 Hz, or a low cut above the sheet value?',
      yes: 'fixLowEqFlat',
      no: 'fixFillTheMiddle',
      safety: 'safeDuringService',
    },
    fixLowEqFlat: {
      kind: 'fix',
      text: 'Take those cuts out and set the low cuts back to the sheet values. The bass low cut on your sheet is {lowCut:bassGuitar}.',
      safety: 'safeDuringService',
      controlRefs: ['eqScreen', 'lowCutScreen'],
    },
    fixFillTheMiddle: {
      kind: 'fix',
      arrangementAdvice: 'Ask {member:keys} or {member:padSynth} to hold fuller chords in the quiet sections. A thin arrangement cannot be mixed full.',
      text: 'The low end is working, so the middle is empty. Push the Keys and Pads DCA up 2 dB, and add a little reverb with the FX Returns DCA.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
  },
};

export const TOO_LOUD_TREE: TroubleshootingTree = {
  id: 'tooLoud',
  symptom: 'Mix is too loud overall',
  group: 'wholeMix',
  targetPicker: 'none',
  entryNodeId: 'stageTest',
  nodes: {
    stageTest: {
      kind: 'check',
      action: 'Between songs or in a quiet moment, pull the main fader down 6 dB for a few seconds, then put it back.',
      question: 'Did the room get clearly quieter?',
      yes: 'oneSourceListen',
      no: 'fixStageVolume',
      safety: 'safeDuringService',
    },
    fixStageVolume: {
      kind: 'fix',
      arrangementAdvice: 'The loudness comes from the stage: wedges, amplifiers or acoustic drums. Ask the band to play more quietly, and offer to turn the wedges down together with them.',
      text: 'Pull each monitor mix master down 2 to 3 dB, and tell the band you did. Leave the main mix where it is: turning it down would only leave the stage sound on its own.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    oneSourceListen: {
      kind: 'check',
      action: 'Listen for one thing that sticks out above everything else.',
      question: 'Is one source much louder than the rest?',
      yes: 'fixOneSource',
      no: 'fixEverythingDown',
      safety: 'safeDuringService',
    },
    fixOneSource: {
      kind: 'fix',
      text: 'Pull that one channel or its DCA down 3 dB, and leave the rest alone. A mix often feels too loud because of one source.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    fixEverythingDown: {
      kind: 'fix',
      text: `Pull every DCA down by the same 2 to 3 dB, slowly, over a few seconds, so nobody notices a jump. Aim for {loudnessTarget}. ${PRINCIPLE_CEILING_FIRST}`,
      safety: 'safeDuringService',
      controlRefs: [],
    },
  },
};

export const CHORUS_NO_LIFT_TREE: TroubleshootingTree = {
  id: 'chorusNoLift',
  symptom: 'Chorus does not lift',
  group: 'wholeMix',
  targetPicker: 'none',
  entryNodeId: 'mainBusLook',
  nodes: {
    mainBusLook: {
      kind: 'check',
      action: 'Watch the main bus during a chorus: its compressor and its limiter meter. On the {console} the main bus has: {control:mainBusProcessing}',
      question: 'Is the main bus compressor on, or does the limiter show more than 2 dB of reduction in the chorus?',
      yes: 'fixMainBusProcessing',
      no: 'verseLook',
      safety: 'safeDuringService',
    },
    fixMainBusProcessing: {
      kind: 'fix',
      text: `Main bus compressor: ${MAIN_BUS_RULES.compressor.value}. ${MAIN_BUS_RULES.compressor.why} Limiter: ${MAIN_BUS_RULES.limiter.value}. ${MAIN_BUS_RULES.limiter.listenFor}`,
      safety: 'rehearsalOnly',
      controlRefs: ['mainBusProcessing'],
      duringService: 'fixUnderTheLimiter',
    },
    fixUnderTheLimiter: {
      kind: 'fix',
      text: 'Switching main bus processing during a service makes the level jump, so leave it for now. Pull every DCA down by the same 2 dB so the mix sits under the limiter, then ride the Low End and Energy DCAs up into the chorus. Change the main bus processing at the next rehearsal.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
    verseLook: {
      kind: 'check',
      action: 'Look at your faders and DCAs during a verse.',
      question: 'Is the verse already almost as loud as the chorus?',
      yes: 'fixVerseLower',
      no: 'dcaRide',
      safety: 'safeDuringService',
    },
    fixVerseLower: {
      kind: 'fix',
      arrangementAdvice: 'Ask the band to play less in the verse: a chorus only lifts when the verse leaves room for it.',
      text: `The faders started too high. In the verse, pull the Energy DCA and the Keys and Pads DCA down 3 dB, and keep the vocal where it is. ${PRINCIPLE_CEILING_FIRST}`,
      safety: 'safeDuringService',
      controlRefs: [],
    },
    dcaRide: {
      kind: 'check',
      action: 'At the next chorus, push the Low End DCA and the Energy DCA up 2 to 3 dB together.',
      question: 'Does the chorus feel bigger?',
      yes: 'fixKeepRiding',
      no: 'fixArrangementLift',
      safety: 'safeDuringService',
    },
    fixKeepRiding: {
      kind: 'fix',
      text: `Do that at every chorus, and bring both DCAs back down for the verse. ${PRINCIPLE_RIDE_DCAS} A channel that sits in two DCAs moves twice, so keep the moves small.`,
      safety: 'safeDuringService',
      controlRefs: [],
    },
    fixArrangementLift: {
      kind: 'fix',
      arrangementAdvice: 'The lift has to come from the band. Ask the drummer to open up to the cymbals in the chorus, {member:electricGuitar} to play fuller chords, and everyone to hold back in the verse.',
      text: 'Keep the 2 dB push on the Low End and Energy DCAs in the chorus, and push the Lead Vocal DCA 1 dB with them so the words stay on top.',
      safety: 'safeDuringService',
      controlRefs: [],
    },
  },
};
