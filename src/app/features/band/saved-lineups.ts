import { Component, computed, inject, output, signal } from '@angular/core';
import { MixStore } from '../../state/mix-store';

/**
 * Saved lineups: load one as this service's band, delete one, or save the current band as a new one.
 * Loading replaces the whole band, so a regular lineup plus one swapped member takes a few taps.
 */
@Component({
  selector: 'app-saved-lineups',
  templateUrl: './saved-lineups.html',
  styleUrl: './saved-lineups.scss',
})
export class SavedLineups {
  protected readonly store = inject(MixStore);

  /** Tells the page that the band was replaced, so it can close an open member form. */
  readonly lineupLoaded = output<void>();

  protected readonly newName = signal('');

  protected readonly bandIsEmpty = computed(() => this.store.band().length === 0);

  protected readonly canSave = computed(() => {
    const hasName = this.newName().trim() !== '';
    return hasName && !this.bandIsEmpty();
  });

  protected onNameInput(event: Event): void {
    this.newName.set((event.target as HTMLInputElement).value);
  }

  protected load(templateId: string): void {
    this.store.loadTemplate(templateId);
    this.lineupLoaded.emit();
  }

  protected remove(templateId: string): void {
    this.store.deleteTemplate(templateId);
  }

  protected save(event: Event): void {
    event.preventDefault();
    if (!this.canSave()) {
      return;
    }
    this.store.saveBandAsTemplate(this.newName().trim());
    this.newName.set('');
  }
}
