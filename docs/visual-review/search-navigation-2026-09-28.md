# Search navigation visual review — 2026-09-28

## Contract

The `SearchPageLayout` stories cover global idle, loading, empty, and results;
scoped results; and a 31-result list. On every `/search` view, the blue header
contains Inventory and the menu trigger but no Search shortcut. Opening the
menu shows Search in the same order as other destinations, highlighted as the
current page but without link behavior. The page heading and explicit scope
remain visible beneath the menu, and search controls and result cards stay
within the viewport. The 31-result list owns scrolling; opening Filters must
leave results reachable.

Required viewports: 390×844 phone, 768×1024 tablet, 1280×720 desktop, and
1600×1000 wide desktop. The menu must fit and remain readable at each width.
The page controls may wrap at the phone width without horizontal overflow.
Interaction checks: open the menu in scoped results, inspect its current-page
label, scroll the long list to item 31, and expand Filters. Matching quality
and item-detail editing are outside this visual review.

## Storybook self-review

The reviewer opened every rendered capture listed below at a readable size.
All captures are in
`/private/tmp/inventory-search-interaction-review-captures/design-revision/storybook/`.
Each cell records the opened artifact and judgment for that story/viewport.

| Story         | Phone 390×844                                                               | Tablet 768×1024                                                               | Desktop 1280×720                                                                | Wide 1600×1000                                                            |
| ------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| GlobalIdle    | `global-idle-phone.png` pass                                                | `global-idle-tablet.png` pass                                                 | `global-idle-desktop.png` pass                                                  | `global-idle-wide.png` pass                                               |
| GlobalLoading | `global-loading-phone.png` pass                                             | `global-loading-tablet.png` pass                                              | `global-loading-desktop.png` pass                                               | `global-loading-wide.png` pass                                            |
| GlobalEmpty   | `global-empty-phone.png` pass                                               | `global-empty-tablet.png` pass                                                | `global-empty-desktop.png` pass                                                 | `global-empty-wide.png` pass                                              |
| GlobalResults | `global-results-phone.png` pass                                             | `global-results-tablet.png` pass                                              | `global-results-desktop.png` pass                                               | `global-results-wide.png` pass                                            |
| ScopedResults | `scoped-results-phone.png` pass; `scoped-menu-phone.png` pass               | `scoped-results-tablet.png` pass; `scoped-menu-tablet.png` pass               | `scoped-results-desktop.png` pass; `scoped-menu-desktop.png` pass               | `scoped-results-wide.png` pass; `scoped-menu-wide.png` pass               |
| LongResults   | `long-results-phone-scrolled.png` and `long-results-phone-filters.png` pass | `long-results-tablet-scrolled.png` and `long-results-tablet-filters.png` pass | `long-results-desktop-scrolled.png` and `long-results-desktop-filters.png` pass | `long-results-wide-scrolled.png` and `long-results-wide-filters.png` pass |

Across all six stories and four widths, the header has no Search shortcut;
the heading, scope, query, controls, status, and cards remain aligned and
readable. The scoped menu highlights Search without making it look like an
additional header action. The menu overlays the page below the header as
intended; it does not leave the viewport or clip its four entries. The phone
controls fit without sideways scrolling, and the desktop and tablet versions
retain a compact top control region. In the long-result captures, the last
card is reachable while the header and query remain in place. Expanding
Filters does not displace the controls or make the results unreachable. The
page frame, containment, proportions, repeated card composition, text,
interaction cues, hierarchy, and continuity across widths were checked.

## Full-app check

The full disposable Meteor app at 1280×720 was opened in the Kitchen-scoped
submitted state with a query and type filter. The reviewer opened
`/private/tmp/inventory-search-interaction-review-captures/design-revision/app/submitted-kitchen-search-menu.png`.
The shell has no Search shortcut, the menu marks Search current, the Kitchen
scope and active filter remain visible, and the one result is readable.
The browser test verifies that the current label has no destination or route
effect, the exact query/filter URL survives, and item detail returns to that
same URL. No page errors were observed. This is a self-review; the verifier
must independently review the candidate before visual acceptance.
