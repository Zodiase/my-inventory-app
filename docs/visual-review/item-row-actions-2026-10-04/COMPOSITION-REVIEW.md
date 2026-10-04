# Real composition review — 2026-10-04

Reviewed full Storybook manager renders at 1280×720, 768×1024 and 390×844.
Expectations are kept in APP-INTEGRATION.md, outside rendered stories.

| Story      | Desktop                                                 | Tablet                                            | Phone                                                                 |
| ---------- | ------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| Ordinary   | Primary cards and trailing actions distinct             | Names readable; no overlap                        | Trailing 44px actions preserve card width                             |
| Hoisted    | Group heading and nested cards preserve hierarchy       | Heading and child commands remain separate        | Borders and nesting readable; heading link enlarged to 44px           |
| Physical   | Occupied card remains within Tier 1                     | Narrow manager canvas stacks action below card    | Two-column slots retained; truncated name readable, button unobscured |
| Search     | Seven mixed-height cards stay in order                  | Description and tag fit without next-card overlap | Long description wraps; all actions reachable through vertical scroll |
| TagResults | Three-column grid; variable-height cards do not overlap | Single-column manager canvas remains readable     | Heading wraps beside Clear Selection; cards and actions distinct      |

The review caught physical link padding extending below its tier and narrow
cards covering their action. Border-box sizing and content-sized narrow
wrappers repair both. Independent actual-app review also caught percentage-height
wrappers shrinking mixed-height search rows. Only physical slots now use fill
height; other wrappers grow with content and do not vertically shrink.

The 15-case composition matrix checks separate 44×44 action buttons, menu focus,
Escape restoration, physical tier containment and narrow button placement,
hoisted heading touch size, and pairwise mixed-height search/tag non-overlap.
Actual routing, search return context, and touch/manual acceptance remain the
independent actual-app verifier's responsibility. This report does not claim
those results or approve merge/deployment.

The full suite additionally detected unequal hoisted child primary-link heights
after content-sized search sizing. Hoisted grid children explicitly fill their
grid cells, including the long-press wrapper; search/tag wrappers retain their
content height. The original equal-height/icon-alignment assertions pass again.
The legacy 100px group cap was replaced by an explicit 44px header plus the
unchanged compact body budget. Reviewed macOS physical-layout references now
include the visible actions; Linux retains its geometry checks.

Independent actual-app review at source 3d25def passed 18 app regressions, 32
Storybook cases, five additional real-tap/geometry journeys including both iPad
orientations and constrained phone, plus manual review of all five surfaces.
Its additional journey is preserved as item-row-actions-geometry.spec.ts and
passes all three existing app projects. The narrow grid follow-up and exact-head
CI remain subject to independent closeout.
