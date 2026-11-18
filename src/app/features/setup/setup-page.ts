import { Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { CONSOLE_PROFILES, ConsoleId } from '../../core/consoles';
import { MonitorType, Reverberance, Room, ServiceSetup, SubwooferFeed } from '../../core/model';
import { MixStore } from '../../state/mix-store';

interface ReverberanceOption {
  value: Reverberance;
  label: string;
  explanation: string;
}

interface MonitorTypeOption {
  value: MonitorType;
  label: string;
}

interface SubwooferFeedOption {
  value: SubwooferFeed;
  label: string;
  explanation: string;
}

interface ConsoleOption {
  id: ConsoleId;
  name: string;
}

const REVERBERANCE_OPTIONS: ReverberanceOption[] = [
  { value: 'live', label: 'Live', explanation: 'Echoey. Hard walls and floor: a hand clap rings on.' },
  { value: 'neutral', label: 'Neutral', explanation: 'In between. No room adjustments are made.' },
  { value: 'dry', label: 'Dry', explanation: 'Soft and dead. Carpet, curtains or padded seats: a hand clap stops at once.' },
];

const MONITOR_TYPE_OPTIONS: MonitorTypeOption[] = [
  { value: 'wedges', label: 'Wedges' },
  { value: 'inEars', label: 'In-ears' },
  { value: 'mixed', label: 'Mixed' },
];

const SUBWOOFER_FEED_OPTIONS: SubwooferFeedOption[] = [
  { value: 'mainThroughCrossover', label: 'Main mix through a crossover', explanation: 'The subwoofer gets the low part of everything in the main mix.' },
  { value: 'ownBus', label: 'Its own bus', explanation: 'Only the channels you send to the subwoofer bus reach it.' },
];

const CONSOLE_OPTIONS: ConsoleOption[] = [
  { id: 'x32', name: CONSOLE_PROFILES.x32.name },
  { id: 'wingCompact', name: CONSOLE_PROFILES.wingCompact.name },
];

const MIN_MONITOR_MIXES = 0;
const MAX_MONITOR_MIXES = 12;

/** The room, the console and the monitor setup for this service. Every change is saved at once. */
@Component({
  selector: 'app-setup-page',
  templateUrl: './setup-page.html',
  styleUrl: './setup-page.scss',
})
export class SetupPage {
  protected readonly store = inject(MixStore);

  protected readonly reverberanceOptions = REVERBERANCE_OPTIONS;
  protected readonly monitorTypeOptions = MONITOR_TYPE_OPTIONS;
  protected readonly subwooferFeedOptions = SUBWOOFER_FEED_OPTIONS;
  protected readonly consoleOptions = CONSOLE_OPTIONS;
  protected readonly minMonitorMixes = MIN_MONITOR_MIXES;
  protected readonly maxMonitorMixes = MAX_MONITOR_MIXES;

  protected readonly room = this.store.room;
  protected readonly serviceSetup = this.store.serviceSetup;

  /** The loudness field shows an empty box when no target is set. */
  protected readonly loudnessTargetText = computed(() => {
    const target = this.room().loudnessTargetDba;
    if (target === null) {
      return '';
    }
    return String(target);
  });

  protected readonly canDecreaseMonitorMixes = computed(() => this.serviceSetup().monitorMixCount > MIN_MONITOR_MIXES);
  protected readonly canIncreaseMonitorMixes = computed(() => this.serviceSetup().monitorMixCount < MAX_MONITOR_MIXES);

  private readonly roomNameInput = viewChild.required<ElementRef<HTMLInputElement>>('roomNameInput');

  // --- Room ----------------------------------------------------------------

  protected selectRoom(roomId: string): void {
    this.store.selectRoom(roomId);
  }

  /** Adds a neutral room, selects it and puts the cursor in its name so it can be typed over. */
  protected addRoom(): void {
    const newRoom: Room = {
      id: this.createRoomId(),
      name: 'New room',
      reverberance: 'neutral',
      constantLowFrequencyNoise: false,
      audienceSize: 100,
      loudnessTargetDba: null,
    };
    this.store.addRoom(newRoom);

    const nameInput = this.roomNameInput().nativeElement;
    nameInput.focus();
    // The value binding has not been refreshed yet, so select the text on the next frame.
    requestAnimationFrame(() => nameInput.select());
  }

  protected onRoomNameInput(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.patchRoom({ name });
  }

  protected setReverberance(reverberance: Reverberance): void {
    this.patchRoom({ reverberance });
  }

  protected setConstantNoise(constantLowFrequencyNoise: boolean): void {
    this.patchRoom({ constantLowFrequencyNoise });
  }

  /**
   * The two number fields are read when the user leaves the field (change), not on every key:
   * a half-typed number such as "85." reads as empty, and would wipe a saved value.
   */
  protected onAudienceSizeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const audienceSize = this.readWholeNumber(event);
    if (audienceSize !== null && audienceSize >= 0) {
      this.patchRoom({ audienceSize });
    }
    // Show what is actually stored, in case the typed text was not a usable number.
    input.value = String(this.room().audienceSize);
  }

  /** An empty box means "no target". Anything that is not a positive number is ignored. */
  protected onLoudnessTargetChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const text = input.value.trim();
    if (text === '') {
      this.patchRoom({ loudnessTargetDba: null });
      return;
    }
    const loudnessTargetDba = Number(text);
    const isUsable = Number.isFinite(loudnessTargetDba) && loudnessTargetDba > 0;
    if (isUsable) {
      this.patchRoom({ loudnessTargetDba });
    }
    input.value = this.loudnessTargetText();
  }

  // --- Console -------------------------------------------------------------

  protected selectConsole(consoleId: ConsoleId): void {
    this.store.selectConsole(consoleId);
  }

  // --- Monitors, stream, subwoofer -----------------------------------------

  protected setMonitorType(monitorType: MonitorType): void {
    this.patchServiceSetup({ monitorType });
  }

  protected changeMonitorMixCount(step: -1 | 1): void {
    this.setMonitorMixCount(this.serviceSetup().monitorMixCount + step);
  }

  protected onMonitorMixCountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const typed = this.readWholeNumber(event);
    if (typed !== null) {
      this.setMonitorMixCount(typed);
    }
    // Show what was actually stored, in case the typed number was out of range or not a number.
    input.value = String(this.serviceSetup().monitorMixCount);
  }

  protected setSeparateStreamMix(separateStreamMix: boolean): void {
    this.patchServiceSetup({ separateStreamMix });
  }

  protected setSubwooferFeed(subwooferFeed: SubwooferFeed): void {
    this.patchServiceSetup({ subwooferFeed });
  }

  // --- Helpers -------------------------------------------------------------

  private setMonitorMixCount(requested: number): void {
    const notBelowMinimum = Math.max(MIN_MONITOR_MIXES, requested);
    const monitorMixCount = Math.min(MAX_MONITOR_MIXES, notBelowMinimum);
    this.patchServiceSetup({ monitorMixCount });
  }

  private patchRoom(change: Partial<Room>): void {
    const updated: Room = { ...this.room(), ...change };
    this.store.updateRoom(updated);
  }

  private patchServiceSetup(change: Partial<ServiceSetup>): void {
    const updated: ServiceSetup = { ...this.serviceSetup(), ...change };
    this.store.updateServiceSetup(updated);
  }

  private readWholeNumber(event: Event): number | null {
    const text = (event.target as HTMLInputElement).value.trim();
    if (text === '') {
      return null;
    }
    const value = Number(text);
    if (!Number.isInteger(value)) {
      return null;
    }
    return value;
  }

  private createRoomId(): string {
    const canMakeUuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
    if (canMakeUuid) {
      return `room-${crypto.randomUUID()}`;
    }
    return `room-${Date.now()}`;
  }
}
