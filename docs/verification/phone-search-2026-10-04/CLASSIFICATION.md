# iPhone search routing failure classification

Task: bd-y0a. Exact baseline `6e60f047f14a89ed8992b9b9a9a90d7c05574766`;
current application `becec0db2384a511c470ba8f6dfb3c25859ed7bf`.
Original routing specs and dependency locks are byte-identical. Each used its
own disposable local Mongo directory and search index on task-owned Meili48390;
production/preview databases and search services were not used or reset.

## Causal evidence

All three original iPhone tests fail on both versions. The saved page snapshots
show the compact phone banner and successful results for the Type assertion,
but empty results where fixture writes have not yet completed indexing.

| Journey                             | Cause                                                                                              | Evidence-backed correction                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Scoped Search hides normal menu     | Test expects desktop-only Type: Items button                                                       | Tap compact Scope menu, assert selected Items via aria-pressed, close menu; retain URL/identity/return checks                             |
| Scoped result return and next query | Test may search before fixture indexing; after readiness it times out on desktop-only Clear search | Wait for both scoped/global fixture identities, use phone Clear query menu, assert empty input and retained scope, then submit next query |
| Scoped deletion return              | Fixture-index race produces empty submitted results                                                | Wait for exact scoped/global identities, then exercise original deletion-and-return UI assertions                                         |

Index-readiness-only rerun: scoped deletion passes; scoped return reaches missing
Clear search timeout. This separates the setup race from the responsive-control
expectation. Server search/index.ts explicitly queues observer writes; a create
method completion is not proof the separate search service has indexed fixtures.
Readiness polling has a bounded30s failure and checks all expected IDs, so an
unindexed global item cannot falsely prove correct scoping. No sleep, test skip,
retry inflation, weakened identity assertion or application indexing change.

With repaired tests, unchanged baseline passes3/3. Final current full routing
matrix passes33/33 (Chromium11/iPad11/iPhone11), no retries. The intermediate current matrix passed32/33;
the remaining failure was a new test-label error (selected item includes a visible
checkmark), corrected to match the rendered menu label while retaining
aria-pressed=true. It is not classified as an application defect.

## Durable coverage and boundary

Blocking GitHub App E2E iPad/iPhone jobs now include the entire item-detail-routing
suite, in addition to touch/stabilization/own-details checks. Chromium already
includes the file. Coverage retains browser history and explicit Back to search,
query/scope identity, clearing/resubmission, deletion return, direct navigation,
missing routes and item/tag journeys. Responsive Type and Clear query controls are
actually tapped on phone; desktop assertions remain distinct.

Changes are tests and CI only. This evidence does not establish zero indexing
latency or prove every possible search operation. No application/UI change or
household migration is justified by these three failures. Existing preview and
production remain on verified becec0d; runtime rebuild is unnecessary for test-only
changes. bd-8wk deep-breadcrumb Storybook layout remains a separate next task.
