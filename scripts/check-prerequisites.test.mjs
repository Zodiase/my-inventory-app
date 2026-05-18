import { strict as assert } from 'node:assert';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
            stdout += chunk;
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk;
        });
        child.on('error', reject);
        child.on('close', (code) => {
            resolve({ code, stdout, stderr });
        });
    });
}

test('check-prerequisites accepts a pinned feature directory on master via .specify/feature.json', async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), 'specify-prereq-'));

    try {
        const bashDir = path.join(tempRoot, '.specify', 'scripts', 'bash');
        const featureDir = path.join(tempRoot, 'specs', '002-storybook-e2e-testing');

        await mkdir(bashDir, { recursive: true });
        await mkdir(featureDir, { recursive: true });

        for (const scriptName of ['common.sh', 'check-prerequisites.sh']) {
            const source = path.join(repoRoot, '.specify', 'scripts', 'bash', scriptName);
            const destination = path.join(bashDir, scriptName);
            await writeFile(destination, await readFile(source, 'utf8'));
        }

        await writeFile(
            path.join(tempRoot, '.specify', 'feature.json'),
            JSON.stringify({ feature_directory: 'specs/002-storybook-e2e-testing' }, null, 2)
        );
        await writeFile(path.join(featureDir, 'spec.md'), '# test spec\n');
        await writeFile(path.join(featureDir, 'plan.md'), '# test plan\n');
        await writeFile(path.join(featureDir, 'tasks.md'), '# test tasks\n');

        const gitInit = await run('git', ['init', '-q', '-b', 'master'], tempRoot);
        assert.equal(gitInit.code, 0, gitInit.stderr);

        assert.equal((await run('git', ['config', 'user.name', 'Test User'], tempRoot)).code, 0);
        assert.equal((await run('git', ['config', 'user.email', 'test@example.com'], tempRoot)).code, 0);
        const initialCommit = await run('git', ['commit', '--allow-empty', '-m', 'init'], tempRoot);
        assert.equal(initialCommit.code, 0, initialCommit.stderr);

        const result = await run(
            'bash',
            ['.specify/scripts/bash/check-prerequisites.sh', '--json', '--require-tasks', '--include-tasks'],
            tempRoot
        );

        assert.equal(result.code, 0, result.stderr || result.stdout);

        const payload = JSON.parse(result.stdout);
        assert.equal(payload.FEATURE_DIR, path.join(tempRoot, 'specs', '002-storybook-e2e-testing'));
        assert.deepEqual(payload.AVAILABLE_DOCS, ['tasks.md']);
    } finally {
        await rm(tempRoot, { recursive: true, force: true });
    }
});
