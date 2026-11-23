import { computed, inject, Injectable, signal } from '@angular/core';
import { AdapterResult, CONSOLE_PROFILES, ConsoleId, ConsoleProfile, ConsoleSheet, toConsole, validateForConsole } from '../core/consoles';
import { buildMixPlan } from '../core/engine';
import { DEFAULT_CONSOLE_BY_ROOM } from '../core/knowledge';
import { BandMember, MixPlan, Room, ServiceSetup } from '../core/model';
import { StorageService } from './storage.service';
import { createDefaultState, MixSituation, RosterTemplate, StoredState } from './stored-state';

/**
 * The app's single store. Components read signals from here and call its methods.
 * They never call the engine or the adapters directly.
 */
@Injectable({ providedIn: 'root' })
export class MixStore {
  private readonly storage = inject(StorageService);
  private readonly state = signal<StoredState>(this.storage.load());

  readonly rooms = computed(() => this.state().rooms);
  readonly selectedRoomId = computed(() => this.state().selectedRoomId);
  readonly consoleId = computed(() => this.state().consoleId);
  readonly serviceSetup = computed(() => this.state().serviceSetup);
  readonly band = computed(() => this.state().band);
  readonly templates = computed(() => this.state().templates);
  readonly situation = computed(() => this.state().situation);
  readonly storageNoticeDismissed = computed(() => this.state().storageNoticeDismissed);
  readonly installPromptDismissed = computed(() => this.state().installPromptDismissed);
  readonly lastBackupIso = computed(() => this.state().lastBackupIso);
  readonly labLibraryUrl = computed(() => this.state().labLibraryUrl);

  readonly room = computed<Room>(() => {
    const current = this.state();
    const selected = current.rooms.find((room) => room.id === current.selectedRoomId);
    return selected ?? current.rooms[0];
  });

  readonly consoleProfile = computed<ConsoleProfile>(() => CONSOLE_PROFILES[this.consoleId()]);

  /** The console-neutral plan. Recomputed whenever the band, room or setup changes. */
  readonly mixPlan = computed<MixPlan>(() => buildMixPlan(this.band(), this.room(), this.serviceSetup()));

  /** Plain-language reasons the band does not fit the selected console. Empty when it fits. */
  readonly validationErrors = computed<string[]>(() => validateForConsole(this.mixPlan(), this.consoleProfile()));

  /** The selected console's adapter result for the same plan. */
  readonly sheetResult = computed<AdapterResult>(() => toConsole(this.consoleId(), this.mixPlan()));

  readonly sheet = computed<ConsoleSheet | null>(() => {
    const result = this.sheetResult();
    return result.ok ? result.sheet : null;
  });

  readonly checkedStepIds = computed<string[]>(() => this.state().checkedStepIds[this.consoleId()] ?? []);

  // --- Service setup -------------------------------------------------------

  selectRoom(roomId: string): void {
    this.patch({ selectedRoomId: roomId });
    const defaultConsole = DEFAULT_CONSOLE_BY_ROOM[roomId];
    if (defaultConsole !== undefined) {
      this.patch({ consoleId: defaultConsole });
    }
  }

  updateRoom(updated: Room): void {
    const rooms = this.state().rooms.map((room) => (room.id === updated.id ? updated : room));
    this.patch({ rooms });
  }

  addRoom(room: Room): void {
    this.patch({ rooms: [...this.state().rooms, room], selectedRoomId: room.id });
  }

  selectConsole(consoleId: ConsoleId): void {
    this.patch({ consoleId });
  }

  updateServiceSetup(serviceSetup: ServiceSetup): void {
    this.patch({ serviceSetup });
  }

  setSituation(situation: MixSituation): void {
    this.patch({ situation });
  }

  // --- Band roster ---------------------------------------------------------

  addMember(member: BandMember): void {
    this.patch({ band: [...this.state().band, member] });
  }

  updateMember(updated: BandMember): void {
    const band = this.state().band.map((member) => (member.id === updated.id ? updated : member));
    this.patch({ band });
  }

  removeMember(memberId: string): void {
    this.patch({ band: this.state().band.filter((member) => member.id !== memberId) });
  }

  /** Moves a member one place up (-1) or down (+1) in the roster. */
  moveMember(memberId: string, direction: -1 | 1): void {
    const band = [...this.state().band];
    const from = band.findIndex((member) => member.id === memberId);
    const to = from + direction;
    if (from === -1 || to < 0 || to >= band.length) {
      return;
    }
    const [moved] = band.splice(from, 1);
    band.splice(to, 0, moved);
    this.patch({ band });
  }

  clearBand(): void {
    this.patch({ band: [] });
  }

  // --- Templates -----------------------------------------------------------

  saveBandAsTemplate(name: string): void {
    const template: RosterTemplate = { id: `template-${Date.now()}`, name, band: structuredClone(this.state().band) };
    this.patch({ templates: [...this.state().templates, template] });
  }

  loadTemplate(templateId: string): void {
    const template = this.state().templates.find((entry) => entry.id === templateId);
    if (template === undefined) {
      return;
    }
    this.patch({ band: structuredClone(template.band) });
  }

  deleteTemplate(templateId: string): void {
    this.patch({ templates: this.state().templates.filter((entry) => entry.id !== templateId) });
  }

  // --- Sheet progress ------------------------------------------------------

  toggleStep(stepId: string): void {
    const consoleId = this.consoleId();
    const checked = this.checkedStepIds();
    const next = checked.includes(stepId) ? checked.filter((id) => id !== stepId) : [...checked, stepId];
    this.patch({ checkedStepIds: { ...this.state().checkedStepIds, [consoleId]: next } });
  }

  clearProgress(): void {
    this.patch({ checkedStepIds: { ...this.state().checkedStepIds, [this.consoleId()]: [] } });
  }

  // --- Notices, backup -----------------------------------------------------

  dismissStorageNotice(): void {
    this.patch({ storageNoticeDismissed: true });
  }

  dismissInstallPrompt(): void {
    this.patch({ installPromptDismissed: true });
  }

  exportBackup(): string {
    this.patch({ lastBackupIso: new Date().toISOString() });
    return this.storage.exportJson(this.state());
  }

  /** Returns an error message, or null when the import worked. */
  importBackup(text: string): string | null {
    const result = this.storage.importJson(text);
    if (!result.ok) {
      return result.error;
    }
    this.state.set(result.state);
    this.storage.save(result.state);
    return null;
  }

  setLabLibraryUrl(url: string): void {
    this.patch({ labLibraryUrl: url });
  }

  resetEverything(): void {
    this.storage.clear();
    this.state.set(createDefaultState());
  }

  /**
   * Every change goes through here and is saved at once, not on a later tick,
   * so closing or reloading the page right after a change cannot lose it.
   */
  private patch(partial: Partial<StoredState>): void {
    this.state.update((current) => ({ ...current, ...partial }));
    this.storage.save(this.state());
  }
}
