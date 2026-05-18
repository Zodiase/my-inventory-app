import { strict as assert } from 'node:assert';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { cleanupMeteorGenerated, GENERATED_METEOR_LOCAL_ENTRIES } from './cleanup-meteor-generated.mjs';

test('removes generated Meteor local state while preserving the local DB', async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), 'meteor-cleanup-'));

    try {
        const appDir = path.join(tempRoot, 'meteor-app');
        const localDir = path.join(appDir, '.meteor', 'local');
        const dbFile = path.join(localDir, 'db', 'collection.wt');

        await mkdir(path.dirname(dbFile), { recursive: true });
        await writeFile(dbFile, 'keep me');

        for (const entry of GENERATED_METEOR_LOCAL_ENTRIES) {
            await mkdir(path.join(localDir, entry), { recursive: true });
            await writeFile(path.join(localDir, entry, 'artifact.txt'), 'generated');
        }

        await writeFile(path.join(localDir, 'resolver-result-cache.json'), 'generated');

        const result = await cleanupMeteorGenerated({ appDir });

        assert.equal(await readFile(dbFile, 'utf8'), 'keep me');
        assert.deepEqual(
            result.removed.sort(),
            [...GENERATED_METEOR_LOCAL_ENTRIES, 'resolver-result-cache.json'].sort()
        );
    } finally {
        await rm(tempRoot, { recursive: true, force: true });
    }
});
