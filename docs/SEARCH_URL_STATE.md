# Search URL and history contract

The dedicated Search route uses `q` for query text, `container` for contextual
container identity, `scope=within` for scoped search, repeated `f` parameters
containing JSON search fragments, and `run=1` for a submitted search. Unknown
fragment types, malformed JSON, and invalid known shapes are ignored by
`readSearchUrlState`. A scope without a container falls back to global search.
The merged JSON fragment encoding remains the supported contract.

Browser history preserves completed searches. The first query edit after a completed
run pushes a draft entry, retaining the prior result URL. Subsequent edits and
debounced execution replace that draft. Enter also completes that entry rather
than leaving an extra unsubmitted entry. In-flight or stale results do not create
checkpoints. Repeating Enter on the same submitted query reruns it without adding
an identical history entry. Tag, type, scope, reset, and filter removal replace
the current entry even after a run completes; filter clicks do not create
history checkpoints. Navigation invalidates the pending checkpoint; a
restored search becomes a checkpoint when its run completes.

## 2026-10-04 candidate verification

Based on merged PR #163 (`2262f2c`). Final code revision `b2dd3df` passed 48
independent Chromium/iPad checks, including completed A/B Back/Forward,
coalesced typing, Enter without duplicate drafts, and settled filter updates
without new entries. Manual full-app review at 1280×720 restored A and B and
exited to All Items without captured console errors. See the archived
[independent review](visual-review/search-history-2026-10-04/INDEPENDENT-REVIEW.md).
This candidate is not deployed; GitHub publication and CI remain pending.

Shared local dependencies report an existing `Meteor.callAsync` generic type
incompatibility in `App.tsx` (TS2558), with five related ESLint unsafe-value
diagnostics. The history change does not change that call or its return handling.
Formatting and diff whitespace checks pass. The verifier owns isolated app and
manual full-shell checks against the exact candidate commit.
