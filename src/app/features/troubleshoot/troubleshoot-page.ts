import { afterNextRender, Component, computed, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { SYMPTOM_GROUPS, TROUBLESHOOTING_TREES } from '../../core/knowledge/troubleshooting';
import { StepSafety, SymptomGroup, TroubleshootingTree } from '../../core/knowledge/troubleshooting/types';
import {
  listTargetOptions,
  ResolvedAskForHelp,
  ResolvedCheck,
  ResolvedFix,
  ResolvedTree,
  resolveTree,
  TargetOption,
  TroubleshootContext,
  TroubleshootSituation,
  WalkAnswer,
  WalkState,
  walkTree,
} from '../../core/troubleshooter';
import { MixStore } from '../../state/mix-store';

interface SymptomButtonGroup {
  group: SymptomGroup;
  trees: TroubleshootingTree[];
}

/**
 * The troubleshooter screen. It reads the store's signals and calls the pure resolver.
 * All the knowledge lives in the trees; this component only shows one step at a time.
 *
 * The walk is not stored as "current node". It is stored as the list of answers, and the current
 * step is recomputed from the resolved tree. So when the situation, band or console changes,
 * the walk follows the new tree without any extra code.
 */
@Component({
  selector: 'app-troubleshoot-page',
  templateUrl: './troubleshoot-page.html',
  styleUrl: './troubleshoot-page.scss',
})
export class TroubleshootPage {
  private readonly store = inject(MixStore);
  private readonly injector = inject(Injector);

  /** The heading of the step on screen. Focus moves here after every answer. */
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly pickerHeading = viewChild<ElementRef<HTMLElement>>('pickerHeading');

  readonly situation = this.store.situation;
  readonly consoleName = computed(() => this.store.consoleProfile().name);

  /** Every symptom, grouped under the picker's headings. Static: the trees never change at runtime. */
  readonly symptomGroups: SymptomButtonGroup[] = SYMPTOM_GROUPS.map((group) => ({
    group,
    trees: TROUBLESHOOTING_TREES.filter((tree) => tree.group === group.id),
  }));

  readonly selectedTreeId = signal<string | null>(null);
  readonly answers = signal<WalkAnswer[]>([]);
  readonly selectedTargetId = signal<string | null>(null);

  readonly selectedTree = computed<TroubleshootingTree | null>(() => {
    const treeId = this.selectedTreeId();
    if (treeId === null) {
      return null;
    }
    const tree = TROUBLESHOOTING_TREES.find((entry) => entry.id === treeId);
    return tree ?? null;
  });

  /** The channels or groups the mixer may point at for the selected symptom. Empty when the tree has no picker. */
  readonly targetOptions = computed<TargetOption[]>(() => {
    const tree = this.selectedTree();
    if (tree === null) {
      return [];
    }
    return listTargetOptions(tree.targetPicker, this.store.mixPlan());
  });

  readonly selectedTarget = computed<TargetOption | null>(() => {
    const targetId = this.selectedTargetId();
    const option = this.targetOptions().find((entry) => entry.id === targetId);
    return option ?? null;
  });

  readonly resolvedTree = computed<ResolvedTree | null>(() => {
    const tree = this.selectedTree();
    if (tree === null) {
      return null;
    }
    const target = this.selectedTarget();
    const context: TroubleshootContext = {
      band: this.store.band(),
      room: this.store.room(),
      serviceSetup: this.store.serviceSetup(),
      plan: this.store.mixPlan(),
      profile: this.store.consoleProfile(),
      situation: this.situation(),
      target: target === null ? null : target.target,
    };
    return resolveTree(tree, context);
  });

  readonly walk = computed<WalkState | null>(() => {
    const tree = this.resolvedTree();
    if (tree === null) {
      return null;
    }
    return walkTree(tree, this.answers());
  });

  // The step on screen, by kind. Exactly one of these three is not null while a symptom is selected.
  readonly currentCheck = computed<ResolvedCheck | null>(() => {
    const current = this.walk()?.current;
    if (current === undefined || current.kind !== 'check') {
      return null;
    }
    return current;
  });

  readonly currentFix = computed<ResolvedFix | null>(() => {
    const current = this.walk()?.current;
    if (current === undefined || current.kind !== 'fix') {
      return null;
    }
    return current;
  });

  readonly currentHelp = computed<ResolvedAskForHelp | null>(() => {
    const current = this.walk()?.current;
    if (current === undefined || current.kind !== 'askForHelp') {
      return null;
    }
    return current;
  });

  setSituation(situation: TroubleshootSituation): void {
    if (situation === this.situation()) {
      return;
    }
    this.store.setSituation(situation);
    // The steps differ between rehearsal and service, so the answers given so far no longer apply.
    this.answers.set([]);
  }

  selectSymptom(treeId: string): void {
    this.selectedTreeId.set(treeId);
    this.selectedTargetId.set(null);
    this.answers.set([]);
    this.focusStepHeading();
  }

  toggleTarget(optionId: string): void {
    const alreadySelected = this.selectedTargetId() === optionId;
    this.selectedTargetId.set(alreadySelected ? null : optionId);
  }

  answer(answer: WalkAnswer): void {
    this.answers.update((current) => [...current, answer]);
    this.focusStepHeading();
  }

  /** One question back. From the first question, back to the list of symptoms. */
  back(): void {
    const current = this.answers();
    if (current.length === 0) {
      this.changeSymptom();
      return;
    }
    this.answers.set(current.slice(0, current.length - 1));
    this.focusStepHeading();
  }

  /** Back to the first question of the same symptom. */
  restart(): void {
    this.answers.set([]);
    this.focusStepHeading();
  }

  changeSymptom(): void {
    this.selectedTreeId.set(null);
    this.selectedTargetId.set(null);
    this.answers.set([]);
    afterNextRender(
      () => {
        this.pickerHeading()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  safetyLabel(safety: StepSafety): string {
    if (safety === 'rehearsalOnly') {
      return 'Rehearsal only';
    }
    return 'Safe during a service';
  }

  answerLabel(answer: WalkAnswer): string {
    return answer === 'yes' ? 'Yes' : 'No';
  }

  /** Moves keyboard and screen-reader focus to the new step once it is on screen. */
  private focusStepHeading(): void {
    afterNextRender(
      () => {
        this.stepHeading()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }
}
