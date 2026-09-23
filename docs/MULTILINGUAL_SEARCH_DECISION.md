# Multilingual inventory search decision

## Decision

Use a locally hosted Meilisearch 1.37.x index as a required, derived search service. MongoDB remains the authoritative source for inventory records and containment. Search hits must be re-read from MongoDB before they are returned, and location paths must always be calculated from current MongoDB data.

The index may contain retrieval fields and source-version metadata only. It must be rebuildable from MongoDB and safe to discard during rollback or recovery.

## Evidence

Run `npm run evaluate:search` with these disposable local candidates available:

```sh
docker run --rm --name inventory-search-typesense-eval \
  -p 127.0.0.1:18108:8108 \
  -e TYPESENSE_API_KEY=bd-ast-eval-key \
  typesense/typesense:30.2 --data-dir /data

docker run --rm --name inventory-search-meili-eval \
  -p 127.0.0.1:17700:7700 \
  -e MEILI_MASTER_KEY=bd-ast-eval-key \
  getmeili/meilisearch:v1.37.0
```

The checked-in corpus is synthetic except for seven deliberately reproduced recall phrases from archived household-intake evidence. The two garage-crate fixtures retain their real inventory record IDs; the laundry-room fixtures use synthetic IDs while preserving the confirmed vocabulary and hierarchy. The evaluation does not read or mutate the live inventory database.

| Candidate                                 | Passed | Important finding                                                                                                                                            |
| ----------------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Existing Mongo literal substring behavior |  13/22 | Missed reordered words, a one-character typo, CJK compounds, mixed-language text, `QR label`, and ranking the more-specific laundry shelf above its cabinet. |
| Typesense 30.2                            |  22/22 | Passed after adding script detection, language-specific searches, result intersection for mixed-language queries, and a separate zero-typo identifier path.  |
| Meilisearch 1.37.0                        |  22/22 | Passed with one configured search request, language-specific indexed attributes, and typo tolerance disabled on identifiers and CJK vocabulary.              |

Meilisearch is selected because both purpose-built engines met recall, while Meilisearch required less application-owned query orchestration. The smaller integration reduces the risk that future vocabulary or script combinations bypass a hand-written language-routing branch.

The corpus covers:

- English names, descriptions, aliases, word reordering, inflection, and a one-character typo;
- Chinese vocabulary and a compound query;
- Japanese katakana and mixed kanji/kana;
- a mixed English/Japanese record query;
- exact identifier matching and a near-miss exclusion;
- bounded behavior for a short typo and an unrelated no-match query;
- the real-intake phrases `USB cables`, `gardening supplies`, `QR label`, `moving pads`, `furniture pads`, `garbage bags`, and `cleaners`.

## Measured local performance

Run `npm run benchmark:search -- --url <disposable-url> --key <key> --index <disposable-index>`. Add `--restart-container <name> --confirm-disposable` only for a disposable Docker candidate. The script deletes its benchmark index when it finishes and never connects to MongoDB.

The following run used Meilisearch 1.37.0 in a disposable loopback-only Docker container on the Apple-silicon Mac mini. Normal writes measured one document from submission through completed indexing and a confirming query. Bulk samples contained 50 documents. Rebuild samples atomically swapped 500-document indexes. Restart samples required both service health and a successful query after restart.

| Operation                    | Samples | p50      | p95      | Maximum  | Failures |
| ---------------------------- | ------: | -------- | -------- | -------- | -------: |
| Normal write to queryable    |      25 | 97.1 ms  | 179.0 ms | 195.9 ms |        0 |
| 50-record bulk intake        |      10 | 104.1 ms | 117.6 ms | 117.6 ms |        0 |
| Query                        |      50 | 45.7 ms  | 51.2 ms  | 52.5 ms  |        0 |
| 500-record atomic rebuild    |      10 | 152.5 ms | 169.3 ms | 169.3 ms |        0 |
| Service restart to queryable |      10 | 255.5 ms | 323.6 ms | 323.6 ms |        0 |

These are local evidence for the current inventory scale, not capacity claims under concurrent production load. The checked-in acceptance flow separately measures application-visible eventual synchronization with bounded polling.

## Compatibility

The integration uses Meilisearch's HTTP API through the Node `fetch` available to the current Meteor runtime. It does not depend on Minimongo, MongoDB text indexes, or a version-specific MongoDB driver extension. This keeps it compatible with the current Meteor 3.4.1, `npm-mongo` 6.16.1, MongoDB Node driver 4.x, and MongoDB 4 deployment.

Meilisearch documents localized attributes for English, Chinese, and Japanese, configurable typo tolerance, asynchronous indexing tasks, atomic index swapping, and an ARM64 Docker image. Relevant primary documentation:

- <https://www.meilisearch.com/docs/reference/api/settings/get-localizedattributes>
- <https://www.meilisearch.com/docs/learn/relevancy/typo_tolerance_settings>
- <https://www.meilisearch.com/docs/reference/api/tasks>
- <https://www.meilisearch.com/docs/reference/api/indexes#swap-indexes>
- <https://www.meilisearch.com/integrations/docker>

## Operational contract

- Search-service unavailability is a distinct error state, never an empty result set.
- There is no alternate fuzzy-search fallback.
- Exact identity-oriented lookup remains separate from natural-language retrieval.
- Normal mutations enqueue derived-index updates after MongoDB succeeds.
- Bulk imports request one full reconciliation after their database writes.
- Startup reconciliation, a 15-minute periodic reconciliation, and full rebuild recover missed or delayed index work.
- Rebuild writes a temporary index and atomically swaps it into service.
- Deployment and rollback preserve the MongoDB volume. The Meilisearch volume is derived state and may be rebuilt.

## Deployment and rollback

1. Start the private Meilisearch service and wait for its health check before starting the new application image. It has no host port in the production Compose topology.
2. Preserve the existing MongoDB named volume and create a separate derived search-data volume. Never use `docker compose down -v` during this rollout.
3. Start the application with the internal search URL, API key, and index name. Startup rebuilds the index from MongoDB before the application finishes starting; a search-service failure therefore fails that startup instead of silently serving empty search results.
4. Verify a natural-language query through both the browser and loopback-only agent API, including a current containment path, before switching traffic.
5. To roll back, route traffic to the previous application image without modifying MongoDB. The older application can ignore the extra search service and its derived volume. Keep the search volume for diagnosis or discard only that derived volume after rollback is stable; never discard or recreate the MongoDB volume.
6. After a search-service or index-format recovery, restart the application or invoke the controlled bulk-import/reconciliation path so the index is regenerated from authoritative MongoDB data.
