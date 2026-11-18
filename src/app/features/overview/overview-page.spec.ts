import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MixStore } from '../../state/mix-store';
import { OverviewPage } from './overview-page';

describe('OverviewPage', () => {
  let store: MixStore;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [OverviewPage],
      providers: [provideRouter([])],
    }).compileComponents();
    store = TestBed.inject(MixStore);
  });

  it('shows the empty state when there is no band', async () => {
    const fixture = TestBed.createComponent(OverviewPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-testid="overview-empty"]')).not.toBeNull();
    expect(element.querySelectorAll('[data-testid="overview-card"]').length).toBe(0);
  });

  it('shows one card per channel with its console channel number, and the ensemble advice', async () => {
    store.loadTemplate('template-example');
    const fixture = TestBed.createComponent(OverviewPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const cards = element.querySelectorAll('[data-testid="overview-card"]');
    expect(cards.length).toBe(store.mixPlan().channels.length);
    expect(cards[0].querySelector('[data-testid="overview-channel-number"]')?.textContent).toContain('Ch ');
    expect(element.querySelector('[data-testid="overview-ensemble-advice"]')?.textContent).toContain('Before you reach for EQ');
    expect(element.querySelector('[data-testid="overview-house-principles"]')).not.toBeNull();
  });

  it('opening a value shows its range and provenance', async () => {
    store.loadTemplate('template-example');
    const fixture = TestBed.createComponent(OverviewPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const valueButton = element.querySelector<HTMLButtonElement>('[data-testid="step-value"]');
    const setting = valueButton?.closest('[data-testid="overview-setting"]');
    const detail = setting?.querySelector<HTMLElement>('[data-testid="step-detail"]');
    expect(detail?.hidden).toBe(true);

    valueButton?.click();
    await fixture.whenStable();

    expect(detail?.hidden).toBe(false);
    expect(detail?.textContent).toContain('Usable range');
    expect(detail?.querySelector('[data-testid="step-provenance"]')).not.toBeNull();
  });

  it('never prints a skill level', async () => {
    store.loadTemplate('template-example');
    const fixture = TestBed.createComponent(OverviewPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toMatch(/beginner|intermediate|advanced/i);
  });
});
