/**
 * A plain-language reminder of what the common controls do.
 * Each entry says what the control is, and what you hear when you turn it each way.
 */

/** Which console name to show next to an entry, when the console profile has one. */
export type KnobConsoleName =
  | 'preampGain'
  | 'lowCut'
  | 'gateThreshold'
  | 'gateRange'
  | 'gateAttack'
  | 'gateHold'
  | 'gateRelease'
  | 'compThreshold'
  | 'compRatio'
  | 'compAttack'
  | 'compRelease'
  | 'compMakeupGain'
  | 'polarity'
  | 'phantomPower';

export interface KnobEntry {
  id: string;
  name: string;
  whatItIs: string;
  /** Headings for the two directions. Most knobs are simply "More" and "Less". */
  moreLabel: string;
  lessLabel: string;
  /** What you hear with more of it (higher, longer, further clockwise). */
  more: string;
  /** What you hear with less of it. */
  less: string;
  /** One thing to remember. */
  remember: string;
  consoleName: KnobConsoleName | null;
}

export interface KnobGroup {
  id: string;
  title: string;
  intro: string;
  entries: KnobEntry[];
}

export const KNOB_GUIDE: KnobGroup[] = [
  {
    id: 'level',
    title: 'Getting the signal in',
    intro: 'These decide how strong the signal is before anything else happens to it.',
    entries: [
      {
        id: 'gain',
        name: 'Gain (preamp gain)',
        whatItIs: 'How much the console amplifies the mic or instrument as it comes in. It is set once, at soundcheck.',
        moreLabel: 'More',
        lessLabel: 'Less',
        more: 'A stronger signal. Too much and loud moments crunch and the red light shows.',
        less: 'A cleaner, quieter signal. Too little and you hear hiss when you push the fader.',
        remember: 'Gain is not a volume control. Use the fader for volume. During a service only ever turn gain down, and only if the input is clipping.',
        consoleName: 'preampGain',
      },
      {
        id: 'fader',
        name: 'Fader',
        whatItIs: 'How loud this channel is in the room.',
        moreLabel: 'Up',
        lessLabel: 'Down',
        more: 'Louder in the main speakers.',
        less: 'Quieter in the main speakers.',
        remember: 'The fader does not change what a musician hears in a pre-fader monitor.',
        consoleName: null,
      },
      {
        id: 'phantom',
        name: 'Phantom power (48 V)',
        whatItIs: 'Power sent up the mic cable. Condenser mics and active DI boxes need it. Ordinary vocal mics do not.',
        moreLabel: 'On',
        lessLabel: 'Off',
        more: 'The condenser mic or active DI works.',
        less: 'A mic that needs it is silent.',
        remember: 'Mute the channel before switching it, or the speakers pop. Rehearsal only.',
        consoleName: 'phantomPower',
      },
      {
        id: 'polarity',
        name: 'Polarity (phase)',
        whatItIs: 'Flips the signal upside down. It matters only when two mics hear the same source, such as a snare mic and the overheads.',
        moreLabel: 'Flipped',
        lessLabel: 'Normal',
        more: 'If the sound gets fuller, leave it flipped.',
        less: 'If the sound gets thinner when flipped, put it back.',
        remember: 'On a single mic or DI it changes nothing you can hear.',
        consoleName: 'polarity',
      },
      {
        id: 'pan',
        name: 'Pan',
        whatItIs: 'Where the sound sits between the left and right speakers.',
        moreLabel: 'To one side',
        lessLabel: 'Center',
        more: 'Further to one side: only the people near that speaker hear it well.',
        less: 'Every seat hears it the same.',
        remember: 'In a room, keep vocals, kick and bass in the center.',
        consoleName: null,
      },
    ],
  },
  {
    id: 'eq',
    title: 'Low cut and EQ',
    intro: 'These change the tone: which low, middle and high parts of the sound get through.',
    entries: [
      {
        id: 'lowCut',
        name: 'Low cut',
        whatItIs: 'Removes everything below the frequency you set. Also called a high-pass filter.',
        moreLabel: 'Set higher',
        lessLabel: 'Set lower',
        more: 'Less rumble, boom and handling noise. Too high and the source sounds thin.',
        less: 'More body and warmth, and more rumble.',
        remember: 'Raise it until the source just starts to thin, then back off a little. Leave kick and bass low.',
        consoleName: 'lowCut',
      },
      {
        id: 'eqFrequency',
        name: 'EQ frequency',
        whatItIs: 'Chooses which part of the sound an EQ band works on. Low numbers are bass, high numbers are treble.',
        moreLabel: 'Higher',
        lessLabel: 'Lower',
        more: 'The band moves toward brightness, consonants and cymbals.',
        less: 'The band moves toward body, warmth and boom.',
        remember: 'Roughly: 100 Hz is boom, 250 Hz is mud, 500 Hz is boxy, 1 kHz is honk, 3 kHz is harsh, 7 kHz is "s" sounds.',
        consoleName: null,
      },
      {
        id: 'eqGain',
        name: 'EQ gain',
        whatItIs: 'How much the band turns its part of the sound up or down.',
        moreLabel: 'Boost',
        lessLabel: 'Cut',
        more: 'More of that part. It also adds level and feedback risk.',
        less: 'Less of that part.',
        remember: 'Cut before you boost. A 2 to 3 dB cut is usually enough.',
        consoleName: null,
      },
      {
        id: 'eqQ',
        name: 'Q (width)',
        whatItIs: 'How wide the EQ band is.',
        moreLabel: 'Higher Q (narrow)',
        lessLabel: 'Lower Q (wide)',
        more: 'Higher Q is narrower: it affects a small range. Use it to remove one ringing note.',
        less: 'Lower Q is wider: it also moves the notes around it. Use it for gentle tone changes.',
        remember: 'Narrow for problems, wide for tone.',
        consoleName: null,
      },
    ],
  },
  {
    id: 'gate',
    title: 'Gate',
    intro: 'A gate turns a mic down when its source is not playing, so it stops picking up everything else.',
    entries: [
      {
        id: 'gateThreshold',
        name: 'Gate threshold',
        whatItIs: 'How loud the source must be to open the gate.',
        moreLabel: 'Higher',
        lessLabel: 'Lower',
        more: 'Only loud hits open it. Soft notes get cut off.',
        less: 'It opens easily, also for other instruments leaking into the mic.',
        remember: 'Set it so every real hit opens the gate, including the soft ones.',
        consoleName: 'gateThreshold',
      },
      {
        id: 'gateRange',
        name: 'Gate range',
        whatItIs: 'How much the gate turns the mic down when it is closed.',
        moreLabel: 'More',
        lessLabel: 'Less',
        more: 'More range: closer to silence between hits. It can sound choppy.',
        less: 'Less range: the mic is only turned down a bit. More natural.',
        remember: 'You rarely need full silence. 10 to 20 dB is usually plenty.',
        consoleName: 'gateRange',
      },
      {
        id: 'gateAttack',
        name: 'Gate attack',
        whatItIs: 'How fast the gate opens when the source starts.',
        moreLabel: 'Slower',
        lessLabel: 'Faster',
        more: 'The very start of each hit is lost.',
        less: 'The full hit comes through.',
        remember: 'Drums need the fastest attack.',
        consoleName: 'gateAttack',
      },
      {
        id: 'gateHold',
        name: 'Gate hold',
        whatItIs: 'How long the gate stays fully open after the source drops below the threshold.',
        moreLabel: 'Longer',
        lessLabel: 'Shorter',
        more: 'The body of the note comes through. Too long and bleed comes through too.',
        less: 'Tighter, but notes can sound clipped off.',
        remember: 'If a drum sounds cut short, lengthen the hold first.',
        consoleName: 'gateHold',
      },
      {
        id: 'gateRelease',
        name: 'Gate release',
        whatItIs: 'How slowly the gate closes after the hold time.',
        moreLabel: 'Longer',
        lessLabel: 'Shorter',
        more: 'The sound fades away naturally.',
        less: 'The sound snaps shut.',
        remember: 'If you can hear the gate closing, lengthen the release.',
        consoleName: 'gateRelease',
      },
    ],
  },
  {
    id: 'compressor',
    title: 'Compressor',
    intro: 'A compressor turns the loud moments down automatically, so quiet and loud parts end up closer together.',
    entries: [
      {
        id: 'compThreshold',
        name: 'Threshold',
        whatItIs: 'The level above which the compressor starts turning the sound down.',
        moreLabel: 'Higher',
        lessLabel: 'Lower',
        more: 'It only touches the very loudest moments, or nothing at all.',
        less: 'It works more of the time and reduces more.',
        remember: 'Set it by watching the gain reduction meter on loud passages, not by a number.',
        consoleName: 'compThreshold',
      },
      {
        id: 'compRatio',
        name: 'Ratio',
        whatItIs: 'How hard the compressor turns down what goes over the threshold.',
        moreLabel: 'Higher',
        lessLabel: 'Lower',
        more: '6:1, 10:1: loud moments are held back firmly. It can sound squashed.',
        less: '2:1, 3:1: gentle and natural.',
        remember: 'Most sources sit between 2:1 and 4:1.',
        consoleName: 'compRatio',
      },
      {
        id: 'compAttack',
        name: 'Attack',
        whatItIs: 'How quickly the compressor reacts once the sound goes over the threshold.',
        moreLabel: 'Slower',
        lessLabel: 'Faster',
        more: '30 ms and up: the start of each note or word gets through, so it keeps its punch and clarity.',
        less: 'Under 10 ms: it catches the start too. More control, but the sound can go dull.',
        remember: 'If something sounds dull or has lost its punch, slow the attack down.',
        consoleName: 'compAttack',
      },
      {
        id: 'compRelease',
        name: 'Release',
        whatItIs: 'How quickly the compressor lets go once the sound drops back under the threshold.',
        moreLabel: 'Slower',
        lessLabel: 'Faster',
        more: '200 ms and up: smooth and steady. Too slow and the next quiet word is still turned down.',
        less: 'Under 100 ms: it recovers quickly. Too fast and you hear the level "breathing" or pumping.',
        remember: 'If you hear pumping, lengthen the release.',
        consoleName: 'compRelease',
      },
      {
        id: 'gainReduction',
        name: 'Gain reduction (the meter)',
        whatItIs: 'Not a knob: the meter that shows how much the compressor is turning the sound down right now.',
        moreLabel: 'More',
        lessLabel: 'Less',
        more: 'More reduction: more control, a flatter sound, and with wedges a higher risk of feedback.',
        less: 'Less reduction: more natural, less control.',
        remember: 'Around 3 to 6 dB on loud passages is a normal working amount.',
        consoleName: null,
      },
      {
        id: 'makeupGain',
        name: 'Makeup gain',
        whatItIs: 'Turns the whole signal back up after the compressor turned the loud parts down.',
        moreLabel: 'More',
        lessLabel: 'Less',
        more: 'More: louder overall, including the quiet parts, the stage noise and the room.',
        less: 'Less: the compressed sound stays a little quieter.',
        remember: 'With wedges on vocals, leave it at zero and use the fader instead.',
        consoleName: 'compMakeupGain',
      },
    ],
  },
  {
    id: 'sends',
    title: 'Sends, monitors and effects',
    intro: 'A send is a copy of a channel going somewhere else: to a monitor, or to a reverb.',
    entries: [
      {
        id: 'sendLevel',
        name: 'Send level',
        whatItIs: 'How much of this channel goes to that monitor mix or effect.',
        moreLabel: 'More',
        lessLabel: 'Less',
        more: 'More of this channel in that monitor, or more reverb on it.',
        less: 'Less of it there.',
        remember: 'It does not change how loud the channel is in the room.',
        consoleName: null,
      },
      {
        id: 'prePost',
        name: 'Pre-fader and post-fader',
        whatItIs: 'Whether a send is taken before or after the channel fader.',
        moreLabel: 'Post-fader',
        lessLabel: 'Pre-fader',
        more: 'The send follows the fader. Used for reverb and delay.',
        less: 'The send ignores the fader. Used for monitors, so the room mix does not change what musicians hear.',
        remember: 'Monitors pre, effects post.',
        consoleName: null,
      },
      {
        id: 'reverbTime',
        name: 'Reverb time (decay)',
        whatItIs: 'How long the reverb tail lasts.',
        moreLabel: 'Longer',
        lessLabel: 'Shorter',
        more: 'Bigger and more washed out. Words blur.',
        less: 'Tighter and clearer.',
        remember: 'In a live room use less than you think. The room is already a reverb.',
        consoleName: null,
      },
      {
        id: 'delayTime',
        name: 'Delay time and repeats',
        whatItIs: 'Delay time is the gap between echoes. Repeats is how many echoes follow.',
        moreLabel: 'Longer, more repeats',
        lessLabel: 'Shorter, fewer repeats',
        more: 'Longer time or more repeats: obvious echoes that pile up.',
        less: 'Shorter time or fewer repeats: a subtle thickening.',
        remember: 'Tap the song tempo so the echoes land in time. Two or three repeats is enough.',
        consoleName: null,
      },
    ],
  },
  {
    id: 'groups',
    title: 'DCAs, groups and mutes',
    intro: 'These let you move or silence several channels at once.',
    entries: [
      {
        id: 'dca',
        name: 'DCA',
        whatItIs: 'A remote control for several faders. No sound passes through it.',
        moreLabel: 'Up',
        lessLabel: 'Down',
        more: 'Every member gets louder by the same amount.',
        less: 'Every member gets quieter by the same amount.',
        remember: 'A channel in two DCAs gets both moves added together.',
        consoleName: null,
      },
      {
        id: 'groupBus',
        name: 'Group bus',
        whatItIs: 'A bus that several channels really pass through on their way to the main mix. It can have its own EQ.',
        moreLabel: 'Up',
        lessLabel: 'Down',
        more: 'The whole group gets louder.',
        less: 'The whole group gets quieter. Its reverb does not follow.',
        remember: 'A channel in a group must be taken off the main mix, or it is heard twice.',
        consoleName: null,
      },
      {
        id: 'muteGroup',
        name: 'Mute group',
        whatItIs: 'One button that mutes a set of channels together.',
        moreLabel: 'On',
        lessLabel: 'Off',
        more: 'All its members are silent.',
        less: 'Each member goes back to its own mute state.',
        remember: 'Use "All FX" when someone speaks, so their voice has no reverb.',
        consoleName: null,
      },
      {
        id: 'solo',
        name: 'Solo',
        whatItIs: 'Lets you hear one channel alone on headphones.',
        moreLabel: 'On',
        lessLabel: 'Off',
        more: 'You hear only that channel in the headphones.',
        less: 'The headphones go back to the normal mix.',
        remember: 'Solo tells you about the source, not about the room. Never switch on solo-in-place: it mutes everything else for everyone.',
        consoleName: null,
      },
    ],
  },
];
