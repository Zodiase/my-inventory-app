# Compact tri-state pill — self-review

**Story:** `Prototypes / Tri-state Compact Pill` Off / Include / Exclude.  
**Contract:** [CONTRACT.md](CONTRACT.md).  
**Reviewer:** implementation agent; user/design approval remains pending.  
**Baseline:** [rejected upper-label/underline design](BASELINE.md).

| State   | Desktop 1280 × 800                                                             | iPad 820 × 900                                                           | Judgment                                                                          |
| ------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Off     | [full](after/off-desktop.png) · [six rows](after/off-rows-desktop.png)         | [full](after/off-ipad.png) · [six rows](after/off-rows-ipad.png)         | Geometry and self-review pass. Neutral thumb is light; fixed words stay centered. |
| Include | [full](after/include-desktop.png) · [six rows](after/include-rows-desktop.png) | [full](after/include-ipad.png) · [six rows](after/include-rows-ipad.png) | Geometry and self-review pass. Thumb covers Include only in the changed row.      |
| Exclude | [full](after/exclude-desktop.png) · [six rows](after/exclude-rows-desktop.png) | [full](after/exclude-ipad.png) · [six rows](after/exclude-rows-ipad.png) | Geometry and self-review pass. Thumb covers Exclude only in the changed row.      |

I opened all six full-story images and all six repeated-row crops at readable scale. The page frame, tag names, controls, and footer remain in order. Neither viewport clips the pill, crowds the labels, or creates horizontal overflow. The same pill size is used in the example and repeated rows, so the example no longer distorts its perceived scale. The text is centered inside the visible cavity and stays fixed as the translucent thumb moves over it; no underline lane or changing thumb symbol remains. The six neutral controls read as secondary to the tag names. Row rhythm and spacing remain consistent across states and widths.

Browser measurements at [desktop](after/geometry-desktop.json) and [iPad](after/geometry-ipad.json): example and repeated pills are **162 × 29 px**; rows are **48 px** high; thumb is **52 × 24 px**; each choice has a **54 × 44 px** hit area. The first label midpoint is **1 px** from the pill midpoint, and the active thumb overlaps its word. The pill uses about **60%** of row height, down from the rejected 44 px rail occupying about 90% of a 49 px row. Horizontal overflow is zero.

The [narrow 390 × 844 capture](after/off-narrow.png) keeps all six rows reachable without horizontal overflow. [Desktop focus](after/focus-desktop.png) and [iPad focus](after/focus-ipad.png) show a visible amber outline. Browser checks also exercised direct mouse/touch selection, keyboard arrows, RTL mirroring, continuous horizontal travel, and reduced motion.

These results establish that the mock meets the measured contract and resolves the specific upper-label/underline geometry defect. They do not establish user visual approval or production acceptance.
