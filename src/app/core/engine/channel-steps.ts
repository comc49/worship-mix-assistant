import {
  Adjustment,
  buildVocalMudCut,
  ENSEMBLE_RULES,
  EnsembleRule,
  findProfiles,
  FOUNDATION_ROLES,
  getMusicalLimit,
  InstrumentProfile,
  LOW_FREQUENCY_NOISE_ADJUSTMENT,
  MIC_MODELS,
  MicModel,
  MONITOR_RULES,
  ROOM_MODIFIERS,
  SKILL_MODIFIERS,
  SkillAdjustment,
  VOCAL_LOW_CUT_BY_RANGE,
  WEDGE_VOCAL_GAIN_REDUCTION_CAP_DB,
} from '../knowledge';
import { BandMember, isVocalRole, MemberRole, ParamKey, Role, Room, ServiceSetup } from '../model';
import { addCeiling, addFloor, addOffset, ChannelDraft, createParamDraft, ParamDraft } from './draft';

/** Pipeline steps 1 to 7. Each step is one small function so it can be debugged alone. */

const PARAM_KEYS: ParamKey[] = [
  'lowCutHz',
  'gateRangeDb',
  'gateAttackMs',
  'gateHoldMs',
  'gateReleaseMs',
  'compRatio',
  'compAttackMs',
  'compReleaseMs',
  'compGainReductionDb',
  'levelDb',
  'monitorSendDb',
  'fxSend.vocalPlate',
  'fxSend.tempoDelay',
  'fxSend.hall',
  'fxSend.drumRoom',
];

function isStereoChannel(profile: InstrumentProfile, memberRole: MemberRole): boolean {
  if (profile.stereo === 'always') {
    return true;
  }
  if (profile.stereo === 'never') {
    return false;
  }
  return memberRole.connection === 'stereoDi';
}

function findMicModel(memberRole: MemberRole): MicModel | null {
  if (memberRole.vocal === null) {
    return null;
  }
  const micModelId = memberRole.vocal.micModel;
  const found = MIC_MODELS.find((mic) => mic.id === micModelId);
  return found ?? null;
}

function applyAdjustment(channel: ChannelDraft, adjustment: Adjustment, source: string): void {
  const entry = { source, amount: adjustment.amount, why: adjustment.why };
  if (adjustment.kind === 'add') {
    addOffset(channel, adjustment.param, entry);
    return;
  }
  if (adjustment.kind === 'ceiling') {
    addCeiling(channel, adjustment.param, entry);
    return;
  }
  addFloor(channel, adjustment.param, entry);
}

export function listRolesInBand(band: BandMember[]): Role[] {
  const roles: Role[] = [];
  for (const member of band) {
    for (const memberRole of member.roles) {
      if (!roles.includes(memberRole.role)) {
        roles.push(memberRole.role);
      }
    }
  }
  return roles;
}

// ---------------------------------------------------------------------------
// Step 1: expand members into channels in the standard patch order.
// ---------------------------------------------------------------------------

export function expandMembersIntoChannels(band: BandMember[]): ChannelDraft[] {
  const channels: ChannelDraft[] = [];
  const usedIds = new Map<string, number>();

  for (const member of band) {
    for (const memberRole of member.roles) {
      const profiles = findProfiles(memberRole.role, memberRole.connection);
      for (const profile of profiles) {
        const baseId = `${member.id}:${profile.id}`;
        const timesUsed = usedIds.get(baseId) ?? 0;
        usedIds.set(baseId, timesUsed + 1);
        const id = timesUsed === 0 ? baseId : `${baseId}#${timesUsed + 1}`;

        channels.push({
          id,
          member,
          memberRole,
          profile,
          stereo: isStereoChannel(profile, memberRole),
          params: {},
          suggestedCuts: [],
          ifYouHear: [],
          makeupGain: null,
          sendToSubBus: false,
          mixerNotes: [],
          coachingNotes: [],
        });
      }
    }
  }

  // Standard patch order: drums, bass, guitars, keys, pads, vocals. Ties keep roster order.
  const withIndex = channels.map((channel, index) => ({ channel, index }));
  withIndex.sort((a, b) => {
    const orderDifference = a.channel.profile.patchOrder - b.channel.profile.patchOrder;
    if (orderDifference !== 0) {
      return orderDifference;
    }
    return a.index - b.index;
  });
  return withIndex.map((entry) => entry.channel);
}

// ---------------------------------------------------------------------------
// Step 2: apply the baseline profile (and for vocals the voice range and mic model).
// ---------------------------------------------------------------------------

export function applyBaselineProfiles(channels: ChannelDraft[]): void {
  for (const channel of channels) {
    const profile = channel.profile;

    for (const key of PARAM_KEYS) {
      const baseline = profile.params[key];
      if (baseline === undefined) {
        continue;
      }
      channel.params[key] = createParamDraft(baseline, `${profile.label} baseline`);
    }

    channel.suggestedCuts = [...profile.suggestedCuts];
    channel.ifYouHear = [...profile.ifYouHear];
    channel.makeupGain = profile.makeupGain;
    channel.sendToSubBus = profile.sendToSubBus;
    channel.mixerNotes = [...profile.mixerNotes];

    applyVocalDetails(channel);
  }
}

function applyVocalDetails(channel: ChannelDraft): void {
  const vocal = channel.memberRole.vocal;
  if (vocal === null) {
    return;
  }

  const byRange = VOCAL_LOW_CUT_BY_RANGE.find((entry) => entry.voiceRange === vocal.voiceRange);
  const lowCutBaseline = channel.profile.params.lowCutHz;
  if (byRange !== undefined && lowCutBaseline !== undefined) {
    const rangeBaseline = { ...lowCutBaseline, value: byRange.baselineHz, min: byRange.floor, max: byRange.ceiling };
    channel.params.lowCutHz = createParamDraft(rangeBaseline, `${channel.profile.label}, ${vocal.voiceRange} voice`);
    channel.suggestedCuts.push(buildVocalMudCut(byRange.suggestedMudCutHz));
  }

  const mic = findMicModel(channel.memberRole);
  if (mic === null) {
    return;
  }
  if (mic.lowCutOffsetHz !== 0) {
    addOffset(channel, 'lowCutHz', { source: 'Mic', amount: mic.lowCutOffsetHz, why: `${mic.label}: ${mic.why}` });
  }
  if (mic.suggestedCut !== null) {
    channel.suggestedCuts.push(mic.suggestedCut);
  }
  channel.ifYouHear.push(...mic.ifYouHear);
}

// ---------------------------------------------------------------------------
// Step 3: apply the member's skill modifiers.
// ---------------------------------------------------------------------------

function skillAdjustmentApplies(adjustment: SkillAdjustment, channel: ChannelDraft, rolesInBand: Role[]): boolean {
  const profileFilterActive = adjustment.onlyProfileIds.length > 0;
  if (profileFilterActive && !adjustment.onlyProfileIds.includes(channel.profile.id)) {
    return false;
  }
  for (const requiredRole of adjustment.requiresRolesInBand) {
    if (!rolesInBand.includes(requiredRole)) {
      return false;
    }
  }
  return true;
}

export function applySkillModifiers(channels: ChannelDraft[], rolesInBand: Role[]): void {
  for (const channel of channels) {
    const skill = channel.memberRole.skill;
    if (skill === 'intermediate') {
      continue;
    }
    const modifier = SKILL_MODIFIERS.find((entry) => entry.role === channel.memberRole.role && entry.level === skill);
    if (modifier === undefined) {
      continue;
    }

    for (const adjustment of modifier.adjustments) {
      if (!skillAdjustmentApplies(adjustment, channel, rolesInBand)) {
        continue;
      }
      applyAdjustment(channel, adjustment, 'Player');
    }

    channel.coachingNotes.push(modifier.coaching);
    for (const note of modifier.mixerNotes) {
      const noteApplies = note.onlyProfileIds.length === 0 || note.onlyProfileIds.includes(channel.profile.id);
      if (noteApplies) {
        channel.mixerNotes.push(note.text);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Step 4: apply room modifiers.
// ---------------------------------------------------------------------------

function isOpenMic(channel: ChannelDraft): boolean {
  const connection = channel.memberRole.connection;
  return connection === 'dynamicMic' || connection === 'condenserMic';
}

export function applyRoomModifiers(channels: ChannelDraft[], room: Room): void {
  const modifierSet = ROOM_MODIFIERS.find((entry) => entry.reverberance === room.reverberance);

  for (const channel of channels) {
    if (modifierSet !== undefined) {
      const roleModifier = modifierSet.byRole[channel.memberRole.role];
      for (const adjustment of roleModifier.adjustments) {
        applyAdjustment(channel, adjustment, 'Room');
      }
    }

    const isFoundation = FOUNDATION_ROLES.includes(channel.memberRole.role);
    const noiseApplies = room.constantLowFrequencyNoise && isOpenMic(channel) && !isFoundation;
    if (noiseApplies) {
      applyAdjustment(channel, LOW_FREQUENCY_NOISE_ADJUSTMENT, 'Room noise');
    }
  }
}

// ---------------------------------------------------------------------------
// Step 5: apply the monitor, subwoofer and stream rules from the service setup.
// ---------------------------------------------------------------------------

export function applyServiceRules(channels: ChannelDraft[], setup: ServiceSetup): void {
  const wedgesOnStage = setup.monitorType === 'wedges' || setup.monitorType === 'mixed';
  const capWhy = setup.monitorType === 'mixed' ? `${MONITOR_RULES.mixedWhy} ${MONITOR_RULES.wedgeCapWhy}` : MONITOR_RULES.wedgeCapWhy;

  for (const channel of channels) {
    const isVocal = isVocalRole(channel.memberRole.role);

    if (wedgesOnStage && isVocal) {
      addCeiling(channel, 'compGainReductionDb', {
        source: 'Monitors',
        amount: WEDGE_VOCAL_GAIN_REDUCTION_CAP_DB,
        why: capWhy,
      });
      channel.makeupGain = MONITOR_RULES.wedgeNoMakeup;

      const mic = findMicModel(channel.memberRole);
      if (mic !== null) {
        channel.mixerNotes.push(mic.wedgeNote);
      }
    }

    if (setup.subwooferFeed === 'mainThroughCrossover') {
      channel.sendToSubBus = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Step 6: apply ensemble rules, which may adjust several channels at once.
// ---------------------------------------------------------------------------

export function findActiveEnsembleRules(rolesInBand: Role[]): EnsembleRule[] {
  return ENSEMBLE_RULES.filter((rule) => {
    for (const oneOf of rule.requiresOneOfEach) {
      const anyPresent = oneOf.some((role) => rolesInBand.includes(role));
      if (!anyPresent) {
        return false;
      }
    }
    return true;
  });
}

export function applyEnsembleRules(channels: ChannelDraft[], activeRules: EnsembleRule[]): void {
  for (const rule of activeRules) {
    for (const channel of channels) {
      const role = channel.memberRole.role;
      for (const entry of rule.adjustments) {
        if (entry.targetRoles.includes(role)) {
          applyAdjustment(channel, entry.adjustment, 'Band');
        }
      }
      if (rule.removeSubSendFrom.includes(role)) {
        channel.sendToSubBus = false;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Step 7: attach the musical limits. They clamp last, when each value is resolved.
// ---------------------------------------------------------------------------

export function applyMusicalLimits(channels: ChannelDraft[]): void {
  for (const channel of channels) {
    const voiceRange = channel.memberRole.vocal === null ? null : channel.memberRole.vocal.voiceRange;
    for (const key of PARAM_KEYS) {
      const draft: ParamDraft | undefined = channel.params[key];
      if (draft === undefined) {
        continue;
      }
      draft.musicalLimit = getMusicalLimit(channel.profile, key, voiceRange);
    }
  }
}
