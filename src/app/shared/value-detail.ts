import { Component, input, signal } from '@angular/core';
import { DetailContent } from './detail-content';

/** Gives every panel on the page its own id, so each button can point at its panel. */
let nextPanelNumber = 1;

/**
 * A value shown as a button. Tapping it opens a panel right below with the
 * usable range, the reason, what to listen for and how the value was reached.
 *
 * The panel is inline (not a modal) so it prints and so the mixer keeps their
 * place on the sheet. It stays in the DOM while closed, hidden with the
 * `hidden` attribute, so a print stylesheet can choose to show it.
 */
@Component({
  selector: 'app-value-detail',
  templateUrl: './value-detail.html',
  styleUrl: './value-detail.scss',
})
export class ValueDetail {
  /** The text on the button: the value itself, or a word like "Why?" for steps without a value. */
  readonly buttonText = input.required<string>();
  /** True shows the button text large, as the one value to set. */
  readonly prominent = input(true);
  /** Read out before the button text by screen readers, for example "Low cut". */
  readonly accessibleLabel = input('');
  readonly detail = input<DetailContent | null>(null);
  /** An extra note shown first in the panel, used for "check on your console". */
  readonly note = input<string | null>(null);

  protected readonly isOpen = signal(false);
  protected readonly panelId = `value-detail-panel-${nextPanelNumber++}`;

  protected toggle(): void {
    this.isOpen.update((open) => !open);
  }

  protected ariaLabel(): string | null {
    const label = this.accessibleLabel();
    if (label === '') {
      return null;
    }
    return `${label}: ${this.buttonText()}. Show the details.`;
  }
}
