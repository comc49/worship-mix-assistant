import { Injectable } from '@angular/core';
import { createDefaultState, CURRENT_SCHEMA_VERSION, StoredState } from './stored-state';

const STORAGE_KEY = 'worship-mix-assistant.state';

export type ImportResult = { ok: true; state: StoredState } | { ok: false; error: string };

/**
 * A migration takes the saved object at version N and returns it at version N + 1.
 * MIGRATIONS[0] migrates version 1 to 2, and so on. There are none yet.
 */
type Migration = (older: Record<string, unknown>) => Record<string, unknown>;
const MIGRATIONS: Migration[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The only place in the app that touches localStorage.
 * Data lives only on this device and this browser.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  load(): StoredState {
    const raw = this.readRaw();
    if (raw === null) {
      return createDefaultState();
    }
    const parsed = this.parseAndMigrate(raw);
    if (!parsed.ok) {
      return createDefaultState();
    }
    return parsed.state;
  }

  save(state: StoredState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be full or blocked (private browsing). The app keeps working in memory.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
  }

  /** The complete backup, including names and skill ratings. */
  exportJson(state: StoredState): string {
    return JSON.stringify(state, null, 2);
  }

  /** Reads a backup file's text. Older schema versions are migrated forward. */
  importJson(text: string): ImportResult {
    return this.parseAndMigrate(text);
  }

  private readRaw(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private parseAndMigrate(text: string): ImportResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: 'This file is not valid JSON.' };
    }
    if (!isRecord(parsed)) {
      return { ok: false, error: 'This file is not a Worship Mix Assistant backup.' };
    }

    const version = parsed['schemaVersion'];
    if (typeof version !== 'number' || version < 1) {
      return { ok: false, error: 'This file is not a Worship Mix Assistant backup.' };
    }
    if (version > CURRENT_SCHEMA_VERSION) {
      return { ok: false, error: 'This backup was made by a newer version of the app. Update the app, then import again.' };
    }

    let current: Record<string, unknown> = parsed;
    for (let from = version; from < CURRENT_SCHEMA_VERSION; from = from + 1) {
      const migrate = MIGRATIONS[from - 1];
      current = migrate(current);
      current['schemaVersion'] = from + 1;
    }

    const hasCoreFields = Array.isArray(current['band']) && Array.isArray(current['rooms']) && Array.isArray(current['templates']);
    if (!hasCoreFields) {
      return { ok: false, error: 'This backup is missing its band, rooms or templates.' };
    }

    // Fields added later fall back to their defaults.
    const merged = { ...createDefaultState(), ...current } as StoredState;
    return { ok: true, state: merged };
  }
}
