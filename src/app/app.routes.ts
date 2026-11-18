import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'setup' },
  { path: 'setup', title: 'Setup', loadComponent: () => import('./features/setup/setup-page').then((m) => m.SetupPage) },
  { path: 'band', title: 'Band', loadComponent: () => import('./features/band/band-page').then((m) => m.BandPage) },
  { path: 'sheet', title: 'Console sheet', loadComponent: () => import('./features/sheet/sheet-page').then((m) => m.SheetPage) },
  { path: 'overview', title: 'Mix overview', loadComponent: () => import('./features/overview/overview-page').then((m) => m.OverviewPage) },
  { path: 'soundcheck', title: 'Soundcheck', loadComponent: () => import('./features/soundcheck/soundcheck-page').then((m) => m.SoundcheckPage) },
  { path: 'troubleshoot', title: 'Fix a problem', loadComponent: () => import('./features/troubleshoot/troubleshoot-page').then((m) => m.TroubleshootPage) },
  { path: 'backup', title: 'Backup', loadComponent: () => import('./features/backup/backup-page').then((m) => m.BackupPage) },
  { path: '**', redirectTo: 'setup' },
];
