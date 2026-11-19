import { ConsoleProfile, Fact } from './console-profile';

const MANUAL = 'X32 Digital Mixer User Manual (Behringer, P0ASF, 75 pages)';

function verified<T>(value: T, section: string, page: number | null, quote: string, note = ''): Fact<T> {
  return { value, source: { status: 'verified', manual: MANUAL, section, page, quote, note } };
}

function unverified<T>(value: T, note: string): Fact<T> {
  return { value, source: { status: 'unverified', note } };
}

/**
 * Behringer X32 (full size). Read from the manual in docs/manuals/ on 2026-11-18.
 * The manual is thin: it describes controls by encoder position and gives almost no
 * parameter ranges, so those are UNVERIFIED and the sheet flags them "check on your console".
 */
export const X32_PROFILE: ConsoleProfile = {
  id: 'x32',
  name: 'Behringer X32',
  manualTitle: MANUAL,
  facts: {
    inputChannelCount: verified(32, '8. Specifications', 68, '32 input channels, 8 aux channels, 8 fx return channels'),
    auxChannelCount: verified(8, '1. Operational Overview (Routing I/O)', 10, 'Aux Return Channels 1-8 are pre-configured to use the 6 aux input signals', 'Aux channels 7-8 carry USB playback by default.'),
    stereoChannels: verified('linkAdjacentPair', '7.2.1 Home Screen: Home Tab', 46, 'Tap the 1st encoder to link the channel with its adjacent channel.'),
    stereoLinkPairRule: unverified('An odd channel links with the next even channel (1+2, 3+4)', 'The manual only says "adjacent channel". The odd/even rule was in the brief\'s checked list but is not stated in this manual.'),
    stereoBuses: verified('linkAdjacentPair', '4. FX Descriptions', 21, 'when the left and right signal are to be altered together (e.g. on linked stereo', 'Supported by the "Link" control on the bus config screenshot (p11) and the block diagram\'s Mix 1,3...15 / Mix 2,4...16 send pairs. A bus-link procedure is not written out.'),
    busLinkProcedure: unverified('Select the first bus of the pair, open the Home screen config tab and switch on Link', 'A "Link" control is visible on the bus config tab in a screenshot (p11), but the manual writes out no procedure for linking two buses.'),
    stereoSourceProcedure: verified(null, '7.2.1 Home Screen: Home Tab', 46, 'Tap the 1st encoder to link the channel with its adjacent channel.', 'A stereo source uses two linked channels on this console.'),
    assignSourceToChannel: unverified(null, 'This sheet assumes input socket N feeds channel N. The manual\'s default input patch was not checked.'),
    mixBusCount: verified(16, '1. Operational Overview (Input Channel Banks)', 6, 'the 16 Mix Bus Masters, which is useful when you wish to include Bus Masters'),
    matrixCount: verified(6, '1. Operational Overview (Routing I/O)', 11, 'Bus sends to 6 matrices'),
    mainBuses: verified(['Main LR (stereo)', 'Mono Bus (center)'], '1. Operational Overview (Routing I/O)', 11, 'Main Bus Channels LR/C are always available and independent from Mix Buses.'),
    dcaCount: verified(8, '1. Operational Overview (Group/Bus Channel Banks)', 7, 'Eight DCA (digitally controlled amplifier) groups'),
    muteGroupCount: verified(6, '5.8 Using Mute Groups', 32, 'The X32 has 6 separate'),

    fxSlotCount: verified(8, '1. Operational Overview (Effects Processing 1-8)', 11, 'The X32 console contains eight true-stereo internal effects engines.'),
    fxSendCapableSlots: verified([1, 2, 3, 4], '1. Operational Overview (Effects Processing 1-8)', 11, 'FX 1-4 can be configured as side chain or insert effects, while FX 5-8 can only', 'The manual calls a send effect a "side chain" effect.'),
    fxInsertOnlySlots: verified([5, 6, 7, 8], '1. Operational Overview (Effects Processing 1-8)', 11, 'FX 1-4 can be configured as side chain or insert effects, while FX 5-8 can only'),
    fxReverbDelaySlots: unverified([1, 2, 3, 4, 5, 6, 7, 8], 'No rule about which slots can load a reverb or delay is stated. The manual only advises using the left-side slots (1-4) for send effects like reverb.'),
    fxReturnStyle: verified('dedicatedReturnChannels', '1. Operational Overview (Routing I/O)', 10, 'FX Return Channels 1L-4R control the 4 stereo output signals of side-chain FX1-4.', 'They are counted separately from the 32 input channels (spec, p68).'),
    fxDefaultFeedBuses: verified([13, 14, 15, 16], '5.4 How do I add one of the 8 internal effects to the sound?', 29, 'Bus masters 13-16 are connected to the effects inputs FX1-4.'),
    fxScreen: verified('Effects', '7.1.1 Display and Navigation Controls', 43, 'immediately navigate to any of 8 master screens that address different sections'),
    fxInsertProcedure: verified(
      'On the Effects screen, set both inputs of the slot to "Insert" and pick the effect. Then select the channel, open the Home screen config tab, choose the slot with the 6th encoder and press to connect.',
      '1. Operational Overview / 5.4',
      30,
      'As the effects on the left side are also able to handle complex send effects',
      'One FX slot cannot be inserted on more than one channel.',
    ),

    sendTapIsPerBusPair: verified(true, '7.2.6 Home Screen: Sends Tab', 49, 'for the first two sends of the currently focused four sends', 'The place a send is taken from is chosen for two buses at a time (1+2, 3+4, ...).'),
    groupSendDefaultState: unverified(null, 'The manual confirms each send can be muted (p49) but does not say whether a send is on or off by default once its pair is set to Sub-Group. Check on the console which channels feed the group.'),
    sendTapPoints: verified(['Pre-EQ', 'Post-EQ', 'Pre-Fader', 'Post-Fader', 'Sub-Group'], '7.2.6 Home Screen: Sends Tab', 49, 'Adjust the 1st encoder to select where in the signal chain the send is', 'The manual gives three slightly different lists and never prints the abbreviated labels shown on the console screen.'),
    monitorSendTap: verified('Pre-Fader', '7.2.6 Home Screen: Sends Tab', 49, 'Adjust the 1st encoder to select where in the signal chain the send is'),
    defaultSendTap: unverified(null, 'The manual never says which tap a send uses by default.'),
    preFaderSendIsAfterDynamics: verified(true, 'Block Diagram', 70, 'Pre HP/Pre Gate/Post Gate/Pre EQ/Post EQ/Pre Fader/Post Fader/Post Pan L', 'Read from the block diagram: the Pre Fader tap sits after gate, EQ and compressor.'),
    muteCutsPreFaderSends: unverified(true, 'The text is silent. The block diagram (p70) draws each send\'s mute ganged to the channel mute, which suggests a channel mute also cuts its sends. Confirm on the console before relying on it.'),
    sendsScreen: verified('Home screen, sends tab', '7.2.6 Home Screen: Sends Tab', 49, 'Adjust the 1st encoder to select where in the signal chain the send is'),

    soloBehavior: verified('Solo goes to a separate solo bus and does not change what the audience hears. Options are on the Monitor screen (View button in the Monitor section).', '5.7 Everything you ought to know about Solo and monitor sources', 31, 'audio to the solo bus. This operation will not affect the mix that the audience'),
    soloInPlaceExists: unverified(null, 'Solo-in-place is not mentioned anywhere in this manual. Searched: "in place", "SIP", "solo in".'),
    subwooferFeedOptions: verified(
      ['Mono Bus: assign a channel with the "Mono Bus" button and set its "Level"', 'A matrix with a crossover filter on its EQ'],
      '5.14 How do I set up a Matrix for a delay column/tower or a remote zone mix?',
      34,
      'Lets assume Matrix 1 is supposed to drive a woofer system, while Matrix 2',
      'The word "subwoofer" never appears. Feeding a sub from a mix bus is not described.',
    ),

    channelEqBandCount: verified(4, '7.2.5 Home Screen: EQ Tab', 49, 'If the currently selected channel is an input, the channel equalizer contains'),
    busEqBandCount: verified(6, '7.2.5 Home Screen: EQ Tab', 49, 'If the currently selected channel is a bus, the channel equalizer contains six'),
    eqScreen: verified('Home screen, eq tab', '7.2.5 Home Screen: EQ Tab', 49, 'If the currently selected channel is an input, the channel equalizer contains'),
    eqModels: verified(['PEQ (standard parametric)', 'VEQ (vintage style)'], '7.2.5 Home Screen: EQ Tab', 49, 'PEQ (standard parametric)', 'These are per-band modes, not whole-EQ models.'),

    lowCutName: verified('Low Cut', '2.1 Channel Strip', 13, 'Press the Low Cut', 'The screen label on the Home config tab is "Lo Cut".'),
    lowCutRangeHz: unverified(null, 'The range is not stated. A screenshot shows "20 Hz" and nothing more.'),
    lowCutScreen: verified('Home screen, config tab (2nd encoder)', '7.2.2 Home Screen: Config Tab', 47, 'Tap the 2nd encoder to toggle the low-cut filter in/out of the signal path.'),

    gateScreen: verified('Home screen, gate tab', '7.2.3 Home Screen: Gate Tab', 47, 'Adjust the 2nd encoder to select between a gate, ducker, or 3 types'),
    gateParamNames: unverified(
      { threshold: 'threshold (1st encoder)', range: 'range (6th encoder)', attack: 'attack (3rd encoder)', hold: 'hold (4th encoder)', release: 'release (5th encoder)' },
      'The controls and their encoder positions are from the manual (7.2.3, p47). The exact on-screen labels are not printed in it.',
    ),
    gateRangeDbRange: unverified(null, 'No gate ranges or units are given in the manual.'),

    compScreen: verified('Home screen, dyn tab', '7.2.4 Home Screen: Dynamics Tab', 48, 'The dynamics tab displays all aspects of the channel compressor and allows for'),
    compParamNames: unverified(
      { threshold: 'threshold (1st encoder)', ratio: 'ratio (2nd encoder)', attack: 'attack (3rd encoder)', release: 'release (5th encoder)', makeupGain: 'makeup gain (6th encoder)' },
      'The controls and their encoder positions are from the manual (7.2.4, p48). The exact on-screen labels are not printed in it.',
    ),
    compRatioValues: unverified(null, 'The list of ratio values is not in the manual.'),
    compressorModels: unverified(['Channel compressor/expander'], 'The manual describes one channel compressor/expander and no selectable models, but never says there is only one.'),

    reverbEffects: verified(['Hall Reverb', 'Ambience', 'Rich Plate Reverb', 'Room Reverb', 'Chamber Reverb', 'Plate Reverb', 'Vintage Reverb', 'Vintage Room', 'Gated Reverb', 'Reverse Reverb'], '7.7.1 Effects Screen: Home Tab', 59, 'Rich Plate Reverb'),
    delayEffects: verified(['Stereo Delay', '3-Tap Delay', 'Rhythm Delay', 'Modulation Delay'], '7.7.1 Effects Screen: Home Tab', 59, '3-Tap Delay'),
    deEsserEffects: verified(['Dual DeEsser', 'Stereo DeEsser'], '7.7.1 Effects Screen: Home Tab', 59, 'Dual DeEsser', 'Only listed; the manual has no description of the DeEsser.'),
    limiterEffects: verified(['Precision Limiter'], '4. FX Descriptions', 21, 'Stereo Precision Limiter allows you to set a precise volume limit,', 'No built-in main bus limiter is documented; this effect has to be inserted from an FX slot.'),

    setBusAsGroup: verified(
      'Select the channel, open the Home screen sends tab, and for the pair of buses that holds this bus choose "Sub-Group" as the place the send is taken from.',
      '5.9 Mix Buses, Sub Groups and DCA Groups',
      32,
      'of buses and groups for the 16 mix outputs of the console. This setting can later',
      'A console-wide preset of buses and groups is on the Setup screen, config tab. The manual names that location inconsistently.',
    ),
    removeChannelFromMain: verified('Select the channel, open the Home screen main tab, and tap the 1st encoder so the channel is no longer assigned to the main stereo output (or turn off the "Stereo Bus" button on the channel strip).', '7.2.7 Home Screen: Main Tab', 49, 'Tap the 1st encoder to assign the selected channel to the main stereo output.'),
    saveScene: verified(
      ['Press the View button in the Scenes section and open the scenes tab.', 'Turn the 2nd encoder to an empty scene slot and press it to open the save screen.', 'Type a new name and save.'],
      '7.13.2 Scenes Screen: Scenes Tab',
      65,
      'Rotate the 2nd encoder to select a scene slot and press the encoder to bring',
      'The manual does not say how the save screen is confirmed.',
    ),
    nameChannel: verified(
      ['Press Select on the channel.', 'Press Home and go to the config tab.', 'Press Utility, then choose a color and icon and type a name.'],
      '5.13 What kinds of Utilities are available?',
      33,
      'select a color, icon, and type in a name for the',
    ),
    assignDca: verified(
      ['Press the GROUP DCA 1-8 button on the output fader layer.', 'Hold that DCA\'s Select button.', 'While holding it, press Select on every channel that belongs to the DCA.'],
      '5.9 Mix Buses, Sub Groups and DCA Groups',
      32,
      'Hold the respective DCA Group Select button on the right-hand side of',
    ),
    assignMuteGroup: verified(
      ['Press the MUTE GRP button next to the display.', 'Hold the mute group button (1-6) and press Select on every channel that belongs to it.', 'Press MUTE GRP again to leave assign mode.'],
      '5.8 Using Mute Groups',
      32,
      'Press the MUTE GRP button.',
    ),
    phantomPower: verified('48 V button in the channel strip Config/Preamp section', '2.1 Channel Strip', 13, 'Press the 48 V button to apply phantom power for use with', 'The manual advises muting the channel before switching phantom power.'),
    preampGain: verified('Gain knob in the channel strip Config/Preamp section', '2.1 Channel Strip', 13, 'Adjust the preamp gain for the selected channel with the'),
    polarity: verified('"phase flip": Home screen home tab, page 2, tap the 2nd encoder', '7.2.1 Home Screen: Home Tab', 46, 'Tap the 2nd encoder to toggle phase flip on/off for the currently', 'The manual says "phase", never "polarity".'),
    mainBusProcessing: verified('Insert point, 6-band parametric EQ, compressor/expander, sends to 6 matrices. No built-in limiter is documented.', '1. Operational Overview (Routing I/O)', 11, 'Main Bus Channels LR/C are always available and independent from Mix Buses.'),
    mainLimiterInsertPoint: verified(null, '1. Operational Overview (Routing I/O)', 11, 'Main Bus Channels LR/C are always available and independent from Mix Buses.', 'The main bus has one insert point.'),
  },
  effectChoice: {
    plateReverb: 'Plate Reverb',
    hallReverb: 'Hall Reverb',
    roomReverb: 'Room Reverb',
    delay: 'Stereo Delay',
    deEsser: 'Dual DeEsser',
  },
};
