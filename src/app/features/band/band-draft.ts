import { DEFAULT_CONNECTION_BY_ROLE, SKILL_DESCRIPTIONS } from '../../core/knowledge';
import { BandMember, isVocalRole, MemberRole, MicModelId, Role, ROLES, SkillLevel, SourceConnection, VocalDetails, VOICE_RANGES, VoiceRange } from '../../core/model';

/**
 * Pure helpers for the member editor: building a new member or role with sensible defaults,
 * and turning the text values that come out of <select> elements back into domain types.
 */

/** One of the three "Which sounds most like them?" choices. The description is the only part shown. */
export interface BehaviorOption {
  level: SkillLevel;
  description: string;
}

/** The role a brand-new member, or an added role, starts with. */
const FIRST_ROLE: Role = 'leadVocal';

/** The level a new role starts with. It is the baseline: it changes nothing in the mix. */
const STARTING_LEVEL: SkillLevel = 'intermediate';

export function createMemberId(): string {
  const canMakeUuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
  if (canMakeUuid) {
    return `m-${crypto.randomUUID()}`;
  }
  const randomPart = Math.floor(Math.random() * 1_000_000);
  return `m-${Date.now()}-${randomPart}`;
}

export function createVocalDetails(): VocalDetails {
  return { voiceRange: 'medium', micModel: 'sm58', micModelFreeText: '' };
}

/** A role with its default connection. Vocal roles also get default vocal details. */
export function createMemberRole(role: Role): MemberRole {
  const vocal = isVocalRole(role) ? createVocalDetails() : null;
  return {
    role,
    skill: STARTING_LEVEL,
    connection: DEFAULT_CONNECTION_BY_ROLE[role],
    vocal,
  };
}

export function createEmptyMember(): BandMember {
  return {
    id: createMemberId(),
    name: '',
    roles: [createMemberRole(FIRST_ROLE)],
  };
}

/**
 * The same entry after the user picked a different role.
 * The connection resets to the new role's default, because the old one may not exist for it.
 * The chosen level is kept. Vocal details are kept when both roles are vocal.
 */
export function changeRole(current: MemberRole, role: Role): MemberRole {
  let vocal: VocalDetails | null = null;
  if (isVocalRole(role)) {
    vocal = current.vocal ?? createVocalDetails();
  }
  return {
    role,
    skill: current.skill,
    connection: DEFAULT_CONNECTION_BY_ROLE[role],
    vocal,
  };
}

/** The three behavior descriptions for a role, in the order they are offered. */
export function behaviorOptionsForRole(role: Role): BehaviorOption[] {
  const descriptions = SKILL_DESCRIPTIONS.find((entry) => entry.role === role);
  if (descriptions === undefined) {
    return [];
  }
  return [
    { level: 'beginner', description: descriptions.beginner },
    { level: 'intermediate', description: descriptions.intermediate },
    { level: 'advanced', description: descriptions.advanced },
  ];
}

/** What gets saved: a trimmed name, and no leftover free-text mic when a listed mic is chosen. */
export function cleanMemberForSaving(draft: BandMember): BandMember {
  const roles = draft.roles.map((memberRole) => {
    if (memberRole.vocal === null) {
      return memberRole;
    }
    const usesFreeText = memberRole.vocal.micModel === 'other';
    const micModelFreeText = usesFreeText ? memberRole.vocal.micModelFreeText.trim() : '';
    return { ...memberRole, vocal: { ...memberRole.vocal, micModelFreeText } };
  });
  return { id: draft.id, name: draft.name.trim(), roles };
}

// --- Text from a <select> back to a domain type. Unknown text gives null. ---

export function parseRole(text: string): Role | null {
  return ROLES.find((role) => role === text) ?? null;
}

export function parseVoiceRange(text: string): VoiceRange | null {
  return VOICE_RANGES.find((voiceRange) => voiceRange === text) ?? null;
}

export function parseConnection(text: string, allowed: SourceConnection[]): SourceConnection | null {
  return allowed.find((connection) => connection === text) ?? null;
}

const MIC_MODEL_IDS: readonly MicModelId[] = ['sm58', 'beta58a', 'e835', 'e935', 'condenserHandheld', 'other'];

export function parseMicModelId(text: string): MicModelId | null {
  return MIC_MODEL_IDS.find((micModelId) => micModelId === text) ?? null;
}
