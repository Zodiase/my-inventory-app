# Independent acceptance of PR 163

Initial candidate: 65bac5b99378aab8e7897a6694d4badbe61371b3. Stack base: codex/bd-1pw-search-banner (#160). Review owner: Inventory system verification. Initial verdict: corrections required.

Independent tests: 45/45 focused Storybook Chromium; 16/16 actual-app search-trace-exit across Chromium and iPad. Initial sandbox launch failure was environmental; rerun with browser permissions passed. Disposable app 127.0.0.1:48380; local Mongo 48381, dbpath /private/tmp/inventory-bd-1pw/meteor-app/.meteor/local/db; dedicated disposable search index inventory_bd_1pw_review_65bac5b. Primary/preview data untouched.

Manual evidence: full Storybook manager catalog at 1280×800 and 820×900; selected-only and path Find; composed search shell and combined filters at820×900;18-selection stress; shared switch keyboard/focus/on/disabled. Actual app desktop1280×800, iPad820×900, narrow320×700: include first→2 results, add second→3, second Exclude→1; selected-only+Find, type Containers→empty, query+tags→1; result anchor/detail/Back to search; normal shell buttons; Escape returns focus. Query width168px at320, no horizontal overflow.

Measured initial actual app: pill162×29, row50px. Full-manager standalone catalog initially row55px because component relies on global border-box; approved maximum52. Shared switch track35×22, thumb14×14, checked translation17px and centered grid; border+padding give2px opposite end insets.

Findings sent implementation owner:

1. Shared catalog story row55 exceeds48–52 contract; sizing assertion checks minimum only. Fix self-contained box sizing and upper-bound assertions.
2. Confirmed pure-function legacy AND [include first],[include second],[exclude third] → third Neutral leaves exclusion unchanged. Applied-summary removal uses same function. New Include choices silently no-op. Fix removal without changing independent AND fragments; disable/explain unavailable Include.
3. Full-manager18-selection stress expands catalog1075px/list981px despite560px story wrapper. Find/header scroll with body rather than catalog. Bound the composition and test scrolling/header stability.

CI inspected through GitHub: only guardrails/scan SUCCESS on initial head. App Tests trigger master/twig/** bases; codex stack base is ineligible. Eligible-base CI required before merge recommendation.

Implementation owner authorized to apply targeted corrections and report new exact head. Final acceptance pending corrected-candidate recheck. No merge or deployment performed.

## Corrected candidate acceptance

Reviewed f1170107d358d202f3c593b7237cd5cd4771a228. Tracked checkout clean; PR163 updated by implementation owner. All three findings resolved and independently rechecked. Verdict: passes local functional and visual acceptance for the reviewed scope; eligible-base CI remains a shipping gate.

Independent corrected-head tests:32/32 Storybook (SearchTagCatalog, TriStateCompactPill, SearchPageLayout);16/16 actual-app search-trace-exit across Chromium/iPad. Earlier45-test run established surrounding StandaloneFilterView/SearchShell regressions; corrected shared-control effects covered by new geometry checks and manual review.

Manual corrected render: full manager1280×720 and820×900; actual app1280×800 and820×900. Checked18 selections in one catalog; corrected catalog560px/list465–466px (83%); row50px; native catalog scroll565px left Find at the same y65. Actual legacy AND with excluded Third: Off changes1→2 results and keeps two separate include fragments; re-exclude then summary Remove changes1→2 with same fragments. New Include Third disabled and explained. Final iPad app screenshot /private/tmp/inventory-review-corrected-app-ipad.png. Desktop manager screenshot /private/tmp/inventory-review-corrected-manager-desktop.png.

Limitations: emulated iPad, no physical device exercise; no full repository test suite rerun; CI App Tests absent for current codex base. Production/48372 preview not deployed or inspected for this revision. Recommended next action: design owner may arrange approved preview inspection; ensure stacked base is resolved and eligible-base App Tests run before merging. No merge/deploy performed.
