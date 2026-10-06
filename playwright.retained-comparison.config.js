/** Prepared six-attempt app comparison; requires an independently reviewed exact HEAD. */
import { execFileSync } from 'node:child_process';
import base from './playwright.config.js';
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.RETAINED_COMPARISON_REVIEWED_HEAD !== head || !process.env.RETAINED_COMPARISON_OUTPUT)
    throw new Error('Independent exact-head approval and explicit output directory required before app comparison');
export default {
    ...base,
    testMatch: '**/retained-navigation.comparison.spec.proposal.ts',
    projects: base.projects.filter((project) => project.name === 'chromium'),
    retries: 0,
    workers: 1,
    preserveOutput: 'always',
    outputDir: process.env.RETAINED_COMPARISON_OUTPUT,
};
