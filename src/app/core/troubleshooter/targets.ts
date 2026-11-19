import { TargetPicker } from '../knowledge/troubleshooting/types';
import { MixPlan } from '../model';
import { TroubleTarget } from './context';

export interface TargetOption {
  /** Stable id for the picker button. */
  id: string;
  label: string;
  target: TroubleTarget;
}

/** The channels (and, where the tree allows it, the groups) the mixer can point at. */
export function listTargetOptions(picker: TargetPicker, plan: MixPlan): TargetOption[] {
  if (picker === 'none') {
    return [];
  }

  const options: TargetOption[] = [];
  for (const channel of plan.channels) {
    options.push({
      id: `channel-${channel.id}`,
      label: `${channel.roleLabel} (${channel.memberName})`,
      target: { kind: 'channel', channelId: channel.id },
    });
  }

  if (picker === 'channelOrGroup') {
    for (const dca of plan.dcas) {
      if (dca.holdsFxReturns) {
        continue;
      }
      options.push({
        id: `group-${dca.id}`,
        label: `Group: ${dca.label}`,
        target: { kind: 'group', dcaId: dca.id },
      });
    }
  }

  return options;
}
