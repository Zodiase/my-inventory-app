/** Preparation only: four controlled actual-App documents require exact-head independent approval. */
import { execFileSync } from 'node:child_process';
import base from './playwright.config.js';
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (process.env.CONTROLLED_APP_REVIEWED_HEAD !== head || !process.env.CONTROLLED_APP_OUTPUT)
    throw new Error('Independent exact-head approval/output required before controlled App run');
export default {
    ...base,
    testMatch: '**/controlled-readiness.discriminator.spec.proposal.ts',
    projects: base.projects.filter((p) => p.name === 'chromium'),
    retries: 0,
    workers: 1,
    preserveOutput: 'always',
    outputDir: process.env.CONTROLLED_APP_OUTPUT,
};
