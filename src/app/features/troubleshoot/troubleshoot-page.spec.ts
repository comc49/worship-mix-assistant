import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TROUBLESHOOTING_TREES } from '../../core/knowledge/troubleshooting';
import { FIXTURE_FULL_BAND, FIXTURE_STRIPPED_BAND } from '../../core/testing/fixtures';
import { MixStore } from '../../state/mix-store';
import { TroubleshootPage } from './troubleshoot-page';

describe('TroubleshootPage', () => {
  let fixture: ComponentFixture<TroubleshootPage>;
  let element: HTMLElement;
  let store: MixStore;

  function query(testId: string): HTMLElement | null {
    return element.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  }

  async function click(target: HTMLElement | null): Promise<void> {
    expect(target).not.toBeNull();
    target?.click();
    await fixture.whenStable();
  }

  async function selectSymptom(symptomId: string): Promise<void> {
    await click(element.querySelector<HTMLElement>(`[data-symptom-id="${symptomId}"]`));
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [TroubleshootPage] }).compileComponents();
    store = TestBed.inject(MixStore);
    for (const member of FIXTURE_FULL_BAND) {
      store.addMember(member);
    }
    store.setSituation('rehearsal');
    fixture = TestBed.createComponent(TroubleshootPage);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('shows a real button for every symptom on the first screen', () => {
    const buttons = Array.from(element.querySelectorAll<HTMLElement>('[data-testid="symptom-button"]'));
    expect(buttons.length).toBe(TROUBLESHOOTING_TREES.length);
    const shownIds = buttons.map((button) => button.getAttribute('data-symptom-id'));
    for (const tree of TROUBLESHOOTING_TREES) {
      expect(shownIds, tree.symptom).toContain(tree.id);
    }
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON');
    }
  });

  it('walks one question at a time to a fix, with a trail, Back and Start over', async () => {
    await selectSymptom('distortion');
    expect(query('walker-question')?.textContent).toContain('clip light');
    expect(query('safety-badge')?.textContent).toContain('Safe during a service');
    expect(document.activeElement).toBe(query('walker-question'));

    await click(query('answer-no'));
    expect(query('walker-question')?.textContent).toContain('headphones');
    expect(query('walker-trail')?.textContent).toContain('No');

    await click(query('walker-back'));
    expect(query('walker-question')?.textContent).toContain('clip light');

    await click(query('answer-yes'));
    expect(query('walker-fix')).not.toBeNull();
    expect(query('walker-fix')?.textContent).toContain('Gain knob');
    expect(query('walker-question')).toBeNull();

    await click(query('walker-restart'));
    expect(query('walker-question')?.textContent).toContain('clip light');
    expect(query('walker-fix')).toBeNull();
  });

  it('hides rehearsal-only steps when the situation is Service', async () => {
    await selectSymptom('feedbackHigh');
    // In-ears would skip the wedge test; the default setup uses wedges, so: yes, no, no.
    await click(query('answer-yes'));
    await click(query('answer-no'));
    await click(query('answer-no'));
    expect(query('safety-badge')?.textContent).toContain('Rehearsal only');

    await click(query('situation-service'));
    expect(store.situation()).toBe('service');
    expect(query('situation-service')?.getAttribute('aria-pressed')).toBe('true');

    await click(query('answer-yes'));
    await click(query('answer-no'));
    await click(query('answer-no'));
    expect(query('walker-fix')).not.toBeNull();
    expect(query('safety-badge')?.textContent).toContain('Safe during a service');
  });

  it('ends in an ask-for-help card, and shows arrangement advice before the technical fix', async () => {
    await selectSymptom('humOrBuzz');
    await click(query('answer-no'));
    await click(query('answer-yes'));
    expect(query('walker-ask-for-help')).not.toBeNull();

    await click(query('walker-change-symptom'));
    await selectSymptom('keysFightGuitars');
    await click(query('answer-yes'));
    const fixCard = query('walker-fix');
    const advice = query('walker-arrangement-advice');
    const fixText = query('walker-fix-text');
    expect(fixCard).not.toBeNull();
    expect(advice).not.toBeNull();
    expect(fixText).not.toBeNull();
    const adviceComesFirst = advice !== null && fixText !== null && (advice.compareDocumentPosition(fixText) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    expect(adviceComesFirst).toBe(true);
  });

  it('names the picked channel in the step, and flags unverified console facts', async () => {
    await selectSymptom('noSound');
    const options = Array.from(element.querySelectorAll<HTMLElement>('[data-testid="target-option"]'));
    expect(options.length).toBeGreaterThan(0);
    const leadVocal = options.find((option) => option.textContent?.includes('Lead vocal')) ?? null;
    await click(leadVocal);
    expect(query('walker-action')?.textContent).toContain('the lead vocal channel (Vocalist A)');

    // No, yes, no leads to the gate step. Gate control names are unverified on the X32.
    await click(query('answer-no'));
    await click(query('answer-yes'));
    await click(query('answer-no'));
    expect(query('walker-question')?.textContent).toContain('gate');
    await click(query('answer-yes'));
    expect(query('walker-fix')).not.toBeNull();
    expect(query('check-on-console')).not.toBeNull();
  });

  it('never shows a skill label', async () => {
    for (const tree of TROUBLESHOOTING_TREES) {
      await click(element.querySelector<HTMLElement>(`[data-symptom-id="${tree.id}"]`));
      expect(/beginner|intermediate|advanced/i.test(element.textContent ?? ''), tree.id).toBe(false);
      await click(query('walker-change-symptom'));
    }
  });

  it('hides the problems for instruments the band does not have, and says so', async () => {
    expect(query('hidden-symptoms-hint')).toBeNull();
    expect(query('band-empty-hint')).toBeNull();

    store.clearBand();
    for (const member of FIXTURE_STRIPPED_BAND) {
      store.addMember(member);
    }
    await fixture.whenStable();

    const shownIds = Array.from(element.querySelectorAll<HTMLElement>('[data-testid="symptom-button"]')).map((button) => button.getAttribute('data-symptom-id'));
    for (const hiddenId of ['bassBoomy', 'bassInaudible', 'keysFightBass', 'guitarTooLoud', 'guitarThin', 'guitarHarsh']) {
      expect(shownIds, hiddenId).not.toContain(hiddenId);
    }
    expect(shownIds).toContain('kickNoPunch');
    expect(shownIds).toContain('muddy');
    expect(query('hidden-symptoms-hint')?.textContent).toContain('6 problems');
  });

  it('lists every problem for an empty band, with a hint to add the band', async () => {
    store.clearBand();
    await fixture.whenStable();
    expect(element.querySelectorAll('[data-testid="symptom-button"]').length).toBe(TROUBLESHOOTING_TREES.length);
    expect(query('band-empty-hint')).not.toBeNull();
    expect(query('hidden-symptoms-hint')).toBeNull();
  });

  it('warns about solo-in-place and flags the step when it asks for a headphone solo', async () => {
    await selectSymptom('distortion');
    await click(query('answer-no'));
    expect(query('walker-action')?.textContent).toContain('not in a solo-in-place mode');
    expect(query('check-on-console')).not.toBeNull();
  });
});
