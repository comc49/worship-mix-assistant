import { ConsoleFactKey, ConsoleProfile, Fact } from '../consoles/console-profile';
import { ChannelPlan, MixPlan, NumericSetting, Role, ROLES } from '../model';
import { ResolvedControl, TroubleshootContext } from './context';

/**
 * Turns {tokens} in tree text into plain language for the current band, plan and console.
 * A token that cannot be resolved is left in the text on purpose, so the tests catch it.
 */

/** What to call a musician when nobody in the band plays that role. */
const ROLE_WORDS: Record<Role, string> = {
  leadVocal: 'the lead singer',
  harmonyVocal: 'the harmony singers',
  acousticGuitar: 'the acoustic guitarist',
  electricGuitar: 'the electric guitarist',
  bassGuitar: 'the bassist',
  synthBass: 'the synth bass player',
  keys: 'the keys player',
  padSynth: 'the pad player',
  electronicDrums: 'the drummer',
  kick: 'the drummer',
  snare: 'the drummer',
  hiHat: 'the drummer',
  toms: 'the drummer',
  overheads: 'the drummer',
  cajon: 'the cajon player',
  backingTracks: 'whoever runs the backing tracks',
  click: 'whoever runs the click',
};

/** Plain-language names for the console facts the trees refer to. */
const FACT_LABELS: Partial<Record<ConsoleFactKey, string>> = {
  lowCutName: 'Low cut',
  lowCutScreen: 'Low cut screen',
  eqScreen: 'EQ screen',
  gateScreen: 'Gate screen',
  gateParamNames: 'Gate controls',
  compScreen: 'Compressor screen',
  compParamNames: 'Compressor controls',
  sendsScreen: 'Sends screen',
  monitorSendTap: 'Monitor send tap',
  fxScreen: 'Effects screen',
  fxInsertProcedure: 'Inserting an effect',
  preampGain: 'Preamp gain',
  phantomPower: 'Phantom power',
  polarity: 'Polarity',
  soloInPlaceExists: 'Solo in place',
  mainBusProcessing: 'Main bus processing',
  removeChannelFromMain: 'Main mix assignment',
  soloBehavior: 'Solo',
};

/** Plain-language names for the parts of a fact that holds several control names. */
const PART_LABELS: Record<string, string> = {
  threshold: 'Threshold',
  range: 'Range',
  ratio: 'Ratio',
  attack: 'Attack',
  hold: 'Hold',
  release: 'Release',
  makeupGain: 'Makeup gain',
};

/** Shown when the console may have a solo-in-place mode, or when the manual does not say. */
const SOLO_CAUTION =
  'Before you press solo, make sure the console is not in a solo-in-place mode (some consoles show an "SIP" indicator): in that mode, solo mutes everything else in the room.';

/** Shown only when the profile has a verified fact that the console has no solo-in-place mode. */
const SOLO_NO_CAUTION_NEEDED = 'This console has no solo-in-place mode, so solo does not change what the room hears.';

export interface ResolvedText {
  text: string;
  controls: ResolvedControl[];
  /** True when the text depends on a console setting the app cannot confirm (for example the solo mode). */
  needsConsoleCheck: boolean;
}

const TOKEN_PATTERN = /\{([a-zA-Z]+)(?::([a-zA-Z0-9.]+))?\}/g;

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function isFactKey(profile: ConsoleProfile, value: string): value is ConsoleFactKey {
  return Object.prototype.hasOwnProperty.call(profile.facts, value);
}

function joinNames(names: string[]): string {
  if (names.length === 1) {
    return names[0];
  }
  const allButLast = names.slice(0, names.length - 1);
  const last = names[names.length - 1];
  return `${allButLast.join(', ')} and ${last}`;
}

function memberNamesForRole(context: TroubleshootContext, role: Role): string {
  const names: string[] = [];
  for (const member of context.band) {
    const playsRole = member.roles.some((memberRole) => memberRole.role === role);
    if (playsRole && !names.includes(member.name)) {
      names.push(member.name);
    }
  }
  if (names.length === 0) {
    return ROLE_WORDS[role];
  }
  return joinNames(names);
}

function firstChannelForRole(plan: MixPlan, role: Role): ChannelPlan | null {
  const channel = plan.channels.find((entry) => entry.role === role);
  return channel ?? null;
}

function formatSetting(setting: NumericSetting): string {
  return `${setting.value} ${setting.unit}`;
}

function lowCutForRole(context: TroubleshootContext, role: Role): string {
  const channel = firstChannelForRole(context.plan, role);
  if (channel === null || channel.lowCut === null) {
    return 'the value on your console sheet';
  }
  return formatSetting(channel.lowCut);
}

function compReductionForRole(context: TroubleshootContext, role: Role): string {
  const channel = firstChannelForRole(context.plan, role);
  if (channel === null || channel.compressor === null) {
    return '3 to 4 dB';
  }
  return formatSetting(channel.compressor.gainReductionDb);
}

function lowercaseFirstLetter(text: string): string {
  if (text.length === 0) {
    return text;
  }
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function targetPhrase(context: TroubleshootContext): string {
  const target = context.target;
  if (target === null) {
    return 'the channel you suspect';
  }
  if (target.kind === 'group') {
    const dca = context.plan.dcas.find((entry) => entry.id === target.dcaId);
    if (dca === undefined) {
      return 'the group you suspect';
    }
    return `the ${dca.label} group`;
  }
  const channel = context.plan.channels.find((entry) => entry.id === target.channelId);
  if (channel === undefined) {
    return 'the channel you suspect';
  }
  return `the ${lowercaseFirstLetter(channel.roleLabel)} channel (${channel.memberName})`;
}

function targetMemberPhrase(context: TroubleshootContext): string {
  const target = context.target;
  if (target === null || target.kind === 'group') {
    return 'the musician';
  }
  const channel = context.plan.channels.find((entry) => entry.id === target.channelId);
  if (channel === undefined) {
    return 'the musician';
  }
  return channel.memberName;
}

function loudnessTargetPhrase(context: TroubleshootContext): string {
  const target = context.room.loudnessTargetDba;
  if (target === null) {
    return 'the level your church is comfortable with';
  }
  return `${target} dBA at the mixing position`;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}

/**
 * Formats a console fact's value as text. Returns null when the fact has no usable text
 * (for example a value the manual does not give).
 */
export function formatFactValue(value: unknown, part: string | null): string | null {
  if (part !== null) {
    if (!isStringRecord(value)) {
      return null;
    }
    const partValue = value[part];
    return partValue === undefined ? null : partValue;
  }
  if (typeof value === 'string') {
    return value.length > 0 ? value : null;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const texts = value.filter((entry): entry is string => typeof entry === 'string');
    return texts.length > 0 ? texts.join(' ') : null;
  }
  if (isStringRecord(value)) {
    const parts = Object.entries(value).map(([name, text]) => formatNamedPart(name, text));
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return null;
}

/**
 * One part of a fact that holds several control names, as it is listed under a fix.
 * When the console's wording already starts with the plain name ("threshold (1st encoder)"),
 * it is shown as it is. Otherwise the plain name goes in front ("Threshold: THR").
 */
function formatNamedPart(name: string, consoleText: string): string {
  const plainLabel = PART_LABELS[name];
  if (plainLabel === undefined) {
    return consoleText;
  }
  const consoleTextStartsWithLabel = consoleText.toLowerCase().startsWith(plainLabel.toLowerCase());
  if (consoleTextStartsWithLabel) {
    return consoleText;
  }
  return `${plainLabel}: ${consoleText}`;
}

/** True only when the profile has a verified fact that says the console has no solo-in-place mode. */
function soloInPlaceIsRuledOut(profile: ConsoleProfile): boolean {
  const fact = profile.facts.soloInPlaceExists;
  return fact.source.status === 'verified' && fact.value === false;
}

/** Looks one console fact up in the profile. `argument` is "key" or "key.part". */
export function resolveControl(profile: ConsoleProfile, argument: string): ResolvedControl | null {
  const dotIndex = argument.indexOf('.');
  const key = dotIndex === -1 ? argument : argument.slice(0, dotIndex);
  const part = dotIndex === -1 ? null : argument.slice(dotIndex + 1);
  if (!isFactKey(profile, key)) {
    return null;
  }
  const fact: Fact<unknown> = profile.facts[key];
  const text = formatFactValue(fact.value, part);
  if (text === null) {
    return null;
  }
  return {
    key,
    label: FACT_LABELS[key] ?? key,
    text,
    verified: fact.source.status === 'verified',
  };
}

function capitalizeSentenceStarts(text: string): string {
  const withFirstLetter = text.charAt(0).toUpperCase() + text.slice(1);
  return withFirstLetter.replace(/([.?!] )([a-z])/g, (_match, punctuation: string, letter: string) => punctuation + letter.toUpperCase());
}

/** Resolves every token in one piece of tree text. */
export function resolveText(text: string, context: TroubleshootContext): ResolvedText {
  const controls: ResolvedControl[] = [];
  let needsConsoleCheck = false;

  const replaced = text.replace(TOKEN_PATTERN, (token: string, name: string, argument: string | undefined) => {
    if (name === 'console') {
      return context.profile.name;
    }
    if (name === 'target') {
      return targetPhrase(context);
    }
    if (name === 'targetMember') {
      return targetMemberPhrase(context);
    }
    if (name === 'loudnessTarget') {
      return loudnessTargetPhrase(context);
    }
    if (name === 'soloCaution') {
      if (soloInPlaceIsRuledOut(context.profile)) {
        return SOLO_NO_CAUTION_NEEDED;
      }
      needsConsoleCheck = true;
      return SOLO_CAUTION;
    }
    if (argument === undefined) {
      return token;
    }
    if (name === 'control') {
      const control = resolveControl(context.profile, argument);
      if (control === null) {
        return token;
      }
      controls.push(control);
      return control.text;
    }
    if (!isRole(argument)) {
      return token;
    }
    if (name === 'member') {
      return memberNamesForRole(context, argument);
    }
    if (name === 'lowCut') {
      return lowCutForRole(context, argument);
    }
    if (name === 'compReduction') {
      return compReductionForRole(context, argument);
    }
    return token;
  });

  return { text: capitalizeSentenceStarts(replaced), controls, needsConsoleCheck };
}
