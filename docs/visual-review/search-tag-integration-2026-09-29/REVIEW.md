# Search tag picker integration review

**Status:** implementation self-review; independent acceptance remains with the verifier.

**Surface:** Search banner, tag catalog, selected-only switch, and applied-filter summary.
**Expected behavior:** the banner stays on one usable row, the tag menu shows one searchable hierarchy, each leaf has a compact Include/Off/Exclude control, selected-only filters that same hierarchy, and the summary explains/removes active constraints without obscuring the results. Older links with separate include fragments retain their all-required meaning.

| Affected story or surface | Viewports checked | Observation |
| --- | --- | --- |
| `SearchTagCatalog/Full` | 1280 × 800; 820 × 900 | All 19 fixture leaves fit the scrollable catalog. A selected tag appears in selected-only; path search retains its parent heading. Compact pill measured 162 × 29 and switch track 35 × 22 at both widths. I manually exercised Include, selected-only, Find, and clearing Find in the Storybook manager. |
| `SearchTagCatalog/Selected Only` | 1280 × 800; 820 × 900 | Existing selections remain visible in the shared catalog; unselected leaves are hidden. |
| `SelectedTagsSwitch` Off/On/Empty | 1280 × 800; 820 × 900 | The disabled empty state, binary position and count label remain compact. The 14 px thumb has 2 px horizontal end insets. |
| `SearchPageLayout` search states | 1280 × 800; 820 × 900; 390 × 844; 320 × 700 in the existing responsive suite | The one-row banner, independent tags/type controls, summary and results remain usable. Existing long-result and older-filter states still pass. |
| `StandaloneFilterView` proof states | 1280 × 800; 820 × 900; 390 × 844 | Find and selected-only compose; removing the last selected row restores a focus target; the panel stays within the narrow viewport. |
| Integrated Meteor Search | 1280-wide browser shell; iPad 820 × 900 | I manually opened Tags in the running app, included Needs sorting, enabled selected-only, observed the one matching result, cleared the tag, and closed the menu. [The iPad screenshot](ipad-search-filter.png) was inspected after the slider settled: the menu is right anchored, hierarchy and selected-only state are readable, the Exclude handle is on the correct side, and the summary and one matching result remain visible. The iPad test also closes the menu with Escape and restores focus to its trigger. |

The focused Storybook suite passed **27/27**. Real-app tests passed for the iPad include-any/exclude flow and for older all-required links. TypeScript and app formatting/lint passed. I observed no Storybook error overlay in the manager or the actual Search shell. The app review and screenshot used disposable local Meteor data; they are not a live-data or physical-device review. Independent visual acceptance and merge remain pending.
