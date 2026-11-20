import { TestBed } from '@angular/core/testing';
import { KNOB_GUIDE } from '../../core/knowledge/knob-guide';
import { MixStore } from '../../state/mix-store';
import { KnobsPage } from './knobs-page';

describe('KnobsPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [KnobsPage] }).compileComponents();
  });

  it('explains attack and release, and every other entry, in both directions', async () => {
    const fixture = TestBed.createComponent(KnobsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const entryCount = KNOB_GUIDE.reduce((count, group) => count + group.entries.length, 0);
    expect(element.querySelectorAll('[data-testid="knob-entry"]').length).toBe(entryCount);
    expect(element.querySelector('[data-knob-id="compAttack"]')?.textContent).toContain('How quickly the compressor reacts');
    expect(element.querySelector('[data-knob-id="compRelease"]')?.textContent).toContain('pumping');

    for (const group of KNOB_GUIDE) {
      for (const entry of group.entries) {
        expect(entry.more.length, entry.id).toBeGreaterThan(0);
        expect(entry.less.length, entry.id).toBeGreaterThan(0);
        expect(entry.remember.length, entry.id).toBeGreaterThan(0);
      }
    }
  });

  it('shows the selected console\'s own name for a control, and flags names the manual does not confirm', async () => {
    const store = TestBed.inject(MixStore);
    store.selectConsole('wingCompact');
    const fixture = TestBed.createComponent(KnobsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const threshold = element.querySelector('[data-knob-id="compThreshold"] [data-testid="knob-console-name"]');
    expect(threshold?.textContent).toContain('THR');
    expect(threshold?.textContent).not.toContain('Check on your console');

    store.selectConsole('x32');
    await fixture.whenStable();
    fixture.detectChanges();
    const onX32 = element.querySelector('[data-knob-id="compThreshold"] [data-testid="knob-console-name"]');
    expect(onX32?.textContent).toContain('Check on your console');
  });
});
