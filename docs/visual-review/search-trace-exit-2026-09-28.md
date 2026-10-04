# Search exit and run-reference visual review — 2026-09-28

## Story contracts

All `UI/SearchPageLayout` stories use the full mock search shell. The header stays
neutral, the Search shortcut is absent, the menu identifies Search as current,
and the page owns one results scroller. At 390×844, 768×1024, 1280×720, and
1600×1000, the exit link must remain visible beside the scope description,
without colliding with the query field or causing horizontal scrolling. The
run reference is quiet secondary text: no query or item identity appears in
it. These stories exclude real server search, which the app test covers.

| Story         | Purpose and expected composition                                          | Interaction check                         |
| ------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| GlobalIdle    | Empty query, `Exit search` to `/items`, no run reference                  | Disabled submit remains visible           |
| GlobalLoading | Active query, `Exit search`, loading indicator, no previous run reference | Loading state does not block exit         |
| GlobalEmpty   | Zero results and a muted zero-result run reference                        | Exit remains reachable                    |
| GlobalError   | Readable safe error and muted error run reference                         | Exit remains reachable                    |
| GlobalResults | Three cards, count above run reference                                    | Cards remain distinct links               |
| ScopedResults | `Search in Rack A`, `Back to Rack A`, three cards                         | Menu Search is current and noninteractive |
| LongResults   | Thirty-one cards with one results scroll owner                            | Scroll to final card, then expand Filters |

Across the four widths, text and controls may wrap within their rows, but the
exit remains in the top control area, cards retain usable width, and the page
frame does not gain horizontal or competing vertical scrolling. The long-list
capture may start or end mid-card because it shows the intentional internal
scroll position.

## Self-review

I opened every capture below at readable scale and checked page frame,
containment, proportions, card composition, text, control cues, hierarchy, and
continuity across widths. The capture root is
`/private/tmp/search-trace-storybook-captures/`; each viewport's directory
contains the named image. `P`, `T`, `D`, and `W` mean 390×844 phone, 768×1024
tablet, 1280×720 desktop, and 1600×1000 wide desktop respectively. Each cell
is a visual judgment after the contrast adjustment.

| Story         | P                                                                           | T                                                                             | D                                                                               | W                                                                         |
| ------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| GlobalIdle    | `global-idle-phone.png` pass                                                | `global-idle-tablet.png` pass                                                 | `global-idle-desktop.png` pass                                                  | `global-idle-wide.png` pass                                               |
| GlobalLoading | `global-loading-phone.png` pass                                             | `global-loading-tablet.png` pass                                              | `global-loading-desktop.png` pass                                               | `global-loading-wide.png` pass                                            |
| GlobalEmpty   | `global-empty-phone.png` pass                                               | `global-empty-tablet.png` pass                                                | `global-empty-desktop.png` pass                                                 | `global-empty-wide.png` pass                                              |
| GlobalError   | `global-error-phone.png` pass                                               | `global-error-tablet.png` pass                                                | `global-error-desktop.png` pass                                                 | `global-error-wide.png` pass                                              |
| GlobalResults | `global-results-phone.png` pass                                             | `global-results-tablet.png` pass                                              | `global-results-desktop.png` pass                                               | `global-results-wide.png` pass                                            |
| ScopedResults | `scoped-results-phone.png` and `scoped-menu-phone.png` pass                 | `scoped-results-tablet.png` and `scoped-menu-tablet.png` pass                 | `scoped-results-desktop.png` and `scoped-menu-desktop.png` pass                 | `scoped-results-wide.png` and `scoped-menu-wide.png` pass                 |
| LongResults   | `long-results-phone-scrolled.png` and `long-results-phone-filters.png` pass | `long-results-tablet-scrolled.png` and `long-results-tablet-filters.png` pass | `long-results-desktop-scrolled.png` and `long-results-desktop-filters.png` pass | `long-results-wide-scrolled.png` and `long-results-wide-filters.png` pass |

The exit link is visible and separate from the scope selector in every state.
The run reference appears only for completed states, fits at phone width, and
does not dominate the result count. Empty and error messaging was too faint in
the first render; after darkening it, all four replacement error captures are
readable. The results region scrolls to item 31 with controls intact; expanded
filters keep the remaining cards reachable. Browser checks passed with no page
errors. This is a self-review, not independent acceptance.

The disposable full app was also opened and inspected at 1280×720 and 390×844
in a submitted Kitchen-scoped search. Captures are
`/private/tmp/search-trace-app-captures/scoped-search-desktop.png` and
`/private/tmp/search-trace-app-captures/scoped-search-phone.png`. Both show the
actual shell, `Back to Kitchen`, a muted server run line, and two readable
cards; no visible overlay or clipping appeared. The app test verifies the
server's recorded ordered IDs against the rendered card links, refresh,
semantic exit, and browser Back.
