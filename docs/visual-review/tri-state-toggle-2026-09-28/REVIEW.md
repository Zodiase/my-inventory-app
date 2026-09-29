# Isolated tri-state toggle visual review

**Reviewer:** implementation agent, self-review; independent design review pending.  
**Contract:** [CONTRACT.md](CONTRACT.md).  
**LAN Storybook:** `http://mini-m4.local:48377/?path=/story/prototypes-tri-state-tag-toggle--undecided`.  
**Evidence:** six settled-state [screenshots](screenshots/) plus live interaction in the isolated Storybook preview on 2026-09-28.

| State | Desktop 1280 × 800 | iPad 820 × 900 | Judgment |
| --- | --- | --- | --- |
| Undecided | [screenshot](screenshots/undecided-desktop.png) — pass | [screenshot](screenshots/undecided-ipad.png) — pass | One dark round handle occupies the center detent. |
| Include | [screenshot](screenshots/include-desktop.png) — pass | [screenshot](screenshots/include-ipad.png) — pass | The same handle occupies logical start. |
| Exclude | [screenshot](screenshots/exclude-desktop.png) — pass | [screenshot](screenshots/exclude-ipad.png) — pass | The same handle occupies logical end. |

I opened and operated the live story, including repeat clicks between positions, and inspected the settled appearances at readable scale. The handle is one physical-looking element over a recessed blue rail; separate buttons do not gain raised active styling. The automated motion check measured the handle at early, intermediate, and final positions for a direct Include-to-Exclude change, and confirmed direction and ordering. Direct rail clicks, keyboard arrows, and reduced-motion behavior were checked. The three settled screenshots and the ordinary-size Search-panel screenshots were inspected for containment and legibility. There was no document overflow or Storybook error overlay.

The focused test suite passed **9/9**, and the combined focused plus Search mock regression run passed **22/22**. TypeScript, Prettier, and Storybook-source ESLint passed. This validates implementation behavior, not the user's aesthetic preference. The explanatory words around the enlarged control are provisional; their eventual placement needs design review.
