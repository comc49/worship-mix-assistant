import { Component, computed, effect, ElementRef, OnDestroy, signal, viewChild } from '@angular/core';
import {
  CompressorSettings,
  DetectorMode,
  DynamicsResult,
  findMaximum,
  GateSettings,
  measureRmsDb,
  runCompressor,
  runGate,
} from '../../core/audio/dynamics';
import { generatePracticeSound, PRACTICE_SAMPLE_RATE, PRACTICE_SOUNDS, PracticeSoundId } from '../../core/audio/practice-sounds';
import {
  COMPRESSOR_CONTROLS,
  COMPRESSOR_PRESETS,
  CompressorControlKey,
  ControlSpec,
  DEFAULT_COMPRESSOR,
  DEFAULT_GATE,
  formatControlValue,
  GATE_CONTROLS,
  GATE_PRESETS,
  GateControlKey,
  positionToValue,
  SLIDER_STEPS,
  valueToPosition,
} from './lab-controls';
import { drawLabPicture, LabColors } from './lab-drawing';
import { LoopPlayer } from './loop-player';

type Processor = 'compressor' | 'gate';

interface SliderView {
  key: string;
  label: string;
  hint: string;
  position: number;
  valueText: string;
}

const COMPRESSOR_METER_SCALE_DB = 24;
const GATE_METER_SCALE_DB = 60;
const DEFAULT_LISTEN_FOR = 'Press Play, then move one slider at a time. Use Bypass to compare with the untouched sound.';

/**
 * The Sound lab: move a compressor's or a gate's controls and hear the result at once.
 *
 * The sound is a short generated loop. Every time a control changes, the whole loop is processed
 * again (it takes a few milliseconds) and swapped in at the same place, so there is no separate
 * real-time audio code to keep in step with the tested DSP in core/audio.
 */
@Component({
  selector: 'app-lab-page',
  templateUrl: './lab-page.html',
  styleUrl: './lab-page.scss',
})
export class LabPage implements OnDestroy {
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('picture');
  private readonly player = new LoopPlayer();
  private readonly soundCache = new Map<PracticeSoundId, Float32Array>();
  private animationFrame: number | null = null;

  protected readonly sliderSteps = SLIDER_STEPS;
  protected readonly sounds = PRACTICE_SOUNDS;
  protected readonly audioSupported = LoopPlayer.isSupported();

  protected readonly processor = signal<Processor>('compressor');
  protected readonly soundId = signal<PracticeSoundId>('unevenBass');
  protected readonly compressor = signal<CompressorSettings>({ ...DEFAULT_COMPRESSOR });
  protected readonly gate = signal<GateSettings>({ ...DEFAULT_GATE });
  protected readonly bypassed = signal(false);
  protected readonly isPlaying = signal(false);
  protected readonly listenFor = signal(DEFAULT_LISTEN_FOR);
  protected readonly selectedPresetId = signal<string | null>(null);
  protected readonly playheadFraction = signal<number | null>(null);
  /** The gain reduction at the playhead right now, for the meter. */
  protected readonly liveReductionDb = signal(0);

  protected readonly presets = computed(() => (this.processor() === 'compressor' ? COMPRESSOR_PRESETS : GATE_PRESETS));

  protected readonly selectedSound = computed(() => {
    const found = PRACTICE_SOUNDS.find((sound) => sound.id === this.soundId());
    return found ?? PRACTICE_SOUNDS[0];
  });

  private readonly input = computed<Float32Array>(() => this.loadSound(this.soundId()));

  private readonly result = computed<DynamicsResult>(() => {
    if (this.processor() === 'compressor') {
      return runCompressor(this.input(), PRACTICE_SAMPLE_RATE, this.compressor());
    }
    return runGate(this.input(), PRACTICE_SAMPLE_RATE, this.gate());
  });

  /** What the speakers get: the untouched sound when bypassed, the processed one otherwise. */
  private readonly audible = computed<Float32Array>(() => (this.bypassed() ? this.input() : this.result().output));

  protected readonly meterScaleDb = computed(() => (this.processor() === 'compressor' ? COMPRESSOR_METER_SCALE_DB : GATE_METER_SCALE_DB));

  protected readonly maxReductionDb = computed(() => findMaximum(this.result().gainReductionDb));

  protected readonly meterPercent = computed(() => {
    const shown = this.isPlaying() && !this.bypassed() ? this.liveReductionDb() : 0;
    return Math.min(100, (shown / this.meterScaleDb()) * 100);
  });

  /** How much louder or quieter the processed loop is than the untouched one, on average. */
  protected readonly loudnessChangeDb = computed(() => measureRmsDb(this.result().output) - measureRmsDb(this.input()));

  protected readonly sliders = computed<SliderView[]>(() => {
    if (this.processor() === 'compressor') {
      const settings = this.compressor();
      return COMPRESSOR_CONTROLS.map((spec) => this.buildSlider(spec, settings[spec.key]));
    }
    const settings = this.gate();
    return GATE_CONTROLS.map((spec) => this.buildSlider(spec, settings[spec.key]));
  });

  constructor() {
    // A changed control or a bypass is heard at once: swap the loop without losing its place.
    effect(() => {
      const samples = this.audible();
      if (this.player.isPlaying) {
        this.player.replace(samples, PRACTICE_SAMPLE_RATE);
      }
    });

    effect(() => {
      this.draw();
    });
  }

  ngOnDestroy(): void {
    this.stopAnimation();
    void this.player.close();
  }

  // --- Choices ---------------------------------------------------------------

  protected chooseProcessor(processor: Processor): void {
    if (processor === this.processor()) {
      return;
    }
    this.processor.set(processor);
    this.selectedPresetId.set(null);
    this.listenFor.set(DEFAULT_LISTEN_FOR);
    // Start on a sound that suits the processor.
    const suitable = PRACTICE_SOUNDS.find((sound) => sound.bestFor === processor);
    if (suitable !== undefined) {
      this.soundId.set(suitable.id);
    }
  }

  protected chooseSound(event: Event): void {
    const chosen = (event.target as HTMLSelectElement).value;
    const sound = PRACTICE_SOUNDS.find((entry) => entry.id === chosen);
    if (sound !== undefined) {
      this.soundId.set(sound.id);
    }
  }

  protected applyPreset(presetId: string): void {
    if (this.processor() === 'compressor') {
      const preset = COMPRESSOR_PRESETS.find((entry) => entry.id === presetId);
      if (preset === undefined) {
        return;
      }
      this.compressor.set({ ...preset.settings });
      this.soundId.set(preset.sound);
      this.listenFor.set(preset.listenFor);
      // Unless the preset is about makeup gain itself, start level-matched, so the first
      // comparison with Bypass is about the sound and not about which one is louder.
      if (preset.settings.makeupGainDb === 0) {
        this.matchLoudness();
      }
    } else {
      const preset = GATE_PRESETS.find((entry) => entry.id === presetId);
      if (preset === undefined) {
        return;
      }
      this.gate.set({ ...preset.settings });
      this.soundId.set(preset.sound);
      this.listenFor.set(preset.listenFor);
    }
    this.selectedPresetId.set(presetId);
    this.bypassed.set(false);
  }

  // --- Controls ----------------------------------------------------------------

  protected onSliderInput(key: string, event: Event): void {
    const position = Number((event.target as HTMLInputElement).value);
    if (this.processor() === 'compressor') {
      const spec = COMPRESSOR_CONTROLS.find((entry) => entry.key === key);
      if (spec === undefined) {
        return;
      }
      const controlKey: CompressorControlKey = spec.key;
      this.compressor.update((current) => ({ ...current, [controlKey]: positionToValue(position, spec) }));
      return;
    }
    const spec = GATE_CONTROLS.find((entry) => entry.key === key);
    if (spec === undefined) {
      return;
    }
    const controlKey: GateControlKey = spec.key;
    this.gate.update((current) => ({ ...current, [controlKey]: positionToValue(position, spec) }));
  }

  protected chooseDetector(detector: DetectorMode): void {
    this.compressor.update((current) => ({ ...current, detector }));
  }

  protected toggleBypass(): void {
    this.bypassed.update((current) => !current);
  }

  /** Sets the makeup gain so compressed and bypassed are equally loud, which makes the comparison fair. */
  protected matchLoudness(): void {
    const current = this.compressor();
    const changeWithoutMakeup = this.loudnessChangeDb() - current.makeupGainDb;
    const neededMakeup = Math.round(-changeWithoutMakeup * 2) / 2;
    const clamped = Math.min(18, Math.max(-6, neededMakeup));
    this.compressor.set({ ...current, makeupGainDb: clamped });
  }

  protected reset(): void {
    if (this.processor() === 'compressor') {
      this.compressor.set({ ...DEFAULT_COMPRESSOR });
    } else {
      this.gate.set({ ...DEFAULT_GATE });
    }
    this.selectedPresetId.set(null);
    this.listenFor.set(DEFAULT_LISTEN_FOR);
  }

  // --- Playback ----------------------------------------------------------------

  protected async togglePlay(): Promise<void> {
    if (this.isPlaying()) {
      this.player.stop();
      this.isPlaying.set(false);
      this.playheadFraction.set(null);
      this.stopAnimation();
      return;
    }
    await this.player.play(this.audible(), PRACTICE_SAMPLE_RATE);
    this.isPlaying.set(true);
    this.startAnimation();
  }

  private startAnimation(): void {
    const tick = (): void => {
      const position = this.player.positionSeconds();
      if (position !== null) {
        const reduction = this.result().gainReductionDb;
        const index = Math.min(reduction.length - 1, Math.floor(position * PRACTICE_SAMPLE_RATE));
        this.playheadFraction.set(index / reduction.length);
        this.liveReductionDb.set(reduction[index]);
      }
      this.animationFrame = requestAnimationFrame(tick);
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  private stopAnimation(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // --- Helpers -----------------------------------------------------------------

  private loadSound(id: PracticeSoundId): Float32Array {
    const cached = this.soundCache.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const generated = generatePracticeSound(id);
    this.soundCache.set(id, generated);
    return generated;
  }

  private buildSlider(spec: ControlSpec<string>, value: number): SliderView {
    return {
      key: spec.key,
      label: spec.label,
      hint: spec.hint,
      position: valueToPosition(value, spec),
      valueText: formatControlValue(value, spec),
    };
  }

  private draw(): void {
    const canvasRef = this.canvas();
    const result = this.result();
    const input = this.input();
    const bypassed = this.bypassed();
    const playheadFraction = this.playheadFraction();
    const thresholdDb = this.processor() === 'compressor' ? this.compressor().thresholdDb : this.gate().thresholdDb;
    if (canvasRef === undefined) {
      return;
    }

    const element = canvasRef.nativeElement;
    const styles = getComputedStyle(element);
    const colors: LabColors = {
      input: styles.getPropertyValue('--border').trim() || '#555',
      output: styles.getPropertyValue('--accent').trim() || '#5cc8ff',
      reduction: styles.getPropertyValue('--warn').trim() || '#ffc857',
      threshold: styles.getPropertyValue('--text-dim').trim() || '#aaa',
      playhead: styles.getPropertyValue('--text').trim() || '#fff',
    };
    drawLabPicture(
      element,
      {
        input,
        output: result.output,
        gainReductionDb: result.gainReductionDb,
        thresholdDb,
        reductionScaleDb: this.meterScaleDb(),
        playheadFraction,
        showOutput: !bypassed,
      },
      colors,
    );
  }
}
