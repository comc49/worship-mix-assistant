import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BandMember } from '../../core/model';
import { MixStore } from '../../state/mix-store';
import { BandPage } from './band-page';

/** Placeholder names only: no real volunteers in committed files. */
function keysPlayer(): BandMember {
  return {
    id: 'm-test-keys',
    name: 'Keys Player',
    roles: [{ role: 'keys', skill: 'intermediate', connection: 'stereoDi', vocal: null }],
  };
}

function bassPlayer(): BandMember {
  return {
    id: 'm-test-bass',
    name: 'Bass Player',
    roles: [{ role: 'bassGuitar', skill: 'intermediate', connection: 'monoDi', vocal: null }],
  };
}

describe('BandPage', () => {
  let fixture: ComponentFixture<BandPage>;
  let element: HTMLElement;
  let store: MixStore;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [BandPage] }).compileComponents();
    store = TestBed.inject(MixStore);
    fixture = TestBed.createComponent(BandPage);
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

  async function typeInto(testId: string, text: string): Promise<void> {
    const input = query<HTMLInputElement>(testId);
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function choose(testId: string, value: string, index = 0): Promise<void> {
    const select = query<HTMLSelectElement>(testId, index);
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  it('adds a member with the role default connection', async () => {
    await click('add-member');
    await typeInto('member-name', 'Keys Player');
    await choose('role-select', 'keys');

    // Keys default to a stereo DI.
    expect(query<HTMLSelectElement>('connection-select').value).toBe('stereoDi');

    await click('save-member');

    const band = store.band();
    expect(band.length).toBe(1);
    expect(band[0].name).toBe('Keys Player');
    expect(band[0].id.startsWith('m-')).toBe(true);
    expect(band[0].roles).toEqual([{ role: 'keys', skill: 'intermediate', connection: 'stereoDi', vocal: null }]);

    expect(queryAll('member-row').length).toBe(1);
    expect(query('member-row').textContent).toContain('Keys Player');
    expect(queryAll('member-editor').length).toBe(0);
  });

  it('does not save a member without a name', async () => {
    await click('add-member');
    await click('save-member');

    expect(store.band().length).toBe(0);
    expect(query('member-name-error').textContent).toContain('Enter a name');
  });

  it('stores the level that matches the chosen behavior description', async () => {
    await click('add-member');
    await typeInto('member-name', 'Vocalist A');

    await click('skill-option-0');
    await click('save-member');
    expect(store.band()[0].roles[0].skill).toBe('beginner');

    await click('edit-member');
    await click('skill-option-2');
    await click('save-member');
    expect(store.band()[0].roles[0].skill).toBe('advanced');
  });

  it('offers both drum module connections for electronic drums', async () => {
    await click('add-member');
    await choose('role-select', 'electronicDrums');

    const connectionSelect = query<HTMLSelectElement>('connection-select');
    const optionLabels = Array.from(connectionSelect.options).map((option) => option.textContent?.trim());
    expect(optionLabels).toEqual(['Drum module, stereo pair', 'Drum module, separate outputs']);
    expect(connectionSelect.value).toBe('drumModuleStereoPair');
  });

  it('asks vocal roles for voice range and mic, and reveals a text field for another mic', async () => {
    await click('add-member');
    await typeInto('member-name', 'Vocalist B');
    await choose('role-select', 'harmonyVocal');
    await choose('voice-range', 'high');

    expect(queryAll('mic-model-other').length).toBe(0);
    await choose('mic-model', 'other');
    await typeInto('mic-model-other', 'Placeholder Mic 1');
    await click('save-member');

    expect(store.band()[0].roles[0].vocal).toEqual({ voiceRange: 'high', micModel: 'other', micModelFreeText: 'Placeholder Mic 1' });
  });

  it('does not ask instrument roles for voice range or mic', async () => {
    await click('add-member');
    await choose('role-select', 'bassGuitar');

    expect(queryAll('voice-range').length).toBe(0);
    expect(queryAll('mic-model').length).toBe(0);
  });

  it('edits a member', async () => {
    store.addMember(keysPlayer());
    await fixture.whenStable();

    await click('edit-member');
    expect(query<HTMLInputElement>('member-name').value).toBe('Keys Player');

    await typeInto('member-name', 'Second Keys Player');
    await choose('role-select', 'padSynth');
    await click('save-member');

    const band = store.band();
    expect(band.length).toBe(1);
    expect(band[0].id).toBe('m-test-keys');
    expect(band[0].name).toBe('Second Keys Player');
    expect(band[0].roles[0].role).toBe('padSynth');
    expect(query('member-row').textContent).toContain('Second Keys Player');
  });

  it('leaves the member unchanged when the edit is cancelled', async () => {
    store.addMember(keysPlayer());
    await fixture.whenStable();

    await click('edit-member');
    await typeInto('member-name', 'Someone Else');
    await click('cancel-member');

    expect(store.band()[0].name).toBe('Keys Player');
  });

  it('removes a member', async () => {
    store.addMember(keysPlayer());
    store.addMember(bassPlayer());
    await fixture.whenStable();
    expect(queryAll('member-row').length).toBe(2);

    await click('remove-member', 0);

    expect(store.band().map((member) => member.name)).toEqual(['Bass Player']);
    expect(queryAll('member-row').length).toBe(1);
  });

  it('reorders members with the up and down buttons', async () => {
    store.addMember(keysPlayer());
    store.addMember(bassPlayer());
    await fixture.whenStable();

    expect(query<HTMLButtonElement>('move-up', 0).disabled).toBe(true);
    expect(query<HTMLButtonElement>('move-down', 1).disabled).toBe(true);

    await click('move-down', 0);
    expect(store.band().map((member) => member.name)).toEqual(['Bass Player', 'Keys Player']);

    await click('move-up', 1);
    expect(store.band().map((member) => member.name)).toEqual(['Keys Player', 'Bass Player']);
  });

  it('gives a singer who also plays two channels in the mix plan', async () => {
    await click('add-member');
    await typeInto('member-name', 'Vocalist A');
    await choose('role-select', 'leadVocal', 0);

    await click('add-role');
    expect(queryAll('role-editor').length).toBe(2);
    await choose('role-select', 'acousticGuitar', 1);

    await click('save-member');

    const band = store.band();
    expect(band.length).toBe(1);
    expect(band[0].roles.map((memberRole) => memberRole.role)).toEqual(['leadVocal', 'acousticGuitar']);
    expect(band[0].roles[1].connection).toBe('monoDi');
    expect(band[0].roles[1].vocal).toBeNull();

    expect(store.mixPlan().channels.length).toBe(2);
    expect(queryAll('member-row').length).toBe(1);
  });

  it('never shows a level word, in the roster or in the member form', async () => {
    const forbidden = /beginner|intermediate|advanced|skill/i;

    // The example lineup holds members at all three levels.
    await click('load-template');
    expect(queryAll('member-row').length).toBeGreaterThan(0);
    expect(element.textContent ?? '').not.toMatch(forbidden);

    await click('edit-member');
    await click('add-role');
    expect(queryAll('member-editor').length).toBe(1);
    expect(element.textContent ?? '').not.toMatch(forbidden);
  });

  it('does not show the chosen behavior description in the roster', async () => {
    await click('add-member');
    await typeInto('member-name', 'Vocalist A');
    const chosenDescription = query('skill-option-0').parentElement?.textContent?.trim() ?? '';
    expect(chosenDescription).not.toBe('');
    await click('skill-option-0');
    await click('save-member');

    expect(query('member-row').textContent).not.toContain(chosenDescription);
  });

  it('loads a saved lineup, and lets one member be swapped', async () => {
    await click('load-template');
    const loadedCount = store.band().length;
    expect(loadedCount).toBeGreaterThan(1);

    await click('edit-member', 1);
    await typeInto('member-name', 'Guest Vocalist');
    await click('save-member');

    expect(store.band().length).toBe(loadedCount);
    expect(store.band()[1].name).toBe('Guest Vocalist');
  });

  it('saves the current band as a lineup and deletes a lineup', async () => {
    expect(query<HTMLButtonElement>('save-template').disabled).toBe(true);

    store.addMember(keysPlayer());
    await fixture.whenStable();
    await typeInto('template-name', 'Small band');
    await click('save-template');

    const names = store.templates().map((template) => template.name);
    expect(names).toContain('Small band');
    expect(queryAll('template-row').length).toBe(names.length);
    expect(query<HTMLInputElement>('template-name').value).toBe('');

    await click('delete-template', names.length - 1);
    expect(store.templates().map((template) => template.name)).not.toContain('Small band');
  });

  it('shows the store validation errors in plain language', async () => {
    expect(queryAll('validation-error').length).toBe(0);

    // More stereo keyboards than any console has input channels.
    for (let index = 0; index < 40; index += 1) {
      store.addMember({ ...keysPlayer(), id: `m-test-keys-${index}` });
    }
    await fixture.whenStable();

    expect(store.validationErrors().length).toBeGreaterThan(0);
    expect(queryAll('validation-error').length).toBe(store.validationErrors().length);
    expect(query('validation-error').textContent).toContain(store.validationErrors()[0]);
  });
});
