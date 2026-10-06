/** Isolated synthetic DOM/lifecycle controls; never starts an app or touches a database. */
export default {
    testDir: './tests/e2e/mechanisms',
    testMatch: '**/retained-readiness.controls.mjs',
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
    workers: 1,
    retries: 0,
    use: { trace: 'on', screenshot: 'on' },
    preserveOutput: 'always',
    outputDir: process.env.RETAINED_CONTROLS_OUTPUT || '/private/tmp/retained-readiness-controls',
};
