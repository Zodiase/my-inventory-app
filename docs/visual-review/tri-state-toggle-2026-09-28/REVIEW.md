# Isolated tri-state toggle visual review

**Reviewer:** implementation agent, self-review; independent design review pending.  
**Contract:** [CONTRACT.md](CONTRACT.md).  
**LAN Storybook:** `http://mini-m4.local:48377/?path=/story/prototypes-tri-state-tag-toggle--undecided`.  
**Evidence:** six settled-state [screenshots](screenshots/) plus live interaction in the isolated Storybook preview on 2026-09-28.

| State | Desktop 1280 × 800 | iPad 820 × 900 | Judgment |
| --- | --- | --- | --- |
| Off | [screenshot](screenshots/undecided-desktop.png) — pass | [screenshot](screenshots/undecided-ipad.png) — pass | Quiet translucent handle sits over fixed Off text. |
| Include | [screenshot](screenshots/include-desktop.png) — pass | [screenshot](screenshots/include-ipad.png) — pass | Same unlabeled handle moves to fixed Include text. |
| Exclude | [screenshot](screenshots/exclude-desktop.png) — pass | [screenshot](screenshots/exclude-ipad.png) — pass | Same unlabeled handle moves to fixed Exclude text. |

I opened and operated the live story, including repeated direct changes between ends, and inspected the settled appearances at readable scale. The same translucent capsule moves in one recessed rail; the three printed labels stay in place and no per-stop border or active button highlight appears. The automated motion check measured early, intermediate, and final handle positions for direct Include-to-Exclude travel. Direct rail clicks, keyboard arrows, RTL geometry, and reduced-motion behavior were checked. The ordinary-size Search-panel screenshot was inspected for quiet repeated controls and row legibility. No document overflow or Storybook error overlay appeared.

The focused test suite passed **10/10**, and the combined focused plus Search mock regression run passed **23/23**. TypeScript, Prettier, and Storybook-source ESLint passed. These checks validate implementation behavior and layout, not the user's design approval. This remains a visual hypothesis for user review.
