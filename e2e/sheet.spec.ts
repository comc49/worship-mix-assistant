import { expect, Page, test } from '@playwright/test';
import { FIXTURE_BAND, loadExampleLineup, saveScreenshot, SKILL_WORDS } from './helpers';

const SECTION_IDS = ['protect', 'patch', 'gain', 'lowCuts', 'groups', 'fx', 'dynamics', 'monitors', 'main'];

async function walkSheet(page: Page, consoleId: 'x32' | 'wingCompact', projectName: string): Promise<void> {
  await page.goto('/sheet');
  await page.getByTestId(`console-switch-${consoleId}`).click();
  await expect(page.getByTestId(`console-switch-${consoleId}`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('sheet-disclaimer')).toHaveCount(1);
  await expect(page.getByTestId('sheet-error')).toHaveCount(0);

  // Every section is there, in setup order, and each has steps.
  const sections = page.getByTestId('sheet-section');
  await expect(sections).toHaveCount(SECTION_IDS.length);
  for (let index = 0; index < SECTION_IDS.length; index = index + 1) {
    const section = sections.nth(index);
    await expect(section).toHaveAttribute('data-section-id', SECTION_IDS[index]);
    expect(await section.getByTestId('sheet-step').count()).toBeGreaterThan(0);
  }

  // Rehearsal-only steps are visibly marked.
  expect(await page.getByTestId('badge-rehearsal').count()).toBeGreaterThan(5);

  // Tapping a value shows its range, reason, listen-for note and provenance trail.
  const lowCutStep = page.locator('[data-section-id="lowCuts"] [data-testid="sheet-step"]').first();
  await lowCutStep.getByTestId('step-value').click();
  await expect(lowCutStep.getByTestId('step-detail')).toBeVisible();
  await expect(lowCutStep.getByTestId('step-provenance')).toContainText('Baseline');

  // Checking a step survives a reload.
  const firstCheckbox = page.getByTestId('step-checkbox').first();
  await firstCheckbox.check();
  await page.reload();
  await expect(page.getByTestId('step-checkbox').first()).toBeChecked();

  // The reference appendix has no checkboxes.
  const reference = page.getByTestId('sheet-reference');
  await expect(reference).toBeVisible();
  await expect(reference.locator('input[type="checkbox"]')).toHaveCount(0);

  // No rating wording anywhere on the sheet, but the names are there.
  const sheetText = await page.locator('main').innerText();
  expect(sheetText).not.toMatch(SKILL_WORDS);
  expect(sheetText).toContain(FIXTURE_BAND[0].name);

  await saveScreenshot(page, `sheet-${consoleId}`, projectName);
}

test('walks a full X32 sheet for the fixture band', async ({ page }, testInfo) => {
  await loadExampleLineup(page);
  await walkSheet(page, 'x32', testInfo.project.name);
});

test('walks a full WING Compact sheet for the fixture band', async ({ page }, testInfo) => {
  await loadExampleLineup(page);
  await walkSheet(page, 'wingCompact', testInfo.project.name);
});

test('overview and soundcheck show the plan with no rating wording', async ({ page }, testInfo) => {
  await loadExampleLineup(page);

  await page.goto('/overview');
  await expect(page.getByTestId('overview-card')).toHaveCount(9);
  expect(await page.locator('main').innerText()).not.toMatch(SKILL_WORDS);
  await saveScreenshot(page, 'overview', testInfo.project.name);

  await page.goto('/soundcheck');
  const steps = page.getByTestId('soundcheck-step');
  await expect(steps.first()).toContainText('Ring out the vocal mics');
  expect(await page.locator('main').innerText()).not.toMatch(SKILL_WORDS);
  await saveScreenshot(page, 'soundcheck', testInfo.project.name);
});

test('saves the sheet as a PDF with no rating wording', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet', 'One PDF is enough.');
  await loadExampleLineup(page);
  await page.goto('/sheet');
  await expect(page.getByTestId('sheet-section')).toHaveCount(SECTION_IDS.length);

  await page.emulateMedia({ media: 'print' });
  const printedText = await page.locator('body').innerText();
  expect(printedText).not.toMatch(SKILL_WORDS);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();

  await page.pdf({ path: 'docs/screenshots/sheet-x32-fixture-band.pdf', format: 'A4', printBackground: false });
});
