# Search URL and history contract

The dedicated Search route uses `q` for query text, `container` for contextual
container identity, `scope=within` for scoped search, repeated `f` parameters
containing JSON search fragments, and `run=1` for a submitted search. Unknown
fragment types, malformed JSON, and invalid known shapes are ignored by
`readSearchUrlState`. A scope without a container falls back to global search.
The merged JSON fragment encoding remains the supported contract.

Browser history preserves completed searches. The first edit after a completed
run pushes a draft entry, retaining the prior result URL. Subsequent edits and
debounced execution replace that draft. Enter also completes that entry rather
than leaving an extra unsubmitted entry. In-flight or stale results do not create
checkpoints. Repeating Enter on the same submitted query reruns it without adding
an identical history entry. Navigation invalidates the pending checkpoint; a
restored search becomes a checkpoint when its run completes.

## 2026-10-04 candidate verification

Based on merged PR #163 (`2262f2c`). Adds app regressions for completed A/B
Back/Forward, coalesced typing, and Enter without a duplicate draft. Independent
app verification is pending; this candidate is not deployed or accepted yet.

Shared local dependencies report an existing `Meteor.callAsync` generic type
incompatibility in `App.tsx` (TS2558), with five related ESLint unsafe-value
diagnostics. The history change does not change that call or its return handling.
Formatting and diff whitespace checks pass. The verifier owns isolated app and
manual full-shell checks against the exact candidate commit.
