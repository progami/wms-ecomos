import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration specifically for performance tests
 */
export default defineConfig({
  testDir: './performance',
  /* Use a longer timeout for performance tests */
  timeout: 60 * 1000,
  /* Run tests in files in parallel */
  fullyParallel: false, // Performance tests should run sequentially
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Single worker for performance consistency */
  workers: 1,
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'performance-report' }],
    ['json', { outputFile: 'performance-results.json' }],
    ['list']
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3002',

    /* Collect trace for performance analysis */
    trace: 'on',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video for performance analysis */
    video: 'on',
    
    /* Network conditions for performance testing */
    // Can be customized for different network speeds
    // offline: false,
    // downloadThroughput: 50 * 1024, // 50kb/s
    // uploadThroughput: 20 * 1024, // 20kb/s
    // latency: 500,
  },

  /* Configure projects for performance testing */
  projects: [
    {
      name: 'Desktop Performance',
      use: { 
        ...devices['Desktop Chrome'],
        /* Enable performance metrics */
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--disable-dev-shm-usage',
          ]
        }
      },
    },
    {
      name: 'Mobile Performance',
      use: { 
        ...devices['Pixel 5'],
        /* Mobile performance testing with throttling */
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--disable-dev-shm-usage',
          ]
        }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev -- --port 3002',
    port: 3002,
    reuseExistingServer: !process.env.CI,
    cwd: '..',
    timeout: 120 * 1000,
  },
});