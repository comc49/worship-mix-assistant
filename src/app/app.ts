import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MixStore } from './state/mix-store';

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
    { path: '/backup', label: 'Backup' },
  ];

  protected readonly contextLine = computed(() => {
    const room = this.store.room();
    const consoleName = this.store.consoleProfile().name;
    return `${room.name} · ${consoleName}`;
  });

  protected dismissStorageNotice(): void {
    this.store.dismissStorageNotice();
  }
}
