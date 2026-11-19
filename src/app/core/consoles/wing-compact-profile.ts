import { ConsoleProfile, Fact } from './console-profile';

const MANUAL = 'WING series User Manual (Behringer, 2025-10-20 edition, 167 pages)';

function verified<T>(value: T, section: string, page: number | null, quote: string, note = ''): Fact<T> {
  return { value, source: { status: 'verified', manual: MANUAL, section, page, quote, note } };
}

function unverified<T>(value: T, note: string): Fact<T> {
  return { value, source: { status: 'unverified', note } };
}

/**
 * Behringer WING Compact. Read from the manual in docs/manuals/ on 2026-11-18.
 * The manual gives parameter names but no numeric ranges, so ranges are UNVERIFIED.
 */
export const WING_COMPACT_PROFILE: ConsoleProfile = {
  id: 'wingCompact',
  name: 'Behringer WING Compact',
  manualTitle: MANUAL,
  facts: {
    inputChannelCount: verified(40, '2.2 40 Input Channels and 8 Aux Channels', 7, 'All Input Channels (1-40) support mono, stereo, or mid/side signals'),
    auxChannelCount: verified(8, '2.2 40 Input Channels and 8 Aux Channels', 7, 'Aux Channels (A1-A8) support mono and stereo signals', 'The WING Compact has no Aux In TRS jacks, but the 8 Aux channels exist.'),
    stereoChannels: verified('native', '2.2 40 Input Channels and 8 Aux Channels', 7, 'without requiring adjacent channel linking', 'Mono or stereo is a property of the Source (ROUTING, SOURCES); the channel adopts it.'),
    stereoLinkPairRule: verified(null, '2.2 40 Input Channels and 8 Aux Channels', 7, 'without requiring adjacent channel linking', 'No linking is needed.'),
    stereoBuses: verified('native', '2.4 16 Stereo Buses', 7, 'WING provides 16 stereo buses (B1-B16)'),
    busLinkProcedure: verified(null, '2.4 16 Stereo Buses', 7, 'WING provides 16 stereo buses (B1-B16)', 'Buses are already stereo.'),
    stereoSourceProcedure: verified('Press ROUTING, open SOURCES, select the two inputs and group them as one stereo Source in the right panel', '5.4 ROUTING - SOURCES', 40, 'two input channels must be grouped', 'Full sentence: "To assign a stereo or mid/side Source to a single channel, two input channels must be grouped as a single stereo or mid/side Source in the right panel."'),
    assignSourceToChannel: verified('Press ROUTING, open CHANNELS, click the channel, then click the Source you want on it', '5.4 ROUTING - CHANNELS', 39, 'Click on the Source you want to assign to that channel.'),
    mixBusCount: verified(16, '2.4 16 Stereo Buses', 7, 'WING provides 16 stereo buses (B1-B16)'),
    matrixCount: verified(8, '2.5 8 Matrix Buses', 8, 'The 8 Matrix buses (MX1 - MX8)'),
    mainBuses: verified(['MAIN 1', 'MAIN 2', 'MAIN 3', 'MAIN 4'], '2.3 4 Stereo Main Buses', 7, 'WING features 4 stereo Main buses (M1-M4)'),
    dcaCount: verified(16, '5.1 HOME - Tags', 31, 'There are 16 available DCA groups, labeled D1 to D16', 'Behringer marketing pages list 8; the manual says 16.'),
    muteGroupCount: verified(8, '5.1 HOME - Tags', 31, 'labeled D1 to D16, and 8 Mute Groups'),

    fxSlotCount: verified(16, '5.2 EFFECTS', 36, 'overview of the 16 effect units that can be loaded into the'),
    fxSendCapableSlots: verified([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], '5.2 EFFECTS', 36, 'loaded into the', 'Not a slot property on this console: every slot is used as an insert point, and a send effect is an effect inserted on a bus.'),
    fxInsertOnlySlots: verified([], '5.2 EFFECTS', 36, 'The eight Standard FX slots can accommodate only the effects from the STD and CH categories', 'No slot range is labelled insert only. Slots 9-16 load only the STD and CH categories.'),
    fxReverbDelaySlots: verified([1, 2, 3, 4, 5, 6, 7, 8], '5.2 EFFECTS', 36, 'not available in slots 9-16', 'Slots 1-8 "provide access to effects that require external memory - such as those with delay lines".'),
    fxReturnStyle: verified('busIsTheReturn', '6 Channel Processing', 68, 'instead of being set up through dedicated effect buses or returns', 'The effect is inserted on a bus, channels are sent to that bus, and the bus is routed to Main.'),
    fxDefaultFeedBuses: verified(null, '6 Channel Processing', 68, 'instead of being set up through dedicated effect buses or returns', 'Any bus can host a send effect.'),
    fxScreen: verified('EFFECTS', '5.2 EFFECTS', 36, 'overview of the 16 effect units that can be loaded into the'),
    fxInsertProcedure: verified(
      'Select the channel or bus, press HOME, open the INS 1 slot and choose the FX slot there.',
      '5.2 EFFECTS / 6.1 INS 1 and INS 2',
      37,
      'Load the desired effect into the insert point of a Bus',
    ),

    sendTapIsPerBusPair: verified(false, '2.4 16 Stereo Buses', 8, 'GROUP: The send level to the bus is deactivated', 'The mode is chosen for each send on its own.'),
    groupSendDefaultState: unverified(null, 'The manual documents a send on/off setting ("Send Enable", p36) but does not say whether a send is on by default. Check that each channel\'s send to the group bus is switched on.'),
    sendTapPoints: verified(['TAP', 'POST', 'GROUP'], '2.4 16 Stereo Buses / 6.1 BUS/MATRIX SENDS', 68, 'The following TAP point positions are available', 'There is no bus send mode named PRE. A pre-fader send is TAP mode with the channel\'s TAP point at PRE FDR.'),
    monitorSendTap: verified('TAP, with the channel TAP point at PRE FDR', '6.1 INPUT Channels', 68, 'PRE FDR: Between the fourth processing slot and the channel fader'),
    defaultSendTap: unverified(null, 'The manual does not state the factory default send mode or TAP point position.'),
    preFaderSendIsAfterDynamics: verified(null, '6.1 INPUT Channels', 68, 'The order of all processing slots and the TAP point can be adjusted', 'It depends on where the TAP point is placed. At PRE FDR it is after the gate, EQ and compressor.'),
    muteCutsPreFaderSends: unverified(true, 'Implied, not stated: a TAP-mode option "IGNORE CHANNEL MUTE" exists ("the send remains active when the channel is muted", p74), but its default state is not given.'),
    sendsScreen: verified('HOME, BUS/MATRIX SENDS', '6.1 BUS/MATRIX SENDS', 74, 'the send remains active when the channel is muted'),

    soloBehavior: verified('Solo can be PFL or AFL, set in SETUP under SOLO SYSTEM. SOLO MODE offers LIVE, STUDIO and SIP (Solo In Place).', '5.5 SETUP - SOLO SYSTEM', 46, 'pre-fader listen, PFL) or post-fader (after-fader'),
    soloInPlaceExists: verified(true, '5.5 SETUP - SOLO SYSTEM', 46, 'SIP (Solo In Place): When Solo is activated on a channel', 'SIP mutes every other channel in the room mix.'),
    subwooferFeedOptions: unverified(['A bus', 'A matrix', 'A second Main bus'], 'The manual never mentions subwoofers. Only the building blocks are documented: 16 buses, 8 matrices and 4 independent Main buses.'),

    channelEqBandCount: verified(6, '11.1 Equalizers - WING EQ', 92, 'featuring six parametric filters'),
    busEqBandCount: verified(8, '6.3 Bus Channels', 76, '8-band EQ (post-fader) (same processors as Input Channels)'),
    eqScreen: verified('HOME, EQ', '11.1 Equalizers - WING EQ', 92, 'WING EQ is the console’s default digital equalizer'),
    eqModels: unverified(['WING EQ'], 'WING EQ is the verified default. The manual lists other EQ models but does not say which are selectable in the channel EQ slot.'),

    lowCutName: verified('LO CUT', '6.1 INPUT Channels', 71, 'The LO CUT and HI CUT buttons enable/disable the filter in the INPUT slot', 'On the FILTER screen the frequency control is LC FREQ.'),
    lowCutRangeHz: unverified(null, 'No frequency range for the low cut is given anywhere in the manual text.'),
    lowCutScreen: verified('HOME, INPUT, FILTER (LC FREQ)', '6.1 INPUT Channels', 69, 'FILTER: clicking on the name opens a screen with additional controls'),

    gateScreen: verified('HOME, GATE', '11.2 Dynamics - WING Gate/Expander', 104, 'A combination of a noise gate and downward expander'),
    gateParamNames: verified({ threshold: 'THR', range: 'RANGE', attack: 'ATTACK', hold: 'HOLD', release: 'RELEASE' }, '11.2 Dynamics - WING Gate/Expander', 104, 'A combination of a noise gate and downward expander', 'Names are from the parameter table. No ranges or units are given.'),
    gateRangeDbRange: unverified(null, 'No numeric ranges are given for the gate.'),

    compScreen: verified('HOME, COMP', '11.2 Dynamics - WING Compressor', 102, 'Threshold in dB, when reached, gain'),
    compParamNames: verified({ threshold: 'THR', ratio: 'RATIO', attack: 'ATTACK', release: 'RELEASE', makeupGain: 'GAIN' }, '11.2 Dynamics - WING Compressor', 102, 'Threshold in dB, when reached, gain', 'Names are from the WING Compressor parameter table. No ranges are given.'),
    compRatioValues: unverified(null, 'No ratio range or list is given in the manual.'),
    compressorModels: unverified(['WING Compressor'], 'WING Compressor is the verified default. The manual lists many dynamics models but does not say which appear in the channel COMP slot.'),

    reverbEffects: verified(['Hall Reverb', 'Room Reverb', 'Chamber Reverb', 'Plate Reverb', 'Concert Reverb', 'Ambience Reverb', 'VSS3 Reverb', 'Vintage Room', 'Vintage Reverb', 'Vintage Plate', 'Blue Plate', 'Gated Reverb', 'Reverse Reverb', 'Delay/Reverb', 'Shimmer Reverb', 'Spring Reverb'], '11.4 Reverbs', 126, 'Hall, Room, Chamber, Plate, Concert, and Ambience'),
    delayEffects: verified(['Stereo Delay', 'Ultratap Delay', 'Tape Delay', 'Oilcan Delay', 'BBD Delay'], '11.5 Delays', 142, 'Oilcan Delay is modeled after'),
    deEsserEffects: verified(['BDX902 De-Esser', '2-Band De-Esser'], '11.2 Dynamics', 124, '2-Band De-Esser is only available in the FX Rack', 'The 2-Band De-Esser is used as an insert from the FX Rack.'),
    limiterEffects: verified(['Precision Limiter'], '11.2 Dynamics', 119, 'Provides precise peak control to prevent digital clipping and distortion', 'The quote is from the Precision Limiter description; the page was reported by the manual reader and should be spot-checked.'),

    setBusAsGroup: verified('Select the channel, open HOME, BUS/MATRIX SENDS, click the Pan knob of that bus and set MODE to GROUP.', '2.4 16 Stereo Buses', 8, 'GROUP: The send level to the bus is deactivated'),
    removeChannelFromMain: unverified('Select the channel, open HOME, MAIN SENDS, and turn off its send to MAIN 1.', 'The MAIN SENDS screen is documented (p72), but the manual does not spell out a step for removing a channel from Main.'),
    saveScene: verified(['Press LIBRARY.', 'Open the SNAP tab.', 'Press SAVE to store a new Snapshot of the current console.'], '5.6 LIBRARY - SNAP', 54, 'SAVE: creates a new Snapshot with all the current console configurations', 'The manual does not describe a file-name entry step.'),
    nameChannel: verified(['Select the channel and press HOME.', 'Open the NAME/ICON/COLOR window.', 'On the Name tab, type the name.'], '5.1 HOME - Name', 31, 'Input the desired name for the channel'),
    assignDca: verified(['Select the channel and press HOME.', 'Open the TAGS tab.', 'Select the DCA (D1 to D16).'], '5.1 HOME - Tags', 31, 'There are 16 available DCA groups, labeled D1 to D16'),
    assignMuteGroup: verified(['Select the channel and press HOME.', 'Open the TAGS tab.', 'Select the Mute Group.'], '5.11 MUTE GROUPS', 66, 'click on the grid corresponding to the desired Mute Group'),
    phantomPower: unverified('Phantom power is a property of the Source: ROUTING, SOURCES, select the Source', 'The manual says phantom power is a Source property (p40) but does not give the exact on-screen label.'),
    preampGain: unverified('Preamp gain is a property of the Source: ROUTING, SOURCES, select the Source', 'The manual says gain is a Source property (p40). The exact on-screen label, and any hardware gain knob on the WING Compact, are not described.'),
    polarity: verified('INVERT, in HOME, INPUT under TRIM & BALANCE', '6.1 INPUT Channels', 69, 'INVERT: phase inversion'),
    mainBusProcessing: verified('Dynamics slot, pre-fader insert, 8-band EQ, post-fader insert. No gate.', '6.5 Main Channels', 77, 'There are 4 Main Channels available'),
  },
  effectChoice: {
    plateReverb: 'Plate Reverb',
    hallReverb: 'Hall Reverb',
    roomReverb: 'Room Reverb',
    delay: 'Stereo Delay',
    deEsser: '2-Band De-Esser',
  },
};
