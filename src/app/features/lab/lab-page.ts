import { Component, computed, effect, ElementRef, OnDestroy, signal, viewChild } from '@angular/core';
import { findMaximum, measureRmsDb } from '../../core/audio/dynamics';
import { generatePracticeSound, PRACTICE_SAMPLE_RATE, PRACTICE_SOUNDS, PracticeSoundId } from '../../core/audio/practice-sounds';
import {
  DYNAMIC_EQ_MISTAKES,
  DYNAMIC_EQ_MODES,
  DYNAMIC_EQ_PARAMETERS,
  DYNAMIC_EQ_STEPS,
  DYNAMIC_EQ_SUMMARY,
  DYNAMIC_EQ_WHERE,
} from '../../core/knowledge/dynamic-eq-lesson';
import { ControlSpec, formatControlValue, positionToValue, SLIDER_STEPS, valueToPosition } from './lab-controls';
import { buildCurveFrequencies, CurveColors, drawEqCurve, drawLabPicture, LabColors } from './lab-drawing';
import { findProcessor, LAB_PROCESSORS, LabProcessor, LabRun, LabValues, ProcessorId } from './lab-processors';
import { LoopPlayer } from './loop-player';

interface SliderView {
  key: string;
  label: string;
  hint: string;
  position: number;
  valueText: string;
  span: number;
}

interface ChoiceView {
  key: string;
  label: string;
  options: { value: string; label: string; selected: boolean }[];
}

const DEFAULT_LISTEN_FOR = 'Press Play, then move one slider at a time. Use Bypass to compare with the untouched sound.';
const MAKEUP_MIN_DB = -6;
const MAKEUP_MAX_DB = 18;

function buildStartingValues(): Record<ProcessorId, LabValues> {
  return {
    compressor: { ...findProcessor('compressor').defaults },
    gate: { ...findProcessor('gate').defaults },
    eq: { ...findProcessor('eq').defaults },
    dynamicEq: { ...findProcessor('dynamicEq').defaults },
  };
}

/**
 * The Sound lab: move a processor's controls and hear the result at once.
 *
 * The sound is a short generated loop. Every time a control changes, the whole loop is processed
 * again (it takes a few milliseconds) and swapped in at the same place, so there is no separate
 * real-time audio code to keep in step with the tested code in core/audio.
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
  private readonly curveFrequencies = buildCurveFrequencies();
  private animationFrame: number | null = null;

  protected readonly sliderSteps = SLIDER_STEPS;
  protected readonly sounds = PRACTICE_SOUNDS;
  protected readonly processors = LAB_PROCESSORS;
  protected readonly audioSupported = LoopPlayer.isSupported();

  protected readonly lessonSummary = DYNAMIC_EQ_SUMMARY;
  protected readonly lessonWhere = DYNAMIC_EQ_WHERE;
  protected readonly lessonModes = DYNAMIC_EQ_MODES;
  protected readonly lessonParameters = DYNAMIC_EQ_PARAMETERS;
  protected readonly lessonSteps = DYNAMIC_EQ_STEPS;
  protected readonly lessonMistakes = DYNAMIC_EQ_MISTAKES;

  protected readonly processorId = signal<ProcessorId>('compressor');
  protected readonly soundId = signal<PracticeSoundId>(findProcessor('compressor').defaultSound);
  private readonly valuesByProcessor = signal<Record<ProcessorId, LabValues>>(buildStartingValues());
  protected readonly bypassed = signal(false);
  protected readonly isPlaying = signal(false);
  protected readonly listenFor = signal(DEFAULT_LISTEN_FOR);
  protected readonly selectedPresetId = signal<string | null>(null);
  protected readonly playheadFraction = signal<number | null>(null);
  /** The change at the playhead right now, for the meter. */
  protected readonly liveChangeDb = signal(0);

  protected readonly processor = computed<LabProcessor>(() => findProcessor(this.processorId()));
  private readonly values = computed<LabValues>(() => this.valuesByProcessor()[this.processorId()]);

  protected readonly selectedSound = computed(() => {
    const found = PRACTICE_SOUNDS.find((sound) => sound.id === this.soundId());
    return found ?? PRACTICE_SOUNDS[0];
  });

  private readonly input = computed<Float32Array>(() => this.loadSound(this.soundId()));

  private readonly result = computed<LabRun>(() => this.processor().run(this.input(), PRACTICE_SAMPLE_RATE, this.values()));

  /** What the speakers get: the untouched sound when bypassed, the processed one otherwise. */
  private readonly audible = computed<Float32Array>(() => (this.bypassed() ? this.input() : this.result().output));

  protected readonly showsWaveform = computed(() => this.processor().picture === 'waveform');
  protected readonly changeName = computed(() => this.processor().changeName);

  protected readonly maxChangeDb = computed(() => {
    const change = this.result().changeDb;
    return change === null ? 0 : findMaximum(change);
  });

  protected readonly meterPercent = computed(() => {
    const shown = this.isPlaying() && !this.bypassed() ? this.liveChangeDb() : 0;
    return Math.min(100, (shown / this.processor().changeScaleDb) * 100);
  });

  /** How much louder or quieter the processed loop is than the untouched one, on average. */
  protected readonly loudnessChangeDb = computed(() => measureRmsDb(this.result().output) - measureRmsDb(this.input()));

  protected readonly sliders = computed<SliderView[]>(() => {
    const values = this.values();
    return this.processor().controls.map((spec) => this.buildSlider(spec, values[spec.key]));
  });

  protected readonly choices = computed<ChoiceView[]>(() => {
    const values = this.values();
    return this.processor().choices.map((choice) => ({
      key: choice.key,
      label: choice.label,
      options: choice.options.map((option) => ({ ...option, selected: values[choice.key] === option.value })),
    }));
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

  protected chooseProcessor(id: ProcessorId): void {
    if (id === this.processorId()) {
      return;
    }
    this.processorId.set(id);
    this.selectedPresetId.set(null);
    this.listenFor.set(DEFAULT_LISTEN_FOR);
    this.liveChangeDb.set(0);
    // Start on a sound that suits the processor.
    this.soundId.set(findProcessor(id).defaultSound);
  }

  protected chooseSound(event: Event): void {
    const chosen = (event.target as HTMLSelectElement).value;
    const sound = PRACTICE_SOUNDS.find((entry) => entry.id === chosen);
    if (sound !== undefined) {
      this.soundId.set(sound.id);
    }
  }

  protected applyPreset(presetId: string): void {
    const processor = this.processor();
    const preset = processor.presets.find((entry) => entry.id === presetId);
    if (preset === undefined) {
      return;
    }
    this.setValues({ ...preset.values });
    this.soundId.set(preset.sound);
    this.listenFor.set(preset.listenFor);
    this.selectedPresetId.set(presetId);
    this.bypassed.set(false);

    // Unless the preset is about makeup gain itself, start level-matched, so the first
    // comparison with Bypass is about the sound and not about which one is louder.
    const makeupKey = processor.makeupKey;
    if (makeupKey !== null && preset.values[makeupKey] === 0) {
      this.matchLoudness();
    }
  }

  // --- Controls ----------------------------------------------------------------

  protected onSliderInput(key: string, event: Event): void {
    const spec = this.processor().controls.find((entry) => entry.key === key);
    if (spec === undefined) {
      return;
    }
    const position = Number((event.target as HTMLInputElement).value);
    this.setValues({ ...this.values(), [key]: positionToValue(position, spec) });
  }

  protected choose(key: string, value: string): void {
    this.setValues({ ...this.values(), [key]: value });
  }

  protected toggleBypass(): void {
    this.bypassed.update((current) => !current);
  }

  /** Sets the makeup gain so processed and bypassed are equally loud, which makes the comparison fair. */
  protected matchLoudness(): void {
    const makeupKey = this.processor().makeupKey;
    if (makeupKey === null) {
      return;
    }
    const values = this.values();
    const currentMakeup = values[makeupKey];
    if (typeof currentMakeup !== 'number') {
      return;
    }
    const changeWithoutMakeup = this.loudnessChangeDb() - currentMakeup;
    const neededMakeup = Math.round(-changeWithoutMakeup * 2) / 2;
    const clamped = Math.min(MAKEUP_MAX_DB, Math.max(MAKEUP_MIN_DB, neededMakeup));
    this.setValues({ ...values, [makeupKey]: clamped });
  }

  protected reset(): void {
    this.setValues({ ...this.processor().defaults });
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
        const length = this.input().length;
        const index = Math.min(length - 1, Math.floor(position * PRACTICE_SAMPLE_RATE));
        this.playheadFraction.set(index / length);
        const change = this.result().changeDb;
        this.liveChangeDb.set(change === null ? 0 : change[index]);
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

  private setValues(values: LabValues): void {
    this.valuesByProcessor.update((current) => ({ ...current, [this.processorId()]: values }));
  }

  private loadSound(id: PracticeSoundId): Float32Array {
    const cached = this.soundCache.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const generated = generatePracticeSound(id);
    this.soundCache.set(id, generated);
    return generated;
  }

  private buildSlider(spec: ControlSpec<string>, value: number | string): SliderView {
    const numericValue = typeof value === 'number' ? value : spec.min;
    return {
      key: spec.key,
      label: spec.label,
      hint: spec.hint,
      position: valueToPosition(numericValue, spec),
      valueText: formatControlValue(numericValue, spec),
      span: spec.span ?? 3,
    };
  }

  private draw(): void {
    const canvasRef = this.canvas();
    const processor = this.processor();
    const values = this.values();
    const result = this.result();
    const input = this.input();
    const bypassed = this.bypassed();
    const playheadFraction = this.playheadFraction();
    if (canvasRef === undefined) {
      return;
    }

    const element = canvasRef.nativeElement;
    const styles = getComputedStyle(element);
    const readColor = (name: string, fallback: string): string => styles.getPropertyValue(name).trim() || fallback;

    if (processor.picture === 'curve') {
      const flat = this.curveFrequencies.map(() => 0);
      const response = bypassed ? flat : (processor.curveDb(values, this.curveFrequencies, PRACTICE_SAMPLE_RATE) ?? flat);
      const curveColors: CurveColors = {
        grid: readColor('--border', '#555'),
        label: readColor('--text-dim', '#aaa'),
        curve: readColor('--accent', '#5cc8ff'),
      };
      drawEqCurve(element, response, curveColors);
      return;
    }

    const colors: LabColors = {
      input: readColor('--border', '#555'),
      output: readColor('--accent', '#5cc8ff'),
      reduction: readColor('--warn', '#ffc857'),
      threshold: readColor('--text-dim', '#aaa'),
      playhead: readColor('--text', '#fff'),
    };
    drawLabPicture(
      element,
      {
        input,
        output: result.output,
        changeDb: result.changeDb,
        thresholdDb: processor.thresholdDb(values),
        reductionScaleDb: processor.changeScaleDb,
        playheadFraction,
        showOutput: !bypassed,
      },
      colors,
    );
  }
}
