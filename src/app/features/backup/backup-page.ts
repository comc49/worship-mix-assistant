import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MixStore } from '../../state/mix-store';

/** Backup and restore as one JSON file, plus the install hint and a full reset. */
@Component({
  selector: 'app-backup-page',
  imports: [DatePipe],
  templateUrl: './backup-page.html',
})
export class BackupPage {
  protected readonly store = inject(MixStore);

  protected readonly exportWarningShown = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly resetConfirmShown = signal(false);

  protected readonly lastBackup = computed(() => this.store.lastBackupIso());

  protected showExportWarning(): void {
    this.exportWarningShown.set(true);
  }

  protected cancelExport(): void {
    this.exportWarningShown.set(false);
  }

  protected confirmExport(): void {
    const json = this.store.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);

    const link = document.createElement('a');
    link.href = url;
    link.download = `worship-mix-backup-${today}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    this.exportWarningShown.set(false);
    this.errorMessage.set(null);
    this.message.set('Backup file saved. Keep it somewhere private.');
  }

  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file === undefined) {
      return;
    }
    const text = await file.text();
    const error = this.store.importBackup(text);
    input.value = '';

    if (error !== null) {
      this.message.set(null);
      this.errorMessage.set(error);
      return;
    }
    this.errorMessage.set(null);
    this.message.set('Backup restored. Everything from the file is now on this device.');
  }

  protected askReset(): void {
    this.resetConfirmShown.set(true);
  }

  protected cancelReset(): void {
    this.resetConfirmShown.set(false);
  }

  protected confirmReset(): void {
    this.store.resetEverything();
    this.resetConfirmShown.set(false);
    this.errorMessage.set(null);
    this.message.set('Everything on this device was erased and the defaults were restored.');
  }
}
