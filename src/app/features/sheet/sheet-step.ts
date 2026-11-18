import { Component, computed, input, output } from '@angular/core';
import { SheetStep } from '../../core/consoles';
import { ValueDetail } from '../../shared/value-detail';

/** One step of the console sheet: a checkbox, the instruction, the value to set and its badges. */
@Component({
  selector: 'app-sheet-step',
  imports: [ValueDetail],
  templateUrl: './sheet-step.html',
  styleUrl: './sheet-step.scss',
})
export class SheetStepRow {
  readonly step = input.required<SheetStep>();
  readonly checked = input(false);
  /** Emits the step id when the mixer ticks or unticks the checkbox. */
  readonly toggled = output<string>();

  protected readonly isRehearsalOnly = computed(() => this.step().safety === 'rehearsalOnly');

  /**
   * A step without a value can still have a reason or a "check on your console"
   * note. Those get a small "Why?" button in place of the value button.
   */
  protected readonly hasDetailWithoutValue = computed(() => {
    const step = this.step();
    if (step.value !== null) {
      return false;
    }
    return step.detail !== null || step.checkOnConsole !== null;
  });

  protected onCheckboxChange(): void {
    this.toggled.emit(this.step().id);
  }
}
