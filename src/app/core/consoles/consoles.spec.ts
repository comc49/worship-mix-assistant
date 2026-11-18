import { buildMixPlan } from '../engine';
import { BandMember, MixPlan } from '../model';
import {
  FIXTURE_DRY_ROOM,
  FIXTURE_FULL_BAND,
  FIXTURE_LIVE_ROOM,
  FIXTURE_STRIPPED_BAND,
  FIXTURE_WEDGES,
} from '../testing/fixtures';
import { ConsoleProfile, Fact } from './console-profile';
import { AdapterResult, ConsoleSheet } from './console-sheet';
import { buildConsoleSheet, CONSOLE_PROFILES, toWingCompact, toX32, validateForConsole, WING_COMPACT_PROFILE, X32_PROFILE } from './index';

function expectSheet(result: AdapterResult): ConsoleSheet {
  if (!result.ok) {
    throw new Error(`Expected a sheet, got errors: ${result.errors.join('; ')}`);
  }
  return result.sheet;
}

const fullLive = () => buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
const fullDry = () => buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_DRY_ROOM, FIXTURE_WEDGES);
const stripped = () => buildMixPlan(FIXTURE_STRIPPED_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
const PROFILES: ConsoleProfile[] = [X32_PROFILE, WING_COMPACT_PROFILE];

describe('console profiles', () => {
  it('gives every fact a manual source or an UNVERIFIED flag with a note', () => {
    for (const profile of PROFILES) {
      const entries = Object.entries(profile.facts) as [string, Fact<unknown>][];
      expect(entries.length).toBeGreaterThan(40);
      for (const [key, fact] of entries) {
        const label = `${profile.id}.${key}`;
        expect(fact, label).toHaveProperty('value');
        const source = fact.source;
        if (source.status === 'verified') {
          expect(source.section.length, label).toBeGreaterThan(0);
          expect(source.quote.length, label).toBeGreaterThan(0);
          expect(source.manual.length, label).toBeGreaterThan(0);
        } else {
          expect(source.status, label).toBe('unverified');
          expect(source.note.length, label).toBeGreaterThan(0);
        }
      }
    }
  });

  it('chooses only effects that the profile lists', () => {
    for (const profile of PROFILES) {
      const facts = profile.facts;
      expect(facts.reverbEffects.value).toContain(profile.effectChoice.plateReverb);
      expect(facts.reverbEffects.value).toContain(profile.effectChoice.hallReverb);
      expect(facts.reverbEffects.value).toContain(profile.effectChoice.roomReverb);
      expect(facts.delayEffects.value).toContain(profile.effectChoice.delay);
      expect(facts.deEsserEffects.value).toContain(profile.effectChoice.deEsser);
    }
  });
});

describe('console adapters', () => {
  it('produce sheets for the three fixture plans on both consoles', () => {
    for (const plan of [fullLive(), fullDry(), stripped()]) {
      expect(expectSheet(toX32(plan))).toMatchSnapshot();
      expect(expectSheet(toWingCompact(plan))).toMatchSnapshot();
    }
  });

  it('never reference a control, effect, slot or bus that is absent from the profile', () => {
    for (const profile of PROFILES) {
      const sheet = expectSheet(buildConsoleSheet(fullLive(), profile));
      const factKeys = Object.keys(profile.facts);
      const effectNames = [
        ...profile.facts.reverbEffects.value,
        ...profile.facts.delayEffects.value,
        ...profile.facts.deEsserEffects.value,
        ...profile.facts.limiterEffects.value,
      ];
      for (const section of sheet.sections) {
        for (const step of section.steps) {
          for (const ref of step.controlRefs) {
            expect(factKeys).toContain(ref);
          }
          if (step.effectName !== null) {
            expect(effectNames).toContain(step.effectName);
          }
          if (step.fxSlot !== null) {
            expect(step.fxSlot).toBeGreaterThanOrEqual(1);
            expect(step.fxSlot).toBeLessThanOrEqual(profile.facts.fxSlotCount.value);
          }
          for (const bus of step.busNumbers) {
            expect(bus).toBeGreaterThanOrEqual(1);
            expect(bus).toBeLessThanOrEqual(profile.facts.mixBusCount.value);
          }
        }
      }
      for (const fx of sheet.fxMap) {
        expect(effectNames).toContain(fx.effectName);
      }
    }
  });

  it('flags every step that relies on an unverified fact, and no other', () => {
    for (const profile of PROFILES) {
      const sheet = expectSheet(buildConsoleSheet(fullLive(), profile));
      for (const section of sheet.sections) {
        for (const step of section.steps) {
          const usesUnverified = step.controlRefs.some((ref) => profile.facts[ref].source.status === 'unverified');
          expect(step.checkOnConsole !== null, step.id).toBe(usesUnverified);
        }
      }
    }
  });

  it('X32, full band with wedges: monitors and send effects get buses before any group, and dropped wishes are warned', () => {
    const plan = fullLive();
    const sheet = expectSheet(toX32(plan));
    const purposes = sheet.busMap.map((bus) => bus.purpose);
    const firstGroupIndex = purposes.indexOf('group');
    const lastMonitorIndex = purposes.lastIndexOf('monitor');
    const lastEffectIndex = purposes.lastIndexOf('sendEffect');
    expect(lastMonitorIndex).toBeLessThan(firstGroupIndex);
    expect(lastEffectIndex).toBeLessThan(firstGroupIndex);
    expect(purposes.filter((purpose) => purpose === 'monitor').length).toBe(plan.monitorMixes.length);
    expect(purposes.filter((purpose) => purpose === 'sendEffect').length).toBe(plan.sendEffects.length);

    // No bus is used twice.
    const allBuses = sheet.busMap.flatMap((bus) => bus.busNumbers);
    expect(new Set(allBuses).size).toBe(allBuses.length);

    // On a console with only 6 buses the wishes do not all fit: each dropped wish is a warning.
    const smallConsole: ConsoleProfile = {
      ...X32_PROFILE,
      facts: { ...X32_PROFILE.facts, mixBusCount: { value: 6, source: { status: 'unverified', note: 'test' } } },
    };
    const crowdedSheet = expectSheet(buildConsoleSheet(plan, smallConsole));
    const served = crowdedSheet.busMap.filter((bus) => bus.purpose === 'group' || bus.purpose === 'sendEffect').length;
    const dropped = crowdedSheet.warnings.filter((warning) => warning.kind === 'droppedWish');
    expect(served + dropped.length).toBe(plan.groupBuses.length + plan.sendEffects.length);
    expect(crowdedSheet.busMap.filter((bus) => bus.purpose === 'monitor').length).toBe(plan.monitorMixes.length);
    expect(dropped.length).toBeGreaterThan(0);
  });

  it('uses a linked pair for a stereo source on the X32 and one channel on the WING Compact', () => {
    const plan = fullLive();
    const keysId = plan.channels.find((channel) => channel.role === 'keys')?.id;
    const onX32 = expectSheet(toX32(plan)).channelMap.find((entry) => entry.channelId === keysId);
    const onWing = expectSheet(toWingCompact(plan)).channelMap.find((entry) => entry.channelId === keysId);
    expect(onX32?.consoleChannels.length).toBe(2);
    expect((onX32?.consoleChannels[0] ?? 0) % 2).toBe(1);
    expect(onWing?.consoleChannels.length).toBe(1);
  });

  it('puts reverbs and delays only in WING Compact slots that accept them', () => {
    const sheet = expectSheet(toWingCompact(fullLive()));
    const allowed = WING_COMPACT_PROFILE.facts.fxReverbDelaySlots.value;
    for (const fx of sheet.fxMap.filter((entry) => entry.role === 'send')) {
      expect(allowed).toContain(fx.slot);
    }
  });

  it('do not change the MixPlan they are given', () => {
    const plan: MixPlan = fullLive();
    const before = JSON.stringify(plan);
    toX32(plan);
    toWingCompact(plan);
    expect(JSON.stringify(plan)).toBe(before);
  });

  it('return a clear validation error for a band too large for the console', () => {
    const hugeBand: BandMember[] = [];
    for (let index = 0; index < 20; index = index + 1) {
      hugeBand.push({ id: `m-keys-${index}`, name: `Keys ${index}`, roles: [{ role: 'keys', skill: 'intermediate', connection: 'stereoDi', vocal: null }] });
    }
    const plan = buildMixPlan(hugeBand, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
    const result = toX32(plan);
    expect(result.ok).toBe(false);
    const errors = validateForConsole(plan, X32_PROFILE);
    expect(errors[0]).toContain('needs 40 input channels');
    expect(errors[0]).toContain('has 32');
    // 20 stereo sources fit the WING Compact's 40 natively stereo channels.
    expect(validateForConsole(plan, CONSOLE_PROFILES.wingCompact)).toEqual([]);
  });

  it('clamp to the console range and snap ratios when the console\'s values are known', () => {
    const known: ConsoleProfile = {
      ...X32_PROFILE,
      facts: {
        ...X32_PROFILE.facts,
        lowCutRangeHz: { value: { min: 20, max: 100 }, source: { status: 'unverified', note: 'test' } },
        compRatioValues: { value: [2, 3, 4, 5, 7, 10], source: { status: 'unverified', note: 'test' } },
      },
    };
    const sheet = expectSheet(buildConsoleSheet(fullLive(), known));
    expect(sheet.warnings.some((warning) => warning.kind === 'clamp')).toBe(true);
    expect(sheet.warnings.some((warning) => warning.kind === 'adaptation')).toBe(true);
    const lowCutSteps = sheet.sections.flatMap((section) => section.steps).filter((step) => step.id.startsWith('lowcut:'));
    for (const step of lowCutSteps) {
      expect(Number.parseInt(step.value ?? '0', 10)).toBeLessThanOrEqual(100);
    }
  });

  it('open with a protection section and mark preamp and routing steps rehearsal only', () => {
    const sheet = expectSheet(toX32(fullLive()));
    expect(sheet.sections.map((section) => section.id)).toEqual(['protect', 'patch', 'gain', 'lowCuts', 'groups', 'fx', 'dynamics', 'monitors', 'main']);
    expect(sheet.doNotTouch.length).toBeGreaterThan(3);
    const gainSteps = sheet.sections.find((section) => section.id === 'gain')?.steps ?? [];
    expect(gainSteps.every((step) => step.safety === 'rehearsalOnly')).toBe(true);
    const text = JSON.stringify(sheet);
    expect(text).not.toMatch(/beginner|intermediate|advanced/i);
  });
});
