# Local inventory agent interface v1

The target inventory-deletion design is defined by
[`LOGICAL_DELETION.md`](LOGICAL_DELETION.md): same-collection tombstones first,
with physical cold storage deferred until measured performance justifies it.
Deletion remains excluded from the current v1 agent API. Its planned two-step
protocol must preserve records, identities and history rather than physically
removing documents.

This opt-in JSON interface writes the same `items` collection used by the UI. It reuses the application's create/update/move business functions and supports nested containers and ordinary items. It does not issue stickers, write a household journal, ingest real household data automatically, or deploy anything.

## Run against disposable local data

Install root and application dependencies. For a reproducible disposable run including UI checks, use [the acceptance runbook](../tests/acceptance/README.md).

For manual fictional requests, allocate a fresh Meteor data directory and bind explicitly to loopback. This command removes inherited database connection variables; do not load a personal environment file into this run.

```bash
export INVENTORY_AGENT_TOKEN="$(openssl rand -hex 32)"
export METEOR_LOCAL_DIR="$(mktemp -d -t inventory-agent-manual)"
cd meteor-app
env -u MONGO_URL -u MONGO_OPLOG_URL -u NAS_MONGO_URL -u E2E_RESET_DATABASE meteor run --port 127.0.0.1:3000
```

Keep the token in the server environment and the calling agent's secret environment; it is never placed in Meteor public settings or sent to the browser. For another shell, provide the same secret using your normal secret handling. A token shorter than 32 characters disables the route. The HTTP handler checks the actual socket peer for loopback, rejects browser `Origin` and RFC `Forwarded` headers, and requires the token. In Meteor development mode only, it accepts the runner's single loopback `X-Forwarded-For` hop with a single `http` protocol and numeric port. Forwarding chains, non-loopback addresses, unknown `X-Forwarded-*` headers and malformed metadata are rejected. Production mode rejects all `X-Forwarded-*` headers. Keep the server bound to `127.0.0.1`; do not put this route behind a reverse proxy that hides remote clients as loopback. The app's existing unauthenticated UI and DDP behavior is unchanged; this endpoint does not make the whole app an authenticated service.

Every operation is a JSON POST to `/api/agent/v1`, with `Content-Type: application/json` and `Authorization: Bearer <token>`. Bodies are limited to 32 KiB. For example, create a fictional root container:

```bash
curl --fail-with-body http://127.0.0.1:3000/api/agent/v1 \
  -H "Authorization: Bearer $INVENTORY_AGENT_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary '{"op":"create","requestId":"example-room-1","source":{"system":"synthetic-example","reference":"fictional-room"},"item":{"name":"Example Room","isContainer":true,"description":"Fictional fixture only"}}'
```

The result has this shape (IDs, dates and version hashes are illustrative):

```json
{
    "ok": true,
    "replayed": false,
    "result": {
        "item": {
            "_id": "agent-<hash>",
            "name": "Example Room",
            "isContainer": true,
            "description": "Fictional fixture only",
            "tagIds": [],
            "createdAt": "2026-01-01T00:00:00.000Z",
            "modifiedAt": "2026-01-01T00:00:00.000Z"
        },
        "version": "<opaque snapshot hash>",
        "externalIdentities": []
    }
}
```

Open `/items/<result.item._id>` for UI readback. Descriptions are the visible item notes. Source attribution and correction reasons are in the agent history; the current UI does not render that history or the identity mapping.

## Contract

Unknown fields, wrong types, empty required strings and unsupported operations are rejected. Names are at most 500 characters; descriptions and audit notes at most 5000. `requestId`, `itemId`, identity namespace and source system are at most 200 characters; identity values at most 500 and source reference at most 2000. Identity strings are exact and case-sensitive, with no UUID normalization or validation against an external registry. Use the external system's canonical spelling.

Every mutation requires `requestId` and `source: {system, reference}`. Optional `note` explains the observation or correction. Request IDs are global within this inventory database, not scoped to source; callers should prefix them with their workflow/fixture identity. Use one stable key per logical mutation. IDs are retained indefinitely in v1.

| `op`           | Other fields                                                                                            | Result                                            |
| -------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `create`       | `item: {name, isContainer, description?, containerId?}`, optional `externalIdentity: {namespace,value}` | Readback                                          |
| `update`       | `itemId`, `expectedVersion`, `changes: {name?,description?}` (nonempty)                                 | Readback                                          |
| `move`         | `itemId`, `expectedVersion`, `containerId` (app ID or `null` for root)                                  | Readback                                          |
| `bindIdentity` | `itemId`, `expectedVersion`, `externalIdentity: {namespace,value}`                                      | Readback                                          |
| `children`     | `containerId` (ID or null), optional `after`, `limit`                                                   | `{items: Readback[], nextCursor: string or null}` |
| `hierarchy`    | `itemId`, optional `maxNodes`                                                                           | `{root: Readback, items: Readback[]}`             |
| `get`          | `itemId`                                                                                                | Readback                                          |
| `lookup`       | Exactly one of nonempty `name` or `externalIdentity`                                                    | `{items: Readback[]}`                             |
| `history`      | `itemId`                                                                                                | `{events: Event[]}`                               |
| `status`       | `requestId`                                                                                             | `{event: Event \| null}`                          |

A Readback is `{item, version, externalIdentities}`. Read operations do not take source, note or requestId (except status), and do not have a replayed flag. Mutation responses include `replayed`. `version` describes the inventory item snapshot, not the set of external identities. Bindings are additive; one identity can name only one item, and an item may have multiple identities. There is no unbind/reassign operation.

Name lookup is a case-insensitive literal substring search, capped at 100 results in app-ID order; empty name is invalid. History returns the first 1000 events in time/ID order, including pending events. Name lookup and history do not paginate; the children operation supports pagination. Status returns one exact request regardless of history limits. Treat lookup/history as bounded inspection, not full database export.

To create a nested box, supply the returned room app ID as `item.containerId`. Create its contents with `isContainer:false` and the box app ID. Do not send sticker UUIDs as containerId. Either include an existing external identity on create or bind an already existing app record explicitly:

```json
{
    "op": "bindIdentity",
    "requestId": "example-bind-1",
    "source": { "system": "synthetic-example", "reference": "fictional-sticker" },
    "itemId": "<box app ID>",
    "expectedVersion": "<get result.version>",
    "externalIdentity": { "namespace": "synthetic-sticker", "value": "00000000-0000-4000-8000-000000000001" }
}
```

Corrections are separate operations with current versions, not changed replays:

```json
{
    "op": "update",
    "requestId": "example-correct-1",
    "source": { "system": "synthetic-example", "reference": "observation-2" },
    "itemId": "<item app ID>",
    "expectedVersion": "<get result.version>",
    "changes": { "description": "Corrected fictional description" },
    "note": "Corrected a transcription error"
}
```

```json
{
    "op": "move",
    "requestId": "example-move-1",
    "source": { "system": "synthetic-example", "reference": "observation-3" },
    "itemId": "<item app ID>",
    "expectedVersion": "<latest result.version>",
    "containerId": "<new parent app ID>"
}
```

The history event contains `_id` (requestId), `request` (including source/note), `itemId`, `status`, `createdAt`, optional `completedAt`, and `before`/`after` Readbacks. Create has no before snapshot. These are snapshots observed by the agent interface, not a complete audit of UI edits.

## Replay, conflicts and interrupted writes

Identical parsed JSON, including source and note, replays the originally recorded result with `replayed:true`. Object key order is ignored; other changes are significant. Replay returns the original snapshot even if later corrections changed the item. Use get for current state. A requestId with changed payload returns HTTP 409 `conflict`. Stale expectedVersion also returns 409 `conflict` before mutation. Update/move use a snapshot predicate at the Mongo write, so a concurrent edit cannot be silently overwritten. If that write races after preflight, the conservative result is `indeterminate`, requiring reconciliation.

The planned two-step logical-deletion workflow is a documented exception to
the one-exact-body rule: its prepare and confirm calls share one workflow
request ID and use phase-aware replay checks. Different deletion intent still
conflicts. Authorization rotation and completed-confirmation replay semantics
are defined in [Logical deletion and cold-storage roadmap](LOGICAL_DELETION.md).

A durable, non-expiring lock serializes agent mutations across server processes. A competing mutation returns HTTP 409 `busy` without starting a write. A durable request event is reserved before mutation. If a process dies or persistence fails after reservation, a same-key retry returns HTTP 409 `indeterminate`; new writes remain stopped if the writer lock was retained. Reads continue. There is deliberately no timer that assumes an unfinished write failed.

A create's pending event records its deterministic candidate app ID before insert. To investigate an interrupted operation:

1. Stop callers from submitting mutations. Do not invent a new requestId, delete the pending event, or blindly clear the lock.
2. Call `{"op":"status","requestId":"<original key>"}`. Preserve the complete event and original request. If the lock exists but no event exists, an operator must inspect server/database state; do not infer that it is safe to clear a live writer.
3. Call get using the event's itemId, and lookup for its external identity if present. Compare the record to the requested change and before snapshot. A pending create may have inserted the item but not bound its external identity; a pending correction may have been applied.
4. A maintainer, with the server stopped and database backed up, must reconcile `agent_requests`, `agent_identities`, `agent_locks`, and the item as one reviewed recovery operation. If the intended change is proven complete, record its verified after snapshot and completed state, then release only its matching writer lock. If incomplete or ambiguous, repair under review before resuming. v1 does not expose a remote recovery/delete endpoint or automate this decision.

The unit suite deterministically injects failure after item insertion and before ledger completion, restarts the service over the same store, verifies one item, checks status/get readback, and verifies that same-key and new-key retries cannot insert another item.

Errors are `{ok:false,error:{code,message}}`: 400 `invalid_input`/`limit_exceeded`, 401 `unauthorized`, 403 `forbidden`, 404 `disabled`/`not_found`, 409 `conflict`/`busy`/`indeterminate`, 405 for non-POST, 413 for oversized bodies, 415 for wrong content type, and 500 `internal_error`. After any uncertain network/500 response, inspect status and retry only the identical request; never change keys to work around uncertainty.

## Scope and validation

Run focused tests with `node --test scripts/agent-interface.test.mjs` after installing meteor-app dependencies. They transpile and exercise the actual service and HTTP modules with a synthetic in-memory persistence adapter; they do not prove Mongo/Meteor or browser integration. Run `npm run check:type --prefix meteor-app` and targeted ESLint/Prettier checks for the production files. The [independent acceptance suite](../tests/acceptance/README.md) exercises the Mongo adapter and UI against a fresh disposable Meteor database. It passed the synthetic townhouse scenario on 2026-09-08; this does not establish deployment or personal-database readiness.

The API excludes deletion, attachment ingestion, property editing and tag renaming/moving/deletion, changing an item's container flag, batch transactions, external registry validation, and journal synchronization. Existing CRUD/import/export behavior is unchanged. The auxiliary collections are not currently included in inventory exports/backups by app code; back up Mongo collections together. Restoring only inventory items loses replay/history/binding state and is not a supported agent recovery procedure.

The writer lock covers agent calls only. Existing UI/import writers can still race hierarchy validation, delete parent records, or make other changes outside this interface. Atomic item preconditions protect the corrected item's snapshot; they do not make an entire hierarchy transactionally consistent. Before real-data operation, integration owners must assess those limitations, independent acceptance results, backup coverage, and the manual recovery path. This v1 implementation does not establish whole-system or household-intake readiness.

### Meteor development proxy regression

Verified with installed Meteor 3.4.1: `tools/runners/run-proxy.js` creates `http-proxy` with `xfwd:true`. Its bundled `http-proxy/lib/http-proxy/passes/web-incoming.js` appends the actual caller socket address, protocol and port and supplies `x-forwarded-host`. A raw loopback request to a fresh disposable server was observed at the app handler as peer `127.0.0.1`, `x-forwarded-for: 127.0.0.1`, `x-forwarded-proto: http`, and `x-forwarded-port: 3289`, with neither Origin nor Forwarded. Unconditionally rejecting XFF prevented all normal requests through `meteor run`.

The adapter explicitly enables the narrow exception with `Meteor.isDevelopment`; the standalone handler defaults to rejecting proxies. Trust requires both the actual socket to be loopback and exactly one loopback XFF value. Neither Host nor XFF alone establishes trust. Caller-supplied XFF is appended by Meteor into a chain and therefore rejected. This is specific to the observed Meteor development runner, not a general reverse-proxy trust setting.

The focused regression checks production/default rejection, valid development shape, missing token, non-loopback socket, remote/forged/multiple XFF hops, Origin, Forwarded and malformed protocol metadata. Live disposable HTTP smoke additionally verified 401 without a token; 200 for authenticated read/create/replay/correction/move/history; 409 for a stale version; and 403 for spoofed XFF and Origin. Independent browser acceptance remains a separate integration check.

## Persistent Compose runtime

Compose keeps MongoDB on its named volume with no published database port. The app UI is published on host loopback only. `INVENTORY_SEED_SAMPLE_DATA=0` disables sample items, tags and room fixtures; the Compose runtime sets it explicitly. A generated `INVENTORY_AGENT_TOKEN` stays in the protected, Git-ignored `.env` and app container environment. `.env` files are excluded from Docker build context. Optional Mongo Explorer credentials are not required to run the database and app.

Use the project-owned client from any directory; pass the exact intended checkout explicitly:

```sh
/path/to/checkout/scripts/inventory-agent.mjs --project-dir /path/to/checkout < read-request.json
/path/to/checkout/scripts/inventory-agent.mjs --project-dir /path/to/checkout --allow-mutation < mutation-request.json
```

The first form permits only get/lookup/history/status/children/hierarchy. The second explicitly permits supported mutations; normal requestId/source/version rules still apply. The client sends exactly once over loopback inside the selected app container through Docker Compose exec. It does not expose the token on the host command line, weaken remote-address checks, or retry on errors. A timeout may have an indeterminate write outcome; inspect status with the original key. Docker permission prompts remain governed by the host, not this script.

Rebuild with `docker compose build meteorapp`, then start with `docker compose up -d meteorapp`. Preserve the named volume; never use `down -v` for routine shutdown. Container recreation is not a data backup. Inventory export currently omits the agent ledger and bindings, so recovery must retain all Mongo collections together as well as the independent source archive.

## Live hierarchy discovery

For questions such as “what rooms are in the house?”, resolve the home with `lookup`, then call `hierarchy` using the returned ID. If name lookup has multiple plausible homes, disambiguate before querying. Do not enumerate saved intake receipt IDs as if they were exhaustive current inventory.

```json
{ "op": "hierarchy", "itemId": "<home ID>", "maxNodes": 1000 }
```

The result is `{root: Readback, items: Readback[]}` with every discovered descendant, excluding the root from items. Traversal follows current parent IDs breadth-first and includes ordinary contents. Interpret room names and notes in that hierarchy; `isContainer` alone does not distinguish a room, floor or storage box. Group known rooms by their containing floor and retain ambiguities instead of inventing classifications. This read never writes inventory or request history.

For direct children or larger hierarchies, use paginated reads:

```json
{"op":"children","containerId":"<container ID>","limit":100}
{"op":"children","containerId":"<container ID>","limit":100,"after":"<nextCursor>"}
{"op":"children","containerId":null,"limit":100}
```

Children returns `{items: Readback[], nextCursor: string|null}` in ascending Mongo item-ID order. `containerId:null` means root-level records (missing/null parent). `limit` defaults to 100 and accepts integers 1–100; use the returned cursor with the same parent until null. Empty children are a successful empty list. Missing parents return not_found; ordinary items cannot be used as container roots.

Hierarchy defaults to at most 1000 descendants; `maxNodes` accepts integers 1–1000. Exceeding the limit fails with HTTP400 `limit_exceeded`, never a successful partial tree. Use paginated children traversal when larger results are needed. A detected cycle/revisited node fails with409 `conflict`. These are live reads, not an atomic database snapshot: concurrent UI/agent moves or additions can change a traversal. For a stable exhaustive inventory, quiesce writers; do not claim snapshot consistency from successful traversal alone.

## Agent tags and attribute conventions

Tags use the existing shared `tags` collection and item `tagIds`; no separate
ownership column or person model is introduced. Names remain globally unique
(case-insensitive), including across parents. Discover an existing name before
creating it. Names are trimmed at creation; regex punctuation is treated literally.

- `createTag`: mutation with requestId/source/note and `tag: {name, parentTagId?}`.
  Omit parentTagId or use the empty string for a root. Returns `{tag, version}`.
  Stable candidate IDs and `afterTag` snapshots are retained in the existing
  agent ledger; exact replay returns the original tag snapshot. For an interrupted
  creation, inspect `status` then `getTag` using the event's `tagId`. The same
  conservative writer-lock and manual recovery rules apply as for items.
- `getTag`: `{op:"getTag", tagId}` returns `{tag, version}`.
- `tags`: optional `parentTagId`, `name`, `after`, `limit`. Parent omitted searches
  all tags; empty string selects roots. Name is a literal case-insensitive
  substring. Returns `{tags:[{tag,version}], nextCursor}`. Continue with identical
  filters until nextCursor is null. Default/max page size 100, sorted by ID.
- `taggedItems`: required `tagId`, optional `after`/`limit`; returns paginated
  `{items:[Readback], nextCursor}`. Matches only explicitly assigned tag IDs.
  It does not implicitly include child tags or items inside tagged containers.
- Item `create.item.tagIds` and `update.changes.tagIds` accept up to 100 unique
  existing tag IDs. An update replaces the whole list; read first, preserve other
  tags, and supply expectedVersion. An empty list removes all assignments.
  Assignment/removal uses the existing conditional item write and before/after
  history. Missing tags, duplicate IDs, malformed input and stale item versions
  are rejected before mutation. Omission leaves tags unchanged on update.

For a bedroom occupant, create or resolve `Occupant`, then `Xingchen` beneath it,
then apply the person's leaf tag to the room. `Owner` would be a separate meaning;
room occupancy does not imply ownership or assign attributes to contents.
Tag paths provide hierarchy; they are not typed properties, unique-owner rules,
or access-control permissions. Global name uniqueness currently means the same
leaf name cannot be created under another category. No schema migration changes
that constraint here. UI/import writers remain outside the agent lock, so tag
validation and an item write are not a transaction across collections; a
concurrent UI tag deletion can still race assignment. Reads are live, not atomic
snapshots. The agent client permits these operations with the same read/mutation
separation as the existing commands.

# Structural locks

Inventory items expose a dedicated `locked` system flag. `lock` and `unlock` are audited, version-checked agent mutations requiring `itemId` and `expectedVersion`. A locked item remains editable for metadata and contents, but shared move and delete operations reject it until an explicit unlock; creation is unaffected.
