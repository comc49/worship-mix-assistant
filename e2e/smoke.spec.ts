import { expect, test } from '@playwright/test';

test('the app loads and shows the navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Worship Mix Assistant')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test('the Knobs tab explains attack and release', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Knobs' }).click();
  await expect(page.locator('[data-knob-id="compAttack"]')).toContainText('Attack');
  await expect(page.locator('[data-knob-id="compRelease"]')).toContainText('Release');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `docs/screenshots/knobs-${testInfo.project.name}.png`, fullPage: true });
});
