import { Role } from '../model';
import { add, ceiling } from './builders';
import { Adjustment, RoomModifierSet, RoomRoleModifier } from './types';

/**
 * Room modifiers. A neutral room applies none.
 * Precedence: the room's reverb ceilings override any skill modifier, and the musical limits override everything.
 */

const LIVE_REVERB_ADJUSTMENTS: Adjustment[] = [
  add('fxSend.vocalPlate', -4, 'The room already adds its own reverb.'),
  add('fxSend.hall', -4, 'The room already adds its own reverb.'),
  add('fxSend.drumRoom', -4, 'The room already adds its own reverb.'),
  add('fxSend.tempoDelay', -3, 'Repeats smear in a reverberant room.'),
  ceiling('fxSend.vocalPlate', -15, 'Live room limit: more reverb than this washes out the words.'),
  ceiling('fxSend.hall', -18, 'Live room limit: more reverb than this washes out the mix.'),
  ceiling('fxSend.drumRoom', -18, 'Live room limit: the room is already the drum reverb.'),
  ceiling('fxSend.tempoDelay', -20, 'Live room limit: louder repeats smear the words.'),
];

const DRY_REVERB_ADJUSTMENTS: Adjustment[] = [
  add('fxSend.vocalPlate', 3, 'A dry room gives the voice no sustain of its own.'),
  add('fxSend.hall', 3, 'A dry room gives instruments no space of their own.'),
  add('fxSend.drumRoom', 3, 'A dry room makes drums sound small.'),
];

function liveRaised(why: string): RoomRoleModifier {
  return {
    why,
    adjustments: [add('lowCutHz', 20, 'Higher low cut for the live room: less low-mid goes into a room that already builds it up.'), ...LIVE_REVERB_ADJUSTMENTS],
  };
}

function liveFoundation(why: string): RoomRoleModifier {
  return { why, adjustments: [...LIVE_REVERB_ADJUSTMENTS] };
}

function dryLowered(why: string): RoomRoleModifier {
  return {
    why,
    adjustments: [add('lowCutHz', -10, 'Conservative low cut for the dry room: the room adds no warmth, so the source keeps more of its own.'), ...DRY_REVERB_ADJUSTMENTS],
  };
}

function dryUnchanged(why: string): RoomRoleModifier {
  return { why, adjustments: [...DRY_REVERB_ADJUSTMENTS] };
}

const FOUNDATION_WHY = 'Kick and bass are the foundation. Their low cut is not raised for the room.';
const LIVE_WHY = 'The room builds up low-mids, so this source sends less of them into it and uses less reverb.';
const DRY_WHY = 'The room is thin and adds nothing, so this source keeps more low end and gets more reverb.';
const DRY_FOUNDATION_WHY = 'The foundation is already at its lowest sensible cut.';

const LIVE_BY_ROLE: Record<Role, RoomRoleModifier> = {
  leadVocal: liveRaised(LIVE_WHY),
  harmonyVocal: liveRaised(LIVE_WHY),
  acousticGuitar: liveRaised(LIVE_WHY),
  electricGuitar: liveRaised(LIVE_WHY),
  bassGuitar: liveFoundation(FOUNDATION_WHY),
  synthBass: liveFoundation(FOUNDATION_WHY),
  keys: liveRaised(LIVE_WHY),
  padSynth: liveRaised(LIVE_WHY),
  electronicDrums: liveFoundation('The kick is part of every electronic drum feed here, so the low cut is not raised.'),
  kick: liveFoundation(FOUNDATION_WHY),
  snare: liveRaised(LIVE_WHY),
  hiHat: liveRaised(LIVE_WHY),
  toms: liveRaised(LIVE_WHY),
  overheads: liveRaised(LIVE_WHY),
  cajon: liveFoundation('The cajon is the kick of a stripped set. Its low cut is not raised.'),
  backingTracks: liveFoundation('Tracks are already mixed; their low end is handled by level.'),
  click: liveFoundation('The click never reaches the room.'),
};

const DRY_BY_ROLE: Record<Role, RoomRoleModifier> = {
  leadVocal: dryLowered(DRY_WHY),
  harmonyVocal: dryLowered(DRY_WHY),
  acousticGuitar: dryLowered(DRY_WHY),
  electricGuitar: dryLowered(DRY_WHY),
  bassGuitar: dryUnchanged(DRY_FOUNDATION_WHY),
  synthBass: dryUnchanged(DRY_FOUNDATION_WHY),
  keys: dryLowered(DRY_WHY),
  padSynth: {
    why: 'In a dry room the pad is the atmosphere the room does not provide.',
    adjustments: [
      add('lowCutHz', -10, 'Conservative low cut for the dry room.'),
      add('levelDb', 2, 'Pads fill the space a dry room leaves empty.'),
      ...DRY_REVERB_ADJUSTMENTS,
    ],
  },
  electronicDrums: dryUnchanged(DRY_FOUNDATION_WHY),
  kick: dryUnchanged(DRY_FOUNDATION_WHY),
  snare: dryLowered(DRY_WHY),
  hiHat: dryUnchanged('A hi-hat has no low end to keep.'),
  toms: dryLowered(DRY_WHY),
  overheads: dryLowered(DRY_WHY),
  cajon: dryUnchanged(DRY_FOUNDATION_WHY),
  backingTracks: dryUnchanged('Tracks are already mixed.'),
  click: dryUnchanged('The click never reaches the room.'),
};

export const ROOM_MODIFIERS: RoomModifierSet[] = [
  {
    reverberance: 'live',
    summary: 'Live, boomy room: higher low cuts on everything except kick and bass, shorter and quieter reverbs, low-mid control on the group buses.',
    byRole: LIVE_BY_ROLE,
    effectTime: {
      vocalPlate: { addSeconds: -0.4, ceilingSeconds: 1.4, why: 'The room adds its own tail; a long plate on top blurs the words.' },
      hall: { addSeconds: -0.6, ceilingSeconds: 1.8, why: 'A long hall in a live room turns into wash.' },
      drumRoom: { addSeconds: -0.2, ceilingSeconds: 0.8, why: 'The room is already the drum reverb.' },
      tempoDelay: { addSeconds: 0, ceilingSeconds: null, why: 'Delay time follows the song tempo, not the room.' },
    },
    groupBusNotes: [
      'If a group sounds thick in this room, cut 2 to 3 dB around 250 to 350 Hz, wide Q, on the group\'s EQ instead of on every channel.',
    ],
  },
  {
    reverberance: 'dry',
    summary: 'Dry, thin room: conservative low cuts, longer and louder reverb, pads used as atmosphere.',
    byRole: DRY_BY_ROLE,
    effectTime: {
      vocalPlate: { addSeconds: 0.4, ceilingSeconds: null, why: 'A dry room gives no tail, so the plate provides it.' },
      hall: { addSeconds: 0.4, ceilingSeconds: null, why: 'A longer hall replaces the space the room lacks.' },
      drumRoom: { addSeconds: 0.2, ceilingSeconds: null, why: 'Drums sound small in a dry room.' },
      tempoDelay: { addSeconds: 0, ceilingSeconds: null, why: 'Delay time follows the song tempo, not the room.' },
    },
    groupBusNotes: [],
  },
];

/** Constant low-frequency noise (HVAC): open mics pick it up, so their low cut goes a little higher. */
export const LOW_FREQUENCY_NOISE_ADJUSTMENT: Adjustment = add(
  'lowCutHz',
  10,
  'The room has constant low-frequency noise (HVAC). Every open mic picks it up, so its low cut goes a little higher.',
);

/** Roles whose low cut is never raised for room noise. */
export const FOUNDATION_ROLES: Role[] = ['kick', 'bassGuitar', 'synthBass', 'electronicDrums', 'cajon'];
