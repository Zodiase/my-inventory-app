# Synthetic agent ingestion acceptance

`fixtures/alder-lantern.json` is entirely fictional. The scenario preserves unknown floor count and bedroom ownership, nests bathrooms inside bedrooms, treats appliances as ordinary items, and keeps connected garage/basement spaces as siblings.

## Safe disposable run

Run from a checkout containing both the agent v1 implementation and these tests:

```sh
npm ci --ignore-scripts
(cd meteor-app && npm ci --ignore-scripts)
npx playwright install chromium
npx playwright test --config tests/acceptance/playwright.config.ts
```

The dedicated configuration starts Meteor on `127.0.0.1:3287` with a newly allocated temporary `METEOR_LOCAL_DIR` for each invocation. It removes inherited Mongo connection variables, never reuses an existing server, supplies a fictional test token, and does not enable the database reset endpoint. An occupied port causes failure. Do not substitute the general E2E config or an existing personal server. Temporary directories use the `inventory-agent-acceptance-` prefix and may be removed after the spawned server exits if no longer needed for diagnosis.

Discovery-only check (no server or database):

```sh
npx playwright test --config tests/acceptance/playwright.config.ts --list
```

The suite uses the authenticated `POST /api/agent/v1` contract. It verifies create/get, hierarchy and unresolved notes, duplicate-free replay, changed-payload conflict, external identity uniqueness, optimistic concurrency, correction/move audit history, replay after later mutation, identity lookup after movement, two-step agent logical deletion, and UI logical deletion. It proves ordinary reads hide tombstones while `auditGet` retains the document and identity binding. It compares every active agent item with the app's `items.search` results and checks rendered item name, description and location. No private data, global reset, or deployment is involved.

Verified 2026-09-08: the revised implementation passes the unchanged live scenario (1 passed in 17.8 seconds) in the independent acceptance checkout. The earlier HTTP 403 blocker was caused by Meteor development proxy forwarding headers, not an observed browser Origin header. The development-only single-loopback-hop handling resolves it; production still rejects proxy headers. Rerun this suite after integration or transport changes.

An interrupted pending mutation cannot be induced safely through the public API alone. The implementation's focused fault-injection tests must separately prove the indeterminate boundary; this browser scenario does not claim that coverage.

The live-discovery checks resolve the complete current subtree, paginate direct children, reject oversized hierarchy requests, discover a room added after intake, and stop reporting it under the original home after it is moved out. They do not use the original intake IDs to discover new records.
