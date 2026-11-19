import { TreeCondition, TroubleshootingTree } from '../knowledge/troubleshooting/types';
import { BandMember, Role, SKILL_LEVELS } from '../model';
import { TroubleshootContext } from './context';

function bandHasRole(band: BandMember[], role: Role): boolean {
  for (const member of band) {
    for (const memberRole of member.roles) {
      if (memberRole.role === role) {
        return true;
      }
    }
  }
  return false;
}

function roleIsAtLowestSkill(band: BandMember[], role: Role): boolean {
  const lowestSkill = SKILL_LEVELS[0];
  for (const member of band) {
    for (const memberRole of member.roles) {
      if (memberRole.role === role && memberRole.skill === lowestSkill) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Whether a symptom makes sense for this band: "Bass boomy" is not offered to a band without a bass.
 * An empty band has not been entered yet, so every symptom stays available.
 */
export function isTreeRelevant(tree: TroubleshootingTree, band: BandMember[]): boolean {
  if (band.length === 0) {
    return true;
  }
  for (const oneOfTheseRoles of tree.needsOneOfEach) {
    const bandHasOne = oneOfTheseRoles.some((role) => bandHasRole(band, role));
    if (!bandHasOne) {
      return false;
    }
  }
  return true;
}

/** Answers one tree condition for the current band, room and setup. */
export function evaluateCondition(condition: TreeCondition, context: TroubleshootContext): boolean {
  switch (condition.kind) {
    case 'roomIs':
      return context.room.reverberance === condition.reverberance;
    case 'wedgesInUse':
      // 'mixed' means some wedges are on stage, so the wedge rules apply.
      return context.serviceSetup.monitorType !== 'inEars';
    case 'roleInBand':
      return bandHasRole(context.band, condition.role);
    case 'anyRoleInBand':
      return condition.roles.some((role) => bandHasRole(context.band, role));
    case 'allOf':
      return condition.conditions.every((entry) => evaluateCondition(entry, context));
    case 'not':
      return !evaluateCondition(condition.condition, context);
    case 'lowestSkill':
      return roleIsAtLowestSkill(context.band, condition.role);
    case 'streamMixEnabled':
      return context.serviceSetup.separateStreamMix;
    case 'subOnOwnBus':
      return context.serviceSetup.subwooferFeed === 'ownBus';
  }
}

/**
 * Describes a condition for the review document. PRIVACY: the skill condition is described by
 * behavior only, never by a skill label.
 */
export function describeCondition(condition: TreeCondition): string {
  switch (condition.kind) {
    case 'roomIs':
      return `the room is ${condition.reverberance}`;
    case 'wedgesInUse':
      return 'wedges are on stage';
    case 'roleInBand':
      return `the band has this role: ${condition.role}`;
    case 'anyRoleInBand':
      return `the band has one of these roles: ${condition.roles.join(', ')}`;
    case 'allOf':
      return condition.conditions.map((entry) => describeCondition(entry)).join(', and ');
    case 'not':
      return `it is not true that ${describeCondition(condition.condition)}`;
    case 'lowestSkill':
      return `the roster settings for this role call for this check first: ${condition.role}`;
    case 'streamMixEnabled':
      return 'a separate stream mix is in use';
    case 'subOnOwnBus':
      return 'the subwoofer has its own feed';
  }
}
