import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 5,
  reporter: [
    ['html', { outputFolder: './playwright-report' }],
    ['junit', { outputFile: './playwright-results.xml' }],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: process.env.CI ? 'npm run start:ci' : 'npm run start',
    port: 3000,
    url: process.env.CI ? 'http://localhost:3000/api/health-ci' : 'http://localhost:3000/api/health',
    timeout: 180 * 1000, // Increased timeout for CI
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe', // Show server output for debugging
    stderr: 'pipe',
  },
});