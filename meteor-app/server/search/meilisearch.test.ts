import assert from 'assert';

import { MeilisearchInventoryClient } from './meilisearch';

describe('Meilisearch inventory client', function () {
    it('preserves engine relevance order without requesting an ID sort', async function () {
        let requestBody: Record<string, unknown> = {};
        const fetchImpl: typeof fetch = async (_input, init) => {
            const body = init?.body;
            if (typeof body !== 'string') throw new Error('Expected a JSON request body');
            requestBody = JSON.parse(body) as Record<string, unknown>;
            return new Response(
                JSON.stringify({
                    estimatedTotalHits: 2,
                    hits: [
                        { id: 'relevant-second-id', _rankingScore: 0.95 },
                        { id: 'less-relevant-first-id', _rankingScore: 0.6 },
                    ],
                }),
                { status: 200 }
            );
        };
        const client = new MeilisearchInventoryClient(
            { url: 'http://127.0.0.1:7700', apiKey: 'test-key', index: 'inventory-test' },
            fetchImpl
        );

        const page = await client.search('moving pads', 0, 20);

        assert.strictEqual(Object.hasOwn(requestBody ?? {}, 'sort'), false);
        assert.deepStrictEqual(
            page.hits.map((hit) => hit.id),
            ['relevant-second-id', 'less-relevant-first-id']
        );
    });
});
