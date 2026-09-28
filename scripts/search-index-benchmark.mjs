/**
 * Measures disposable Meilisearch indexing visibility, bulk intake, rebuild,
 * query, and optional container-restart latency for the inventory search index.
 * The target index is deleted when the run finishes; never point it at live data.
 */
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const option = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index === -1 ? fallback : process.argv[index + 1];
};
const has = (name) => process.argv.includes(name);
const url = option('--url', 'http://127.0.0.1:7700').replace(/\/$/u, '');
const key = option('--key', 'inventory-search-internal-development-key-32-chars');
const index = option('--index', `inventory_benchmark_${Date.now()}`);
const explicitIndex = has('--index');
const restartContainer = option('--restart-container', undefined);
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

if (!/^inventory_benchmark_[A-Za-z0-9_-]+$/u.test(index)) {
    throw new Error('Benchmark index must use the disposable inventory_benchmark_ prefix');
}
if (explicitIndex && !has('--confirm-disposable')) {
    throw new Error('An explicit --index requires --confirm-disposable');
}
if (restartContainer !== undefined && !has('--confirm-disposable')) {
    throw new Error('--restart-container requires --confirm-disposable');
}

const request = async (path, init = {}) => {
    const response = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
    const text = await response.text();
    if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${text}`);
    return text === '' ? undefined : JSON.parse(text);
};
const waitTask = async (uid) => {
    const deadline = performance.now() + 30000;
    while (performance.now() < deadline) {
        const task = await request(`/tasks/${uid}`);
        if (task.status === 'succeeded') return;
        if (task.status === 'failed' || task.status === 'canceled') throw new Error(JSON.stringify(task.error));
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Task ${uid} timed out`);
};
const task = async (path, method, body) => {
    const response = await request(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    await waitTask(response.taskUid);
};
const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
const summary = (samples, failures) => {
    const sorted = samples.toSorted((a, b) => a - b);
    return {
        samples: samples.length,
        p50Ms: Number(percentile(sorted, 0.5).toFixed(1)),
        p95Ms: Number(percentile(sorted, 0.95).toFixed(1)),
        maxMs: Number(sorted.at(-1).toFixed(1)),
        failures,
    };
};
const document = (id, phrase) => ({
    id,
    name: `Benchmark ${id}`,
    description: phrase,
    aliases: [],
    vocabulary_en: [phrase],
    vocabulary_zh: [],
    vocabulary_ja: [],
    metadata: [],
    modifiedAt: new Date().toISOString(),
});
const measure = async (count, run) => {
    const samples = [];
    let failures = 0;
    for (let i = 0; i < count; i++) {
        const started = performance.now();
        try {
            await run(i);
            samples.push(performance.now() - started);
        } catch (error) {
            failures++;
            process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        }
    }
    if (samples.length === 0) throw new Error('Every benchmark sample failed');
    return summary(samples, failures);
};
const waitVisible = async (targetIndex, query, expectedId) => {
    const deadline = performance.now() + 10000;
    while (performance.now() < deadline) {
        const result = await request(`/indexes/${targetIndex}/search`, {
            method: 'POST',
            body: JSON.stringify({ q: query, limit: 20 }),
        });
        if (result.hits.some((hit) => hit.id === expectedId)) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Document ${expectedId} did not become searchable`);
};
const restart = async (container) => {
    await new Promise((resolve, reject) => {
        const child = spawn('docker', ['restart', container], { stdio: 'ignore' });
        child.once('error', reject);
        child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`docker restart exited ${code}`))));
    });
    const deadline = performance.now() + 30000;
    while (performance.now() < deadline) {
        try {
            const health = await request('/health');
            if (health.status === 'available') return;
        } catch {
            // Expected while the disposable service restarts.
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('Search service did not become healthy after restart');
};

const settings = {
    searchableAttributes: [
        'id',
        'name',
        'description',
        'aliases',
        'vocabulary_en',
        'vocabulary_zh',
        'vocabulary_ja',
        'metadata',
    ],
    localizedAttributes: [
        { attributePatterns: ['name', 'description', 'aliases', 'metadata', 'vocabulary_en'], locales: ['eng'] },
        { attributePatterns: ['vocabulary_zh'], locales: ['zho'] },
        { attributePatterns: ['vocabulary_ja'], locales: ['jpn'] },
    ],
    typoTolerance: {
        enabled: true,
        minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 },
        disableOnAttributes: ['id', 'vocabulary_zh', 'vocabulary_ja'],
        disableOnNumbers: true,
    },
    sortableAttributes: ['id'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'exactness', 'sort'],
};

const createIndex = async (uid) => {
    await task('/indexes', 'POST', { uid, primaryKey: 'id' });
    await task(`/indexes/${uid}/settings`, 'PATCH', settings);
};
const deleteIfPresent = async (uid) => {
    const exists = await fetch(`${url}/indexes/${uid}`, { headers });
    if (exists.status === 404) return;
    if (!exists.ok) throw new Error(await exists.text());
    const response = await fetch(`${url}/indexes/${uid}`, { method: 'DELETE', headers });
    const body = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(body));
    await waitTask(body.taskUid);
};

await deleteIfPresent(index);
await createIndex(index);
try {
    const normalWrites = await measure(25, async (i) => {
        const id = `normal_${i}`;
        const phrase = `visibility phrase ${i}`;
        await task(`/indexes/${index}/documents`, 'POST', [document(id, phrase)]);
        await waitVisible(index, phrase, id);
    });
    const bulkIntake = await measure(10, async (batch) => {
        const documents = Array.from({ length: 50 }, (_, i) =>
            document(`bulk_${batch}_${i}`, `bulk visibility ${batch} ${i}`)
        );
        await task(`/indexes/${index}/documents`, 'POST', documents);
        await waitVisible(index, `bulk visibility ${batch} 49`, `bulk_${batch}_49`);
    });
    const query = await measure(50, async (i) => {
        await waitVisible(index, `visibility phrase ${i % 25}`, `normal_${i % 25}`);
    });
    const rebuild = await measure(10, async (sample) => {
        const temporary = `${index}_swap_${sample}`;
        await createIndex(temporary);
        await task(
            `/indexes/${temporary}/documents`,
            'POST',
            Array.from({ length: 500 }, (_, i) => document(`rebuild_${sample}_${i}`, `rebuild ${sample} ${i}`))
        );
        await task('/swap-indexes', 'POST', [{ indexes: [index, temporary] }]);
        await task(`/indexes/${temporary}`, 'DELETE');
        await waitVisible(index, `rebuild ${sample} 499`, `rebuild_${sample}_499`);
    });
    const serviceRestart =
        restartContainer === undefined
            ? undefined
            : await measure(10, async () => {
                  await restart(restartContainer);
                  await waitVisible(index, 'rebuild 9 499', 'rebuild_9_499');
              });
    process.stdout.write(
        `${JSON.stringify({ generatedAt: new Date().toISOString(), normalWrites, bulkIntake, query, rebuild, serviceRestart }, null, 2)}\n`
    );
} finally {
    await deleteIfPresent(index);
}
