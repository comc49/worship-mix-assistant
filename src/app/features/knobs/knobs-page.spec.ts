import { TestBed } from '@angular/core/testing';
import { KNOB_GUIDE } from '../../core/knowledge/knob-guide';
import { MixStore } from '../../state/mix-store';
import { KnobsPage } from './knobs-page';

function clickGroup(element: HTMLElement, groupId: string): void {
  const tab = element.querySelector<HTMLButtonElement>(`[data-testid="knob-group-tab"][data-group-id="${groupId}"]`);
  tab?.click();
}

function clickTile(element: HTMLElement, knobId: string): void {
  const tile = element.querySelector<HTMLButtonElement>(`[data-testid="knob-tile"][data-knob-id="${knobId}"]`);
  tile?.click();
}

describe('KnobsPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [KnobsPage] }).compileComponents();
  });

  it('shows one group at a time as tiles that fill the grid with no holes', async () => {
    const fixture = TestBed.createComponent(KnobsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('[data-testid="knob-group-tab"]').length).toBe(KNOB_GUIDE.length);

    for (const group of KNOB_GUIDE) {
      clickGroup(element, group.id);
      await fixture.whenStable();
      fixture.detectChanges();
      const tiles = element.querySelectorAll('[data-testid="knob-tile"]');
      const wideTiles = element.querySelectorAll('.bento__tile--wide');
      expect(tiles.length, group.id).toBe(group.entries.length);
      // Four columns: every row is full.
      expect((tiles.length + wideTiles.length) % 4, group.id).toBe(0);
      // The first tile of a group is selected, so the detail panel is never empty.
      expect(element.querySelector('[data-testid="knob-detail"]')?.getAttribute('data-knob-id')).toBe(group.entries[0].id);
    }
  });

  it('explains attack and release in the detail panel when their tiles are tapped', async () => {
    const fixture = TestBed.createComponent(KnobsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    clickGroup(element, 'compressor');
    await fixture.whenStable();
    fixture.detectChanges();

    clickTile(element, 'compAttack');
    await fixture.whenStable();
    fixture.detectChanges();
    const detail = element.querySelector('[data-testid="knob-detail"]');
    expect(detail?.textContent).toContain('How quickly the compressor reacts');
    expect(detail?.textContent).toContain('Slower');
    expect(detail?.textContent).toContain('Faster');

    clickTile(element, 'compRelease');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('[data-testid="knob-detail"]')?.textContent).toContain('pumping');
  });

  it('shows the selected console\'s own name for a control, and flags names the manual does not confirm', async () => {
    const store = TestBed.inject(MixStore);
    store.selectConsole('wingCompact');
    const fixture = TestBed.createComponent(KnobsPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    clickGroup(element, 'compressor');
    await fixture.whenStable();
    fixture.detectChanges();
    const onWing = element.querySelector('[data-testid="knob-console-name"]');
    expect(onWing?.textContent).toContain('THR');
    expect(onWing?.textContent).not.toContain('Check on your console');

    store.selectConsole('x32');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('[data-testid="knob-console-name"]')?.textContent).toContain('Check on your console');
  });

  it('gives every entry both directions and a line to remember', () => {
    for (const group of KNOB_GUIDE) {
      for (const entry of group.entries) {
        expect(entry.more.length, entry.id).toBeGreaterThan(0);
        expect(entry.less.length, entry.id).toBeGreaterThan(0);
        expect(entry.remember.length, entry.id).toBeGreaterThan(0);
      }
    }
  });
});
