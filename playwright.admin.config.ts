import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './admin-e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:3101', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `${process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'} --filter @matiq/admin-web exec next dev --port 3101`,
    url: 'http://localhost:3101',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
