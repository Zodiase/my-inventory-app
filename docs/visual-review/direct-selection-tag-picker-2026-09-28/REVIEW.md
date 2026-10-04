# Direct-selection tag picker visual review

**Reviewer:** implementation agent, self-review (not independent validation).  
**Contract:** [CONTRACT.md](CONTRACT.md).  
**Evidence:** [screenshots](screenshots/) captured from the isolated Storybook server on 2026-09-28.  
**Story URL:** `http://mini-m4.local:48377/?path=/story/prototypes-direct-selection-tag-picker--<story>`.  
**Status:** passes the declared desktop/iPad proof; still requires product/design judgment before app integration.

Every screenshot below was opened and inspected at readable scale. Across states I checked the page frame, panel containment, catalog scrollbar ownership, proportions, nested row rhythm, text, control targets, and continuity between widths. The panel overlays results deliberately, while the applied summary remains available after closing it. The narrowest supported width in this proof is 820px.

| Story | 1280 × 800 | 820 × 1100 | Judgment against contract |
| --- | --- | --- | --- |
| browse | [desktop](screenshots/browse-desktop.png) — pass | [iPad](screenshots/browse-ipad.png) — pass | Header/search fixed above the large hierarchical catalog; rows and group structure legible. |
| one-selected | [desktop](screenshots/one-selected-desktop.png) — pass | [iPad](screenshots/one-selected-ipad.png) — pass | Included state and one removable applied tag are clear. |
| two-selected | [desktop](screenshots/two-selected-desktop.png) — pass | [iPad](screenshots/two-selected-ipad.png) — pass | Both selected rows visible; summary says `Tags: … or …`. |
| excluded | [desktop](screenshots/excluded-desktop.png) — pass | [iPad](screenshots/excluded-ipad.png) — pass | Orange Excluded state, parent path, and `Not:` summary distinguish it from inclusion. |
| sixteen-selected | [desktop](screenshots/sixteen-selected-desktop.png) — pass | [iPad](screenshots/sixteen-selected-ipad.png) — pass | Catalog, not a chip wall, carries all sixteen; outside summary stays compact. |
| review-selected | [desktop](screenshots/review-selected-desktop.png) — pass | [iPad](screenshots/review-selected-ipad.png) — pass | Sixteen rows remain scrollable in the same catalog with Browse return. |
| path-search | [desktop](screenshots/path-search-desktop.png) — pass | [iPad](screenshots/path-search-ipad.png) — pass | Lens appears with its Equipment / Camera path; empty catalog area is expected for one match. |
| type-open | [desktop](screenshots/type-open-desktop.png) — pass | [iPad](screenshots/type-open-ipad.png) — pass | Type stays separately anchored; selected Items state is readable. |

Browser checks exercised the five required flows, catalog geometry, exact manager route, and keyboard Escape focus. Eight Playwright checks passed. The tag catalog ratio was at least 70% of the panel height in both viewports. No page errors or horizontal document overflow were observed. The Storybook manager rendered without an error overlay.

**Known limits:** The mock result list and matching logic demonstrate interaction only. No production route, persistent filter, saved URL, or inventory data has been changed. Touch-size targets were measured and visually inspected at tablet width, but physical-device testing is not part of this proof.
