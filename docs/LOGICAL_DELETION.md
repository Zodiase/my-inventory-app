# Logical deletion and cold-storage roadmap

The target inventory-deletion model is logical retirement, not physical
removal. The current implementation still removes documents and must be
replaced. The target system preserves records, stable IDs, external identities,
relationships, and audit history after an item disappears from ordinary use.

## Current target: same-collection tombstones

The first implementation keeps the document in the existing `items`
collection and marks it deleted with durable metadata such as `deletedAt` and
the request or actor responsible for the transition. Exact field names remain
an implementation choice, but deletion must be a version-checked atomic state
change rather than a MongoDB remove.

Once implemented, active application and agent queries exclude tombstoned
records by default, including ordinary lists, navigation, search, lookup,
children and hierarchy reads, duplicate-candidate discovery, and active-child
checks. A deliberate maintenance/audit path may include tombstoned records for
investigation and restoration. External identities remain reserved and must
not be silently reused.

The UI and planned agent interface must use the same shared logical-delete
business operation. Tests must fail if either path physically removes an
inventory document.

## Agent confirmation protocol

The planned agent deletion protocol uses two explicit steps; neither operation
is exposed by the current v1 API:

1. `prepareDelete` validates the target snapshot and returns a single-use
   `deletionAuthorizationId` bound to the supplied item ID and expected version.
2. `confirmDelete` supplies the authorization ID, item ID and expected version,
   and performs the logical deletion only after repeating all safety checks and
   matching all three fields to the prepared journal record.

Callers do not supply request IDs for deletion. The server assigns a distinct
request ID to every prepare, confirm, status or retry call and returns it for
cross-endpoint tracing and triage. These request IDs are observational only:
they do not identify the deletion workflow, authorize deletion, or control
idempotency. A confirm retry therefore receives a new request ID while still
resolving to the original terminal result.

The authorization is cryptographically random, stored only as a hash, bound to
the item ID, expected version and other safety-relevant preparation fields, and
expires five minutes after issuance according to the server clock. It is
invalidated after any confirmation attempt. Expiration or a changed target
requires a new preparation. Containers must have no active children, and
locked or already deleted records are rejected.

Replay semantics are part of the protocol:

- If a prepare response is lost, the caller may prepare the same item snapshot
  again. Each preparation has its own authorization and server request ID; an
  unused authorization simply expires.
- A matching `confirmDelete` transitions the item once. The item tombstone
  write and append-only terminal journal event occur in the same concurrency
  boundary.
- Retrying a successfully completed `confirmDelete` with the same
  authorization, item ID and expected version returns the original journaled
  result with `replayed: true`, even if the authorization's five-minute window
  has since elapsed. The retry has a new server request ID and never writes a
  second tombstone.
- A mismatched item ID, expected version or authorization returns a conflict
  and never replays a successful result.
- Result lookup uses the authorization, item ID and expected version to find
  the journaled outcome. It returns a new tracing request ID but never returns
  a stored authorization hash.

The active-child check and tombstone write must share one concurrency boundary
with UI and agent mutations that can create, restore, move, or delete children.
Use a transaction where the deployed database topology supports it, or a shared
server-side hierarchy-mutation lock held across the final child recheck and
conditional tombstone write. An agent-only lock is insufficient because UI
writes could otherwise add or move a child after the check. The implementation
must include a deterministic race test proving a container cannot become
tombstoned while an active child is concurrently attached.

The append-only journal retains preparation attempts and terminal outcomes,
including the distinct server request IDs for each call. Interrupted writes
follow the interface's conservative recovery rules.

Implementation and regression coverage are tracked by Beads issue `bd-iyq`.

## Future optimization: cold storage

Do not introduce a second collection merely to implement deletion. Moving old
tombstones is a later performance optimization and requires measured evidence
that retained records materially harm active-query latency, index size, backup
cost, or operational maintenance.

If those measurements justify archival, a controlled background process may
move sufficiently old tombstoned documents to a cold collection. That process
must:

- preserve stable IDs, external identities, deletion metadata, and audit links;
- leave enough active-side reservation metadata to prevent identity reuse;
- be idempotent, resumable, observable, and safe under interruption;
- provide an explicit maintenance lookup and tested restoration path;
- reconcile parent/child references without making active records point to
  unavailable parents;
- retain backup and restore coverage for active and cold collections together;
- avoid changing the user-visible meaning of deletion.

Cold storage is not part of `bd-iyq`. Create separate work only after collecting
performance measurements and defining retention and restoration requirements.

## Verification expectations

Coverage must include logical deletion through both UI and agent paths;
default filtering across every active read surface; retained documents,
identities and history; restoration or maintenance visibility; stale versions,
locks and active-child races; authorization expiry; lost prepare responses;
successful confirm replay before and after authorization expiry; mismatched
intent; distinct server request IDs across calls and retries; concurrent
confirmations causing one tombstone transition; and a regression assertion that
normal production deletion never performs physical removal.
