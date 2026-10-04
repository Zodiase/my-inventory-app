# Independent URL-state verification

Date: 2026-10-04 (America/Los_Angeles). Baseline: merged PR #163,
`2262f2c945aece95a10bf4baa7644ac1ef0416be`.

This isolated clone contains verification-only additions. Production behavior,
the primary instance, and the existing preview were not modified.

## Coverage and results

| Surface                      | Coverage                                                                                                                                                              | Baseline result                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Pure parser/serializer       | Defaults; global/scoped Unicode round trip; all fragment shapes; repeated AND include groups; 13 invalid fragment forms; invalid scope/run; query clear; filter reset | 7/7 passed                                                    |
| Actual app, Chromium         | Mixed valid/invalid fragments; scoped result identity and exit; reload; missing root/invalid run; Clear search with and without filters                               | 4/4 passed                                                    |
| Actual app, iPad WebKit      | Same live recovery cases                                                                                                                                              | 4/4 passed                                                    |
| Actual app, Chromium history | Completed debounced A → completed B → Back → Forward                                                                                                                  | Failed: Back is `/items`; Forward is B; A is lost             |
| Actual app, Chromium history | Enter-completed A → edited/Enter-completed B; repeat Enter; Back                                                                                                      | Failed: A was replaced by B's draft; Back re-executes B       |
| Manual actual app, 1280×720  | Invalid URL → idle global search → Enter → server run reference → Clear → idle `/search`                                                                              | Observed expected state, no console errors or visible overlay |

The baseline history artifacts are preserved separately under
`/private/tmp/inventory-history-baseline-evidence/` so later runs do not overwrite
the failing screenshots, videos, or error contexts. Manual screenshot:
`/private/tmp/inventory-malformed-url-cleared-desktop.png`.

## Test ownership and integration

- `tests/e2e/app/search-url-state.spec.ts`: pure contract tests; Playwright imports
  the real production module, with no page/server/data fixture.
- `tests/e2e/app/search-url-recovery.spec.ts`: live browser/Meteor integration;
  database resets and fixture creation are restricted to the disposable app.
- `tests/e2e/app/search-history-verification.spec.ts`: deliberately failing
  baseline regression and independent corrected-candidate acceptance.

Run parser checks without services:

```sh
PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e -- tests/e2e/app/search-url-state.spec.ts --project=chromium --reporter=line
```

The existing CI App E2E jobs include `tests/e2e/app/`; these additions will be
included after the developer adopts them in the candidate. They are not yet
committed or included in a PR. Live checks used loopback app port 48380, its local
Mongo database, and a dedicated disposable Meilisearch container on port 48382
with a unique test index. No production credentials or database connections were
used.

## Corrected candidate review

Developer candidate `0c77c19db2ca55296154d57d26d4e8f33f1d679e` was imported
unchanged into this clone as local unsigned commit `0e6b3b2` because the host
1Password signing socket was unavailable. Production-source diff against the
developer commit is empty. Developer subsequently adopted the pure/live URL
tests unchanged in signed `c736bec9c0f25afab2296451ac03bc15d96d5271`.

The focused combined suite passed 46/46: both independent history cases, both
developer history cases, seven pure URL cases, four live recovery cases, and
eight existing trace/detail/exit/filter cases, each on Chromium and iPad WebKit.
Corrected-candidate artifacts: `/private/tmp/inventory-history-candidate-evidence/`.
Manual full app at 1280×720 also restored completed A after Back and B after
Forward, with matching query values and completed run references; no console
errors were captured. Screenshot: `/private/tmp/inventory-history-corrected-back-desktop.png`.

An additional filter-history diagnostic found a requirement gap: after a
completed query, settled Include clicks grew `history.length` from 3 to 4 to 5.
The design owner confirmed that per-filter-click checkpoints violate the intended
coalescing rule and authorized the developer to restrict checkpoint creation to
query edits. `search-filter-history-observation.spec.ts` now asserts that both
settled tag changes keep the initial history length. Thus the 46 passing checks
did **not** constitute final acceptance of that revision.

Final query-only candidate `b2dd3df45bb9448c7cf910bc4dfb0ea0cc5b4102` was
imported unchanged as local unsigned `05be204`. The expanded suite passed 48/48
(34 live browser cases and 14 pure parser checks across Chromium/iPad projects).
Settled tag updates now keep `history.length` at 3 → 3 → 3 on both projects.
Completed query A/B Back/Forward, coalesced typing, Enter/rerun, malformed URL
recovery, detail return, scoped exit, and stale-response guards continue to pass.
Final artifacts: `/private/tmp/inventory-history-query-only-evidence/`.
Production `App.tsx` and all three adopted verification files are blob-identical
to the signed candidate. Verification-file formatting and the isolated app's
`npm run check:type` passed. The developer's earlier generic type error was not
reproduced in this initialized isolated Meteor checkout; CI remains unverified.
Manual 1280×720 full app again restored completed A and B, followed by deterministic
exit to All Items, with no captured console errors. Screenshot:
`/private/tmp/inventory-history-query-only-back-desktop.png`.

## Remaining work

The design owner accepted the demonstrated history defect and authorized the
developer to preserve one completed-search checkpoint when the next editing
session begins, while coalescing subsequent typing/debounce/Enter updates. The
query-only corrected commit passes the exercised local acceptance scope. CI and
publication are not verified; the developer reports publication awaits explicit
human approval. The generic type error previously noted in the candidate
contract was not reproduced here. No merge or deployment approval is implied.

This record is functional verification, not a new visual-design approval of the
toggle, filter catalog, or row-action prototype. Those require their own exact
artifact review.
