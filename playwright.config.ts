import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/Collections-App/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'unit', testMatch: 'unit/**/*.spec.ts' },
    { name: 'desktop-chrome', testMatch: 'e2e/**/*.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'android-chrome', testMatch: 'e2e/**/*.spec.ts', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-safari', testMatch: 'e2e/**/*.spec.ts', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: 'node scripts/build-web.mjs && node tests/support/serve-dist.mjs',
    url: `http://localhost:${PORT}/Collections-App/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { PORT: String(PORT) },
  },
});
