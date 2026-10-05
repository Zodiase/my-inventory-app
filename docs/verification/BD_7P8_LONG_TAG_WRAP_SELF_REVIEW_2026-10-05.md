# Long tag wrapping — implementation self-review

2026-10-05, America/Los_Angeles. Base 055d94c. Candidate revision recorded by the publication handoff. This is implementation self-review, not independent or coordinator design acceptance. Live review used the full Storybook manager on loopback port 48397; no household records or production services changed.

## Scope and checks

Full tag identity and ancestry wrap instead of truncating. Short rows remain compact; long rows grow. Existing 162x29 toggle rails and 44px choice targets stay unchanged. The catalog minimum height reserves a group and multiline leaf in combined menus. Subjective toggle sizing/motion approval is excluded.

15 focused Chromium/WebKit checks passed after the final behavioral change; type/style passed. The new composed desktop regression fails against unchanged 48396 with nowrap versus expected normal. Initial wrap-only code passed width checks but manual tablet review found vertical clipping; the revised minimum height and explicit name-within-list assertion fix that failure. Generated Meteor types were restored locally to match the unchanged base; App source was not edited.

Contracts: SearchPageLayout.stories.tsx ToggleRegression parameters.review and SearchTagCatalog.stories.tsx shared parameters.review, outside the render tree.

## UI/SearchPageLayout/ToggleRegression

- **1280x720: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-manager-1280.png). Separate Tags menu, two-line identity, ancestry readable, centered rail; manager addons constrain preview height. No horizontal escape, overlapping rows, error overlay or clipped name observed. All eight review dimensions inspected: frame/containment/proportions/composition/text/targets/hierarchy/responsive continuity.
- **820x900: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-manager-820.png). Combined Filters menu, three-line identity and ancestry fully visible; Type below catalog, outer menu scrollbar. No horizontal escape, overlapping rows, error overlay or clipped name observed. All eight review dimensions inspected: frame/containment/proportions/composition/text/targets/hierarchy/responsive continuity.
- **390x844: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-manager-390x844.png). Combined Scope/Tags/Type menu, three-line identity; header/search remain usable and menu scroll owns overflow. No horizontal escape, overlapping rows, error overlay or clipped name observed. All eight review dimensions inspected: frame/containment/proportions/composition/text/targets/hierarchy/responsive continuity.
- **390x480: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-manager-390x480.png). After neutral radio interaction scrolls outer menu, full name and ancestry visible; Scope/Tags heading above viewport remains recoverable by scrolling. No horizontal escape, overlapping rows, error overlay or clipped name observed. All eight review dimensions inspected: frame/containment/proportions/composition/text/targets/hierarchy/responsive continuity.

Find Camera → Include → clear Find → Escape was manually exercised in the desktop manager: selection updated and menu closed (`aria-expanded=false`). Tablet/phone representative selection and short-menu scrolling were exercised during the initial review. Full-name vertical visibility and centered rail/hit bounds are additionally asserted at all four sizes. The short phone intentionally needs vertical menu scrolling; all sections are not simultaneously on screen. Cross-size conclusion: passes this identity wrapping correction; broader aesthetic toggle approval remains open.

## UI/SearchTagCatalog/Full

- **1280x720: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-full-1280x720.png). Short labels retain 50px compact rows, aligned rails and group hierarchy. Find and selected-only fit the panel header. No horizontal overflow or text/target collision; fixed 560px fixture may scroll inside a shorter manager preview. Panel list owns its own bounded vertical scrolling. All eight review dimensions inspected.
- **820x900: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-full-820x900.png). Short labels retain 50px compact rows, aligned rails and group hierarchy. Find and selected-only fit the panel header. No horizontal overflow or text/target collision; fixed 560px fixture may scroll inside a shorter manager preview. Panel list owns its own bounded vertical scrolling. All eight review dimensions inspected.
- **390x844: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-full-390x844.png). Short labels retain 50px compact rows, aligned rails and group hierarchy. Find and selected-only fit the panel header. No horizontal overflow or text/target collision; fixed 560px fixture may scroll inside a shorter manager preview. Panel list owns its own bounded vertical scrolling. All eight review dimensions inspected.
- **390x480: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-full-390x480.png). Short labels retain 50px compact rows, aligned rails and group hierarchy. Find and selected-only fit the panel header. No horizontal overflow or text/target collision; fixed 560px fixture may scroll inside a shorter manager preview. Panel list owns its own bounded vertical scrolling. All eight review dimensions inspected.

Find Camera → Include → clear Find was exercised. Include Hardware part 16 scrolled to the last row and visibly selected it ([scroll render](bd-7p8/bd-7p8-full-scroll.png)); Find remained recoverable by focusing it, then Camera → Exclude produced `data-state=exclude`, and clear Find left focus in the empty search field. The manager preview also scrolls when the unchanged fixed-height fixture exceeds preview height; that is distinct from internal list scrolling. Cross-size conclusion: no new catalog regression observed.

## UI/SearchTagCatalog/SelectedOnly

- **1280x720: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-selected-1280x720.png). Only two selected Workflow leaves appear; Include/Exclude states, switch and count agree. Compact rows/rails remain aligned. Empty space reflects unchanged 560px fixed-panel fixture; smaller preview scrolls that panel without horizontal escape. No text/target overlap or overlay. All eight review dimensions inspected.
- **820x900: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-selected-820x900.png). Only two selected Workflow leaves appear; Include/Exclude states, switch and count agree. Compact rows/rails remain aligned. Empty space reflects unchanged 560px fixed-panel fixture; smaller preview scrolls that panel without horizontal escape. No text/target overlap or overlay. All eight review dimensions inspected.
- **390x844: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-selected-390x844.png). Only two selected Workflow leaves appear; Include/Exclude states, switch and count agree. Compact rows/rails remain aligned. Empty space reflects unchanged 560px fixed-panel fixture; smaller preview scrolls that panel without horizontal escape. No text/target overlap or overlay. All eight review dimensions inspected.
- **390x480: pass for bounded requirement.** [Render](bd-7p8/bd-7p8-selected-390x480.png). Only two selected Workflow leaves appear; Include/Exclude states, switch and count agree. Compact rows/rails remain aligned. Empty space reflects unchanged 560px fixed-panel fixture; smaller preview scrolls that panel without horizontal escape. No text/target overlap or overlay. All eight review dimensions inspected.

Neutralized Needs repair and then Needs sorting. Count became zero, selected-only reset to full catalog with the switch disabled and Find focused; recovery did not strand the user. Cross-size conclusion: selected-only composition and recovery pass self-review.

## Evidence limits

Screenshots were opened and inspected individually. Early malformed viewport captures were replaced after separating resize/state observation from capture; only reviewed replacements are archived. Relevant browser error logs were empty. Independent exact-head testing and coordinator manual render acceptance are still required before merge/deployment. No broad toggle aesthetic acceptance or loading-bug fix is claimed.
