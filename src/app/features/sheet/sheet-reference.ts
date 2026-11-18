import { Component, computed, input } from '@angular/core';
import { ChannelReference } from '../../core/consoles';

/**
 * The appendix after the steps: per channel, "if you hear X, try Y", plus notes.
 * Nothing here is a task, so there are no checkboxes.
 */
@Component({
  selector: 'app-sheet-reference',
  templateUrl: './sheet-reference.html',
  styleUrl: './sheet-reference.scss',
})
export class SheetReference {
  readonly reference = input.required<ChannelReference[]>();

  /** Channels with nothing to say are left out. */
  protected readonly channelsWithContent = computed<ChannelReference[]>(() => {
    return this.reference().filter((channel) => {
      const entryCount = channel.ifYouHear.length + channel.mixerNotes.length + channel.coachingNotes.length;
      return entryCount > 0;
    });
  });
}
