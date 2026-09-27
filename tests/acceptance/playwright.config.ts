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
const externalSearchConfiguration = [
    process.env.INVENTORY_SEARCH_URL,
    process.env.INVENTORY_SEARCH_API_KEY,
    process.env.INVENTORY_SEARCH_INDEX,
];
if (externalSearchConfiguration.some(Boolean) && !externalSearchConfiguration.every(Boolean)) {
    throw new Error(
        'Set INVENTORY_SEARCH_URL, INVENTORY_SEARCH_API_KEY, and INVENTORY_SEARCH_INDEX together for acceptance.'
    );
}
const usesExternalSearch = externalSearchConfiguration.every(Boolean);
const searchPort = process.env.INVENTORY_ACCEPTANCE_SEARCH_PORT ?? '7787';
const searchUrl = process.env.INVENTORY_SEARCH_URL ?? `http://127.0.0.1:${searchPort}`;
const searchApiKey = process.env.INVENTORY_SEARCH_API_KEY ?? 'inventory-search-internal-development-key-32-chars';
const searchIndex = process.env.INVENTORY_SEARCH_INDEX ?? 'inventory_agent_acceptance';

const searchWebServer = {
    command:
        `docker run --rm --name inventory-agent-acceptance-search -p 127.0.0.1:${searchPort}:7700 ` +
        '-e MEILI_ENV -e MEILI_NO_ANALYTICS -e MEILI_MASTER_KEY getmeili/meilisearch:v1.37.0',
    url: `${searchUrl.replace(/\/$/u, '')}/health`,
    reuseExistingServer: false,
    timeout: 120000,
    stdout: 'pipe' as const,
    stderr: 'pipe' as const,
    env: {
        MEILI_ENV: 'production',
        MEILI_NO_ANALYTICS: 'true',
        MEILI_MASTER_KEY: searchApiKey,
    },
};

const meteorWebServer = {
    command:
        'env -u MONGO_URL -u MONGO_OPLOG_URL -u NAS_MONGO_URL -u E2E_RESET_DATABASE meteor run --port 127.0.0.1:3287',
    cwd: '../../meteor-app',
    url: 'http://127.0.0.1:3287',
    reuseExistingServer: false,
    timeout: 240000,
    env: {
        METEOR_LOCAL_DIR: localDir,
        INVENTORY_AGENT_TOKEN: token,
        INVENTORY_SEARCH_URL: searchUrl,
        INVENTORY_SEARCH_API_KEY: searchApiKey,
        INVENTORY_SEARCH_INDEX: searchIndex,
    },
    stdout: 'pipe' as const,
    stderr: 'pipe' as const,
};

export default defineConfig({
    testDir: '.',
    testMatch: 'agent-ingestion.spec.ts',
    workers: 1,
    retries: 0,
    timeout: 120000,
    reporter: 'list',
    outputDir: '../../test-results/agent-acceptance',
    use: { baseURL: 'http://127.0.0.1:3287', browserName: 'chromium', screenshot: 'only-on-failure' },
    webServer: [...(usesExternalSearch ? [] : [searchWebServer]), meteorWebServer],
});
