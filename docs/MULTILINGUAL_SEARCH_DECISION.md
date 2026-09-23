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

The checked-in corpus is synthetic except for three deliberately reproduced recall phrases and record IDs from the archived garage-crate intake. It does not read or mutate the live inventory database.

| Candidate                                 | Passed | Important finding                                                                                                                                           |
| ----------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing Mongo literal substring behavior |  11/18 | Missed reordered words, a one-character typo, CJK compounds, mixed-language text, and `QR label` in the crate descriptions.                                 |
| Typesense 30.2                            |  18/18 | Passed after adding script detection, language-specific searches, result intersection for mixed-language queries, and a separate zero-typo identifier path. |
| Meilisearch 1.37.0                        |  18/18 | Passed with one configured search request, language-specific indexed attributes, and typo tolerance disabled on identifiers and CJK vocabulary.             |

Meilisearch is selected because both purpose-built engines met recall, while Meilisearch required less application-owned query orchestration. The smaller integration reduces the risk that future vocabulary or script combinations bypass a hand-written language-routing branch.

The corpus covers:

- English names, descriptions, aliases, word reordering, inflection, and a one-character typo;
- Chinese vocabulary and a compound query;
- Japanese katakana and mixed kanji/kana;
- a mixed English/Japanese record query;
- exact identifier matching and a near-miss exclusion;
- bounded behavior for a short typo and an unrelated no-match query;
- the real-intake phrases `USB cables`, `gardening supplies`, and `QR label`.

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
- Startup reconciliation and full rebuild recover missed or delayed index work.
- Rebuild writes a temporary index and atomically swaps it into service.
- Deployment and rollback preserve the MongoDB volume. The Meilisearch volume is derived state and may be rebuilt.
