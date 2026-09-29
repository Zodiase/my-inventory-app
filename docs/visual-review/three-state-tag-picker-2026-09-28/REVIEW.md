# Three-state tag picker visual review

**Reviewer:** implementation agent, self-review; independent visual approval remains pending.  
**Contract:** [CONTRACT.md](CONTRACT.md).  
**Evidence:** [screenshots](screenshots/) captured from isolated Storybook on 2026-09-28.  
**LAN Storybook:** `http://mini-m4.local:48377/?path=/story/prototypes-direct-selection-tag-picker--browse`.  
**Status:** implementation proof passes this visual contract; production integration awaits design-owner and user review.

The tag controls now use the shared recessed rail and translucent unlabeled handle reviewed in the [isolated toggle proof](../tri-state-toggle-2026-09-28/REVIEW.md). The three labels remain fixed inside the rail, and external Included/Excluded row words have been removed. These screenshots reflect that revision; user visual approval remains pending.

Screenshots were inspected at readable scale, including the final slider/switch treatment, panel containment, hierarchy, legibility, control affordances, and desktop/tablet continuity. The panel deliberately overlays mock results while the compact applied summary remains accessible. It does not claim phone support.

| Story | 1280 × 800 | 820 × 1100 | Judgment |
| --- | --- | --- | --- |
| browse | [desktop](screenshots/browse-desktop.png) — pass | [iPad](screenshots/browse-ipad.png) — pass | Hierarchy, neutral center detent, and large catalog are clear. |
| one-selected | [desktop](screenshots/one-selected-desktop.png) — pass | [iPad](screenshots/one-selected-ipad.png) — pass | Include position and compact summary are legible. |
| two-selected | [desktop](screenshots/two-selected-desktop.png) — pass | [iPad](screenshots/two-selected-ipad.png) — pass | Two included rows remain visible in the same catalog. |
| excluded | [desktop](screenshots/excluded-desktop.png) — pass | [iPad](screenshots/excluded-ipad.png) — pass | Exclude position and NOT summary are distinguishable. |
| sixteen-selected | [desktop](screenshots/sixteen-selected-desktop.png) — pass | [iPad](screenshots/sixteen-selected-ipad.png) — pass | Long selection scrolls inside the catalog; page summary stays compact. |
| review-selected | [desktop](screenshots/review-selected-desktop.png) — pass | [iPad](screenshots/review-selected-ipad.png) — pass | Binary switch is visibly On and selected rows remain navigable. |
| selected-search | [desktop](screenshots/selected-search-desktop.png) — pass | [iPad](screenshots/selected-search-ipad.png) — pass | Query and selected-only mode compose without losing parent headings. |
| selected-empty | [desktop](screenshots/selected-empty-desktop.png) — pass | [iPad](screenshots/selected-empty-ipad.png) — pass | Empty state and clear-query action are visible. |
| path-search | [desktop](screenshots/path-search-desktop.png) — pass | [iPad](screenshots/path-search-ipad.png) — pass | Lens result retains Equipment / Camera context. |
| type-open | [desktop](screenshots/type-open-desktop.png) — pass | [iPad](screenshots/type-open-ipad.png) — pass | Type remains its own anchored menu. |

Focused Playwright suite: **13/13 passed**. It covers every screenshot state at both widths, catalog geometry, direct slider positions, binary selected-only behavior, search, large selection removal and focus, keyboard, RTL, tablet tapping, and the Storybook manager route. TypeScript, formatting, and Storybook-source lint also passed. No horizontal overflow, browser errors, or error overlay were observed.

**Limit:** mock results and tag catalog demonstrate interaction only. Nothing has been deployed into the inventory app. Physical-device testing and independent visual approval remain to be done.
