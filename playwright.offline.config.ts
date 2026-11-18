import { defineConfig } from '@playwright/test';

/** Runs the offline test against the production build, where the service worker is active. */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/offline.spec.ts'],
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4300',
    browserName: 'chromium',
    viewport: { width: 820, height: 1180 },
  },
  webServer: {
    command: 'npm run build && node scripts/serve-dist.mjs',
    url: 'http://localhost:4300',
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
