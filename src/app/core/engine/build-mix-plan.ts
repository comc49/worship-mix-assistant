import {
  DCA_DEFINITIONS,
  DE_ESSER,
  DRUM_ROLES,
  EnsembleRule,
  GROUP_BUS_DEFINITIONS,
  HOUSE_PRINCIPLES,
  KICK_LIKE_ROLES,
  MAIN_BUS_RULES,
  MONITOR_FOLDBACK_BY_ROLE,
  MONITOR_RULES,
  MUTE_GROUP_DEFINITIONS,
  ROOM_MODIFIERS,
  SEND_EFFECTS,
  STREAM_DIFFERENCES,
  SUBWOOFER_RULES,
  NumDefault,
} from '../knowledge';
import {
  BandMember,
  ChannelPlan,
  CompressorPlan,
  DcaPlan,
  EffectWish,
  FxSendPlan,
  GatePlan,
  GroupBusWish,
  isVocalRole,
  MixPlan,
  MonitorGuidance,
  MonitorMixPlan,
  MonitorSendPlan,
  MuteGroupId,
  MuteGroupPlan,
  NumericSetting,
  ParamKey,
  PlanWarning,
  Role,
  Room,
  SendEffectId,
  ServiceSetup,
  SoundcheckStep,
  TextSetting,
} from '../model';
import {
  applyBaselineProfiles,
  applyEnsembleRules,
  applyMusicalLimits,
  applyRoomModifiers,
  applyServiceRules,
  applySkillModifiers,
  expandMembersIntoChannels,
  findActiveEnsembleRules,
  listRolesInBand,
} from './channel-steps';
import { ChannelDraft, createParamDraft, resolveParam, toPlanWarnings } from './draft';

const PARAM_LABELS: Record<ParamKey, string> = {
  lowCutHz: 'Low cut',
  gateRangeDb: 'Gate range',
  gateAttackMs: 'Gate attack',
  gateHoldMs: 'Gate hold',
  gateReleaseMs: 'Gate release',
  compRatio: 'Compressor ratio',
  compAttackMs: 'Compressor attack',
  compReleaseMs: 'Compressor release',
  compGainReductionDb: 'Compressor gain reduction',
  levelDb: 'Level',
  monitorSendDb: 'Monitor send',
  'fxSend.vocalPlate': 'Vocal plate send',
  'fxSend.tempoDelay': 'Tempo delay send',
  'fxSend.hall': 'Hall send',
  'fxSend.drumRoom': 'Drum room send',
};

const SEND_EFFECT_IDS: SendEffectId[] = ['vocalPlate', 'tempoDelay', 'hall', 'drumRoom'];

function staticSetting(baseline: NumDefault, label: string): NumericSetting {
  return resolveParam(createParamDraft(baseline, label), label).setting;
}

// ---------------------------------------------------------------------------
// Monitor mixes
// ---------------------------------------------------------------------------

/** The order in which musicians get their own monitor mix when there are fewer mixes than people. */
const LISTENER_GROUPS: { label: string; roles: Role[] }[] = [
  { label: 'Lead vocal', roles: ['leadVocal'] },
  { label: 'Harmony vocals', roles: ['harmonyVocal'] },
  { label: 'Keys', roles: ['keys', 'padSynth', 'synthBass'] },
  { label: 'Guitars', roles: ['acousticGuitar', 'electricGuitar'] },
  { label: 'Bass', roles: ['bassGuitar'] },
  { label: 'Drums', roles: DRUM_ROLES },
  { label: 'Others', roles: ['backingTracks', 'click'] },
];

interface ListenerGroup {
  label: string;
  members: BandMember[];
}

function groupListeners(band: BandMember[]): ListenerGroup[] {
  const groups: ListenerGroup[] = LISTENER_GROUPS.map((group) => ({ label: group.label, members: [] }));

  for (const member of band) {
    const memberRoles = member.roles.map((memberRole) => memberRole.role);
    const groupIndex = LISTENER_GROUPS.findIndex((group) => group.roles.some((role) => memberRoles.includes(role)));
    if (groupIndex === -1) {
      continue;
    }
    groups[groupIndex].members.push(member);
  }
  return groups.filter((group) => group.members.length > 0);
}

export function buildMonitorMixes(band: BandMember[], setup: ServiceSetup): { mix: MonitorMixPlan; memberIds: string[] }[] {
  const mixCount = setup.monitorMixCount;
  if (mixCount <= 0) {
    return [];
  }

  const groups = groupListeners(band);
  const orderedMembers = groups.flatMap((group) => group.members);
  let slots: ListenerGroup[];

  if (orderedMembers.length <= mixCount) {
    // Enough mixes for everyone to have their own.
    slots = orderedMembers.map((member) => ({ label: member.name, members: [member] }));
  } else if (groups.length <= mixCount) {
    slots = groups;
  } else {
    // More groups than mixes: the last mix is shared by everyone who is left.
    const ownMixGroups = groups.slice(0, mixCount - 1);
    const sharedGroups = groups.slice(mixCount - 1);
    const sharedMembers = sharedGroups.flatMap((group) => group.members);
    slots = [...ownMixGroups, { label: 'Band', members: sharedMembers }];
  }

  return slots.map((slot, index) => {
    const mix: MonitorMixPlan = {
      id: `monitor-${index + 1}`,
      label: `Monitor ${index + 1}: ${slot.label}`,
      forMemberNames: slot.members.map((member) => member.name),
      preFader: true,
      why: MONITOR_RULES.wedgePreFaderWhy,
    };
    return { mix, memberIds: slot.members.map((member) => member.id) };
  });
}

function buildMonitorSends(
  channel: ChannelDraft,
  ownSend: NumericSetting | null,
  mixes: { mix: MonitorMixPlan; memberIds: string[] }[],
): MonitorSendPlan[] {
  const sends: MonitorSendPlan[] = [];
  const foldback = MONITOR_FOLDBACK_BY_ROLE[channel.memberRole.role];

  for (const entry of mixes) {
    const isOwnMix = entry.memberIds.includes(channel.member.id);
    if (isOwnMix && ownSend !== null) {
      sends.push({ mixId: entry.mix.id, levelDb: ownSend });
      continue;
    }
    if (foldback !== undefined) {
      sends.push({ mixId: entry.mix.id, levelDb: staticSetting(foldback, 'Starting level in other people\'s monitors') });
    }
  }
  return sends;
}

// ---------------------------------------------------------------------------
// Step 9: attach the why, the listenFor, the usable range and the provenance trail.
// ---------------------------------------------------------------------------

function resolveOptional(channel: ChannelDraft, key: ParamKey, warnings: string[]): NumericSetting | null {
  const draft = channel.params[key];
  if (draft === undefined) {
    return null;
  }
  const resolved = resolveParam(draft, PARAM_LABELS[key]);
  warnings.push(...resolved.warnings);
  return resolved.setting;
}

function buildGate(channel: ChannelDraft, warnings: string[]): GatePlan | null {
  const range = resolveOptional(channel, 'gateRangeDb', warnings);
  const attack = resolveOptional(channel, 'gateAttackMs', warnings);
  const hold = resolveOptional(channel, 'gateHoldMs', warnings);
  const release = resolveOptional(channel, 'gateReleaseMs', warnings);
  const threshold = channel.profile.gateThreshold;
  if (range === null || attack === null || hold === null || release === null || threshold === null) {
    return null;
  }
  return { thresholdProcedure: threshold, rangeDb: range, attackMs: attack, holdMs: hold, releaseMs: release };
}

function buildCompressor(channel: ChannelDraft, warnings: string[]): CompressorPlan | null {
  const ratio = resolveOptional(channel, 'compRatio', warnings);
  const attack = resolveOptional(channel, 'compAttackMs', warnings);
  const release = resolveOptional(channel, 'compReleaseMs', warnings);
  const gainReduction = resolveOptional(channel, 'compGainReductionDb', warnings);
  const makeupGain = channel.makeupGain;
  if (ratio === null || attack === null || release === null || gainReduction === null || makeupGain === null) {
    return null;
  }
  return { ratio, attackMs: attack, releaseMs: release, gainReductionDb: gainReduction, makeupGain };
}

function finalizeChannel(
  channel: ChannelDraft,
  mixes: { mix: MonitorMixPlan; memberIds: string[] }[],
  groupBusIds: string[],
  planWarnings: PlanWarning[],
): ChannelPlan {
  const warnings: string[] = [];
  const profile = channel.profile;

  const lowCut = resolveOptional(channel, 'lowCutHz', warnings);
  const level = resolveOptional(channel, 'levelDb', warnings);
  const ownMonitorSend = resolveOptional(channel, 'monitorSendDb', warnings);

  const fxSends: FxSendPlan[] = [];
  for (const effectId of SEND_EFFECT_IDS) {
    const key = `fxSend.${effectId}` as ParamKey;
    const levelDb = resolveOptional(channel, key, warnings);
    if (levelDb !== null) {
      fxSends.push({ effectId, levelDb });
    }
  }

  const muteGroupIds: MuteGroupId[] = isVocalRole(profile.role) ? ['allVocals'] : ['allBand'];
  const wantsGroupBus = profile.groupBus !== null && groupBusIds.includes(profile.groupBus);

  const gate = buildGate(channel, warnings);
  const compressor = buildCompressor(channel, warnings);

  planWarnings.push(...toPlanWarnings(channel.id, `${profile.label} (${channel.member.name})`, warnings));

  if (level === null) {
    throw new Error(`Profile ${profile.id} has no levelDb. Every profile must define one.`);
  }

  return {
    id: channel.id,
    roleLabel: profile.label,
    memberId: channel.member.id,
    memberName: channel.member.name,
    role: profile.role,
    profileId: profile.id,
    connection: channel.memberRole.connection,
    stereo: channel.stereo,
    gainStaging: profile.gainStaging,
    polarity: profile.polarity,
    lowCut,
    suggestedCuts: channel.suggestedCuts.slice(0, 3),
    ifYouHear: channel.ifYouHear,
    gate,
    compressor,
    level,
    pan: profile.pan,
    fxSends,
    monitorSends: buildMonitorSends(channel, ownMonitorSend, mixes),
    dcaIds: [...profile.dcas],
    inMultipleDcas: profile.dcas.length > 1,
    muteGroupIds,
    groupBusId: wantsGroupBus ? profile.groupBus : null,
    sendToSubBus: channel.sendToSubBus,
    routeToMain: profile.routeToMain,
    mixerNotes: channel.mixerNotes,
    coachingNotes: channel.coachingNotes,
  };
}

// ---------------------------------------------------------------------------
// Step 8: build the group layout.
// ---------------------------------------------------------------------------

function buildGroupBusWishes(channels: ChannelDraft[], room: Room): GroupBusWish[] {
  const roomModifiers = ROOM_MODIFIERS.find((entry) => entry.reverberance === room.reverberance);
  const processingNotes = roomModifiers === undefined ? [] : roomModifiers.groupBusNotes;

  const wishes: GroupBusWish[] = [];
  for (const definition of GROUP_BUS_DEFINITIONS) {
    const members = channels.filter((channel) => channel.profile.groupBus === definition.id);
    // A group of one channel does nothing its own fader cannot do.
    if (members.length < 2) {
      continue;
    }
    wishes.push({
      id: definition.id,
      label: definition.label,
      priority: definition.priority,
      preferredWidth: definition.preferredWidth,
      monoIsAcceptable: definition.monoIsAcceptable,
      memberChannelIds: members.map((channel) => channel.id),
      processingNotes,
      why: definition.why,
    });
  }
  return wishes;
}

function buildDcas(channels: ChannelPlan[]): DcaPlan[] {
  return DCA_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    memberChannelIds: channels.filter((channel) => channel.dcaIds.includes(definition.id)).map((channel) => channel.id),
    holdsFxReturns: definition.holdsFxReturns,
    why: definition.why,
  }));
}

function buildMuteGroups(channels: ChannelPlan[]): MuteGroupPlan[] {
  return MUTE_GROUP_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    memberChannelIds: channels.filter((channel) => channel.muteGroupIds.includes(definition.id)).map((channel) => channel.id),
    holdsFxReturns: definition.id === 'allFx',
    why: definition.why,
  }));
}

function buildSendEffects(channels: ChannelPlan[], room: Room, planWarnings: PlanWarning[]): EffectWish[] {
  const roomModifiers = ROOM_MODIFIERS.find((entry) => entry.reverberance === room.reverberance);
  const wishes: EffectWish[] = [];

  for (const definition of SEND_EFFECTS) {
    const fedBy = channels.filter((channel) => channel.fxSends.some((send) => send.effectId === definition.id));
    if (fedBy.length === 0) {
      continue;
    }

    let timeSeconds: NumericSetting | null = null;
    if (definition.time !== null) {
      const draft = createParamDraft(definition.time, `${definition.label} baseline`);
      draft.musicalLimit = definition.timeLimit;
      if (roomModifiers !== undefined) {
        const roomTime = roomModifiers.effectTime[definition.id];
        if (roomTime.addSeconds !== 0) {
          draft.offsets.push({ source: 'Room', amount: roomTime.addSeconds, why: roomTime.why });
        }
        if (roomTime.ceilingSeconds !== null) {
          draft.ceilings.push({ source: 'Room', amount: roomTime.ceilingSeconds, why: roomTime.why });
        }
      }
      const resolved = resolveParam(draft, `${definition.label} time`);
      timeSeconds = resolved.setting;
      planWarnings.push(...toPlanWarnings(null, definition.label, resolved.warnings));
    }

    wishes.push({
      id: definition.id,
      label: definition.label,
      family: definition.family,
      priority: definition.priority,
      why: definition.why,
      listenFor: definition.listenFor,
      timeSeconds,
      timeNote: definition.timeNote,
      insertOnChannelId: null,
      fedByChannelIds: fedBy.map((channel) => channel.id),
    });
  }
  return wishes;
}

function buildInsertEffects(channels: ChannelPlan[]): EffectWish[] {
  const leadVocal = channels.find((channel) => channel.role === 'leadVocal');
  if (leadVocal === undefined) {
    return [];
  }
  return [
    {
      id: DE_ESSER.id,
      label: DE_ESSER.label,
      family: 'deEsser',
      priority: DE_ESSER.priority,
      why: DE_ESSER.why,
      listenFor: DE_ESSER.listenFor,
      timeSeconds: null,
      timeNote: '',
      insertOnChannelId: leadVocal.id,
      fedByChannelIds: [],
    },
  ];
}

function buildMonitorGuidance(setup: ServiceSetup): MonitorGuidance {
  if (setup.monitorType === 'inEars') {
    return { monitorType: 'inEars', compressionNote: MONITOR_RULES.inEarCompressionNote, ringOutRequired: false, why: MONITOR_RULES.inEarWhy };
  }
  const why = setup.monitorType === 'mixed' ? MONITOR_RULES.mixedWhy : MONITOR_RULES.wedgePreFaderWhy;
  return { monitorType: setup.monitorType, compressionNote: MONITOR_RULES.wedgeCompressionNote, ringOutRequired: true, why };
}

function buildSoundcheck(rolesInBand: Role[], guidance: MonitorGuidance, room: Room): SoundcheckStep[] {
  const steps: SoundcheckStep[] = [];

  if (guidance.ringOutRequired) {
    steps.push({
      title: 'Ring out the vocal mics',
      detail: 'Before the band plays: with each vocal mic open on stage, slowly raise its wedge send until it just starts to ring, then cut that frequency 3 dB with a narrow EQ on the monitor bus and back the send off 3 dB. Stop after two or three cuts per wedge.',
    });
  }

  const hasKick = KICK_LIKE_ROLES.some((role) => rolesInBand.includes(role));
  const hasBass = rolesInBand.includes('bassGuitar') || rolesInBand.includes('synthBass');
  if (hasKick || hasBass) {
    steps.push({
      title: 'Kick and bass foundation',
      detail: 'Bring up the kick, then the bass, until they feel like one solid low end. Do not thin anything else out before this is right.',
    });
  }
  if (DRUM_ROLES.some((role) => rolesInBand.includes(role))) {
    steps.push({ title: 'The rest of the drums', detail: 'Add snare, toms and cymbals around the kick. In a live room, add less than you think.' });
  }
  steps.push({ title: 'Keys and guitars', detail: 'Bring in keys, pads and guitars under where the vocal will sit. If two of them fight, ask who should play less before touching EQ.' });
  steps.push({ title: 'Vocals on top', detail: 'Lead vocal first, clearly above the band. Then tuck the harmonies under it.' });
  steps.push({
    title: 'Set the ceiling',
    detail: 'Ask the band for the loudest chorus of the loudest song. Set the faders there so it is as loud as the service should ever get. Then work backward: verses are played softer, not mixed lower.',
  });
  if (room.loudnessTargetDba !== null) {
    steps.push({
      title: `Check loudness: target ${room.loudnessTargetDba} dBA`,
      detail: `At the loudest chorus, the meter at the mix position should read about ${room.loudnessTargetDba} dBA (slow, A-weighted).`,
    });
  }
  return steps;
}

function describeEnsembleAdvice(rules: EnsembleRule[]): string[] {
  return rules.map((rule) => `${rule.title}. ${rule.arrangementAdvice}`);
}

// ---------------------------------------------------------------------------
// The pipeline
// ---------------------------------------------------------------------------

/**
 * Builds the console-neutral mix plan. It never fails on console limits, because it does not
 * know them. That is the adapters' job.
 */
export function buildMixPlan(band: BandMember[], room: Room, serviceSetup: ServiceSetup): MixPlan {
  const planWarnings: PlanWarning[] = [];
  const rolesInBand = listRolesInBand(band);

  // Steps 1 to 7.
  const drafts = expandMembersIntoChannels(band);
  applyBaselineProfiles(drafts);
  applySkillModifiers(drafts, rolesInBand);
  applyRoomModifiers(drafts, room);
  applyServiceRules(drafts, serviceSetup);
  const activeRules = findActiveEnsembleRules(rolesInBand);
  applyEnsembleRules(drafts, activeRules);
  applyMusicalLimits(drafts);

  // Step 8 (layout) and step 9 (explanations and provenance).
  const groupBuses = buildGroupBusWishes(drafts, room);
  const groupBusIds = groupBuses.map((wish) => wish.id);
  const monitorMixEntries = buildMonitorMixes(band, serviceSetup);
  const channels = drafts.map((draft) => finalizeChannel(draft, monitorMixEntries, groupBusIds, planWarnings));

  const monitorGuidance = buildMonitorGuidance(serviceSetup);
  const subSendChannelIds = channels.filter((channel) => channel.sendToSubBus).map((channel) => channel.id);
  const subWhy = serviceSetup.subwooferFeed === 'ownBus' ? SUBWOOFER_RULES.ownBusWhy : SUBWOOFER_RULES.mainThroughCrossoverWhy;
  const mainBus: { limiter: TextSetting; compressor: TextSetting; eq: TextSetting } = MAIN_BUS_RULES;

  return {
    channels,
    sendEffects: buildSendEffects(channels, room, planWarnings),
    insertEffects: buildInsertEffects(channels),
    groupBuses,
    dcas: buildDcas(channels),
    muteGroups: buildMuteGroups(channels),
    monitorMixes: monitorMixEntries.map((entry) => entry.mix),
    monitorGuidance,
    mainBus,
    subwoofer: { feed: serviceSetup.subwooferFeed, sendChannelIds: subSendChannelIds, why: subWhy },
    stream: { enabled: serviceSetup.separateStreamMix, differences: serviceSetup.separateStreamMix ? STREAM_DIFFERENCES : [] },
    soundcheck: buildSoundcheck(rolesInBand, monitorGuidance, room),
    loudnessTargetDba: room.loudnessTargetDba,
    housePrinciples: HOUSE_PRINCIPLES,
    ensembleAdvice: describeEnsembleAdvice(activeRules),
    warnings: planWarnings,
  };
}
