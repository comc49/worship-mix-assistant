import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BusPurpose, ConsoleId, FxAssignment, SheetWarning, WarningKind } from '../../core/consoles';
import { MixStore } from '../../state/mix-store';
import { SheetReference } from './sheet-reference';
import { SheetSectionCard } from './sheet-section';

interface ConsoleOption {
  id: ConsoleId;
  label: string;
}

/** The warnings of one kind, under one plain-language heading. */
interface WarningGroup {
  kind: WarningKind;
  label: string;
  messages: string[];
}

const CONSOLE_OPTIONS: ConsoleOption[] = [
  { id: 'x32', label: 'X32' },
  { id: 'wingCompact', label: 'WING Compact' },
];

/** The order the warning groups appear in, most important first. */
const WARNING_KIND_ORDER: WarningKind[] = ['droppedWish', 'clamp', 'adaptation', 'plan', 'unverified'];

const WARNING_KIND_LABELS: Record<WarningKind, string> = {
  droppedWish: 'Left out on this console',
  clamp: 'Adjusted to fit this console',
  adaptation: 'Adapted for this console',
  plan: 'Held at a musical limit',
  unverified: 'Check on your console',
};

const BUS_PURPOSE_LABELS: Record<BusPurpose, string> = {
  monitor: 'Monitor mix',
  sendEffect: 'Effect send',
  group: 'Group',
  stream: 'Livestream',
  subwoofer: 'Subwoofer',
};

const FX_ROLE_LABELS: Record<FxAssignment['role'], string> = {
  send: 'Shared effect',
  insert: 'On one channel or bus',
};

/** The console sheet: the mix plan as ordered, tickable steps in the selected console's own names. */
@Component({
  selector: 'app-sheet-page',
  imports: [RouterLink, SheetSectionCard, SheetReference],
  templateUrl: './sheet-page.html',
  styleUrl: './sheet-page.scss',
})
export class SheetPage {
  protected readonly store = inject(MixStore);

  protected readonly consoleOptions = CONSOLE_OPTIONS;

  protected readonly hasBand = computed(() => this.store.band().length > 0);

  /** The adapter's reasons the band does not fit this console. Empty when a sheet was produced. */
  protected readonly errors = computed<string[]>(() => {
    const result = this.store.sheetResult();
    if (result.ok) {
      return [];
    }
    return result.errors;
  });

  protected readonly warningGroups = computed<WarningGroup[]>(() => {
    const sheet = this.store.sheet();
    if (sheet === null) {
      return [];
    }
    return groupWarningsByKind(sheet.warnings);
  });

  /** A Set, so each step can look up its own checked state quickly. */
  protected readonly checkedStepIds = computed<ReadonlySet<string>>(() => new Set(this.store.checkedStepIds()));

  protected readonly totalStepCount = computed(() => {
    const sheet = this.store.sheet();
    if (sheet === null) {
      return 0;
    }
    let total = 0;
    for (const section of sheet.sections) {
      total += section.steps.length;
    }
    return total;
  });

  /** Counts only checked ids that are on the current sheet: an id saved for a step that no longer exists is ignored. */
  protected readonly doneStepCount = computed(() => {
    const sheet = this.store.sheet();
    if (sheet === null) {
      return 0;
    }
    const checked = this.checkedStepIds();
    let done = 0;
    for (const section of sheet.sections) {
      for (const step of section.steps) {
        if (checked.has(step.id)) {
          done += 1;
        }
      }
    }
    return done;
  });

  protected readonly isServiceSituation = computed(() => this.store.situation() === 'service');

  protected selectConsole(consoleId: ConsoleId): void {
    this.store.selectConsole(consoleId);
  }

  protected toggleStep(stepId: string): void {
    this.store.toggleStep(stepId);
  }

  protected clearCheckmarks(): void {
    const confirmed = window.confirm('Clear every checkmark on this console sheet?');
    if (!confirmed) {
      return;
    }
    this.store.clearProgress();
  }

  protected print(): void {
    window.print();
  }

  protected busNumbersText(busNumbers: number[]): string {
    return busNumbers.join(' + ');
  }

  protected busPurposeLabel(purpose: BusPurpose): string {
    return BUS_PURPOSE_LABELS[purpose];
  }

  protected fxRoleLabel(role: FxAssignment['role']): string {
    return FX_ROLE_LABELS[role];
  }
}

function groupWarningsByKind(warnings: SheetWarning[]): WarningGroup[] {
  const groups: WarningGroup[] = [];

  for (const kind of WARNING_KIND_ORDER) {
    const messages = warnings.filter((warning) => warning.kind === kind).map((warning) => warning.message);
    if (messages.length === 0) {
      continue;
    }
    groups.push({ kind, label: WARNING_KIND_LABELS[kind], messages });
  }

  return groups;
}
