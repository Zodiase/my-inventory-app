import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for testing the Meteor inventory app.
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests/e2e',

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Opt out of parallel tests on CI */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter to use */
    reporter: 'html',

    /* Shared settings for all the projects below */
    use: {
        /* Base URL to use in actions like `await page.goto('/')` */
        baseURL: 'http://localhost:3000',

        /* Collect trace when retrying the failed test */
        trace: 'on-first-retry',

        /* Take screenshot on failure */
        screenshot: 'only-on-failure',

        /* Video on first retry */
        video: 'retain-on-failure',
    },

    /* Configure projects for major browsers and mobile devices */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'iPad',
            use: {
                ...devices['iPad Pro'],
                hasTouch: true,
            },
        },
        {
            name: 'iPhone',
            use: {
                ...devices['iPhone 13'],
                hasTouch: true,
            },
        },
        /* Storybook component testing project */
        {
            name: 'storybook-chromium',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://localhost:6006',
            },
            testMatch: /tests\/e2e\/storybook\/.*\.spec\.ts/,
        },
    ],

    /* Run your local dev server before starting the tests */
    // Skip webServer if PLAYWRIGHT_SKIP_WEBSERVER is set (for running tests against already-running server)
    ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER
        ? {}
        : {
              webServer: {
                  command: 'meteor run --port 3000',
                  url: 'http://localhost:3000',
                  reuseExistingServer: !process.env.CI,
                  timeout: 120 * 1000, // 2 minutes for Meteor to start
                  stdout: 'pipe',
                  stderr: 'pipe',
                  cwd: './meteor-app',
              },
          }),
});
