import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MixStore } from './state/mix-store';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const BACKUP_REMINDER_DAYS = 30;

function isAppleTouchDevice(): boolean {
  const userAgent = navigator.userAgent;
  const isIphoneOrIpad = /iPad|iPhone|iPod/.test(userAgent);
  // An iPad in desktop mode reports itself as a Mac with a touch screen.
  const isIpadInDesktopMode = userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1;
  return isIphoneOrIpad || isIpadInDesktopMode;
}

function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

interface NavItem {
  path: string;
  label: string;
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(MixStore);

  protected readonly navItems: NavItem[] = [
    { path: '/setup', label: 'Setup' },
    { path: '/band', label: 'Band' },
    { path: '/sheet', label: 'Sheet' },
    { path: '/overview', label: 'Overview' },
    { path: '/soundcheck', label: 'Soundcheck' },
    { path: '/troubleshoot', label: 'Fix a problem' },
    { path: '/knobs', label: 'Knobs' },
    { path: '/lab', label: 'Sound lab' },
    { path: '/backup', label: 'Backup' },
  ];

  protected readonly contextLine = computed(() => {
    const room = this.store.room();
    const consoleName = this.store.consoleProfile().name;
    return `${room.name} · ${consoleName}`;
  });

  /** True on an iPhone or iPad browser tab that is not yet installed to the home screen. */
  protected readonly showInstallPrompt = computed(() => {
    if (this.store.installPromptDismissed()) {
      return false;
    }
    return isAppleTouchDevice() && !isInstalled();
  });

  /** True when there is a band worth protecting and no backup in the last 30 days. */
  protected readonly showBackupReminder = computed(() => {
    if (this.store.band().length === 0) {
      return false;
    }
    const lastBackupIso = this.store.lastBackupIso();
    if (lastBackupIso === null) {
      return false;
    }
    const daysSince = (Date.now() - new Date(lastBackupIso).getTime()) / MILLISECONDS_PER_DAY;
    return daysSince > BACKUP_REMINDER_DAYS;
  });

  protected dismissStorageNotice(): void {
    this.store.dismissStorageNotice();
  }

  protected dismissInstallPrompt(): void {
    this.store.dismissInstallPrompt();
  }
}
