import { expect, test } from '@playwright/test';

test('the app loads and shows the navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Worship Mix Assistant')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test('the Knobs tab shows a group as tiles and explains attack and release', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Knobs' }).click();
  await page.locator('[data-testid="knob-group-tab"][data-group-id="compressor"]').click();
  await expect(page.getByTestId('knob-tile')).toHaveCount(6);

  await page.locator('[data-testid="knob-tile"][data-knob-id="compAttack"]').click();
  await expect(page.getByTestId('knob-detail')).toContainText('How quickly the compressor reacts');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `docs/screenshots/knobs-${testInfo.project.name}.png`, fullPage: true });

  await page.locator('[data-testid="knob-tile"][data-knob-id="compRelease"]').click();
  await expect(page.getByTestId('knob-detail')).toContainText('pumping');

  // On the tablet the whole group and its detail panel fit on one screen: no scrolling.
  if (testInfo.project.name === 'tablet') {
    await page.getByRole('button', { name: 'Got it' }).click();
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(pageHeight).toBeLessThanOrEqual(1180);
  }
});
