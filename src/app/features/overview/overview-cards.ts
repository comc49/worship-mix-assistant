import { ChannelAssignment, ConsoleSheet } from '../../core/consoles';
import { ChannelPlan, MixPlan, NumericSetting } from '../../core/model';
import { DetailContent, detailFromNumericSetting, formatSettingValue } from '../../shared/detail-content';

/** One line on a channel card: a label, the value as text, and the tap-for-detail content when there is any. */
export interface OverviewSetting {
  label: string;
  valueText: string;
  /** null for plain words such as "Off" or "None", which have nothing to open. */
  detail: DetailContent | null;
}

/** Everything one channel card shows, already turned into text. */
export interface OverviewCard {
  channelId: string;
  title: string;
  /** "Ch 11" or "Ch 1+2". null when the band does not fit the console, so there is no channel number yet. */
  consoleChannelText: string | null;
  settings: OverviewSetting[];
  fxSends: OverviewSetting[];
  monitorSends: OverviewSetting[];
  dcaLabels: string[];
  inMultipleDcas: boolean;
}

/** Builds one card per channel of the plan. The sheet only adds the console channel numbers. */
export function buildOverviewCards(plan: MixPlan, sheet: ConsoleSheet | null): OverviewCard[] {
  return plan.channels.map((channel) => buildCard(channel, plan, sheet));
}

function buildCard(channel: ChannelPlan, plan: MixPlan, sheet: ConsoleSheet | null): OverviewCard {
  const assignment = findAssignment(channel.id, sheet);

  let title = `${channel.roleLabel} (${channel.memberName})`;
  let consoleChannelText: string | null = null;
  if (assignment !== null) {
    title = assignment.label;
    consoleChannelText = `Ch ${assignment.consoleChannels.join('+')}`;
  }

  const fxSends: OverviewSetting[] = channel.fxSends.map((send) => {
    const effect = plan.sendEffects.find((entry) => entry.id === send.effectId);
    const label = effect === undefined ? send.effectId : effect.label;
    return numericSetting(label, send.levelDb);
  });

  const monitorSends: OverviewSetting[] = channel.monitorSends.map((send) => {
    const mix = plan.monitorMixes.find((entry) => entry.id === send.mixId);
    const label = mix === undefined ? send.mixId : mix.label;
    return numericSetting(label, send.levelDb);
  });

  const dcaLabels: string[] = [];
  for (const dcaId of channel.dcaIds) {
    const dca = plan.dcas.find((entry) => entry.id === dcaId);
    if (dca !== undefined) {
      dcaLabels.push(dca.label);
    }
  }

  return {
    channelId: channel.id,
    title,
    consoleChannelText,
    settings: buildMainSettings(channel),
    fxSends,
    monitorSends,
    dcaLabels,
    inMultipleDcas: channel.inMultipleDcas,
  };
}

function buildMainSettings(channel: ChannelPlan): OverviewSetting[] {
  const settings: OverviewSetting[] = [];

  if (channel.lowCut === null) {
    settings.push(plainSetting('Low cut', 'Off'));
  } else {
    settings.push(numericSetting('Low cut', channel.lowCut));
  }

  if (channel.gate === null) {
    settings.push(plainSetting('Gate', 'None'));
  } else {
    settings.push(plainSetting('Gate', 'On'));
  }

  if (channel.compressor === null) {
    settings.push(plainSetting('Compressor', 'None'));
  } else {
    settings.push(numericSetting('Compressor ratio', channel.compressor.ratio));
    settings.push(numericSetting('Compressor: gain reduction to aim for', channel.compressor.gainReductionDb));
  }

  settings.push(numericSetting('Fader starting point', channel.level));

  return settings;
}

function numericSetting(label: string, setting: NumericSetting): OverviewSetting {
  return {
    label,
    valueText: formatSettingValue(setting),
    detail: detailFromNumericSetting(setting),
  };
}

function plainSetting(label: string, valueText: string): OverviewSetting {
  return { label, valueText, detail: null };
}

function findAssignment(channelId: string, sheet: ConsoleSheet | null): ChannelAssignment | null {
  if (sheet === null) {
    return null;
  }
  const assignment = sheet.channelMap.find((entry) => entry.channelId === channelId);
  return assignment ?? null;
}
