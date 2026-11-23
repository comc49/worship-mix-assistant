import { expect, test } from '@playwright/test';

test('the production build loads and works with the network disabled', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByText('Worship Mix Assistant')).toBeVisible();

  // Wait until the service worker controls the page and has cached the app.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.waitForTimeout(3000);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Worship Mix Assistant')).toBeVisible();

  // Every screen is reachable offline, including the lazily loaded ones.
  for (const path of ['/band', '/sheet', '/overview', '/soundcheck', '/troubleshoot', '/knobs', '/lab', '/backup', '/setup']) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
  }
});
