import { TreeCondition } from '../knowledge/troubleshooting/types';
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
    case 'lowestSkill':
      return `the roster settings for this role call for this check first: ${condition.role}`;
    case 'streamMixEnabled':
      return 'a separate stream mix is in use';
    case 'subOnOwnBus':
      return 'the subwoofer has its own feed';
  }
}
