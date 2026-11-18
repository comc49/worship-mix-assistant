import { expect, Page } from '@playwright/test';

/** One role of a fixture member, in the terms the roster form uses. */
export interface RoleInput {
  role: string;
  connection: string;
  /** 0 = first behavior description, 2 = last. */
  behavior: 0 | 1 | 2;
  voiceRange?: 'low' | 'medium' | 'high';
}

export interface MemberInput {
  name: string;
  roles: RoleInput[];
}

/** The fixture band from CLAUDE.md. Placeholder names on purpose. */
export const FIXTURE_BAND: MemberInput[] = [
  {
    name: 'Vocalist A',
    roles: [
      { role: 'leadVocal', connection: 'dynamicMic', behavior: 1, voiceRange: 'medium' },
      { role: 'acousticGuitar', connection: 'monoDi', behavior: 1 },
    ],
  },
  { name: 'Vocalist B', roles: [{ role: 'harmonyVocal', connection: 'dynamicMic', behavior: 0, voiceRange: 'high' }] },
  { name: 'Vocalist C', roles: [{ role: 'harmonyVocal', connection: 'dynamicMic', behavior: 2, voiceRange: 'low' }] },
  { name: 'Keys', roles: [{ role: 'keys', connection: 'stereoDi', behavior: 0 }] },
  { name: 'Pad', roles: [{ role: 'padSynth', connection: 'stereoDi', behavior: 1 }] },
  { name: 'Electric guitar', roles: [{ role: 'electricGuitar', connection: 'modelerDirect', behavior: 1 }] },
  { name: 'Bass', roles: [{ role: 'bassGuitar', connection: 'monoDi', behavior: 0 }] },
  { name: 'Drums', roles: [{ role: 'electronicDrums', connection: 'drumModuleStereoPair', behavior: 1 }] },
];

export const SKILL_WORDS = /beginner|intermediate|advanced/i;

export async function startFresh(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/band');
  await expect(page.getByTestId('add-member')).toBeVisible();
}

export async function addMember(page: Page, member: MemberInput): Promise<void> {
  await page.getByTestId('add-member').click();
  await page.getByTestId('member-name').fill(member.name);

  for (let index = 0; index < member.roles.length; index = index + 1) {
    const input = member.roles[index];
    if (index > 0) {
      await page.getByTestId('add-role').click();
    }
    const roleEditor = page.getByTestId('role-editor').nth(index);
    await roleEditor.getByTestId('role-select').selectOption(input.role);
    await roleEditor.getByTestId('connection-select').selectOption(input.connection);
    if (input.voiceRange !== undefined) {
      await roleEditor.getByTestId('voice-range').selectOption(input.voiceRange);
      await roleEditor.getByTestId('mic-model').selectOption('sm58');
    }
    await roleEditor.getByTestId(`skill-option-${input.behavior}`).check();
  }

  await page.getByTestId('save-member').click();
  await expect(page.getByTestId('member-editor')).toHaveCount(0);
}

export async function buildFixtureBand(page: Page): Promise<void> {
  await startFresh(page);
  for (const member of FIXTURE_BAND) {
    await addMember(page, member);
  }
  await expect(page.getByTestId('member-row')).toHaveCount(FIXTURE_BAND.length);
}

/** Loads the seeded example lineup, which is the same fixture band. Faster than typing it in. */
export async function loadExampleLineup(page: Page): Promise<void> {
  await startFresh(page);
  await page.getByTestId('load-template').first().click();
  await expect(page.getByTestId('member-row')).toHaveCount(FIXTURE_BAND.length);
}

export function screenshotPath(name: string, projectName: string): string {
  return `docs/screenshots/${name}-${projectName}.png`;
}

/** Saves a full-page screenshot from the top of the page, so the sticky header is where a user sees it. */
export async function saveScreenshot(page: Page, name: string, projectName: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: screenshotPath(name, projectName), fullPage: true });
}
