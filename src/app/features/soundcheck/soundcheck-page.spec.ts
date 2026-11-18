import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MixStore } from '../../state/mix-store';
import { SoundcheckPage } from './soundcheck-page';

describe('SoundcheckPage', () => {
  let store: MixStore;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SoundcheckPage],
      providers: [provideRouter([])],
    }).compileComponents();
    store = TestBed.inject(MixStore);
  });

  it('lists the soundcheck steps in order, the monitor mixes and the house principles', async () => {
    store.loadTemplate('template-example');
    const fixture = TestBed.createComponent(SoundcheckPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const plan = store.mixPlan();
    const renderedTitles = Array.from(element.querySelectorAll('[data-testid="soundcheck-step"] h2')).map((title) => title.textContent);
    const plannedTitles = plan.soundcheck.map((step) => step.title);
    expect(renderedTitles).toEqual(plannedTitles);

    expect(element.querySelectorAll('[data-testid="soundcheck-monitor-mix"]').length).toBe(plan.monitorMixes.length);
    expect(element.querySelector('[data-testid="soundcheck-house-principles"]')).not.toBeNull();
  });

  it('shows the loudness target only when the room has one', async () => {
    store.loadTemplate('template-example');
    const fixture = TestBed.createComponent(SoundcheckPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="soundcheck-loudness"]')).toBeNull();

    store.updateRoom({ ...store.room(), loudnessTargetDba: 88 });
    await fixture.whenStable();
    expect(element.querySelector('[data-testid="soundcheck-loudness"]')?.textContent).toContain('88 dBA');
  });

  it('never prints a skill level', async () => {
    store.loadTemplate('template-example');
    const fixture = TestBed.createComponent(SoundcheckPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toMatch(/beginner|intermediate|advanced/i);
  });
});
