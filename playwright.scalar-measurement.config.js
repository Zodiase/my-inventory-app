/**
 * Explicit review-gated nine-document causal measurement, excluded from ordinary CI.
 * Keeps original assertions and fixtures; retains every attempt without retries.
 */
import base from './playwright.config.js';
if (!process.env.SCALAR_MEASUREMENT_OUTPUT) throw new Error('Explicit scalar measurement output directory required');
export default {
    ...base,
    testMatch: '**/scalar-navigation.measurement.spec.proposal.ts',
    retries: 0,
    workers: 1,
    preserveOutput: 'always',
    outputDir: process.env.SCALAR_MEASUREMENT_OUTPUT,
};
