import { expect, test } from '@playwright/test';
import { buildFixtureBand, saveScreenshot, SKILL_WORDS, startFresh } from './helpers';

test('builds the fixture band from an empty state, saves it as a lineup, reloads and finds it', async ({ page }, testInfo) => {
  await buildFixtureBand(page);
  await expect(page.getByTestId('validation-error')).toHaveCount(0);

  await page.getByTestId('template-name').fill('Sunday regulars');
  await page.getByTestId('save-template').click();
  await expect(page.getByTestId('template-row').filter({ hasText: 'Sunday regulars' })).toHaveCount(1);

  await page.reload();
  await expect(page.getByTestId('member-row')).toHaveCount(8);
  const savedLineup = page.getByTestId('template-row').filter({ hasText: 'Sunday regulars' });
  await expect(savedLineup).toHaveCount(1);

  // The roster never shows a rating or its wording.
  const rosterText = await page.locator('main').innerText();
  expect(rosterText).not.toMatch(SKILL_WORDS);

  await saveScreenshot(page, 'band', testInfo.project.name);

  // A normal Sunday: load the lineup, then swap whoever is different.
  await page.getByTestId('remove-member').first().click();
  await expect(page.getByTestId('member-row')).toHaveCount(7);
  await savedLineup.getByTestId('load-template').click();
  await expect(page.getByTestId('member-row')).toHaveCount(8);
});

test('the member form and the setup screen', async ({ page }, testInfo) => {
  await startFresh(page);
  await page.getByTestId('add-member').click();
  await page.getByTestId('member-name').fill('Vocalist A');
  await page.getByTestId('role-select').selectOption('leadVocal');
  await saveScreenshot(page, 'band-member-form', testInfo.project.name);

  await page.goto('/setup');
  await expect(page.getByTestId('room-button')).toHaveCount(2);
  await page.getByTestId('monitor-type-inEars').click();
  await page.getByTestId('monitor-type-wedges').click();
  await saveScreenshot(page, 'setup', testInfo.project.name);
});
