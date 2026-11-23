import { TestBed } from '@angular/core/testing';
import { GATE_RATIO } from '../../core/audio/dynamics';
import { COMPRESSOR_CONTROLS, formatControlValue, GATE_CONTROLS, positionToValue, SLIDER_STEPS, valueToPosition } from './lab-controls';
import { LabPage } from './lab-page';

function readout(element: HTMLElement, testId: string): string {
  return element.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? '';
}

function moveSlider(element: HTMLElement, control: string, position: number): void {
  const slider = element.querySelector<HTMLInputElement>(`[data-control="${control}"]`);
  if (slider === null) {
    throw new Error(`No slider for ${control}`);
  }
  slider.value = String(position);
  slider.dispatchEvent(new Event('input'));
}

describe('lab controls', () => {
  it('map a slider position to a value and back, on linear and logarithmic scales', () => {
    for (const spec of [...COMPRESSOR_CONTROLS, ...GATE_CONTROLS]) {
      expect(positionToValue(0, spec), spec.key).toBe(spec.min);
      expect(positionToValue(SLIDER_STEPS, spec), spec.key).toBe(spec.max);
      const middle = positionToValue(SLIDER_STEPS / 2, spec);
      const backAgain = positionToValue(valueToPosition(middle, spec), spec);
      expect(Math.abs(backAgain - middle), spec.key).toBeLessThanOrEqual(spec.step * 2);
    }
  });

  it('call the gate ratio GATE at its maximum', () => {
    const ratio = GATE_CONTROLS.find((spec) => spec.key === 'ratio');
    if (ratio === undefined) {
      throw new Error('no ratio control');
    }
    expect(formatControlValue(GATE_RATIO, ratio)).toBe('GATE');
    expect(formatControlValue(2, ratio)).toBe('2:1');
  });
});

describe('LabPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LabPage] }).compileComponents();
  });

  it('shows more gain reduction when the threshold is lowered, without needing audio', async () => {
    const fixture = TestBed.createComponent(LabPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const before = Number.parseFloat(readout(element, 'lab-max-reduction'));

    moveSlider(element, 'thresholdDb', 100);
    await fixture.whenStable();
    fixture.detectChanges();
    const after = Number.parseFloat(readout(element, 'lab-max-reduction'));
    expect(after).toBeGreaterThan(before + 5);
    expect(readout(element, 'lab-value-thresholdDb')).toBe('-54 dB');
  });

  it('applies a preset: settings, sound and what to listen for', async () => {
    const fixture = TestBed.createComponent(LabPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('[data-preset-id="releaseTooFast"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(readout(element, 'lab-value-releaseMs')).toBe('30 ms');
    expect(readout(element, 'lab-listen-for')).toContain('pumping');
    expect(element.querySelector<HTMLSelectElement>('[data-testid="lab-sound"]')?.value).toBe('drumLoop');
  });

  it('"Match loudness" sets the makeup gain so compressed and bypassed are about equally loud', async () => {
    const fixture = TestBed.createComponent(LabPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    // -30 dB: enough compression to be clearly quieter, and within reach of the makeup gain slider.
    moveSlider(element, 'thresholdDb', 500);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(Number.parseFloat(readout(element, 'lab-loudness-change'))).toBeLessThan(-1);

    element.querySelector<HTMLButtonElement>('[data-testid="lab-match"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(Math.abs(Number.parseFloat(readout(element, 'lab-loudness-change')))).toBeLessThanOrEqual(0.5);
  });

  it('switches to the gate with its own controls and a sound that has bleed', async () => {
    const fixture = TestBed.createComponent(LabPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('[data-testid="lab-processor-gate"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('[data-control="rangeDb"]')).not.toBeNull();
    expect(element.querySelector('[data-control="accentPercent"]')).not.toBeNull();
    expect(element.querySelector('[data-control="kneeDb"]')).toBeNull();
    expect(readout(element, 'lab-value-ratio')).toBe('GATE');
    expect(element.querySelector<HTMLSelectElement>('[data-testid="lab-sound"]')?.value).toBe('snareWithBleed');
  });
});
