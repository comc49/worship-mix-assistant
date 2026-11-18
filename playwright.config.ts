import { defineConfig } from '@playwright/test';

const TABLET_VIEWPORT = { width: 820, height: 1180 };
const PHONE_VIEWPORT = { width: 390, height: 844 };

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/offline.spec.ts'],
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    browserName: 'chromium',
  },
  projects: [
    { name: 'tablet', use: { viewport: TABLET_VIEWPORT } },
    { name: 'phone', use: { viewport: PHONE_VIEWPORT } },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
