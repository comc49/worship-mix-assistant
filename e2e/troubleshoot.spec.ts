import { expect, test } from '@playwright/test';
import { loadExampleLineup, saveScreenshot, SKILL_WORDS } from './helpers';

const MINIMUM_SYMPTOM_COUNT = 19;

test('every symptom is reachable from one screen in two taps', async ({ page }, testInfo) => {
  await loadExampleLineup(page);
  await page.goto('/troubleshoot');

  const symptomButtons = page.getByTestId('symptom-button');
  await expect(symptomButtons.first()).toBeVisible();
  const symptomCount = await symptomButtons.count();
  expect(symptomCount).toBeGreaterThanOrEqual(MINIMUM_SYMPTOM_COUNT);
  await saveScreenshot(page, 'troubleshoot', testInfo.project.name);

  for (let index = 0; index < symptomCount; index = index + 1) {
    // Tap one: the symptom. Some symptoms then ask which channel (tap two).
    await page.getByTestId('symptom-button').nth(index).click();
    const targetOptions = page.getByTestId('target-option');
    const firstStep = page.getByTestId('walker-question').or(page.getByTestId('walker-fix')).or(page.getByTestId('walker-ask-for-help'));
    // The walk has opened once its symptom heading shows. The channel picker, where a tree has one, is optional.
    await expect(page.getByTestId('walker-symptom')).toBeVisible();
    if ((await targetOptions.count()) > 0) {
      await targetOptions.first().click();
    }
    await expect(firstStep.first()).toBeVisible();
    await expect(page.getByTestId('safety-badge').first()).toBeVisible();
    expect(await page.locator('main').innerText()).not.toMatch(SKILL_WORDS);
    await page.getByTestId('walker-change-symptom').click();
  }
});

test('walks "vocals buried" to a fix, and hides rehearsal-only steps during a service', async ({ page }, testInfo) => {
  await loadExampleLineup(page);
  await page.goto('/troubleshoot');
  await page.getByTestId('situation-service').click();
  await page.locator('[data-symptom-id="vocalsBuried"]').click();

  // Answer "no" until the walk ends. It must end in a fix or in "ask for help".
  const ending = page.getByTestId('walker-fix').or(page.getByTestId('walker-ask-for-help'));
  for (let step = 0; step < 20; step = step + 1) {
    // Wait for the next card to render before deciding whether the walk has ended.
    await expect(page.getByTestId('walker-question').or(ending).first()).toBeVisible();
    const questionCount = await page.getByTestId('walker-question').count();
    if (questionCount === 0) {
      break;
    }
    await expect(page.getByTestId('safety-badge').first()).not.toContainText(/rehearsal only/i);
    await page.getByTestId('answer-no').click();
    // The trail of answers grows by one each time, even when two questions read the same.
    await expect(page.getByTestId('walker-trail').locator('li')).toHaveCount(step + 1);
  }
  await expect(ending.first()).toBeVisible();
  await saveScreenshot(page, 'troubleshoot-walk', testInfo.project.name);

  await page.getByTestId('walker-back').click();
  await expect(page.getByTestId('walker-question')).toBeVisible();
});
