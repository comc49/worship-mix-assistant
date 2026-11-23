import { expect, test } from '@playwright/test';

test('the Sound lab plays, responds to a slider, and compares against bypass', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'tablet', 'The lab is a laptop screen; one run is enough.');
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.goto('/lab');
  await page.getByRole('button', { name: 'Got it' }).click();

  // Lowering the threshold shows more gain reduction straight away.
  const maxReduction = page.getByTestId('lab-max-reduction');
  const before = Number.parseFloat((await maxReduction.innerText()).trim());
  await page.locator('[data-control="thresholdDb"]').fill('200');
  await expect(page.getByTestId('lab-value-thresholdDb')).toHaveText('-48 dB');
  const after = Number.parseFloat((await maxReduction.innerText()).trim());
  expect(after).toBeGreaterThan(before + 5);

  // Play: the meter reading appears and moves.
  await page.getByTestId('lab-play').click();
  await expect(page.getByTestId('lab-play')).toHaveText('Stop');
  await expect(page.getByTestId('lab-live-reduction')).toContainText('dB');

  // A preset changes the controls and says what to listen for.
  await page.locator('[data-preset-id="attackTooFast"]').click();
  await expect(page.getByTestId('lab-listen-for')).toContainText('punch');
  await expect(page.getByTestId('lab-value-attackMs')).toHaveText('0.2 ms');

  await page.getByTestId('lab-bypass').click();
  await expect(page.getByTestId('lab-live-reduction')).toHaveText('-');
  await page.getByTestId('lab-bypass').click();

  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/lab-laptop.png', fullPage: true });

  // The gate has its own controls.
  await page.getByTestId('lab-processor-gate').click();
  await expect(page.locator('[data-control="rangeDb"]')).toBeVisible();
  await page.locator('[data-preset-id="tightSnare"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/lab-gate-laptop.png', fullPage: true });

  await page.getByTestId('lab-play').click();
  await expect(page.getByTestId('lab-play')).toHaveText('Play');
});
