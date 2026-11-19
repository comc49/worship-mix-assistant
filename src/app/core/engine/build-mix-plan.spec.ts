import { getMusicalLimit, INSTRUMENT_PROFILES, WEDGE_VOCAL_GAIN_REDUCTION_CAP_DB } from '../knowledge';
import { BandMember, ChannelPlan, isVocalRole, MixPlan, NumericSetting, SkillLevel } from '../model';
import {
  FIXTURE_DRY_ROOM,
  FIXTURE_FULL_BAND,
  FIXTURE_IN_EARS,
  FIXTURE_LIVE_ROOM,
  FIXTURE_NEUTRAL_ROOM,
  FIXTURE_STRIPPED_BAND,
  FIXTURE_WEDGES,
} from '../testing/fixtures';
import { buildMixPlan } from './build-mix-plan';

function withSkill(band: BandMember[], memberId: string, skill: SkillLevel): BandMember[] {
  return band.map((member) => {
    if (member.id !== memberId) {
      return member;
    }
    return { ...member, roles: member.roles.map((memberRole) => ({ ...memberRole, skill })) };
  });
}

function findChannel(plan: MixPlan, profileId: string): ChannelPlan {
  const channel = plan.channels.find((entry) => entry.profileId === profileId);
  if (channel === undefined) {
    throw new Error(`No channel with profile ${profileId}`);
  }
  return channel;
}

function listNumericSettings(channel: ChannelPlan): { key: string; setting: NumericSetting }[] {
  const settings: { key: string; setting: NumericSetting }[] = [];
  if (channel.lowCut !== null) {
    settings.push({ key: 'lowCutHz', setting: channel.lowCut });
  }
  if (channel.compressor !== null) {
    settings.push({ key: 'compRatio', setting: channel.compressor.ratio });
    settings.push({ key: 'compAttackMs', setting: channel.compressor.attackMs });
    settings.push({ key: 'compReleaseMs', setting: channel.compressor.releaseMs });
    settings.push({ key: 'compGainReductionDb', setting: channel.compressor.gainReductionDb });
  }
  if (channel.gate !== null) {
    settings.push({ key: 'gateRangeDb', setting: channel.gate.rangeDb });
  }
  settings.push({ key: 'levelDb', setting: channel.level });
  for (const send of channel.fxSends) {
    settings.push({ key: `fxSend.${send.effectId}`, setting: send.levelDb });
  }
  return settings;
}

const fullLive = () => buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
const fullDry = () => buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_DRY_ROOM, FIXTURE_WEDGES);
const stripped = () => buildMixPlan(FIXTURE_STRIPPED_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);

describe('buildMixPlan: golden plans', () => {
  it('full band, live room, wedges', () => {
    expect(fullLive()).toMatchSnapshot();
  });

  it('full band, dry room', () => {
    expect(fullDry()).toMatchSnapshot();
  });

  it('stripped set', () => {
    expect(stripped()).toMatchSnapshot();
  });

  it('patches in the standard order: drums, bass, guitars, keys, pads, vocals', () => {
    const labels = fullLive().channels.map((channel) => channel.roleLabel);
    expect(labels).toEqual([
      'Electronic drums (stereo)',
      'Bass guitar',
      'Acoustic guitar',
      'Electric guitar',
      'Keys',
      'Pad',
      'Lead vocal',
      'Harmony vocal',
      'Harmony vocal',
    ]);
  });

  it('a member who sings and plays becomes two channels, and a stereo source is one stereo channel', () => {
    const plan = fullLive();
    const vocalistAChannels = plan.channels.filter((channel) => channel.memberId === 'm-vocalist-a');
    expect(vocalistAChannels.length).toBe(2);
    expect(findChannel(plan, 'keys.di').stereo).toBe(true);
  });
});

describe('buildMixPlan: properties', () => {
  const plans = [fullLive(), fullDry(), stripped()];

  it('is deterministic', () => {
    expect(JSON.stringify(fullLive())).toBe(JSON.stringify(fullLive()));
  });

  it('gives every setting a why, a listenFor and a provenance trail', () => {
    for (const plan of plans) {
      for (const channel of plan.channels) {
        for (const entry of listNumericSettings(channel)) {
          expect(entry.setting.why.length).toBeGreaterThan(0);
          expect(entry.setting.listenFor.length).toBeGreaterThan(0);
          expect(entry.setting.provenance.length).toBeGreaterThan(0);
        }
        expect(channel.gainStaging.why.length).toBeGreaterThan(0);
        expect(channel.pan.why.length).toBeGreaterThan(0);
      }
    }
  });

  it('never lets a value cross a musical limit, for every skill and room combination', () => {
    const skills: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
    const rooms = [FIXTURE_LIVE_ROOM, FIXTURE_DRY_ROOM, FIXTURE_NEUTRAL_ROOM];
    for (const skill of skills) {
      for (const room of rooms) {
        const band = FIXTURE_FULL_BAND.map((member) => withSkill([member], member.id, skill)[0]);
        const plan = buildMixPlan(band, room, FIXTURE_WEDGES);
        for (const channel of plan.channels) {
          const profile = INSTRUMENT_PROFILES.find((entry) => entry.id === channel.profileId);
          const member = band.find((entry) => entry.id === channel.memberId);
          const memberRole = member?.roles.find((entry) => entry.role === channel.role);
          if (profile === undefined || memberRole === undefined) {
            throw new Error('fixture lookup failed');
          }
          const voiceRange = memberRole.vocal === null ? null : memberRole.vocal.voiceRange;
          for (const entry of listNumericSettings(channel)) {
            const limit = getMusicalLimit(profile, entry.key as Parameters<typeof getMusicalLimit>[1], voiceRange);
            if (limit === null) {
              continue;
            }
            expect(entry.setting.value).toBeGreaterThanOrEqual(limit.floor);
            expect(entry.setting.value).toBeLessThanOrEqual(limit.ceiling);
          }
        }
      }
    }
  });

  it('names no console anywhere in the plan', () => {
    for (const plan of plans) {
      const text = JSON.stringify(plan);
      expect(text).not.toMatch(/x32|wing|behringer|midas/i);
    }
  });

  it('never puts a skill label in the plan', () => {
    for (const plan of plans) {
      const text = JSON.stringify(plan);
      expect(text).not.toMatch(/beginner|intermediate|advanced/i);
    }
  });
});

describe('buildMixPlan: isolation', () => {
  it('changing one member\'s skill changes only that member\'s channels and the explicitly linked ones', () => {
    const before = fullLive();
    const after = buildMixPlan(withSkill(FIXTURE_FULL_BAND, 'm-bass', 'advanced'), FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);

    // No ensemble rule depends on the bassist's skill (rules depend on which roles are present),
    // so for this fixture the list of linked channels is empty.
    const linkedChannelIds: string[] = [];

    for (const channelBefore of before.channels) {
      const channelAfter = after.channels.find((channel) => channel.id === channelBefore.id);
      const mayChange = channelBefore.memberId === 'm-bass' || linkedChannelIds.includes(channelBefore.id);
      if (mayChange) {
        continue;
      }
      expect(channelAfter).toEqual(channelBefore);
    }
    expect(findChannel(after, 'bassGuitar.di')).not.toEqual(findChannel(before, 'bassGuitar.di'));
  });
});

describe('buildMixPlan: skill', () => {
  it('gives a beginner bassist more compression than an advanced one', () => {
    const beginner = buildMixPlan(withSkill(FIXTURE_FULL_BAND, 'm-bass', 'beginner'), FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const advanced = buildMixPlan(withSkill(FIXTURE_FULL_BAND, 'm-bass', 'advanced'), FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const beginnerComp = findChannel(beginner, 'bassGuitar.di').compressor;
    const advancedComp = findChannel(advanced, 'bassGuitar.di').compressor;
    expect(beginnerComp?.ratio.value).toBeGreaterThan(advancedComp?.ratio.value ?? 0);
    expect(beginnerComp?.gainReductionDb.value).toBeGreaterThan(advancedComp?.gainReductionDb.value ?? 0);
  });

  it('raises a beginner keys player\'s low cut only when a bass guitar is in the band', () => {
    const withBassBeginner = buildMixPlan(withSkill(FIXTURE_FULL_BAND, 'm-keys', 'beginner'), FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const withBassAdvanced = buildMixPlan(withSkill(FIXTURE_FULL_BAND, 'm-keys', 'advanced'), FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    expect(findChannel(withBassBeginner, 'keys.di').lowCut?.value).toBeGreaterThan(findChannel(withBassAdvanced, 'keys.di').lowCut?.value ?? 0);

    // The stripped set has no bass guitar: the keys' left hand is the low end.
    const noBassBeginner = buildMixPlan(withSkill(FIXTURE_STRIPPED_BAND, 'm-keys', 'beginner'), FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const noBassAdvanced = buildMixPlan(withSkill(FIXTURE_STRIPPED_BAND, 'm-keys', 'advanced'), FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    expect(findChannel(noBassBeginner, 'keys.di').lowCut?.value).toBe(findChannel(noBassAdvanced, 'keys.di').lowCut?.value);
  });

  it('never places a lead vocal lower in the blend because of skill', () => {
    const beginner = buildMixPlan(withSkill(FIXTURE_FULL_BAND, 'm-vocalist-a', 'beginner'), FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    expect(findChannel(beginner, 'leadVocal.mic').level.value).toBe(findChannel(fullLive(), 'leadVocal.mic').level.value);
  });
});

describe('buildMixPlan: safety', () => {
  it('caps vocal gain reduction with wedges, with no makeup gain', () => {
    const band = FIXTURE_FULL_BAND.map((member) => withSkill([member], member.id, 'beginner')[0]);
    const plan = buildMixPlan(band, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const vocals = plan.channels.filter((channel) => isVocalRole(channel.role));
    expect(vocals.length).toBe(3);
    for (const vocal of vocals) {
      expect(vocal.compressor?.gainReductionDb.value).toBeLessThanOrEqual(WEDGE_VOCAL_GAIN_REDUCTION_CAP_DB);
      expect(vocal.compressor?.makeupGain.value).toContain('None');
    }
  });

  it('lifts the makeup restriction with in-ears', () => {
    const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_IN_EARS);
    expect(findChannel(plan, 'leadVocal.mic').compressor?.makeupGain.value).not.toContain('None');
    expect(plan.monitorGuidance.ringOutRequired).toBe(false);
  });

  it('puts no gate on DI, keys, modeler or electronic drum channels', () => {
    for (const plan of [fullLive(), fullDry(), stripped()]) {
      for (const channel of plan.channels) {
        const isOpenMic = channel.connection === 'dynamicMic' || channel.connection === 'condenserMic';
        if (!isOpenMic) {
          expect(channel.gate).toBeNull();
        }
      }
    }
  });

  it('lets the live room\'s reverb limit beat a skill modifier', () => {
    const plan = fullLive();
    const beginnerHarmony = plan.channels.find((channel) => channel.memberId === 'm-vocalist-b');
    const plateSend = beginnerHarmony?.fxSends.find((send) => send.effectId === 'vocalPlate');
    expect(plateSend?.levelDb.value).toBe(-15);
    const sources = plateSend?.levelDb.provenance.map((step) => step.source) ?? [];
    expect(sources).toEqual(['Baseline', 'Player', 'Room', 'Room']);
  });

  it('sends only kick, bass and synth bass sources to a subwoofer on its own bus', () => {
    const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, { ...FIXTURE_WEDGES, subwooferFeed: 'ownBus' });
    const roles = plan.channels.filter((channel) => channel.sendToSubBus).map((channel) => channel.role);
    expect(roles).toEqual(['electronicDrums', 'bassGuitar']);
    expect(fullLive().subwoofer.sendChannelIds).toEqual([]);
  });
});

describe('buildMixPlan: click', () => {
  const bandWithClick: BandMember[] = [
    ...FIXTURE_FULL_BAND,
    { id: 'm-click', name: 'Click', roles: [{ role: 'click', skill: 'intermediate', connection: 'monoDi', vocal: null }] },
  ];

  it('never sends the click to a monitor mix when wedges are on stage, and says so', () => {
    for (const monitorType of ['wedges', 'mixed'] as const) {
      const plan = buildMixPlan(bandWithClick, FIXTURE_LIVE_ROOM, { ...FIXTURE_WEDGES, monitorType });
      expect(findChannel(plan, 'click.di').monitorSends).toEqual([]);
      expect(findChannel(plan, 'click.di').routeToMain).toBe(false);
      expect(plan.warnings.some((warning) => warning.message.startsWith('Click:'))).toBe(true);
    }
  });

  it('sends the click to monitor mixes with in-ears', () => {
    const plan = buildMixPlan(bandWithClick, FIXTURE_LIVE_ROOM, FIXTURE_IN_EARS);
    expect(findChannel(plan, 'click.di').monitorSends.length).toBeGreaterThan(0);
    expect(plan.warnings.some((warning) => warning.message.startsWith('Click:'))).toBe(false);
  });
});

describe('buildMixPlan: privacy', () => {
  it('gives every player of a role the same notes whatever their rating, so a note never reveals a rating', () => {
    const skills: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
    const notesBySkill = skills.map((skill) => {
      const band = FIXTURE_FULL_BAND.map((member) => withSkill([member], member.id, skill)[0]);
      const plan = buildMixPlan(band, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
      return plan.channels.map((channel) => ({ id: channel.id, mixerNotes: channel.mixerNotes, coachingNotes: channel.coachingNotes }));
    });
    expect(notesBySkill[0]).toEqual(notesBySkill[1]);
    expect(notesBySkill[2]).toEqual(notesBySkill[1]);
    // And every channel has a tip, so the absence of one says nothing either.
    for (const entry of notesBySkill[1]) {
      expect(entry.coachingNotes.length, entry.id).toBeGreaterThan(0);
    }
  });
});
