import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['html'],
    // Phase 2 TODO: add json reporter + allure + github-actions reporter
  ],
  use: {
    baseURL: 'http://localhost:3000/',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npx serve frontend -l 3000',
    url: 'http://localhost:3000/index.html',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Phase 2 TODO: add firefox, webkit
  ],
});
