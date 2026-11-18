import { ChannelPlan, EffectWish, MixPlan } from '../model';
import { ConsoleProfile } from './console-profile';
import { BusAssignment, ChannelAssignment, FxAssignment, SheetWarning } from './console-sheet';

/** Channel, bus and FX slot allocation. Pure functions over a plan and a profile. */

export function describeChannel(channel: ChannelPlan): string {
  const nameAddsNothing = channel.roleLabel.toLowerCase().startsWith(channel.memberName.toLowerCase());
  if (nameAddsNothing) {
    return channel.roleLabel;
  }
  return `${channel.roleLabel} (${channel.memberName})`;
}

// ---------------------------------------------------------------------------
// Input channels
// ---------------------------------------------------------------------------

export function allocateChannels(plan: MixPlan, profile: ConsoleProfile): ChannelAssignment[] {
  const stereoNeedsLinkedPair = profile.facts.stereoChannels.value === 'linkAdjacentPair';
  const assignments: ChannelAssignment[] = [];
  let nextChannel = 1;

  for (const channel of plan.channels) {
    const label = describeChannel(channel);
    const needsPair = channel.stereo && stereoNeedsLinkedPair;

    if (!needsPair) {
      assignments.push({ channelId: channel.id, consoleChannels: [nextChannel], label, stereo: channel.stereo });
      nextChannel = nextChannel + 1;
      continue;
    }

    // A linked pair starts on an odd channel. Skip one channel if we are on an even one.
    const isEven = nextChannel % 2 === 0;
    if (isEven) {
      nextChannel = nextChannel + 1;
    }
    assignments.push({ channelId: channel.id, consoleChannels: [nextChannel, nextChannel + 1], label, stereo: true });
    nextChannel = nextChannel + 2;
  }
  return assignments;
}

export function countChannelsUsed(assignments: ChannelAssignment[]): number {
  let highest = 0;
  for (const assignment of assignments) {
    for (const consoleChannel of assignment.consoleChannels) {
      if (consoleChannel > highest) {
        highest = consoleChannel;
      }
    }
  }
  return highest;
}

// ---------------------------------------------------------------------------
// Buses and FX slots
// ---------------------------------------------------------------------------

export interface Allocation {
  busMap: BusAssignment[];
  fxMap: FxAssignment[];
  warnings: SheetWarning[];
  /** True when the subwoofer is fed from a main bus (for example a mono bus) and needs no mix bus. */
  subUsesMainBus: string | null;
}

class BusPool {
  private readonly taken = new Set<number>();

  constructor(private readonly busCount: number) {}

  isFree(bus: number): boolean {
    return bus >= 1 && bus <= this.busCount && !this.taken.has(bus);
  }

  take(buses: number[]): void {
    for (const bus of buses) {
      this.taken.add(bus);
    }
  }

  /** The lowest free bus, or null. */
  findSingle(): number | null {
    for (let bus = 1; bus <= this.busCount; bus = bus + 1) {
      if (this.isFree(bus)) {
        return bus;
      }
    }
    return null;
  }

  /** The lowest free odd/even pair (1+2, 3+4, ...), or null. */
  findLinkablePair(): number[] | null {
    for (let bus = 1; bus < this.busCount; bus = bus + 2) {
      if (this.isFree(bus) && this.isFree(bus + 1)) {
        return [bus, bus + 1];
      }
    }
    return null;
  }
}

function isReverbOrDelay(wish: EffectWish): boolean {
  return wish.family !== 'deEsser';
}

/**
 * Allocates buses in priority order: monitor mixes, send effects, stream mix, subwoofer,
 * then group buses from the wish list until the console runs out.
 * Every wish that is dropped becomes a warning.
 */
export function allocateBusesAndFx(plan: MixPlan, profile: ConsoleProfile): Allocation {
  const facts = profile.facts;
  const busesAreStereo = facts.stereoBuses.value === 'native';
  const pool = new BusPool(facts.mixBusCount.value);
  const busMap: BusAssignment[] = [];
  const fxMap: FxAssignment[] = [];
  const warnings: SheetWarning[] = [];
  const usedSlots = new Set<number>();

  // 1. Monitor mixes.
  for (const mix of plan.monitorMixes) {
    const bus = pool.findSingle();
    if (bus === null) {
      warnings.push({ kind: 'droppedWish', message: `No bus left for ${mix.label}. This console cannot serve that many monitor mixes.` });
      continue;
    }
    pool.take([bus]);
    busMap.push({ busNumbers: [bus], purpose: 'monitor', label: mix.label, planId: mix.id });
  }

  // 2. Send effects, in priority order.
  const sendSlots = facts.fxSendCapableSlots.value;
  const reverbDelaySlots = facts.fxReverbDelaySlots.value;
  const defaultFeedBuses = facts.fxDefaultFeedBuses.value;
  const sortedSendWishes = [...plan.sendEffects].sort((a, b) => a.priority - b.priority);

  for (const wish of sortedSendWishes) {
    const effectName = profile.effectChoice[wish.family];
    const slot = sendSlots.find((candidate) => {
      const free = !usedSlots.has(candidate);
      const acceptsEffect = !isReverbOrDelay(wish) || reverbDelaySlots.includes(candidate);
      return free && acceptsEffect;
    });
    if (slot === undefined) {
      warnings.push({ kind: 'droppedWish', message: `No FX slot left for ${wish.label}. It is left out; the higher-priority effects are kept.` });
      continue;
    }

    let bus: number | null = null;
    if (defaultFeedBuses !== null) {
      // This console wires fixed buses to its send-capable slots.
      const slotIndex = sendSlots.indexOf(slot);
      const feedBus = defaultFeedBuses[slotIndex];
      if (feedBus !== undefined && pool.isFree(feedBus)) {
        bus = feedBus;
      }
    } else {
      bus = pool.findSingle();
    }
    if (bus === null) {
      warnings.push({ kind: 'droppedWish', message: `No bus left to feed ${wish.label}. It is left out because monitor mixes come first.` });
      continue;
    }

    pool.take([bus]);
    usedSlots.add(slot);
    busMap.push({ busNumbers: [bus], purpose: 'sendEffect', label: wish.label, planId: wish.id });
    fxMap.push({ slot, effectName, role: 'send', label: wish.label, planId: wish.id });
  }

  // 3. Stream mix: a stereo, post-fader bus.
  if (plan.stream.enabled) {
    const streamBuses = busesAreStereo ? wrapSingle(pool.findSingle()) : pool.findLinkablePair();
    if (streamBuses === null) {
      warnings.push({ kind: 'droppedWish', message: 'No bus left for a separate stream mix. Feed the stream from the main mix instead.' });
    } else {
      pool.take(streamBuses);
      busMap.push({ busNumbers: streamBuses, purpose: 'stream', label: 'Stream mix', planId: 'stream' });
    }
  }

  // 4. Subwoofer on its own feed.
  let subUsesMainBus: string | null = null;
  if (plan.subwoofer.feed === 'ownBus') {
    const monoMain = facts.mainBuses.value.find((name) => name.toLowerCase().includes('mono'));
    if (monoMain !== undefined) {
      subUsesMainBus = monoMain;
    } else {
      const bus = pool.findSingle();
      if (bus === null) {
        warnings.push({ kind: 'droppedWish', message: 'No bus left for the subwoofer feed. Feed the sub from the main mix through its crossover instead.' });
      } else {
        pool.take([bus]);
        busMap.push({ busNumbers: [bus], purpose: 'subwoofer', label: 'Subwoofer', planId: 'subwoofer' });
      }
    }
  }

  // 5. Group buses, from the wish list, until the console runs out.
  const sortedGroupWishes = [...plan.groupBuses].sort((a, b) => a.priority - b.priority);
  for (const wish of sortedGroupWishes) {
    let buses: number[] | null;
    if (busesAreStereo) {
      buses = wrapSingle(pool.findSingle());
    } else if (wish.monoIsAcceptable) {
      // On a console with mono buses a stereo group costs two, so groups that work in mono use one.
      buses = wrapSingle(pool.findSingle());
    } else {
      buses = pool.findLinkablePair();
    }

    if (buses === null) {
      warnings.push({ kind: 'droppedWish', message: `No bus left for the ${wish.label} group. Use the DCA alone for those channels.` });
      continue;
    }
    pool.take(buses);
    busMap.push({ busNumbers: buses, purpose: 'group', label: `${wish.label} group`, planId: wish.id });
  }

  // 6. Insert effects: the de-esser first, then the main bus limiter.
  const insertWishes: { planId: string; label: string; effectName: string }[] = plan.insertEffects.map((wish) => ({
    planId: wish.id,
    label: wish.label,
    effectName: profile.effectChoice[wish.family],
  }));
  const limiterName = facts.limiterEffects.value[0];
  if (limiterName !== undefined) {
    insertWishes.push({ planId: 'mainLimiter', label: 'Main bus limiter', effectName: limiterName });
  }

  for (const wish of insertWishes) {
    const slot = findInsertSlot(profile, usedSlots);
    if (slot === null) {
      warnings.push({ kind: 'droppedWish', message: `No FX slot left for: ${wish.label}. It is left out.` });
      continue;
    }
    usedSlots.add(slot);
    fxMap.push({ slot, effectName: wish.effectName, role: 'insert', label: wish.label, planId: wish.planId });
  }

  return { busMap, fxMap, warnings, subUsesMainBus };
}

function wrapSingle(bus: number | null): number[] | null {
  if (bus === null) {
    return null;
  }
  return [bus];
}

/** Insert effects go into insert-only slots first, then into slots that cannot host reverbs, then anywhere free. */
function findInsertSlot(profile: ConsoleProfile, usedSlots: Set<number>): number | null {
  const facts = profile.facts;
  const allSlots: number[] = [];
  for (let slot = 1; slot <= facts.fxSlotCount.value; slot = slot + 1) {
    allSlots.push(slot);
  }
  const free = allSlots.filter((slot) => !usedSlots.has(slot));

  const insertOnly = free.find((slot) => facts.fxInsertOnlySlots.value.includes(slot));
  if (insertOnly !== undefined) {
    return insertOnly;
  }
  const notReverbCapable = free.find((slot) => !facts.fxReverbDelaySlots.value.includes(slot));
  if (notReverbCapable !== undefined) {
    return notReverbCapable;
  }
  return free.length > 0 ? free[0] : null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Plain-language reasons this plan cannot be set up on this console. Empty when it fits. */
export function validateForConsole(plan: MixPlan, profile: ConsoleProfile): string[] {
  const errors: string[] = [];
  const facts = profile.facts;

  const channelsUsed = countChannelsUsed(allocateChannels(plan, profile));
  const channelsAvailable = facts.inputChannelCount.value;
  if (channelsUsed > channelsAvailable) {
    const stereoNote = facts.stereoChannels.value === 'linkAdjacentPair' ? ' Each stereo source uses two channels on this console.' : '';
    errors.push(`This band needs ${channelsUsed} input channels, and the ${profile.name} has ${channelsAvailable}.${stereoNote} Remove a source or combine some.`);
  }

  if (plan.monitorMixes.length > facts.mixBusCount.value) {
    errors.push(`${plan.monitorMixes.length} monitor mixes are set up, and the ${profile.name} has ${facts.mixBusCount.value} mix buses. Reduce the number of monitor mixes.`);
  }

  const dcasNeeded = plan.dcas.filter((dca) => dca.holdsFxReturns || dca.memberChannelIds.length > 0).length;
  if (dcasNeeded > facts.dcaCount.value) {
    errors.push(`The plan uses ${dcasNeeded} DCAs, and the ${profile.name} has ${facts.dcaCount.value}.`);
  }

  if (plan.muteGroups.length > facts.muteGroupCount.value) {
    errors.push(`The plan uses ${plan.muteGroups.length} mute groups, and the ${profile.name} has ${facts.muteGroupCount.value}.`);
  }

  return errors;
}
