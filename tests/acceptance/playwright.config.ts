/**
 * Runs agent acceptance against a fresh, loopback-only Meteor database.
 * Never reuses a running server or inherits an external Mongo connection.
 */
import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const localDir = mkdtempSync(join(tmpdir(), 'inventory-agent-acceptance-'));
const token = 'fictional-acceptance-token-never-use-for-deployment';
process.env.INVENTORY_ACCEPTANCE_TOKEN = token;

export default defineConfig({
    testDir: '.',
    testMatch: 'agent-ingestion.spec.ts',
    workers: 1,
    retries: 0,
    timeout: 120000,
    reporter: 'list',
    outputDir: '../../test-results/agent-acceptance',
    use: { baseURL: 'http://127.0.0.1:3287', browserName: 'chromium', screenshot: 'only-on-failure' },
    webServer: {
        command:
            'env -u MONGO_URL -u MONGO_OPLOG_URL -u NAS_MONGO_URL -u E2E_RESET_DATABASE meteor run --port 127.0.0.1:3287',
        cwd: '../../meteor-app',
        url: 'http://127.0.0.1:3287',
        reuseExistingServer: false,
        timeout: 240000,
        env: {
            METEOR_LOCAL_DIR: localDir,
            INVENTORY_AGENT_TOKEN: token,
            INVENTORY_SEARCH_URL: process.env.INVENTORY_SEARCH_URL ?? 'http://127.0.0.1:7700',
            INVENTORY_SEARCH_API_KEY:
                process.env.INVENTORY_SEARCH_API_KEY ?? 'inventory-search-internal-development-key-32-chars',
            INVENTORY_SEARCH_INDEX: process.env.INVENTORY_SEARCH_INDEX ?? 'inventory_agent_acceptance',
        },
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
