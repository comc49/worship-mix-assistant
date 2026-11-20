import { Component, computed, inject, signal } from '@angular/core';
import { ConsoleProfile } from '../../core/consoles';
import { KNOB_GUIDE, KnobConsoleName, KnobEntry, KnobGroup } from '../../core/knowledge/knob-guide';
import { MixStore } from '../../state/mix-store';

interface KnobEntryView {
  entry: KnobEntry;
  /** What the selected console calls this control, when its profile has a name for it. */
  consoleName: string | null;
  /** True when that name could not be confirmed in the console's manual. */
  checkOnConsole: boolean;
}

interface KnobGroupView {
  group: KnobGroup;
  entries: KnobEntryView[];
}

interface ConsoleNameLookup {
  name: string;
  verified: boolean;
}

/** Finds the selected console's name for a control in its profile. */
function lookUpConsoleName(profile: ConsoleProfile, key: KnobConsoleName): ConsoleNameLookup {
  const facts = profile.facts;
  const gate = facts.gateParamNames;
  const comp = facts.compParamNames;
  const gateVerified = gate.source.status === 'verified';
  const compVerified = comp.source.status === 'verified';

  switch (key) {
    case 'preampGain':
      return { name: facts.preampGain.value, verified: facts.preampGain.source.status === 'verified' };
    case 'phantomPower':
      return { name: facts.phantomPower.value, verified: facts.phantomPower.source.status === 'verified' };
    case 'polarity':
      return { name: facts.polarity.value, verified: facts.polarity.source.status === 'verified' };
    case 'lowCut':
      return { name: `${facts.lowCutName.value} (${facts.lowCutScreen.value})`, verified: facts.lowCutName.source.status === 'verified' };
    case 'gateThreshold':
      return { name: gate.value.threshold, verified: gateVerified };
    case 'gateRange':
      return { name: gate.value.range, verified: gateVerified };
    case 'gateAttack':
      return { name: gate.value.attack, verified: gateVerified };
    case 'gateHold':
      return { name: gate.value.hold, verified: gateVerified };
    case 'gateRelease':
      return { name: gate.value.release, verified: gateVerified };
    case 'compThreshold':
      return { name: comp.value.threshold, verified: compVerified };
    case 'compRatio':
      return { name: comp.value.ratio, verified: compVerified };
    case 'compAttack':
      return { name: comp.value.attack, verified: compVerified };
    case 'compRelease':
      return { name: comp.value.release, verified: compVerified };
    case 'compMakeupGain':
      return { name: comp.value.makeupGain, verified: compVerified };
  }
}

const GRID_COLUMNS = 4;

/**
 * How many tiles of a group are double width, so the bento grid has no holes:
 * the tiles plus the extra cells of the wide ones must fill whole rows of four.
 */
function countWideTiles(tileCount: number): number {
  for (let wide = 0; wide <= tileCount; wide = wide + 1) {
    const cells = tileCount + wide;
    const fillsWholeRows = cells % GRID_COLUMNS === 0;
    // A single row of four small tiles is too flat to read, so four tiles become a two-by-two.
    const isSingleFlatRow = cells === GRID_COLUMNS;
    if (fillsWholeRows && !isSingleFlatRow) {
      return wide;
    }
  }
  return 0;
}

/**
 * A reminder of what the common knobs do, as a bento grid: one group at a time, every control
 * of the group visible as a tile, and one detail panel for the tile that is selected.
 */
@Component({
  selector: 'app-knobs-page',
  templateUrl: './knobs-page.html',
  styleUrl: './knobs-page.scss',
})
export class KnobsPage {
  private readonly store = inject(MixStore);

  protected readonly consoleName = computed(() => this.store.consoleProfile().name);

  protected readonly groups = computed<KnobGroupView[]>(() => {
    const profile = this.store.consoleProfile();
    return KNOB_GUIDE.map((group) => ({
      group,
      entries: group.entries.map((entry) => this.buildEntryView(entry, profile)),
    }));
  });

  protected readonly selectedGroupId = signal<string>(KNOB_GUIDE[0].id);
  protected readonly selectedEntryId = signal<string>(KNOB_GUIDE[0].entries[0].id);

  protected readonly selectedGroup = computed<KnobGroupView>(() => {
    const groups = this.groups();
    const found = groups.find((view) => view.group.id === this.selectedGroupId());
    return found ?? groups[0];
  });

  /** The first tiles of a group are double width; how many depends on the group's size. */
  protected readonly wideTileCount = computed(() => countWideTiles(this.selectedGroup().entries.length));

  protected readonly selectedEntry = computed<KnobEntryView>(() => {
    const entries = this.selectedGroup().entries;
    const found = entries.find((item) => item.entry.id === this.selectedEntryId());
    return found ?? entries[0];
  });

  protected selectGroup(groupId: string): void {
    const group = KNOB_GUIDE.find((entry) => entry.id === groupId);
    if (group === undefined) {
      return;
    }
    this.selectedGroupId.set(groupId);
    this.selectedEntryId.set(group.entries[0].id);
  }

  protected selectEntry(entryId: string): void {
    this.selectedEntryId.set(entryId);
  }

  private buildEntryView(entry: KnobEntry, profile: ConsoleProfile): KnobEntryView {
    if (entry.consoleName === null) {
      return { entry, consoleName: null, checkOnConsole: false };
    }
    const lookup = lookUpConsoleName(profile, entry.consoleName);
    return { entry, consoleName: lookup.name, checkOnConsole: !lookup.verified };
  }
}
