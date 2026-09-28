# Search route visual review — 2026-09-27

## Contract

- **Surface:** the full `/search` application shell with 31 matching inventory items.
- **Purpose:** a broad search must leave the heading, query input, scope selector, result count, and result cards in a clear vertical order.
- **Composition:** search controls stay above results without overlap; cards remain readable and aligned. The route scrolls vertically inside the application main area, while the app header remains visible.
- **Viewports:** 390 × 844 phone, 768 × 1024 tablet, 1280 × 720 desktop, and 1600 × 1000 wide desktop.
- **Responsive behavior:** the same order and usable controls persist at every width; cards fill the available content width. No horizontal scrolling is expected.
- **Interaction:** after the broad search, the query input accepts a click; scrolling reaches the final result, and the input can be used again to refine the query.
- **Exclusions:** this review does not assess search ranking or item detail content.

## Review

The reviewer opened both top and bottom screenshots for every viewport. Artifacts were captured from the full disposable Meteor app shell with a 31-item fixture, then inspected at `/private/tmp/inventory-search-layout-{phone,tablet,desktop,wide}.png` and corresponding `-bottom.png` files. This is a self-review.

| Viewport    | Judgment | Observations                                                                                                                                                     |
| ----------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 390 × 844   | Pass     | Header, heading, input, scope, count, and cards are ordered and readable. No horizontal overflow or clipped controls. The final card is visible after scrolling. |
| 768 × 1024  | Pass     | Controls and cards retain spacing and full-width alignment. The final card is reachable by vertical scrolling.                                                   |
| 1280 × 720  | Pass     | The input and result count no longer overlap; cards remain legible in the shorter desktop frame. The final card is reachable.                                    |
| 1600 × 1000 | Pass     | Wide cards and controls retain a clear hierarchy without sparse or stretched elements. The final card is reachable.                                              |

Across all four sizes, the page frame, containment, scale, repeated-card composition, text, interaction cues, visual hierarchy, and responsive continuity were checked in the rendered screenshots. The browser regression additionally clicks the input after 31 results, scrolls to the final card, and refines the query to one result. No visual defect remains in this reviewed state.
