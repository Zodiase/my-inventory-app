# Retained root readiness — preparation for independent review

2026-10-05 America/Los_Angeles. Experiment, not accepted repair. Base is frozen
PR184 56a48bf3202ebc80296dcffe0ad57a7f8d7fccc8. PR182/183/184 untouched.

## Candidate

Only tags.all, items.all and inventory.identities root acquisition calls change.
`useRootReadiness` initially selects the original useSubscribe path, or an explicit
client/development opt-in retained useTracker callback with `[name]` dependencies.
Production and documents without valid initial capability keep the original path.
Selection is immutable per document, including module reevaluation. No global
wrapper replacement, dynamic child change, remount, installed patch, polling or
timeout change. This intentionally changes hook structure and invalidation/cleanup
ordering. It does not claim scalar-candidate hook invariance. Guard normalization
reverses precisely the three-call/import delta; a separate whole-App AST equality
against frozen184 rejects every other semantic App change after removing transparent parentheses. App formatter also removes one redundant search-return parenthesis pair. Opt-in is experimental, not a
security boundary against hostile document scripts.

## Installed provenance and synthetic fixture limits

`tests/e2e/mechanisms/installed/provenance.json` pins full source and extraction
SHA256 hashes from the actual PR184 disposable build. Tracker body, installed
react-meteor-data hook bodies and Connection.subscribe method are unmodified;
only external bindings/exports are added. React/ReactDOM 18.3.1 development UMD
comes from installed dependencies. Hash guard passed. Generated package versions
are in the inherited build provenance; source paths remain available locally.

Controlled Meteor defer/immediate queue, React flushSync and synthetic readyDeps
changes force deterministic ordering. No actual DDP socket/server/App/Grommet.
EJSON clone/equals uses JSON only for empty subscription argument arrays; no
complex payload equivalence claim. The test subscription facade records public
Tracker.currentComputation references without changing installed logic. Counts of
computations, records and sub/unsub messages are separate. Error/nonready controls
remove the installed subscription record and inspect DOM, including removal after
Ready. This models availability loss, not server error classification, callback
or reconnection protocol. Fixed roots have no callbacks. Actual app comparison is
required for backend semantics and failure linkage.

## Executed evidence

15 Chromium controls passed, 5.1s, worker1/retries0, each fresh document. All native
traces, screenshots and attached lifecycle-state JSON retained at
`/private/tmp/retained-controls-final`; durable Home Automation archive:
`docs/verification/retained-readiness-2026-10-05/raw/final`.
Personally inspected original Loading and retained Ready screenshot pixels.

- Pending same-value original stays Loading; retained reaches Ready.
- Original changed-state and flush-first discriminators reach Ready.
- Pending and ready unmount stop computations and owned handle afterFlush;
  late readiness causes no extra component render; DOM remains empty.
- Old→new→old begins Loading for the new owner, rejects old readiness, disposes
  old records, then reaches Ready only for current readiness.
- Unchanged-name renders retain one computation/one active record; true→false→true
  updates DOM without extra sub/unsub or polling.
- Rapid name changes then unmount before flush leave no active owners/records.
- Nonready removal and ready removal both preserve original Loading semantics.
- Two simultaneously active same-publication subscribers own separate records;
  cleanup of the React owner leaves the other live, last-owner cleanup stops it.
- Inactive record reused before former-owner afterFlush survives cleanup with
  unchanged subscription ID; it stops when the replacement owner stops.

99 Node script checks passed; TypeScript5.9.3 passed; scoped lint passes with only
existing App findOne deprecation warning; app/root scoped formatting passed.
First runner failed before tests (TS/CommonJS runner mismatch). Second run stopped
once fixture binding collisions were evident (nextId/installedSubscribe global
lexicals); raw failures preserved. Third intermediate13 controls passed; expanded
final15 passed. No product changes to make controls pass. Import-order/formatting
failures repaired and logs retained. A script command initially used wrong cwd,
then reran at repository root; no hidden app run or retry.

## Prepared next comparison, NOT executed

Dedicated config refuses launch without independently reviewed exact HEAD and
explicit output directory. Six documents: baseline, retained, retained, baseline,
baseline, retained. Both use identical scalar diagnostics; only retained adds the
immutable retained capability. Original beforeEach and nested navigation test body
copied unchanged (same5000ms assertions), worker1/retries0, no implicit reuse under
CI1. Every attempt stores topology mode/bootstrap, scalar evidence, native trace,
screenshot/unavailability and existing public DDP/error evidence. No installed
instrumentation. Existing ordinary test discovery excludes proposal filename.

After independent source/control acceptance, coordinator separately authorizes
execution using a fresh disposable Mongo/App/index, strips household database
variables, verifies initial bootstrap and scalar epoch agreement, archives all raw
outcomes and cleans only owned services/index. No actual navigation authorized by
preparation alone.

Outcome rules: six attempts maximum, no blind repeat. Baseline nonreproduction is
inconclusive even if retained passes; stop and report. Matching baseline Loading
plus retained success only supports bounded comparison, not causal proof/rate or
production acceptance. Retained failure/regression is a failed experiment. Capture
loss/overflow, mode mismatch or unexpected service reuse invalidates affected
interpretation; stop to reconcile rather than relaunch. Product promotion requires
separate independent/design/CI decision; no merge/deploy/security waiver here.
