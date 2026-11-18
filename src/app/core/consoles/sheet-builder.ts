import { ChannelPlan, MixPlan, NumericSetting, TextSetting } from '../model';
import { allocateBusesAndFx, Allocation, allocateChannels, describeChannel, validateForConsole } from './allocation';
import { ConsoleFactKey, ConsoleProfile } from './console-profile';
import {
  AdapterResult,
  BusAssignment,
  ChannelAssignment,
  ChannelReference,
  FxAssignment,
  SectionId,
  SHEET_DISCLAIMER,
  SheetSection,
  SheetStep,
  SheetWarning,
  StepDetail,
} from './console-sheet';

/**
 * Builds a console sheet from a plan and a profile. Every console name on the sheet is taken
 * from the profile. The plan is never changed.
 */

interface BuildContext {
  plan: MixPlan;
  profile: ConsoleProfile;
  channelMap: ChannelAssignment[];
  allocation: Allocation;
  warnings: SheetWarning[];
}

interface StepInput {
  id: string;
  sectionId: SectionId;
  subject: string;
  instruction: string;
  value?: string | null;
  subSteps?: string[];
  detail?: StepDetail | null;
  safety: SheetStep['safety'];
  optional?: boolean;
  refs?: ConsoleFactKey[];
  effectName?: string | null;
  fxSlot?: number | null;
  busNumbers?: number[];
}

function makeStep(context: BuildContext, input: StepInput): SheetStep {
  const refs = input.refs ?? [];

  // A step that relies on a fact the manual could not confirm gets a visible flag.
  let checkOnConsole: string | null = null;
  for (const ref of refs) {
    const source = context.profile.facts[ref].source;
    if (source.status === 'unverified') {
      checkOnConsole = source.note;
      break;
    }
  }

  return {
    id: input.id,
    sectionId: input.sectionId,
    subject: input.subject,
    instruction: input.instruction,
    value: input.value ?? null,
    subSteps: input.subSteps ?? [],
    detail: input.detail ?? null,
    safety: input.safety,
    optional: input.optional ?? false,
    checkOnConsole,
    controlRefs: refs,
    effectName: input.effectName ?? null,
    fxSlot: input.fxSlot ?? null,
    busNumbers: input.busNumbers ?? [],
  };
}

function formatNumber(setting: NumericSetting, value: number): string {
  if (setting.unit === ':1') {
    return `${value}:1`;
  }
  return `${value} ${setting.unit}`;
}

function numericDetail(setting: NumericSetting): StepDetail {
  return {
    range: `${formatNumber(setting, setting.range.min)} to ${formatNumber(setting, setting.range.max)}`,
    why: setting.why,
    listenFor: setting.listenFor,
    provenance: setting.provenance,
  };
}

function textDetail(setting: TextSetting): StepDetail {
  return { range: null, why: setting.why, listenFor: setting.listenFor, provenance: [] };
}

function plainDetail(why: string, listenFor: string): StepDetail {
  return { range: null, why, listenFor, provenance: [] };
}

function describeConsoleChannels(assignment: ChannelAssignment): string {
  if (assignment.consoleChannels.length === 2) {
    return `Ch ${assignment.consoleChannels[0]}+${assignment.consoleChannels[1]}`;
  }
  return `Ch ${assignment.consoleChannels[0]}`;
}

function subjectFor(context: BuildContext, channel: ChannelPlan): string {
  const assignment = context.channelMap.find((entry) => entry.channelId === channel.id);
  if (assignment === undefined) {
    return describeChannel(channel);
  }
  return `${describeConsoleChannels(assignment)} · ${assignment.label}`;
}

function describeBuses(busNumbers: number[]): string {
  if (busNumbers.length === 2) {
    return `buses ${busNumbers[0]}+${busNumbers[1]}`;
  }
  return `bus ${busNumbers[0]}`;
}

function findBus(context: BuildContext, planId: string): BusAssignment | undefined {
  return context.allocation.busMap.find((entry) => entry.planId === planId);
}

function findFx(context: BuildContext, planId: string): FxAssignment | undefined {
  return context.allocation.fxMap.find((entry) => entry.planId === planId);
}

/** Clamps a value to a console range, when the console's range is known, and records the clamp. */
function clampToConsole(
  context: BuildContext,
  value: number,
  range: { min: number; max: number } | null,
  label: string,
  unit: string,
): number {
  if (range === null) {
    return value;
  }
  if (value < range.min) {
    context.warnings.push({ kind: 'clamp', message: `${label}: ${value} ${unit} is below what this console allows. Set to ${range.min} ${unit}.` });
    return range.min;
  }
  if (value > range.max) {
    context.warnings.push({ kind: 'clamp', message: `${label}: ${value} ${unit} is above what this console allows. Set to ${range.max} ${unit}.` });
    return range.max;
  }
  return value;
}

/** Snaps a ratio to the nearest ratio the console offers, when it offers fixed steps. */
function snapRatio(context: BuildContext, ratio: number, label: string): number {
  const offered = context.profile.facts.compRatioValues.value;
  if (offered === null || offered.length === 0) {
    return ratio;
  }
  let nearest = offered[0];
  for (const candidate of offered) {
    if (Math.abs(candidate - ratio) < Math.abs(nearest - ratio)) {
      nearest = candidate;
    }
  }
  if (nearest !== ratio) {
    context.warnings.push({ kind: 'adaptation', message: `${label}: this console has no ${ratio}:1 ratio. Using the nearest, ${nearest}:1.` });
  }
  return nearest;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function buildProtectSection(context: BuildContext): SheetSection {
  const facts = context.profile.facts;
  const steps: SheetStep[] = [
    makeStep(context, {
      id: 'protect:save',
      sectionId: 'protect',
      subject: 'Before anything else',
      instruction: 'Save the console as it is now under a new name, so you can get back to it',
      subSteps: facts.saveScene.value,
      detail: plainDetail('If anything on this sheet goes wrong, the saved copy is the way back.', 'Nothing to listen for. Check the new name appears in the list.'),
      safety: 'safeDuringService',
      refs: ['saveScene'],
    }),
  ];
  return {
    id: 'protect',
    title: 'Protect the current setup',
    intro: 'Save what is on the console now, so nothing you do next can lose a working setup.',
    steps,
  };
}

function buildDoNotTouchList(context: BuildContext): string[] {
  const list = [
    'Routing and input patching (except where this sheet says so, at rehearsal)',
    'Output patching',
    'The system EQ on the main outputs',
    'Loading a scene or snapshot during a service',
  ];
  const soloInPlace = context.profile.facts.soloInPlaceExists;
  if (soloInPlace.value === true) {
    list.push('Solo-in-place (SIP): it mutes everything else in the room');
  } else if (soloInPlace.source.status === 'unverified') {
    list.push('Any solo-in-place mode, if this console has one: it mutes everything else in the room');
  }
  return list;
}

function buildPatchSection(context: BuildContext): SheetSection {
  const facts = context.profile.facts;
  const steps: SheetStep[] = [];
  const needsLinking = facts.stereoChannels.value === 'linkAdjacentPair';

  for (const channel of context.plan.channels) {
    const assignment = context.channelMap.find((entry) => entry.channelId === channel.id);
    if (assignment === undefined) {
      continue;
    }
    const subject = subjectFor(context, channel);
    const isLinkedPair = assignment.consoleChannels.length === 2;

    let instruction = `Plug in and name channel ${assignment.consoleChannels[0]}: ${assignment.label}`;
    const refs: ConsoleFactKey[] = ['nameChannel'];
    if (isLinkedPair) {
      instruction = `Plug left and right into channels ${assignment.consoleChannels[0]} and ${assignment.consoleChannels[1]}, link them as a stereo pair, and name them: ${assignment.label}`;
      refs.push('stereoChannels', 'stereoLinkPairRule');
    } else if (channel.stereo && !needsLinking) {
      instruction = `Plug in channel ${assignment.consoleChannels[0]} as a stereo source and name it: ${assignment.label}`;
      refs.push('stereoChannels');
    }

    steps.push(
      makeStep(context, {
        id: `patch:${channel.id}`,
        sectionId: 'patch',
        subject,
        instruction,
        // The naming procedure is shown once, on the first channel.
        subSteps: steps.length === 0 ? facts.nameChannel.value : [],
        detail: plainDetail('Named channels in a standard order (drums, bass, guitars, keys, pads, vocals) are faster to find under pressure.', 'Nothing to listen for.'),
        safety: 'rehearsalOnly',
        refs,
      }),
    );

    if (channel.connection === 'condenserMic') {
      steps.push(
        makeStep(context, {
          id: `phantom:${channel.id}`,
          sectionId: 'patch',
          subject,
          instruction: 'Mute the channel, turn on phantom power, then unmute',
          value: facts.phantomPower.value,
          detail: plainDetail('A condenser mic does not work without phantom power. Switching it on makes a loud pop unless the channel is muted.', 'No pop through the speakers.'),
          safety: 'rehearsalOnly',
          refs: ['phantomPower'],
        }),
      );
    }

    const polarityNeedsCheck = channel.polarity.value !== 'Normal';
    if (polarityNeedsCheck) {
      steps.push(
        makeStep(context, {
          id: `polarity:${channel.id}`,
          sectionId: 'patch',
          subject,
          instruction: `Polarity: ${channel.polarity.value}`,
          value: facts.polarity.value,
          detail: textDetail(channel.polarity),
          safety: 'rehearsalOnly',
          refs: ['polarity'],
        }),
      );
    }

    if (!channel.routeToMain) {
      steps.push(
        makeStep(context, {
          id: `offmain:${channel.id}`,
          sectionId: 'patch',
          subject,
          instruction: 'Take this channel off the main mix. It goes to monitors only',
          value: facts.removeChannelFromMain.value,
          detail: plainDetail('This source must never be heard in the room.', 'With the channel fader up, nothing should come out of the main speakers.'),
          safety: 'rehearsalOnly',
          refs: ['removeChannelFromMain'],
        }),
      );
    }

    steps.push(
      makeStep(context, {
        id: `pan:${channel.id}`,
        sectionId: 'patch',
        subject,
        instruction: 'Set the pan',
        value: channel.pan.value,
        detail: textDetail(channel.pan),
        safety: 'safeDuringService',
      }),
    );
  }

  return {
    id: 'patch',
    title: 'Patch and name channels',
    intro: 'Put every source on a known channel, in the same order every week, so you can find it without looking.',
    steps,
  };
}

function buildGainSection(context: BuildContext): SheetSection {
  const steps = context.plan.channels.map((channel) =>
    makeStep(context, {
      id: `gain:${channel.id}`,
      sectionId: 'gain',
      subject: subjectFor(context, channel),
      instruction: 'Set the preamp gain',
      value: 'Loudest moments peak around -12 dB',
      subSteps: channel.gainStaging.steps,
      detail: { range: null, why: channel.gainStaging.why, listenFor: channel.gainStaging.listenFor, provenance: [] },
      safety: 'rehearsalOnly',
      refs: ['preampGain'],
    }),
  );
  return {
    id: 'gain',
    title: 'Gain staging',
    intro: 'Set each input so its loudest moment is clean. Everything after this assumes these gains. During a service, only ever turn a gain down, and only if that input is clipping.',
    steps,
  };
}

function buildLowCutSection(context: BuildContext): SheetSection {
  const facts = context.profile.facts;
  const steps: SheetStep[] = [];

  for (const channel of context.plan.channels) {
    const subject = subjectFor(context, channel);
    if (channel.lowCut !== null) {
      const hz = clampToConsole(context, channel.lowCut.value, facts.lowCutRangeHz.value, `${subject} low cut`, 'Hz');
      steps.push(
        makeStep(context, {
          id: `lowcut:${channel.id}`,
          sectionId: 'lowCuts',
          subject,
          instruction: `Turn ${facts.lowCutName.value} on and set it to ${hz} Hz`,
          value: `${hz} Hz`,
          detail: numericDetail(channel.lowCut),
          safety: 'safeDuringService',
          refs: ['lowCutName', 'lowCutScreen'],
        }),
      );
    }

    const bandsAvailable = facts.channelEqBandCount.value;
    const cuts = channel.suggestedCuts.slice(0, bandsAvailable);
    cuts.forEach((suggestedCut, index) => {
      steps.push(
        makeStep(context, {
          id: `eqcut:${channel.id}:${index}`,
          sectionId: 'lowCuts',
          subject,
          instruction: `Optional EQ cut (${suggestedCut.label.toLowerCase()}): ${suggestedCut.gainDb} dB at ${suggestedCut.frequencyHz} Hz, ${suggestedCut.q} Q`,
          value: `${suggestedCut.gainDb} dB at ${suggestedCut.frequencyHz} Hz`,
          detail: plainDetail(suggestedCut.why, suggestedCut.listenFor),
          safety: 'safeDuringService',
          optional: true,
          refs: ['eqScreen', 'channelEqBandCount'],
        }),
      );
    });
  }

  return {
    id: 'lowCuts',
    title: 'Low cuts and optional EQ',
    intro: 'Remove the low rumble each source does not need, so the kick and bass have the low end to themselves. The EQ cuts are optional: try each one and keep it only if it sounds better.',
    steps,
  };
}

function buildGroupsSection(context: BuildContext): SheetSection {
  const facts = context.profile.facts;
  const plan = context.plan;
  const steps: SheetStep[] = [];

  const labelOf = (channelId: string): string => {
    const assignment = context.channelMap.find((entry) => entry.channelId === channelId);
    return assignment === undefined ? channelId : assignment.label;
  };

  let dcaNumber = 0;
  for (const dca of plan.dcas) {
    const hasMembers = dca.holdsFxReturns || dca.memberChannelIds.length > 0;
    if (!hasMembers) {
      continue;
    }
    dcaNumber = dcaNumber + 1;
    const members = dca.holdsFxReturns ? 'every effect return' : dca.memberChannelIds.map(labelOf).join(', ');
    steps.push(
      makeStep(context, {
        id: `dca:${dca.id}`,
        sectionId: 'groups',
        subject: `DCA ${dcaNumber} · ${dca.label}`,
        instruction: `Assign to DCA ${dcaNumber} and name it "${dca.label}"`,
        value: members,
        subSteps: facts.assignDca.value,
        detail: plainDetail(dca.why, 'Moving the DCA fader should move all of its members together.'),
        safety: 'rehearsalOnly',
        refs: ['assignDca', 'dcaCount'],
      }),
    );
  }

  const doubled = plan.channels.filter((channel) => channel.inMultipleDcas);
  if (doubled.length > 0) {
    steps.push(
      makeStep(context, {
        id: 'dca:doubled',
        sectionId: 'groups',
        subject: 'Channels in two DCAs',
        instruction: 'Remember: these channels sit in two DCAs, so two DCA moves add together on them',
        value: doubled.map((channel) => labelOf(channel.id)).join(', '),
        detail: plainDetail('Pushing both DCAs by 3 dB raises these channels by 6 dB.', 'Watch these channels when you ride two DCAs at once.'),
        safety: 'safeDuringService',
      }),
    );
  }

  plan.muteGroups.forEach((muteGroup, index) => {
    const members = muteGroup.holdsFxReturns ? 'every effect return' : muteGroup.memberChannelIds.map(labelOf).join(', ');
    steps.push(
      makeStep(context, {
        id: `mute:${muteGroup.id}`,
        sectionId: 'groups',
        subject: `Mute group ${index + 1} · ${muteGroup.label}`,
        instruction: `Assign to mute group ${index + 1}`,
        value: members,
        subSteps: facts.assignMuteGroup.value,
        detail: plainDetail(muteGroup.why, 'Pressing the mute group should silence exactly these sources.'),
        safety: 'rehearsalOnly',
        refs: ['assignMuteGroup', 'muteGroupCount'],
      }),
    );
  });

  for (const wish of plan.groupBuses) {
    const bus = findBus(context, wish.id);
    if (bus === undefined) {
      continue;
    }
    const members = wish.memberChannelIds.map(labelOf).join(', ');
    const busText = describeBuses(bus.busNumbers);
    const widthNote = bus.busNumbers.length === 1 && facts.stereoBuses.value === 'linkAdjacentPair' ? ' (mono, to save buses)' : '';
    steps.push(
      makeStep(context, {
        id: `group:${wish.id}:route`,
        sectionId: 'groups',
        subject: `${wish.label} group · ${busText}`,
        instruction: `Route these channels through ${busText} as a group${widthNote}, and name the bus "${wish.label}"`,
        value: members,
        subSteps: [facts.setBusAsGroup.value],
        detail: plainDetail(wish.why, 'Pulling the group fader down should pull all of these down together.'),
        safety: 'rehearsalOnly',
        refs: ['setBusAsGroup', 'mixBusCount'],
        busNumbers: bus.busNumbers,
      }),
    );
    steps.push(
      makeStep(context, {
        id: `group:${wish.id}:offmain`,
        sectionId: 'groups',
        subject: `${wish.label} group · ${busText}`,
        instruction: 'Take each of those channels off the main mix, and make sure the group bus itself goes to the main mix',
        value: members,
        subSteps: [facts.removeChannelFromMain.value],
        detail: plainDetail('A channel that goes to the main mix both directly and through its group is heard twice, and sounds louder and hollow.', 'Mute the group bus: its channels should disappear from the room completely.'),
        safety: 'rehearsalOnly',
        refs: ['removeChannelFromMain'],
        busNumbers: bus.busNumbers,
      }),
    );
    wish.processingNotes.forEach((note, index) => {
      steps.push(
        makeStep(context, {
          id: `group:${wish.id}:note:${index}`,
          sectionId: 'groups',
          subject: `${wish.label} group · ${busText}`,
          instruction: note,
          detail: plainDetail('One cut on the group does the work of the same cut on every channel.', 'The group should sound clearer, not thinner.'),
          safety: 'safeDuringService',
          optional: true,
          refs: ['busEqBandCount'],
          busNumbers: bus.busNumbers,
        }),
      );
    });
  }

  return {
    id: 'groups',
    title: 'DCAs, mute groups and group buses',
    intro: 'Gather the channels into a few faders you can ride during the service, instead of chasing thirty.',
    steps,
  };
}

function buildFxSection(context: BuildContext): SheetSection {
  const facts = context.profile.facts;
  const plan = context.plan;
  const steps: SheetStep[] = [];
  const busIsTheReturn = facts.fxReturnStyle.value === 'busIsTheReturn';

  for (const wish of plan.sendEffects) {
    const fx = findFx(context, wish.id);
    const bus = findBus(context, wish.id);
    if (fx === undefined || bus === undefined) {
      continue;
    }
    const subject = `FX ${fx.slot} · ${wish.label}`;
    const busText = describeBuses(bus.busNumbers);

    const loadInstruction = busIsTheReturn
      ? `Load "${fx.effectName}" into FX slot ${fx.slot} and insert it on ${busText}. Name the bus "${wish.label}"`
      : `Load "${fx.effectName}" into FX slot ${fx.slot} as a send effect, fed from ${busText}`;
    const loadRefs: ConsoleFactKey[] = busIsTheReturn
      ? ['fxScreen', 'fxInsertProcedure', 'fxReverbDelaySlots', 'fxReturnStyle']
      : ['fxScreen', 'fxSendCapableSlots', 'fxDefaultFeedBuses'];

    steps.push(
      makeStep(context, {
        id: `fx:${wish.id}:load`,
        sectionId: 'fx',
        subject,
        instruction: loadInstruction,
        value: fx.effectName,
        detail: plainDetail(wish.why, wish.listenFor),
        safety: 'rehearsalOnly',
        refs: loadRefs,
        effectName: fx.effectName,
        fxSlot: fx.slot,
        busNumbers: bus.busNumbers,
      }),
    );

    if (wish.timeSeconds !== null) {
      steps.push(
        makeStep(context, {
          id: `fx:${wish.id}:time`,
          sectionId: 'fx',
          subject,
          instruction: `Set the reverb time (decay) to ${wish.timeSeconds.value} s`,
          value: `${wish.timeSeconds.value} s`,
          detail: numericDetail(wish.timeSeconds),
          safety: 'safeDuringService',
          effectName: fx.effectName,
          fxSlot: fx.slot,
        }),
      );
    } else if (wish.timeNote.length > 0) {
      steps.push(
        makeStep(context, {
          id: `fx:${wish.id}:time`,
          sectionId: 'fx',
          subject,
          instruction: wish.timeNote,
          detail: plainDetail(wish.why, wish.listenFor),
          safety: 'safeDuringService',
          effectName: fx.effectName,
          fxSlot: fx.slot,
        }),
      );
    }

    const returnInstruction = busIsTheReturn
      ? `Send ${busText} to the main mix with its fader at 0 dB. This bus is the effect's return: add it to the FX Returns DCA and the All FX mute group`
      : `Bring up the FX ${fx.slot} return channels to 0 dB, and add them to the FX Returns DCA and the All FX mute group`;
    steps.push(
      makeStep(context, {
        id: `fx:${wish.id}:return`,
        sectionId: 'fx',
        subject,
        instruction: returnInstruction,
        value: '0 dB',
        detail: plainDetail('With the return at 0 dB, the amount of effect is set by each channel\'s send.', 'Muting the All FX mute group should make the mix completely dry.'),
        safety: 'rehearsalOnly',
        refs: ['fxReturnStyle'],
        fxSlot: fx.slot,
        busNumbers: bus.busNumbers,
      }),
    );

    for (const channel of plan.channels) {
      const send = channel.fxSends.find((entry) => entry.effectId === wish.id);
      if (send === undefined) {
        continue;
      }
      steps.push(
        makeStep(context, {
          id: `fxsend:${wish.id}:${channel.id}`,
          sectionId: 'fx',
          subject: subjectFor(context, channel),
          instruction: `Send to ${wish.label} (${busText}), post-fader, at ${send.levelDb.value} dB`,
          value: `${send.levelDb.value} dB`,
          detail: numericDetail(send.levelDb),
          safety: 'safeDuringService',
          refs: ['sendsScreen', 'sendTapPoints'],
          busNumbers: bus.busNumbers,
        }),
      );
    }
  }

  for (const wish of plan.insertEffects) {
    const fx = findFx(context, wish.id);
    const channel = plan.channels.find((entry) => entry.id === wish.insertOnChannelId);
    if (fx === undefined || channel === undefined) {
      continue;
    }
    steps.push(
      makeStep(context, {
        id: `fx:${wish.id}:insert`,
        sectionId: 'fx',
        subject: subjectFor(context, channel),
        instruction: `Load "${fx.effectName}" into FX slot ${fx.slot} and insert it on this channel`,
        value: fx.effectName,
        subSteps: [facts.fxInsertProcedure.value],
        detail: plainDetail(wish.why, wish.listenFor),
        safety: 'rehearsalOnly',
        refs: ['fxInsertProcedure', 'deEsserEffects'],
        effectName: fx.effectName,
        fxSlot: fx.slot,
      }),
    );
  }

  return {
    id: 'fx',
    title: 'FX rack',
    intro: 'Set up a small number of shared effects. Each channel then sends a little of itself to them.',
    steps,
  };
}

function buildDynamicsSection(context: BuildContext): SheetSection {
  const facts = context.profile.facts;
  const gateNames = facts.gateParamNames.value;
  const compNames = facts.compParamNames.value;
  const steps: SheetStep[] = [];

  for (const channel of context.plan.channels) {
    const subject = subjectFor(context, channel);

    if (channel.gate !== null) {
      const gate = channel.gate;
      const rangeDb = clampToConsole(context, gate.rangeDb.value, facts.gateRangeDbRange.value, `${subject} gate range`, 'dB');
      const gateRefs: ConsoleFactKey[] = ['gateScreen', 'gateParamNames'];
      steps.push(
        makeStep(context, { id: `gate:${channel.id}:on`, sectionId: 'dynamics', subject, instruction: `Gate: turn it on. ${gate.thresholdProcedure.value}`, value: gateNames.threshold, detail: textDetail(gate.thresholdProcedure), safety: 'safeDuringService', refs: gateRefs }),
        makeStep(context, { id: `gate:${channel.id}:range`, sectionId: 'dynamics', subject, instruction: `Gate ${gateNames.range}: ${rangeDb} dB`, value: `${rangeDb} dB`, detail: numericDetail(gate.rangeDb), safety: 'safeDuringService', refs: gateRefs }),
        makeStep(context, { id: `gate:${channel.id}:attack`, sectionId: 'dynamics', subject, instruction: `Gate ${gateNames.attack}: ${gate.attackMs.value} ms`, value: `${gate.attackMs.value} ms`, detail: numericDetail(gate.attackMs), safety: 'safeDuringService', refs: gateRefs }),
        makeStep(context, { id: `gate:${channel.id}:hold`, sectionId: 'dynamics', subject, instruction: `Gate ${gateNames.hold}: ${gate.holdMs.value} ms`, value: `${gate.holdMs.value} ms`, detail: numericDetail(gate.holdMs), safety: 'safeDuringService', refs: gateRefs }),
        makeStep(context, { id: `gate:${channel.id}:release`, sectionId: 'dynamics', subject, instruction: `Gate ${gateNames.release}: ${gate.releaseMs.value} ms`, value: `${gate.releaseMs.value} ms`, detail: numericDetail(gate.releaseMs), safety: 'safeDuringService', refs: gateRefs }),
      );
    }

    if (channel.compressor !== null) {
      const comp = channel.compressor;
      const ratio = snapRatio(context, comp.ratio.value, `${subject} compressor`);
      const compRefs: ConsoleFactKey[] = ['compScreen', 'compParamNames'];
      steps.push(
        makeStep(context, { id: `comp:${channel.id}:ratio`, sectionId: 'dynamics', subject, instruction: `Compressor: turn it on and set ${compNames.ratio} to ${ratio}:1`, value: `${ratio}:1`, detail: numericDetail(comp.ratio), safety: 'safeDuringService', refs: [...compRefs, 'compRatioValues'] }),
        makeStep(context, { id: `comp:${channel.id}:attack`, sectionId: 'dynamics', subject, instruction: `Compressor ${compNames.attack}: ${comp.attackMs.value} ms`, value: `${comp.attackMs.value} ms`, detail: numericDetail(comp.attackMs), safety: 'safeDuringService', refs: compRefs }),
        makeStep(context, { id: `comp:${channel.id}:release`, sectionId: 'dynamics', subject, instruction: `Compressor ${compNames.release}: ${comp.releaseMs.value} ms`, value: `${comp.releaseMs.value} ms`, detail: numericDetail(comp.releaseMs), safety: 'safeDuringService', refs: compRefs }),
        makeStep(context, {
          id: `comp:${channel.id}:threshold`,
          sectionId: 'dynamics',
          subject,
          instruction: `Compressor ${compNames.threshold}: while they play or sing loudly, lower it until the gain reduction meter shows about ${comp.gainReductionDb.value} dB on loud passages`,
          value: `${comp.gainReductionDb.value} dB of reduction`,
          detail: numericDetail(comp.gainReductionDb),
          safety: 'safeDuringService',
          refs: compRefs,
        }),
        makeStep(context, { id: `comp:${channel.id}:makeup`, sectionId: 'dynamics', subject, instruction: `Compressor ${compNames.makeupGain}: ${comp.makeupGain.value}`, value: comp.makeupGain.value, detail: textDetail(comp.makeupGain), safety: 'safeDuringService', refs: compRefs }),
      );
    }
  }

  return {
    id: 'dynamics',
    title: 'Dynamics',
    intro: 'Even out each source so quiet parts stay audible and loud parts do not jump out. Set these while the band plays.',
    steps,
  };
}

function buildMonitorsSection(context: BuildContext): SheetSection {
  const facts = context.profile.facts;
  const plan = context.plan;
  const steps: SheetStep[] = [];

  if (plan.monitorMixes.length > 0) {
    const afterDynamics = facts.preFaderSendIsAfterDynamics.value;
    let tapConsequence = 'Check on this console whether that tap is before or after the compressor.';
    if (afterDynamics === true) {
      tapConsequence = 'On this console that tap is after the channel compressor, so compression also reaches the monitors.';
    }
    steps.push(
      makeStep(context, {
        id: 'monitors:tap',
        sectionId: 'monitors',
        subject: 'All monitor sends',
        instruction: `Set every monitor send to be taken at: ${facts.monitorSendTap.value}`,
        value: facts.monitorSendTap.value,
        detail: plainDetail(`${plan.monitorGuidance.why} ${tapConsequence} ${plan.monitorGuidance.compressionNote}`, 'Move a channel fader: that musician\'s monitor level must not change.'),
        safety: 'rehearsalOnly',
        refs: ['monitorSendTap', 'sendTapPoints', 'preFaderSendIsAfterDynamics', 'sendsScreen'],
      }),
    );
    steps.push(
      makeStep(context, {
        id: 'monitors:mute',
        sectionId: 'monitors',
        subject: 'All monitor sends',
        instruction: 'Know what a channel mute does to the monitors: mute one vocal channel and listen to its wedge',
        value: facts.muteCutsPreFaderSends.value === true ? 'Expected: the monitor goes silent too' : 'Find out on this console',
        detail: plainDetail('During feedback you need to know whether muting the channel also silences the monitor.', 'Whether the wedge goes silent when the channel is muted.'),
        safety: 'rehearsalOnly',
        refs: ['muteCutsPreFaderSends'],
      }),
    );
  }

  for (const mix of plan.monitorMixes) {
    const bus = findBus(context, mix.id);
    if (bus === undefined) {
      continue;
    }
    const busText = describeBuses(bus.busNumbers);
    steps.push(
      makeStep(context, {
        id: `monitors:${mix.id}:name`,
        sectionId: 'monitors',
        subject: `${mix.label} · ${busText}`,
        instruction: `Use ${busText} for this monitor mix (for: ${mix.forMemberNames.join(', ')}) and name it`,
        value: busText,
        detail: plainDetail('Which musician shares which mix is a starting guess. Change it to match the stage.', 'Nothing to listen for.'),
        safety: 'rehearsalOnly',
        refs: ['mixBusCount'],
        busNumbers: bus.busNumbers,
      }),
    );
    for (const channel of plan.channels) {
      const send = channel.monitorSends.find((entry) => entry.mixId === mix.id);
      if (send === undefined) {
        continue;
      }
      steps.push(
        makeStep(context, {
          id: `monitors:${mix.id}:${channel.id}`,
          sectionId: 'monitors',
          subject: `${mix.label} · ${busText}`,
          instruction: `Send ${describeChannel(channel)} at ${send.levelDb.value} dB`,
          value: `${send.levelDb.value} dB`,
          detail: numericDetail(send.levelDb),
          safety: 'safeDuringService',
          refs: ['sendsScreen'],
          busNumbers: bus.busNumbers,
        }),
      );
    }
  }

  return {
    id: 'monitors',
    title: 'Monitor sends',
    intro: 'Give each musician what they need to hear, starting low. Quiet monitors are the best protection against feedback.',
    steps,
  };
}

function buildMainSection(context: BuildContext): SheetSection {
  const facts = context.profile.facts;
  const plan = context.plan;
  const steps: SheetStep[] = [];

  const limiter = findFx(context, 'mainLimiter');
  if (limiter !== undefined) {
    steps.push(
      makeStep(context, {
        id: 'main:limiter',
        sectionId: 'main',
        subject: 'Main bus',
        instruction: `Load "${limiter.effectName}" into FX slot ${limiter.slot} and insert it on the main bus. ${plan.mainBus.limiter.value}`,
        value: limiter.effectName,
        subSteps: [facts.fxInsertProcedure.value],
        detail: textDetail(plan.mainBus.limiter),
        safety: 'rehearsalOnly',
        refs: ['limiterEffects', 'fxInsertProcedure', 'mainBusProcessing'],
        effectName: limiter.effectName,
        fxSlot: limiter.slot,
      }),
    );
  }
  steps.push(
    makeStep(context, { id: 'main:compressor', sectionId: 'main', subject: 'Main bus', instruction: `Main bus compressor: ${plan.mainBus.compressor.value}`, value: plan.mainBus.compressor.value, detail: textDetail(plan.mainBus.compressor), safety: 'rehearsalOnly', refs: ['mainBusProcessing'] }),
    makeStep(context, { id: 'main:eq', sectionId: 'main', subject: 'Main bus', instruction: `Main bus EQ: ${plan.mainBus.eq.value}`, value: plan.mainBus.eq.value, detail: textDetail(plan.mainBus.eq), safety: 'rehearsalOnly', refs: ['mainBusProcessing'] }),
  );

  if (plan.subwoofer.feed === 'ownBus') {
    const subBus = findBus(context, 'subwoofer');
    const mainBusName = context.allocation.subUsesMainBus;
    let target: string | null = null;
    let busNumbers: number[] = [];
    if (mainBusName !== null) {
      target = `the ${mainBusName}`;
    } else if (subBus !== undefined) {
      target = describeBuses(subBus.busNumbers);
      busNumbers = subBus.busNumbers;
    }
    if (target !== null) {
      const members = plan.subwoofer.sendChannelIds
        .map((channelId) => context.channelMap.find((entry) => entry.channelId === channelId)?.label ?? channelId)
        .join(', ');
      steps.push(
        makeStep(context, {
          id: 'main:sub',
          sectionId: 'main',
          subject: 'Subwoofer',
          instruction: `Feed the subwoofer from ${target}. Send only these channels to it, and no others`,
          value: members.length > 0 ? members : 'No channels',
          detail: plainDetail(plan.subwoofer.why, 'Mute those channels: the subwoofer should be silent.'),
          safety: 'rehearsalOnly',
          refs: ['subwooferFeedOptions'],
          busNumbers,
        }),
      );
    }
  } else {
    steps.push(
      makeStep(context, {
        id: 'main:sub',
        sectionId: 'main',
        subject: 'Subwoofer',
        instruction: 'Subwoofer: nothing to set. It is fed from the main mix through its crossover',
        detail: plainDetail(plan.subwoofer.why, 'If the low end is muddy, check the low cuts on this sheet before anything else.'),
        safety: 'safeDuringService',
      }),
    );
  }

  if (plan.stream.enabled) {
    const streamBus = findBus(context, 'stream');
    if (streamBus !== undefined) {
      plan.stream.differences.forEach((difference, index) => {
        steps.push(
          makeStep(context, {
            id: `main:stream:${index}`,
            sectionId: 'main',
            subject: `Stream mix · ${describeBuses(streamBus.busNumbers)}`,
            instruction: difference.value,
            detail: textDetail(difference),
            safety: index === 0 ? 'rehearsalOnly' : 'safeDuringService',
            refs: ['sendTapPoints'],
            busNumbers: streamBus.busNumbers,
          }),
        );
      });
    }
  }

  return {
    id: 'main',
    title: 'Main bus',
    intro: 'Protect the speakers and leave the main mix free to get louder and softer with the songs.',
    steps,
  };
}

function buildReference(context: BuildContext): ChannelReference[] {
  return context.plan.channels.map((channel) => ({
    channelId: channel.id,
    subject: subjectFor(context, channel),
    ifYouHear: channel.ifYouHear,
    mixerNotes: channel.mixerNotes,
    coachingNotes: channel.coachingNotes,
  }));
}

function collectUnverifiedWarning(sections: SheetSection[]): SheetWarning[] {
  let flagged = 0;
  for (const section of sections) {
    for (const step of section.steps) {
      if (step.checkOnConsole !== null) {
        flagged = flagged + 1;
      }
    }
  }
  if (flagged === 0) {
    return [];
  }
  return [{ kind: 'unverified', message: `${flagged} steps are marked "check on your console": the manual does not confirm the exact name or behavior they rely on.` }];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildConsoleSheet(plan: MixPlan, profile: ConsoleProfile): AdapterResult {
  const errors = validateForConsole(plan, profile);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const channelMap = allocateChannels(plan, profile);
  const allocation = allocateBusesAndFx(plan, profile);
  const warnings: SheetWarning[] = [...allocation.warnings];
  for (const planWarning of plan.warnings) {
    warnings.push({ kind: 'plan', message: planWarning.message });
  }
  const context: BuildContext = { plan, profile, channelMap, allocation, warnings };

  const suggestedCutCount = Math.max(0, ...plan.channels.map((channel) => channel.suggestedCuts.length));
  if (suggestedCutCount > profile.facts.channelEqBandCount.value) {
    warnings.push({ kind: 'adaptation', message: `This console has ${profile.facts.channelEqBandCount.value} EQ bands per channel, so fewer optional cuts are shown.` });
  }

  const sections: SheetSection[] = [
    buildProtectSection(context),
    buildPatchSection(context),
    buildGainSection(context),
    buildLowCutSection(context),
    buildGroupsSection(context),
    buildFxSection(context),
    buildDynamicsSection(context),
    buildMonitorsSection(context),
    buildMainSection(context),
  ];
  warnings.push(...collectUnverifiedWarning(sections));

  return {
    ok: true,
    sheet: {
      consoleId: profile.id,
      consoleName: profile.name,
      disclaimer: SHEET_DISCLAIMER,
      doNotTouch: buildDoNotTouchList(context),
      warnings,
      sections,
      channelMap,
      busMap: allocation.busMap,
      fxMap: allocation.fxMap,
      reference: buildReference(context),
    },
  };
}
