import { expect, test } from '@playwright/test';

test('the production build loads and works with the network disabled', async ({ page, context }) => {
  // The test server sends the content security policy from vercel.json. Anything it blocks is
  // reported on the console, and would mean a broken app once deployed.
  const blockedByPolicy: string[] = [];
  page.on('console', (message) => {
    if (message.text().includes('Content Security Policy')) {
      blockedByPolicy.push(message.text());
    }
  });

  await page.goto('/');
  await expect(page.getByText('Worship Mix Assistant')).toBeVisible();
  const response = await page.request.get('/');
  expect(response.headers()['content-security-policy']).toContain("script-src 'self'");

  // The stylesheet loaded: the page has the app's dark background, not the browser's white.
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(14, 17, 22)');

  // The Sound lab plays under the policy.
  await page.goto('/lab');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByTestId('lab-play').click();
  await expect(page.getByTestId('lab-play')).toHaveText('Stop');
  await page.getByTestId('lab-play').click();

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

  expect(blockedByPolicy).toEqual([]);
});
