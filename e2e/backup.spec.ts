import { expect, test } from '@playwright/test';
import { loadExampleLineup, saveScreenshot } from './helpers';

test('exports a backup, clears storage, imports it and finds everything restored', async ({ page }, testInfo) => {
  await loadExampleLineup(page);
  await page.getByTestId('template-name').fill('Backup test lineup');
  await page.getByTestId('save-template').click();

  await page.goto('/backup');
  await page.getByTestId('export-start').click();
  // The warning that the file holds names and ratings comes before the download.
  await expect(page.getByTestId('export-warning')).toContainText('not for sharing');
  await saveScreenshot(page, 'backup', testInfo.project.name);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-confirm').click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath('backup.json');
  await download.saveAs(backupPath);

  // Clear everything.
  await page.evaluate(() => localStorage.clear());
  await page.goto('/band');
  await expect(page.getByTestId('member-row')).toHaveCount(0);
  await expect(page.getByTestId('template-row').filter({ hasText: 'Backup test lineup' })).toHaveCount(0);

  // Import and find it all back.
  await page.goto('/backup');
  await page.getByTestId('import-file').setInputFiles(backupPath);
  await expect(page.getByTestId('backup-message')).toContainText('restored');
  await page.goto('/band');
  await expect(page.getByTestId('member-row')).toHaveCount(8);
  await expect(page.getByTestId('template-row').filter({ hasText: 'Backup test lineup' })).toHaveCount(1);
});
