# Search banner visual review — revised one-row design (2026-09-28)

Self-review against `SearchPageLayout.stories.tsx` story-specific `parameters.review`, after inspecting all 70 screenshots below as ten contact sheets and full-size representative views. Storybook manager rendered without an error overlay. `SearchPageLayout.spec.ts` passed 15/15, including geometry, the actual text-input width, focus, collapsed menus, older saved filters, and results scrolling. This is implementation review, not independent acceptance.

Across all states and widths, the exit, scope/filter control and query remain on one blue row. At 320px the text input itself retains at least 160px; no controls overlap, no horizontal document overflow, and the full scope remains in the compact control’s accessible name. The narrow mode moves query clearing into the combined menu and supports Escape in the focused input. The 459px and 460px captures are both intentionally narrow because the transition is based on available banner width; 619px and 620px show the tighter two-control mode, and 1280px shows separate Scope, Tags and Type unless an older saved filter calls for a unified Filters control.

## global-idle

**Expectation and judgment:** One-row query and scope; quiet empty state without a repeated icon. Pass at every required width.

| Viewport | Evidence                                                                                              | Visual judgment                                       |
| -------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 320×700  | [global-idle-minimum-phone.png](visual-review/search-banner-2026-09-28/global-idle-minimum-phone.png) | Pass: no wrap, overlap, clipping or misplaced control |
| 390×844  | [global-idle-phone.png](visual-review/search-banner-2026-09-28/global-idle-phone.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 459×900  | [global-idle-below-medium.png](visual-review/search-banner-2026-09-28/global-idle-below-medium.png)   | Pass: no wrap, overlap, clipping or misplaced control |
| 460×900  | [global-idle-medium.png](visual-review/search-banner-2026-09-28/global-idle-medium.png)               | Pass: no wrap, overlap, clipping or misplaced control |
| 619×900  | [global-idle-below-roomy.png](visual-review/search-banner-2026-09-28/global-idle-below-roomy.png)     | Pass: no wrap, overlap, clipping or misplaced control |
| 620×900  | [global-idle-roomy.png](visual-review/search-banner-2026-09-28/global-idle-roomy.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 1280×720 | [global-idle-desktop.png](visual-review/search-banner-2026-09-28/global-idle-desktop.png)             | Pass: no wrap, overlap, clipping or misplaced control |

## global-loading

**Expectation and judgment:** Banner remains usable while the status announces loading. Pass at every required width.

| Viewport | Evidence                                                                                                    | Visual judgment                                       |
| -------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 320×700  | [global-loading-minimum-phone.png](visual-review/search-banner-2026-09-28/global-loading-minimum-phone.png) | Pass: no wrap, overlap, clipping or misplaced control |
| 390×844  | [global-loading-phone.png](visual-review/search-banner-2026-09-28/global-loading-phone.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 459×900  | [global-loading-below-medium.png](visual-review/search-banner-2026-09-28/global-loading-below-medium.png)   | Pass: no wrap, overlap, clipping or misplaced control |
| 460×900  | [global-loading-medium.png](visual-review/search-banner-2026-09-28/global-loading-medium.png)               | Pass: no wrap, overlap, clipping or misplaced control |
| 619×900  | [global-loading-below-roomy.png](visual-review/search-banner-2026-09-28/global-loading-below-roomy.png)     | Pass: no wrap, overlap, clipping or misplaced control |
| 620×900  | [global-loading-roomy.png](visual-review/search-banner-2026-09-28/global-loading-roomy.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 1280×720 | [global-loading-desktop.png](visual-review/search-banner-2026-09-28/global-loading-desktop.png)             | Pass: no wrap, overlap, clipping or misplaced control |

## global-empty

**Expectation and judgment:** Zero-result status and server run reference remain visible. Pass at every required width.

| Viewport | Evidence                                                                                                | Visual judgment                                       |
| -------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 320×700  | [global-empty-minimum-phone.png](visual-review/search-banner-2026-09-28/global-empty-minimum-phone.png) | Pass: no wrap, overlap, clipping or misplaced control |
| 390×844  | [global-empty-phone.png](visual-review/search-banner-2026-09-28/global-empty-phone.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 459×900  | [global-empty-below-medium.png](visual-review/search-banner-2026-09-28/global-empty-below-medium.png)   | Pass: no wrap, overlap, clipping or misplaced control |
| 460×900  | [global-empty-medium.png](visual-review/search-banner-2026-09-28/global-empty-medium.png)               | Pass: no wrap, overlap, clipping or misplaced control |
| 619×900  | [global-empty-below-roomy.png](visual-review/search-banner-2026-09-28/global-empty-below-roomy.png)     | Pass: no wrap, overlap, clipping or misplaced control |
| 620×900  | [global-empty-roomy.png](visual-review/search-banner-2026-09-28/global-empty-roomy.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 1280×720 | [global-empty-desktop.png](visual-review/search-banner-2026-09-28/global-empty-desktop.png)             | Pass: no wrap, overlap, clipping or misplaced control |

## global-error

**Expectation and judgment:** Error and server run reference are distinct from empty results. Pass at every required width.

| Viewport | Evidence                                                                                                | Visual judgment                                       |
| -------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 320×700  | [global-error-minimum-phone.png](visual-review/search-banner-2026-09-28/global-error-minimum-phone.png) | Pass: no wrap, overlap, clipping or misplaced control |
| 390×844  | [global-error-phone.png](visual-review/search-banner-2026-09-28/global-error-phone.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 459×900  | [global-error-below-medium.png](visual-review/search-banner-2026-09-28/global-error-below-medium.png)   | Pass: no wrap, overlap, clipping or misplaced control |
| 460×900  | [global-error-medium.png](visual-review/search-banner-2026-09-28/global-error-medium.png)               | Pass: no wrap, overlap, clipping or misplaced control |
| 619×900  | [global-error-below-roomy.png](visual-review/search-banner-2026-09-28/global-error-below-roomy.png)     | Pass: no wrap, overlap, clipping or misplaced control |
| 620×900  | [global-error-roomy.png](visual-review/search-banner-2026-09-28/global-error-roomy.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 1280×720 | [global-error-desktop.png](visual-review/search-banner-2026-09-28/global-error-desktop.png)             | Pass: no wrap, overlap, clipping or misplaced control |

## global-results

**Expectation and judgment:** Three cards and result count retain readable hierarchy. Pass at every required width.

| Viewport | Evidence                                                                                                    | Visual judgment                                       |
| -------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 320×700  | [global-results-minimum-phone.png](visual-review/search-banner-2026-09-28/global-results-minimum-phone.png) | Pass: no wrap, overlap, clipping or misplaced control |
| 390×844  | [global-results-phone.png](visual-review/search-banner-2026-09-28/global-results-phone.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 459×900  | [global-results-below-medium.png](visual-review/search-banner-2026-09-28/global-results-below-medium.png)   | Pass: no wrap, overlap, clipping or misplaced control |
| 460×900  | [global-results-medium.png](visual-review/search-banner-2026-09-28/global-results-medium.png)               | Pass: no wrap, overlap, clipping or misplaced control |
| 619×900  | [global-results-below-roomy.png](visual-review/search-banner-2026-09-28/global-results-below-roomy.png)     | Pass: no wrap, overlap, clipping or misplaced control |
| 620×900  | [global-results-roomy.png](visual-review/search-banner-2026-09-28/global-results-roomy.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 1280×720 | [global-results-desktop.png](visual-review/search-banner-2026-09-28/global-results-desktop.png)             | Pass: no wrap, overlap, clipping or misplaced control |

## scoped-results

**Expectation and judgment:** Rack A scope and exit are visible; result anchors remain clear. Pass at every required width.

| Viewport | Evidence                                                                                                    | Visual judgment                                       |
| -------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 320×700  | [scoped-results-minimum-phone.png](visual-review/search-banner-2026-09-28/scoped-results-minimum-phone.png) | Pass: no wrap, overlap, clipping or misplaced control |
| 390×844  | [scoped-results-phone.png](visual-review/search-banner-2026-09-28/scoped-results-phone.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 459×900  | [scoped-results-below-medium.png](visual-review/search-banner-2026-09-28/scoped-results-below-medium.png)   | Pass: no wrap, overlap, clipping or misplaced control |
| 460×900  | [scoped-results-medium.png](visual-review/search-banner-2026-09-28/scoped-results-medium.png)               | Pass: no wrap, overlap, clipping or misplaced control |
| 619×900  | [scoped-results-below-roomy.png](visual-review/search-banner-2026-09-28/scoped-results-below-roomy.png)     | Pass: no wrap, overlap, clipping or misplaced control |
| 620×900  | [scoped-results-roomy.png](visual-review/search-banner-2026-09-28/scoped-results-roomy.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 1280×720 | [scoped-results-desktop.png](visual-review/search-banner-2026-09-28/scoped-results-desktop.png)             | Pass: no wrap, overlap, clipping or misplaced control |

## scoped-active-filters

**Expectation and judgment:** Scope plus two active constraints collapse without hiding the query. Pass at every required width.

| Viewport | Evidence                                                                                                                  | Visual judgment                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 320×700  | [scoped-active-filters-minimum-phone.png](visual-review/search-banner-2026-09-28/scoped-active-filters-minimum-phone.png) | Pass: no wrap, overlap, clipping or misplaced control |
| 390×844  | [scoped-active-filters-phone.png](visual-review/search-banner-2026-09-28/scoped-active-filters-phone.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 459×900  | [scoped-active-filters-below-medium.png](visual-review/search-banner-2026-09-28/scoped-active-filters-below-medium.png)   | Pass: no wrap, overlap, clipping or misplaced control |
| 460×900  | [scoped-active-filters-medium.png](visual-review/search-banner-2026-09-28/scoped-active-filters-medium.png)               | Pass: no wrap, overlap, clipping or misplaced control |
| 619×900  | [scoped-active-filters-below-roomy.png](visual-review/search-banner-2026-09-28/scoped-active-filters-below-roomy.png)     | Pass: no wrap, overlap, clipping or misplaced control |
| 620×900  | [scoped-active-filters-roomy.png](visual-review/search-banner-2026-09-28/scoped-active-filters-roomy.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 1280×720 | [scoped-active-filters-desktop.png](visual-review/search-banner-2026-09-28/scoped-active-filters-desktop.png)             | Pass: no wrap, overlap, clipping or misplaced control |

## contradictory-restored-filters

**Expectation and judgment:** Saved contradictory state remains visible and editable in the menu. Pass at every required width.

| Viewport | Evidence                                                                                                                                    | Visual judgment                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 320×700  | [contradictory-restored-filters-minimum-phone.png](visual-review/search-banner-2026-09-28/contradictory-restored-filters-minimum-phone.png) | Pass: no wrap, overlap, clipping or misplaced control |
| 390×844  | [contradictory-restored-filters-phone.png](visual-review/search-banner-2026-09-28/contradictory-restored-filters-phone.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 459×900  | [contradictory-restored-filters-below-medium.png](visual-review/search-banner-2026-09-28/contradictory-restored-filters-below-medium.png)   | Pass: no wrap, overlap, clipping or misplaced control |
| 460×900  | [contradictory-restored-filters-medium.png](visual-review/search-banner-2026-09-28/contradictory-restored-filters-medium.png)               | Pass: no wrap, overlap, clipping or misplaced control |
| 619×900  | [contradictory-restored-filters-below-roomy.png](visual-review/search-banner-2026-09-28/contradictory-restored-filters-below-roomy.png)     | Pass: no wrap, overlap, clipping or misplaced control |
| 620×900  | [contradictory-restored-filters-roomy.png](visual-review/search-banner-2026-09-28/contradictory-restored-filters-roomy.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 1280×720 | [contradictory-restored-filters-desktop.png](visual-review/search-banner-2026-09-28/contradictory-restored-filters-desktop.png)             | Pass: no wrap, overlap, clipping or misplaced control |

## legacy-saved-filters

**Expectation and judgment:** An older saved filter remains counted and visible in the Filters menu; Reset removes it without clearing the query. Pass at every required width.

| Viewport | Evidence                                                                                                                | Visual judgment                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 320×700  | [legacy-saved-filters-minimum-phone.png](visual-review/search-banner-2026-09-28/legacy-saved-filters-minimum-phone.png) | Pass: count visible; no wrap, overlap, clipping or misplaced control |
| 390×844  | [legacy-saved-filters-phone.png](visual-review/search-banner-2026-09-28/legacy-saved-filters-phone.png)                 | Pass: count visible; no wrap, overlap, clipping or misplaced control |
| 459×900  | [legacy-saved-filters-below-medium.png](visual-review/search-banner-2026-09-28/legacy-saved-filters-below-medium.png)   | Pass: count visible; no wrap, overlap, clipping or misplaced control |
| 460×900  | [legacy-saved-filters-medium.png](visual-review/search-banner-2026-09-28/legacy-saved-filters-medium.png)               | Pass: count visible; no wrap, overlap, clipping or misplaced control |
| 619×900  | [legacy-saved-filters-below-roomy.png](visual-review/search-banner-2026-09-28/legacy-saved-filters-below-roomy.png)     | Pass: count visible; no wrap, overlap, clipping or misplaced control |
| 620×900  | [legacy-saved-filters-roomy.png](visual-review/search-banner-2026-09-28/legacy-saved-filters-roomy.png)                 | Pass: count visible; no wrap, overlap, clipping or misplaced control |
| 1280×720 | [legacy-saved-filters-desktop.png](visual-review/search-banner-2026-09-28/legacy-saved-filters-desktop.png)             | Pass: count visible; no wrap, overlap, clipping or misplaced control |

## long-results

**Expectation and judgment:** Results alone scroll; the header stays fixed and cards do not clip horizontally. Pass at every required width.

| Viewport | Evidence                                                                                                | Visual judgment                                       |
| -------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 320×700  | [long-results-minimum-phone.png](visual-review/search-banner-2026-09-28/long-results-minimum-phone.png) | Pass: no wrap, overlap, clipping or misplaced control |
| 390×844  | [long-results-phone.png](visual-review/search-banner-2026-09-28/long-results-phone.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 459×900  | [long-results-below-medium.png](visual-review/search-banner-2026-09-28/long-results-below-medium.png)   | Pass: no wrap, overlap, clipping or misplaced control |
| 460×900  | [long-results-medium.png](visual-review/search-banner-2026-09-28/long-results-medium.png)               | Pass: no wrap, overlap, clipping or misplaced control |
| 619×900  | [long-results-below-roomy.png](visual-review/search-banner-2026-09-28/long-results-below-roomy.png)     | Pass: no wrap, overlap, clipping or misplaced control |
| 620×900  | [long-results-roomy.png](visual-review/search-banner-2026-09-28/long-results-roomy.png)                 | Pass: no wrap, overlap, clipping or misplaced control |
| 1280×720 | [long-results-desktop.png](visual-review/search-banner-2026-09-28/long-results-desktop.png)             | Pass: no wrap, overlap, clipping or misplaced control |

**Limits:** Mock stories cannot prove persisted URL state or server filtering; the isolated Meteor app suite covers that behavior. The compact control truncates long visible labels by design and exposes the complete name to assistive technology.
