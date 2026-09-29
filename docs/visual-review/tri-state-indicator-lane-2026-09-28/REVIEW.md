# Separate indicator lane visual review

**Reviewer:** implementation agent, self-review; user/design review pending.  
**Contract:** [CONTRACT.md](CONTRACT.md).  
**LAN Storybook:** `http://mini-m4.local:48377/?path=/story/prototypes-tri-state-indicator-lane--off`.  
**Comparison:** [existing overlaid handle story](http://mini-m4.local:48377/?path=/story/prototypes-tri-state-tag-toggle--undecided).

| State | Desktop 1280 × 800 | iPad 820 × 900 | Judgment |
| --- | --- | --- | --- |
| Off | [screenshot](screenshots/off-desktop.png) — pass | [screenshot](screenshots/off-ipad.png) — pass | Indicator stays below all words; six Off rows read quietly. |
| Include | [screenshot](screenshots/include-desktop.png) — pass | [screenshot](screenshots/include-ipad.png) — pass | Indicator moves under Include; first compact row mirrors it. |
| Exclude | [screenshot](screenshots/exclude-desktop.png) — pass | [screenshot](screenshots/exclude-ipad.png) — pass | Indicator moves under Exclude; other rows stay Off. |

I inspected the six screenshots at readable scale and operated the live preview from Off to Include to Exclude. The fixed words remained stationary, and the indicator travelled below them rather than behind the active word. The enlarged example makes the motion visible; the six compact rows show that repeated neutral controls are much less prominent than the prior white overlaid capsules. There is no horizontal overflow or Storybook error overlay. The desktop story is taller than 800px, so its lower rows require vertical scrolling; the full-page screenshots include them.

The alternative's **10/10** focused checks passed, including vertical separation, fixed labels, end-to-end travel, compact-row emphasis, direct input, keyboard, RTL, reduced motion, and manager rendering. The combined suite across this alternative and the two existing mock stories passed **33/33**. TypeScript, formatting, and Storybook-source lint passed. This is a visual hypothesis, not user approval or an app integration.
