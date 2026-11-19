import { FEEDBACK_HIGH_TREE, FEEDBACK_LOW_TREE, FEEDBACK_MID_TREE } from './trees-feedback';
import {
  GUITAR_HARSH_TREE,
  GUITAR_THIN_TREE,
  GUITAR_TOO_LOUD_TREE,
  KEYS_FIGHT_BASS_TREE,
  KEYS_FIGHT_GUITARS_TREE,
} from './trees-guitars-and-keys';
import { BASS_BOOMY_TREE, BASS_INAUDIBLE_TREE, KICK_NO_PUNCH_TREE } from './trees-low-end';
import { CANNOT_HEAR_TREE, STREAM_DIFFERENT_TREE } from './trees-monitors-and-stream';
import { DISTORTION_TREE, HUM_OR_BUZZ_TREE, NO_SOUND_TREE } from './trees-sound-and-noise';
import { LEAD_VOCAL_POPS_TREE, VOCALS_BURIED_TREE, VOCALS_HARSH_TREE } from './trees-vocals';
import { CHORUS_NO_LIFT_TREE, HARSH_TREE, MUDDY_TREE, THIN_TREE, TOO_LOUD_TREE } from './trees-whole-mix';
import { SymptomGroup, TroubleshootingTree } from './types';

export * from './types';

/** The headings on the symptom picker, in screen order. */
export const SYMPTOM_GROUPS: SymptomGroup[] = [
  { id: 'feedback', title: 'Feedback' },
  { id: 'soundAndNoise', title: 'No sound, noise, distortion' },
  { id: 'wholeMix', title: 'The whole mix' },
  { id: 'vocals', title: 'Vocals' },
  { id: 'lowEnd', title: 'Bass and kick' },
  { id: 'guitarsAndKeys', title: 'Guitars and keys' },
  { id: 'monitorsAndStream', title: 'Monitors and stream' },
];

/** Every troubleshooting tree, in the order the buttons appear inside their group. */
export const TROUBLESHOOTING_TREES: TroubleshootingTree[] = [
  FEEDBACK_LOW_TREE,
  FEEDBACK_MID_TREE,
  FEEDBACK_HIGH_TREE,
  NO_SOUND_TREE,
  HUM_OR_BUZZ_TREE,
  DISTORTION_TREE,
  MUDDY_TREE,
  HARSH_TREE,
  THIN_TREE,
  TOO_LOUD_TREE,
  CHORUS_NO_LIFT_TREE,
  VOCALS_BURIED_TREE,
  VOCALS_HARSH_TREE,
  LEAD_VOCAL_POPS_TREE,
  BASS_BOOMY_TREE,
  BASS_INAUDIBLE_TREE,
  KICK_NO_PUNCH_TREE,
  GUITAR_TOO_LOUD_TREE,
  GUITAR_THIN_TREE,
  GUITAR_HARSH_TREE,
  KEYS_FIGHT_GUITARS_TREE,
  KEYS_FIGHT_BASS_TREE,
  CANNOT_HEAR_TREE,
  STREAM_DIFFERENT_TREE,
];
