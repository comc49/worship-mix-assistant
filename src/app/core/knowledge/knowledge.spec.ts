import { ROLES, SKILL_LEVELS } from '../model';
import {
  connectionsForRole,
  DEFAULT_CONNECTION_BY_ROLE,
  ENSEMBLE_RULES,
  findProfiles,
  findRoleNotes,
  getMusicalLimit,
  INSTRUMENT_PROFILES,
  ROOM_MODIFIERS,
  SKILL_DESCRIPTIONS,
  SKILL_MODIFIERS,
} from './index';

describe('knowledge base coverage', () => {
  it('has a baseline for every role and every connection offered for it', () => {
    for (const role of ROLES) {
      const connections = connectionsForRole(role);
      expect(connections.length).toBeGreaterThan(0);
      expect(connections).toContain(DEFAULT_CONNECTION_BY_ROLE[role]);
      for (const connection of connections) {
        expect(findProfiles(role, connection).length).toBeGreaterThan(0);
      }
    }
  });

  it('has beginner and advanced modifiers with a why, and one tip per role that does not depend on the rating', () => {
    for (const role of ROLES) {
      for (const level of ['beginner', 'advanced'] as const) {
        const modifier = SKILL_MODIFIERS.find((entry) => entry.role === role && entry.level === level);
        expect(modifier, `${role} ${level}`).toBeDefined();
        expect(modifier?.why.length).toBeGreaterThan(0);
        for (const adjustment of modifier?.adjustments ?? []) {
          expect(adjustment.why.length).toBeGreaterThan(0);
        }
      }
      expect(findRoleNotes(role).coaching.length, role).toBeGreaterThan(0);
      const advanced = SKILL_MODIFIERS.find((entry) => entry.role === role && entry.level === 'advanced');
      expect(advanced?.coaching, role).toBeUndefined();
      expect(advanced?.mixerNotes, role).toBeUndefined();
    }
  });

  it('has three behavior descriptions for every role', () => {
    for (const role of ROLES) {
      const descriptions = SKILL_DESCRIPTIONS.find((entry) => entry.role === role);
      expect(descriptions).toBeDefined();
      for (const level of SKILL_LEVELS) {
        expect(descriptions?.[level].length).toBeGreaterThan(0);
      }
    }
  });

  it('has live and dry room modifiers for every role', () => {
    for (const reverberance of ['live', 'dry'] as const) {
      const set = ROOM_MODIFIERS.find((entry) => entry.reverberance === reverberance);
      expect(set).toBeDefined();
      for (const role of ROLES) {
        expect(set?.byRole[role].why.length).toBeGreaterThan(0);
      }
    }
  });

  it('never lets skill choose tonal EQ: skill adjustments only touch dynamics, level, low cut and sends', () => {
    // There is no EQ parameter in ParamKey at all, so this is enforced by the type. This test documents it.
    for (const modifier of SKILL_MODIFIERS) {
      for (const adjustment of modifier.adjustments) {
        expect(adjustment.param).not.toMatch(/eq/i);
      }
    }
  });
});

describe('knowledge base values', () => {
  it('gives every value a why and a listenFor, and keeps every default inside its range', () => {
    for (const profile of INSTRUMENT_PROFILES) {
      for (const [key, value] of Object.entries(profile.params)) {
        expect(value.why.length, `${profile.id} ${key}`).toBeGreaterThan(0);
        expect(value.listenFor.length, `${profile.id} ${key}`).toBeGreaterThan(0);
        expect(value.value).toBeGreaterThanOrEqual(value.min);
        expect(value.value).toBeLessThanOrEqual(value.max);
      }
      expect(profile.suggestedCuts.length).toBeLessThanOrEqual(3);
      for (const suggestedCut of profile.suggestedCuts) {
        expect(suggestedCut.gainDb).toBeLessThan(0);
      }
    }
  });

  it('keeps every baseline inside its musical limit', () => {
    for (const profile of INSTRUMENT_PROFILES) {
      for (const [key, value] of Object.entries(profile.params)) {
        const limit = getMusicalLimit(profile, key as Parameters<typeof getMusicalLimit>[1], null);
        expect(limit).not.toBeNull();
        expect(value.value).toBeGreaterThanOrEqual(limit?.floor ?? 0);
        expect(value.value).toBeLessThanOrEqual(limit?.ceiling ?? 0);
      }
    }
  });

  it('puts no gate on a profile that has no open-mic connection', () => {
    for (const profile of INSTRUMENT_PROFILES) {
      const hasOpenMic = profile.connections.includes('dynamicMic') || profile.connections.includes('condenserMic');
      const hasGate = profile.params.gateRangeDb !== undefined;
      if (hasGate) {
        expect(hasOpenMic, profile.id).toBe(true);
      }
    }
  });

  it('names the roles each ensemble rule links, and only adjusts linked roles', () => {
    for (const rule of ENSEMBLE_RULES) {
      expect(rule.links.length).toBeGreaterThan(0);
      expect(rule.arrangementAdvice.length).toBeGreaterThan(0);
      for (const entry of rule.adjustments) {
        for (const role of entry.targetRoles) {
          expect(rule.links).toContain(role);
        }
      }
    }
  });
});
