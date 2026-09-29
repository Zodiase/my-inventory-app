# Tri-state density regression baseline

The current `Prototypes / Tri-state Indicator Lane / Off` story is **visually rejected** by the user. The earlier pass in [the story review](../tri-state-indicator-lane-2026-09-28/REVIEW.md) covered mechanics and must not be treated as design approval. This baseline records the defect before the replacement size contract is applied; it sets no acceptance thresholds.

| Viewport           | Full story                                     | Six-row crop                                | Focus                                        | Geometry                                      |
| ------------------ | ---------------------------------------------- | ------------------------------------------- | -------------------------------------------- | --------------------------------------------- |
| 1280 × 800 desktop | [capture](baseline/density-before-desktop.png) | [capture](baseline/rows-before-desktop.png) | [capture](baseline/focus-before-desktop.png) | [JSON](baseline/geometry-before-desktop.json) |
| 820 × 900 iPad     | [capture](baseline/density-before-ipad.png)    | [capture](baseline/rows-before-ipad.png)    | [capture](baseline/focus-before-ipad.png)    | [JSON](baseline/geometry-before-ipad.json)    |

In both views, the compact rail's hit box is 168 × 44 px inside a 624 × 49 px row. It occupies about 90% of the row height; the visible recessed area is 166 × 32 px. The enlarged example measures 300 × 64 px. The fixed words are centered about 9 px above the rail center, and the moving indicator does not overlap a word. These measurements match the reported visual problems: the control remains tall in repeated rows, the text leans upward, and the indicator reads as an underline. There is no horizontal page overflow.

The replacement review will compare full-story, row-crop, focus, and geometry artifacts at the same viewports after the design owner supplies the intended size and composition limits. The running app is outside this mock review.
