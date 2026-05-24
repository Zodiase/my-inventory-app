import { defineConfig, devices } from '@playwright/test';

const cliArgs = process.argv.slice(2);
const cliArgText = cliArgs.join(' ');
const selectedProjects = cliArgs.flatMap((arg, index) => {
    if (arg.startsWith('--project=')) {
        return [arg.slice('--project='.length)];
    }

    if (arg === '--project' && cliArgs[index + 1]) {
        return [cliArgs[index + 1]];
    }

    return [];
});
const appProjects = new Set(['chromium', 'iPad', 'iPhone']);
const hasAppTestPath = cliArgText.includes('tests/e2e/app');
const hasStorybookTestPath = cliArgText.includes('tests/e2e/storybook');
const isAppOnlyRun =
    (hasAppTestPath && !hasStorybookTestPath) ||
    (selectedProjects.length > 0 && selectedProjects.every((project) => appProjects.has(project)));
const isStorybookOnlyRun =
    (hasStorybookTestPath && !hasAppTestPath) ||
    (selectedProjects.length > 0 && selectedProjects.every((project) => project === 'storybook-chromium'));

const appWebServer = {
    command: 'meteor run --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Meteor to start
    stdout: 'pipe',
    stderr: 'pipe',
    cwd: './meteor-app',
};

const storybookWebServer = {
    command: 'npm run storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    cwd: './meteor-app',
};

const webServer = [...(isStorybookOnlyRun ? [] : [appWebServer]), ...(isAppOnlyRun ? [] : [storybookWebServer])];

/**
 * Playwright configuration for testing the Meteor inventory app.
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests/e2e',

    /* App E2E tests share a single Meteor database and reset it between tests. */
    /* Keep runs serial by default unless explicitly overridden. */
    fullyParallel: false,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Shared DB reset helpers are not safe under parallel workers. */
    workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 1,

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
            testIgnore: /tests\/e2e\/storybook\/.*\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'iPad',
            testIgnore: /tests\/e2e\/storybook\/.*\.spec\.ts/,
            use: {
                ...devices['iPad Pro'],
                hasTouch: true,
            },
        },
        {
            name: 'iPhone',
            testIgnore: /tests\/e2e\/storybook\/.*\.spec\.ts/,
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

    /* Run your local dev servers before starting the tests */
    // Skip webServer if PLAYWRIGHT_SKIP_WEBSERVER is set (for running tests against already-running servers)
    ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER
        ? {}
        : {
              webServer,
          }),
});
