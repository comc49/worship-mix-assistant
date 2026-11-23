import { TestBed } from '@angular/core/testing';
import { MixStore } from './mix-store';
import { StorageService } from './storage.service';
import { CURRENT_SCHEMA_VERSION } from './stored-state';

describe('StorageService and MixStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('starts with an empty band, the default rooms and the example lineup', () => {
    const store = TestBed.inject(MixStore);
    expect(store.band()).toEqual([]);
    expect(store.rooms().length).toBe(2);
    expect(store.templates().length).toBe(1);
  });

  it('exports everything and restores it after storage is cleared', () => {
    const store = TestBed.inject(MixStore);
    const storage = TestBed.inject(StorageService);
    store.loadTemplate('template-example');
    store.saveBandAsTemplate('Sunday');
    store.selectConsole('wingCompact');
    const backup = store.exportBackup();

    store.resetEverything();
    expect(store.band()).toEqual([]);

    const error = store.importBackup(backup);
    expect(error).toBeNull();
    expect(store.band().length).toBe(8);
    expect(store.templates().map((template) => template.name)).toContain('Sunday');
    expect(store.consoleId()).toBe('wingCompact');
    expect(storage.importJson(backup).ok).toBe(true);
  });

  it('rejects files that are not backups, and backups from a newer version', () => {
    const storage = TestBed.inject(StorageService);
    expect(storage.importJson('not json').ok).toBe(false);
    expect(storage.importJson('{"hello": 1}').ok).toBe(false);
    const newer = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, band: [], rooms: [], templates: [] });
    const result = storage.importJson(newer);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('newer version');
    }
  });

  it('rejects a backup whose values have the wrong shape, and keeps the current state', () => {
    const store = TestBed.inject(MixStore);
    const storage = TestBed.inject(StorageService);
    const good = JSON.parse(store.exportBackup()) as Record<string, unknown>;

    const damagedCopies: Record<string, unknown>[] = [
      { ...good, rooms: [] },
      { ...good, band: [null] },
      { ...good, band: [{ id: 'm1', name: 'Player D', roles: [{ role: 'theremin', skill: 'beginner', connection: 'monoDi', vocal: null }] }] },
      { ...good, consoleId: 'someOtherConsole' },
      { ...good, checkedStepIds: 'none' },
      { ...good, serviceSetup: { ...(good['serviceSetup'] as object), monitorMixCount: -1 } },
      { ...good, labLibraryUrl: 42 },
      { ...good, labLibraryUrl: 'javascript:alert(1)' },
    ];
    for (const damaged of damagedCopies) {
      const result = storage.importJson(JSON.stringify(damaged));
      expect(result.ok, JSON.stringify(damaged).slice(0, 80)).toBe(false);
    }

    const error = store.importBackup(JSON.stringify({ ...good, rooms: [] }));
    expect(error).toContain('rooms');
    expect(store.rooms().length).toBe(2);
  });

  it('sets unreadable saved data aside instead of overwriting it', () => {
    const damaged = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, band: [null], rooms: [], templates: [] });
    localStorage.setItem('worship-mix-assistant.state', damaged);
    const storage = TestBed.inject(StorageService);

    const loaded = storage.load();
    expect(loaded.rooms.length).toBe(2);
    expect(localStorage.getItem('worship-mix-assistant.unreadable-state')).toBe(damaged);
  });

  it('builds a sheet for the selected console and remembers checked steps per console', () => {
    const store = TestBed.inject(MixStore);
    store.loadTemplate('template-example');
    expect(store.sheet()?.consoleId).toBe('x32');
    store.toggleStep('protect:save');
    expect(store.checkedStepIds()).toEqual(['protect:save']);
    store.selectConsole('wingCompact');
    expect(store.sheet()?.consoleId).toBe('wingCompact');
    expect(store.checkedStepIds()).toEqual([]);
    expect(store.validationErrors()).toEqual([]);
  });
});
