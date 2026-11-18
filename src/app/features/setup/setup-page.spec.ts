import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MixStore } from '../../state/mix-store';
import { SetupPage } from './setup-page';

describe('SetupPage', () => {
  let fixture: ComponentFixture<SetupPage>;
  let element: HTMLElement;
  let store: MixStore;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [SetupPage] }).compileComponents();
    store = TestBed.inject(MixStore);
    fixture = TestBed.createComponent(SetupPage);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function queryAll<T extends HTMLElement>(testId: string): T[] {
    return Array.from(element.querySelectorAll<T>(`[data-testid="${testId}"]`));
  }

  function query<T extends HTMLElement>(testId: string, index = 0): T {
    const found = queryAll<T>(testId)[index];
    if (found === undefined) {
      throw new Error(`No element with data-testid="${testId}" at index ${index}`);
    }
    return found;
  }

  async function click(testId: string, index = 0): Promise<void> {
    query(testId, index).click();
    await fixture.whenStable();
  }

  async function setValue(testId: string, text: string, eventName: 'input' | 'change'): Promise<void> {
    const input = query<HTMLInputElement>(testId);
    input.value = text;
    input.dispatchEvent(new Event(eventName));
    await fixture.whenStable();
  }

  it('lists the rooms and marks the selected one', () => {
    const roomButtons = queryAll('room-button');
    expect(roomButtons.length).toBe(store.rooms().length);
    expect(roomButtons[0].getAttribute('aria-pressed')).toBe('true');
    expect(roomButtons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('selects a room and shows its profile', async () => {
    await click('room-button', 1);

    expect(store.selectedRoomId()).toBe('room-b');
    expect(query<HTMLInputElement>('room-name').value).toBe(store.room().name);
    expect(query('reverberance-dry').getAttribute('aria-pressed')).toBe('true');
    expect(query('constant-noise-no').getAttribute('aria-pressed')).toBe('true');
  });

  it('edits the selected room profile', async () => {
    await setValue('room-name', 'Main hall', 'input');
    await click('reverberance-neutral');
    await click('constant-noise-no');
    await setValue('audience-size', '220', 'change');
    await setValue('loudness-target', '88', 'change');

    expect(store.room()).toEqual({
      id: 'room-a',
      name: 'Main hall',
      reverberance: 'neutral',
      constantLowFrequencyNoise: false,
      audienceSize: 220,
      loudnessTargetDba: 88,
    });
    expect(query('room-button', 0).textContent).toContain('Main hall');
  });

  it('clears the loudness target when the field is emptied', async () => {
    await setValue('loudness-target', '90', 'change');
    expect(store.room().loudnessTargetDba).toBe(90);

    await setValue('loudness-target', '', 'change');
    expect(store.room().loudnessTargetDba).toBeNull();
  });

  it('adds a room and selects it', async () => {
    const roomCountBefore = store.rooms().length;

    await click('add-room');

    expect(store.rooms().length).toBe(roomCountBefore + 1);
    expect(store.room().name).toBe('New room');
    expect(store.room().reverberance).toBe('neutral');
    expect(queryAll('room-button').length).toBe(roomCountBefore + 1);
  });

  it('chooses the console', async () => {
    const consoleButtons = queryAll('console-button');
    expect(consoleButtons.length).toBe(2);
    expect(consoleButtons[0].textContent).toContain(store.consoleProfile().name);

    await click('console-button', 1);

    expect(store.consoleId()).toBe('wingCompact');
    expect(query('console-button', 1).getAttribute('aria-pressed')).toBe('true');
  });

  it('sets the monitor type', async () => {
    await click('monitor-type-inEars');

    expect(store.serviceSetup().monitorType).toBe('inEars');
    expect(query('monitor-type-inEars').getAttribute('aria-pressed')).toBe('true');
  });

  it('steps the monitor mix count and keeps it between 0 and 12', async () => {
    expect(query<HTMLInputElement>('monitor-count').value).toBe('4');

    await click('monitor-count-increase');
    expect(store.serviceSetup().monitorMixCount).toBe(5);

    await click('monitor-count-decrease');
    await click('monitor-count-decrease');
    expect(store.serviceSetup().monitorMixCount).toBe(3);

    await setValue('monitor-count', '40', 'change');
    expect(store.serviceSetup().monitorMixCount).toBe(12);
    expect(query<HTMLInputElement>('monitor-count').value).toBe('12');
    expect(query<HTMLButtonElement>('monitor-count-increase').disabled).toBe(true);

    await setValue('monitor-count', '-3', 'change');
    expect(store.serviceSetup().monitorMixCount).toBe(0);
    expect(query<HTMLButtonElement>('monitor-count-decrease').disabled).toBe(true);
  });

  it('sets the stream mix and the subwoofer feed', async () => {
    await click('stream-mix-yes');
    await click('subwoofer-feed-ownBus');

    expect(store.serviceSetup().separateStreamMix).toBe(true);
    expect(store.serviceSetup().subwooferFeed).toBe('ownBus');
  });

  it('shows validation errors as they appear', async () => {
    expect(queryAll('validation-error').length).toBe(0);

    // More stereo keyboards than any console has input channels.
    for (let index = 0; index < 40; index += 1) {
      store.addMember({
        id: `m-test-keys-${index}`,
        name: `Keys ${index}`,
        roles: [{ role: 'keys', skill: 'intermediate', connection: 'stereoDi', vocal: null }],
      });
    }
    await fixture.whenStable();

    const errors = store.validationErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(queryAll('validation-error').length).toBe(errors.length);
    expect(query('validation-error').textContent).toContain(errors[0]);
  });
});
