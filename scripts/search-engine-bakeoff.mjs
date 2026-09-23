#!/usr/bin/env node
/**
 * Runs the checked-in multilingual recall corpus against local search candidates.
 * It owns candidate setup and result normalization so architecture decisions remain
 * reproducible without depending on hosted services or personal inventory data.
 */
import { readFile } from 'node:fs/promises';

const corpusUrl = new URL('../tests/search-recall-corpus.json', import.meta.url);
const corpus = JSON.parse(await readFile(corpusUrl, 'utf8'));
const typesenseUrl = process.env.TYPESENSE_URL ?? 'http://127.0.0.1:18108';
const meiliUrl = process.env.MEILI_URL ?? 'http://127.0.0.1:17700';
const apiKey = process.env.SEARCH_EVAL_API_KEY ?? 'bd-ast-eval-key';

const request = async (url, options = {}, responseType = 'json') => {
    const response = await fetch(url, options);
    const text = await response.text();
    if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url}: ${response.status} ${text}`);
    if (responseType === 'text') return text;
    return text === '' ? null : JSON.parse(text);
};

const headers = (kind) => ({
    'Content-Type': 'application/json',
    ...(kind === 'typesense' ? { 'X-TYPESENSE-API-KEY': apiKey } : { Authorization: `Bearer ${apiKey}` }),
});

const flattenedValues = (record) =>
    [
        record.identifier,
        record.name,
        record.description,
        ...record.vocabulary_en,
        ...record.vocabulary_zh,
        ...record.vocabulary_ja,
    ].filter(Boolean);

const literalBaseline = async (query) => {
    const needle = query.toLocaleLowerCase();
    return corpus.records
        .filter((record) => flattenedValues(record).some((value) => value.toLocaleLowerCase().includes(needle)))
        .map((record) => ({ id: record.id, score: null, matchedFields: ['literal-substring'] }));
};

const ignoreNotFound = async (action) => {
    try {
        await action();
    } catch (error) {
        if (!String(error).includes('404')) throw error;
    }
};

const setupTypesense = async () => {
    const name = 'inventory_search_bakeoff';
    await request(`${typesenseUrl}/health`);
    await ignoreNotFound(
        async () =>
            await request(`${typesenseUrl}/collections/${name}`, { method: 'DELETE', headers: headers('typesense') })
    );
    await request(`${typesenseUrl}/collections`, {
        method: 'POST',
        headers: headers('typesense'),
        body: JSON.stringify({
            name,
            fields: [
                { name: 'identifier', type: 'string', optional: true },
                { name: 'name', type: 'string', stem: true },
                { name: 'description', type: 'string', stem: true },
                { name: 'vocabulary_en', type: 'string[]', stem: true },
                { name: 'vocabulary_zh', type: 'string[]', locale: 'zh' },
                { name: 'vocabulary_ja', type: 'string[]', locale: 'ja' },
                { name: 'containerId', type: 'string', optional: true, index: false },
            ],
        }),
    });
    const imported = await request(
        `${typesenseUrl}/collections/${name}/documents/import?action=upsert`,
        {
            method: 'POST',
            headers: { ...headers('typesense'), 'Content-Type': 'text/plain' },
            body: corpus.records.map((record) => JSON.stringify(record)).join('\n'),
        },
        'text'
    );
    const failures = String(imported)
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .filter((line) => line.success !== true);
    if (failures.length > 0) throw new Error(`Typesense import failures: ${JSON.stringify(failures)}`);
    const searchFields = async (query, queryBy, extraParams = {}) => {
        const params = new URLSearchParams({
            q: query,
            query_by: queryBy,
            min_len_1typo: '5',
            min_len_2typo: '9',
            enable_typos_for_numerical_tokens: 'false',
            enable_typos_for_alpha_numerical_tokens: 'false',
            split_join_tokens: 'fallback',
            text_match_type: 'max_score',
            per_page: '10',
            ...extraParams,
        });
        const result = await request(`${typesenseUrl}/collections/${name}/documents/search?${params}`, {
            headers: headers('typesense'),
        });
        return result.hits.map((hit) => ({
            id: hit.document.id,
            score: hit.text_match,
            matchedFields: hit.highlights.map((highlight) => highlight.field),
        }));
    };

    return async (query) => {
        if (/^[^\s]+-[A-Za-z0-9]+$/u.test(query)) {
            return searchFields(query, 'identifier', { num_typos: '0' });
        }

        const latinParts = query.match(/[A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)*/gu) ?? [];
        const cjkParts = query.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [];
        const searches = [];
        for (const part of latinParts) {
            searches.push(searchFields(part, 'name,description,vocabulary_en', { query_by_weights: '8,5,4' }));
        }
        for (const part of cjkParts) {
            if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(part)) {
                searches.push(searchFields(part, 'vocabulary_ja', { num_typos: '0' }));
            } else {
                searches.push(
                    Promise.all([
                        searchFields(part, 'vocabulary_zh', { num_typos: '0' }),
                        searchFields(part, 'vocabulary_ja', { num_typos: '0' }),
                    ]).then((groups) => groups.flat())
                );
            }
        }
        if (searches.length === 0) return [];
        const groups = await Promise.all(searches);
        const byId = new Map();
        for (const hit of groups.flat()) {
            const current = byId.get(hit.id) ?? { ...hit, score: 0, matchedFields: [] };
            current.score += Number(hit.score ?? 0);
            current.matchedFields = [...new Set([...current.matchedFields, ...hit.matchedFields])];
            current.groupCount = (current.groupCount ?? 0) + 1;
            byId.set(hit.id, current);
        }
        return [...byId.values()]
            .filter((hit) => hit.groupCount === groups.length)
            .sort((left, right) => right.score - left.score);
    };
};

const waitForMeiliTask = async (uid) => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
        const task = await request(`${meiliUrl}/tasks/${uid}`, { headers: headers('meili') });
        if (task.status === 'succeeded') return;
        if (task.status === 'failed' || task.status === 'canceled')
            throw new Error(`Meilisearch task failed: ${JSON.stringify(task)}`);
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Timed out waiting for Meilisearch task ${uid}`);
};

const setupMeili = async () => {
    const name = 'inventory_search_bakeoff';
    await request(`${meiliUrl}/health`);
    let existingIndex = true;
    try {
        await request(`${meiliUrl}/indexes/${name}`, { headers: headers('meili') });
    } catch (error) {
        if (String(error).includes('404')) existingIndex = false;
        else throw error;
    }
    if (existingIndex) {
        const task = await request(`${meiliUrl}/indexes/${name}`, { method: 'DELETE', headers: headers('meili') });
        await waitForMeiliTask(task.taskUid);
    }
    let task = await request(`${meiliUrl}/indexes`, {
        method: 'POST',
        headers: headers('meili'),
        body: JSON.stringify({ uid: name, primaryKey: 'id' }),
    });
    await waitForMeiliTask(task.taskUid);
    task = await request(`${meiliUrl}/indexes/${name}/settings`, {
        method: 'PATCH',
        headers: headers('meili'),
        body: JSON.stringify({
            searchableAttributes: [
                'identifier',
                'name',
                'description',
                'vocabulary_en',
                'vocabulary_zh',
                'vocabulary_ja',
            ],
            localizedAttributes: [
                { attributePatterns: ['vocabulary_en'], locales: ['eng'] },
                { attributePatterns: ['vocabulary_zh'], locales: ['zho'] },
                { attributePatterns: ['vocabulary_ja'], locales: ['jpn'] },
            ],
            typoTolerance: {
                enabled: true,
                minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 },
                disableOnAttributes: ['identifier', 'vocabulary_zh', 'vocabulary_ja'],
                disableOnNumbers: true,
            },
        }),
    });
    await waitForMeiliTask(task.taskUid);
    task = await request(`${meiliUrl}/indexes/${name}/documents`, {
        method: 'POST',
        headers: headers('meili'),
        body: JSON.stringify(corpus.records),
    });
    await waitForMeiliTask(task.taskUid);
    return async (query) => {
        const result = await request(`${meiliUrl}/indexes/${name}/search`, {
            method: 'POST',
            headers: headers('meili'),
            body: JSON.stringify({
                q: query,
                limit: 10,
                matchingStrategy: 'all',
                attributesToHighlight: ['*'],
                showRankingScore: true,
                showRankingScoreDetails: true,
            }),
        });
        return result.hits.map((hit) => ({
            id: hit.id,
            score: hit._rankingScore,
            matchedFields: Object.entries(hit._formatted ?? {})
                .filter(([, value]) => JSON.stringify(value).includes('<em>'))
                .map(([field]) => field),
        }));
    };
};

const evaluate = (test, hits) => {
    const ids = hits.map((hit) => hit.id);
    const missing = (test.mustInclude ?? []).filter((id) => !ids.includes(id));
    const forbidden = (test.mustExclude ?? []).filter((id) => ids.includes(id));
    const top1Wrong = test.expectedTop1 !== undefined && ids[0] !== test.expectedTop1;
    const noMatchWrong = test.expectNoMatches === true && ids.length !== 0;
    return {
        passed: missing.length === 0 && forbidden.length === 0 && !top1Wrong && !noMatchWrong,
        missing,
        forbidden,
        top1Wrong,
        noMatchWrong,
    };
};

const engines = [
    { name: 'mongo-literal-baseline', search: literalBaseline },
    { name: 'typesense-30.2', search: await setupTypesense() },
    { name: 'meilisearch-1.37.0', search: await setupMeili() },
];

const report = [];
for (const engine of engines) {
    const cases = [];
    for (const test of corpus.queries) {
        const started = performance.now();
        const hits = await engine.search(test.query);
        cases.push({
            id: test.id,
            query: test.query,
            durationMs: Number((performance.now() - started).toFixed(3)),
            hits,
            ...evaluate(test, hits),
        });
    }
    report.push({
        engine: engine.name,
        passed: cases.filter((test) => test.passed).length,
        total: cases.length,
        cases,
    });
}

process.stdout.write(`${JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2)}\n`);
