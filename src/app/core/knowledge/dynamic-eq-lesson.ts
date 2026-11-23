/**
 * How to learn the WING's Dynamic EQ. Facts about the console are taken from the WING series
 * user manual, section 11.1 (Triple DEQ, Dynamic EQ), pages 94, 95 and 100. Anything the manual
 * does not say is marked `checkOnConsole`.
 */

export interface LessonStep {
  title: string;
  text: string;
  /** True when the step relies on something the manual does not spell out. */
  checkOnConsole: boolean;
}

export interface LessonMode {
  setting: string;
  whatItDoes: string;
  useItFor: string;
}

export const DYNAMIC_EQ_SUMMARY =
  'A dynamic EQ is one EQ band that moves by itself. It listens to how loud the sound is in its own frequency range, and cuts or boosts there only when that range crosses the threshold. Use it for a problem that comes and goes: a voice that turns harsh only on loud notes, one bass note that booms, sharp "s" sounds. If the problem is there all the time, an ordinary EQ cut is simpler and better.';

export const DYNAMIC_EQ_WHERE =
  'On the WING, "Dynamic EQ" is a single-band version of the Triple DEQ and is available in the Gate and Comp slots of input channels. It goes in that slot in place of the gate or the compressor. Load it at rehearsal, not during a service.';

/** The manual's own list of what the Gain sign and the Above/Below switch add up to. */
export const DYNAMIC_EQ_MODES: LessonMode[] = [
  { setting: 'Negative Gain + Above', whatItDoes: 'Turns the band down when it gets loud.', useItFor: 'Harshness on loud notes, a booming note, sharp "s" sounds. Start here: this is the one you will use most.' },
  { setting: 'Positive Gain + Below', whatItDoes: 'Turns the band up when it is quiet.', useItFor: 'Keeping clarity on quiet words without making loud ones harsh.' },
  { setting: 'Negative Gain + Below', whatItDoes: 'Turns the band down when it is quiet.', useItFor: 'Hiding hiss or rumble between notes, in one range only.' },
  { setting: 'Positive Gain + Above', whatItDoes: 'Turns the band up when it gets loud.', useItFor: 'Rarely needed live. Leave it until the others are familiar.' },
];

export const DYNAMIC_EQ_PARAMETERS: { name: string; meaning: string }[] = [
  { name: 'Freq', meaning: 'The center of the band: where the problem is.' },
  { name: 'Q', meaning: 'How wide the band is. Higher is narrower.' },
  { name: 'Gain', meaning: 'The most the band will ever cut or boost. It is a limit, not a fixed amount.' },
  { name: 'Threshold', meaning: 'How loud the band must get before anything happens.' },
  { name: 'Ratio', meaning: 'How quickly the change grows past the threshold. At 2:1, every 2 dB past the threshold gives 1 dB of change, up to the Gain.' },
  { name: 'Attack', meaning: 'How quickly the change is applied once the threshold is crossed.' },
  { name: 'Release', meaning: 'How quickly the band goes back to flat afterwards.' },
  { name: 'Above / Below', meaning: 'Whether it acts when the band is louder than the threshold, or quieter.' },
];

export const DYNAMIC_EQ_STEPS: LessonStep[] = [
  {
    title: 'Hear it here first',
    text: 'Press "Harsh only when loud" under Things to try, press Play, and switch Bypass on and off. Then press "What a fixed EQ cut would do" and notice the quiet phrase has gone dull too. That difference is the whole point of a dynamic EQ.',
    checkOnConsole: false,
  },
  {
    title: 'Pick one real problem that comes and goes',
    text: 'At rehearsal, choose one channel with a problem you only hear some of the time: a vocal that bites on loud notes, a bass with one note that booms, an acoustic guitar that rings on certain chords. Do not start with a channel that sounds wrong all the time.',
    checkOnConsole: false,
  },
  {
    title: 'Find the frequency with the ordinary EQ',
    text: 'On that channel\'s normal EQ, cut one band by 6 dB, make it fairly narrow, and move it slowly while the problem happens until the problem shrinks. Write down the frequency. Then put that EQ band back to 0 dB.',
    checkOnConsole: false,
  },
  {
    title: 'Load the Dynamic EQ',
    text: 'Open the channel\'s GATE slot (or COMP slot) and choose Dynamic EQ. It replaces the gate (or compressor) on that channel while it is loaded, so use the slot you are not relying on.',
    checkOnConsole: true,
  },
  {
    title: 'Set it so it does nothing yet',
    text: 'Set Freq to the frequency you wrote down, Q fairly narrow, Gain to -6 dB, the switch to Above, Ratio around 3:1, and Threshold as high as it goes. With the threshold at the top the band should stay flat.',
    checkOnConsole: false,
  },
  {
    title: 'Lower the Threshold until it catches only the problem',
    text: 'While the musician plays or sings, bring the Threshold down slowly. Stop when the band dips on the problem moments and stays flat the rest of the time. If it is dipping all the time, the threshold is too low: you have built an ordinary EQ cut.',
    checkOnConsole: false,
  },
  {
    title: 'Set how fast it reacts',
    text: 'Start with a fast Attack and a medium Release. If the start of the harsh note still gets through, make the Attack faster. If the tone seems to wobble or "suck" after loud notes, make the Release slower.',
    checkOnConsole: false,
  },
  {
    title: 'Check it by ear, then decide',
    text: 'Use Band Solo to hear only the band on headphones and confirm it is on the right frequency (make sure the console is not in solo-in-place first). Then compare with the Dynamic EQ switched off. Keep it only if the channel sounds better and nothing sounds dull.',
    checkOnConsole: true,
  },
];

export const DYNAMIC_EQ_MISTAKES: string[] = [
  'Threshold too low: it cuts all the time, so it is just an EQ cut with extra steps.',
  'Too much Gain: start at -6 dB. If you need more than about -9 dB, the problem is probably better fixed at the source or with the mic.',
  'Band too wide: a wide band dulls the whole instrument each time it reacts. Narrow it until only the problem moves.',
  'Using it for a constant problem: mud that is always there wants a normal EQ cut or a higher low cut.',
  'Forgetting it took the place of the gate or compressor in that slot.',
];
