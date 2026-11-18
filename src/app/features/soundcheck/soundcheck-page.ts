import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MixStore } from '../../state/mix-store';

/** The soundcheck order for this band, as big steps readable from a step back. */
@Component({
  selector: 'app-soundcheck-page',
  imports: [RouterLink],
  templateUrl: './soundcheck-page.html',
  styleUrl: './soundcheck-page.scss',
})
export class SoundcheckPage {
  protected readonly store = inject(MixStore);

  protected readonly hasBand = computed(() => this.store.band().length > 0);

  protected namesText(names: string[]): string {
    return names.join(', ');
  }
}
