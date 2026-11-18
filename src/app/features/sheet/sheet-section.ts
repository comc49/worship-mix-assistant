import { Component, computed, input, output } from '@angular/core';
import { SheetSection, SheetStep } from '../../core/consoles';
import { SheetStepRow } from './sheet-step';

/** The steps that share one subject (a channel, a DCA, an effect), shown under one heading. */
interface SubjectGroup {
  subject: string;
  steps: SheetStep[];
}

/** One section of the console sheet: title, intro, progress and its steps grouped by subject. */
@Component({
  selector: 'app-sheet-section',
  imports: [SheetStepRow],
  templateUrl: './sheet-section.html',
  styleUrl: './sheet-section.scss',
})
export class SheetSectionCard {
  readonly section = input.required<SheetSection>();
  readonly checkedStepIds = input.required<ReadonlySet<string>>();
  readonly stepToggled = output<string>();

  /** Each subject appears once, in the order its first step appears in the section. */
  protected readonly subjectGroups = computed<SubjectGroup[]>(() => {
    const groups: SubjectGroup[] = [];
    const groupBySubject = new Map<string, SubjectGroup>();

    for (const step of this.section().steps) {
      const existingGroup = groupBySubject.get(step.subject);
      if (existingGroup !== undefined) {
        existingGroup.steps.push(step);
        continue;
      }
      const newGroup: SubjectGroup = { subject: step.subject, steps: [step] };
      groupBySubject.set(step.subject, newGroup);
      groups.push(newGroup);
    }

    return groups;
  });

  protected readonly totalCount = computed(() => this.section().steps.length);

  protected readonly doneCount = computed(() => {
    const checked = this.checkedStepIds();
    const doneSteps = this.section().steps.filter((step) => checked.has(step.id));
    return doneSteps.length;
  });

  protected readonly headingId = computed(() => `sheet-section-${this.section().id}`);

  protected onStepToggled(stepId: string): void {
    this.stepToggled.emit(stepId);
  }
}
