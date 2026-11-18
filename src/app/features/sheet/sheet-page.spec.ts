import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MixStore } from '../../state/mix-store';
import { SheetPage } from './sheet-page';

const SKILL_WORDS = /beginner|intermediate|advanced/i;

describe('SheetPage', () => {
  let store: MixStore;
  let fixture: ComponentFixture<SheetPage>;
  let element: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SheetPage],
      providers: [provideRouter([])],
    }).compileComponents();
    store = TestBed.inject(MixStore);
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(SheetPage);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  }

  function queryAll(testId: string): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
  }

  it('shows the empty state with a link to the band when there is no band', async () => {
    await render();

    const emptyState = element.querySelector('[data-testid="sheet-empty"]');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.querySelector('a')?.getAttribute('href')).toBe('/band');
    expect(queryAll('sheet-section').length).toBe(0);
  });

  it('renders all nine sections, in order, for the example lineup', async () => {
    store.loadTemplate('template-example');
    await render();

    const sectionIds = queryAll('sheet-section').map((section) => section.getAttribute('data-section-id'));
    expect(sectionIds).toEqual(['protect', 'patch', 'gain', 'lowCuts', 'groups', 'fx', 'dynamics', 'monitors', 'main']);

    expect(queryAll('sheet-disclaimer').length).toBe(1);
    expect(element.querySelector('[data-testid="sheet-reference"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="print-button"]')).not.toBeNull();
    expect(queryAll('badge-rehearsal').length).toBeGreaterThan(0);
  });

  it('shows each subject heading once per section', async () => {
    store.loadTemplate('template-example');
    await render();

    for (const section of queryAll('sheet-section')) {
      const headings = Array.from(section.querySelectorAll('h3')).map((heading) => heading.textContent);
      const uniqueHeadings = new Set(headings);
      expect(uniqueHeadings.size).toBe(headings.length);
    }
  });

  it('ticking a checkbox saves the step in the store and updates the progress', async () => {
    store.loadTemplate('template-example');
    await render();

    const firstStep = queryAll('sheet-step')[0];
    const stepId = firstStep.getAttribute('data-step-id') ?? '';
    const checkbox = firstStep.querySelector<HTMLInputElement>('[data-testid="step-checkbox"]');
    expect(stepId).not.toBe('');
    expect(store.checkedStepIds()).toEqual([]);

    checkbox?.click();
    await fixture.whenStable();

    expect(store.checkedStepIds()).toEqual([stepId]);
    expect(element.querySelector('[data-testid="sheet-progress"]')?.textContent).toContain('1 of ');

    checkbox?.click();
    await fixture.whenStable();

    expect(store.checkedStepIds()).toEqual([]);
  });

  it('opening a value shows the range, why, listen-for and the provenance trail', async () => {
    store.loadTemplate('template-example');
    await render();

    // The first low cut step has a numeric value, so it has a range and a provenance trail.
    const lowCutSection = element.querySelector<HTMLElement>('[data-section-id="lowCuts"]');
    const valueButton = lowCutSection?.querySelector<HTMLButtonElement>('[data-testid="step-value"]');
    const step = valueButton?.closest<HTMLElement>('[data-testid="sheet-step"]');
    const detail = step?.querySelector<HTMLElement>('[data-testid="step-detail"]');

    expect(valueButton?.getAttribute('aria-expanded')).toBe('false');
    expect(detail?.hidden).toBe(true);

    valueButton?.click();
    await fixture.whenStable();

    expect(valueButton?.getAttribute('aria-expanded')).toBe('true');
    expect(detail?.hidden).toBe(false);
    expect(detail?.textContent).toContain('Usable range');
    expect(detail?.textContent).toContain('Why');
    expect(detail?.textContent).toContain('Listen for');
    const provenanceLines = detail?.querySelectorAll('[data-testid="step-provenance"] li') ?? [];
    expect(provenanceLines.length).toBeGreaterThan(0);
    expect(provenanceLines[0].textContent).toContain('Baseline:');
  });

  it('switching the console re-renders the sheet for the other console', async () => {
    store.loadTemplate('template-example');
    await render();

    element.querySelector<HTMLButtonElement>('[data-testid="console-switch-wingCompact"]')?.click();
    await fixture.whenStable();

    expect(store.consoleId()).toBe('wingCompact');
    expect(element.querySelector('h1')?.textContent).toContain('WING');
    expect(queryAll('sheet-section').length).toBe(9);
  });

  it('never prints a skill level, on either console, with every detail in the DOM', async () => {
    store.loadTemplate('template-example');
    await render();
    expect(element.textContent).not.toMatch(SKILL_WORDS);

    store.selectConsole('wingCompact');
    await fixture.whenStable();
    expect(element.textContent).not.toMatch(SKILL_WORDS);
  });
});
