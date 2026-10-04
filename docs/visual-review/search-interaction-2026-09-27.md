# Search interaction visual review

## Route contract: `/search`, 31 results

Purpose: verify the dedicated search page keeps its controls available while
only the results list owns long-list scrolling. The fixture contains 31 similarly
named items; it does not exercise actual household records.

Expected composition: the shell header shows Inventory with Search active and no
container breadcrumb. The page heading, explicit scope, query field, scope
selector, and Filters button stay in the top control region. Result count and
cards occupy the region below. Each card reads as one complete linked item,
with its type badge and match information grouped inside. No card may overlap
the query field or escape the page frame.

Required viewports: 390×844 phone, 768×1024 tablet, 1280×720 desktop, and
1600×1000 wide desktop. At all widths, controls remain readable and the result
region takes the remaining height. Narrow widths may wrap controls but must not
create horizontal document scrolling or hide the query and submit affordance.

Interaction checks: focus the query after scrolling results; scroll to the
last result in the result region; open it and use browser Back; verify the
search URL, results, and result scroll position return. The document itself
must not own vertical scrolling. `Filters` exposes its expanded state.

Known exclusions: this fixture does not judge matching quality, item-detail
editing, or a future overlay/split-view concept. Browser link semantics are
checked separately in the `SearchResultsView` Storybook test.

## Route review

The implementation agent opened the full-route top and scrolled captures and
the result-region crops at all four widths. This is a self-review; the verifier
will review the candidate independently before acceptance. Captures are at
`/private/tmp/inventory-search-interaction/test-results/app-search-and-filter-User-ed778-results-exceed-the-viewport-chromium/`:
`search-{phone,tablet,desktop,wide}.png`,
`search-{phone,tablet,desktop,wide}-scrolled.png`, and matching
`results-{phone,tablet,desktop,wide}.png`.

| Viewport               | Judgment          | Contract evidence and rendered inspection                                                                                                                                                                                                  |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 390×844 phone          | Pass, self-review | Header and query remain visible; scope, count, and cards have readable labels and usable targets. The result region scrolls independently to item 31 and the document does not scroll. No horizontal overflow or clipped control was seen. |
| 768×1024 tablet        | Pass, self-review | Controls and count keep their order; cards fill the content width without stretching text. The last card is reachable while the query stays fixed.                                                                                         |
| 1280×720 desktop       | Pass, self-review | The shorter frame still reserves a bounded result region. The count and cards do not overlap the query or scope selector, and scrolling reaches item 31.                                                                                   |
| 1600×1000 wide desktop | Pass, self-review | Wide controls and cards retain consistent left/right alignment, grouping, and spacing. The result region remains the scroll owner.                                                                                                         |

The app-frame, overflow, proportions, card internals, text, action cues,
hierarchy, and cross-size continuity were inspected in those pixels. Browser
checks additionally focused the query after scrolling, opened a late result,
and confirmed that Back restores both the 31-result URL and scroll position.

## Complete search-page Storybook contract

`SearchPageLayout` now uses the same structural component as `/search`. Its
mock-data stories cover global idle, loading, empty, results, scoped results,
and a 31-result list. The expectation at every size is a neutral Inventory
header with Search marked current, an explicit scope label, readable controls,
no horizontal overflow, and a scrollable results region. An expanded filter
panel must keep its disclosure state accurate and leave a usable results
region. The Storybook browser test captures all six states at each required
viewport, plus scrolled and expanded-filter states for the long list.

The implementation agent opened the full-frame global-results phone,
scoped-results tablet, scrolled long-results desktop, and expanded-filter phone
captures. Those pixels show the intended hierarchy, readable targets, and
bounded result content. The expanded phone filter pane occupies much of the
available height but leaves result cards reachable. Captures are under
`/private/tmp/inventory-search-interaction/test-results/storybook-SearchPageLayout-*`.
The `SearchPageLayout` Storybook browser test passed all four viewport cases.
This is a self-review, not independent visual acceptance.

## Storybook result-card contract

The existing `SearchResultsView` stories cover idle, loading, empty, error,
single/multiple/long result states. For the `SingleResult` story, the item card
must be a visible-focus anchor with `/items/item1` as its destination. For
`MultipleResults` and `ManyResults`, cards remain vertically distinct, type
badges do not obscure names, and location context stays inside each card.
The route and complete-page captures above carry the responsive and scroll
contract; the isolated result-card stories cover link semantics and content.

Storybook browser checks passed for `SingleResult` anchor destination,
focus outline, and unprevented modified-click; the existing metadata,
ranking-evidence, and error-state checks also passed. A separate reviewer must
still inspect every affected Storybook story at its declared viewport matrix
before treating the UI as visually accepted. This PR is a review candidate,
not that final acceptance.

## Verification handoff

The two affected real-app E2E files passed all 26 Chromium cases against a
disposable local Meteor/Mongo and Meilisearch stack. A focused iPhone search
return check passed, as did the focused direct-URL auto-run case after removing
manual Search clicks from its assertion. The complete-page and result-card
Storybook suites passed all eight Chromium cases. TypeScript and code-style
checks passed; lint reports one pre-existing deprecated `findOne` warning in
`App.tsx` and no errors.
