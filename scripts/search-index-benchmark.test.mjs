import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const benchmark = path.join(repoRoot, 'scripts', 'search-index-benchmark.mjs');

const run = (...args) => spawnSync(process.execPath, [benchmark, ...args], { encoding: 'utf8' });

test('benchmark refuses an index outside the disposable namespace', () => {
    const result = run('--index', 'inventory_items', '--confirm-disposable');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /disposable inventory_benchmark_ prefix/);
});

test('benchmark requires confirmation for an explicitly named disposable index', () => {
    const result = run('--index', 'inventory_benchmark_manual');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /requires --confirm-disposable/);
});
