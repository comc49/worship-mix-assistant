import { expect, test } from '@playwright/test';

test('the app loads and shows the navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Worship Mix Assistant')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});
