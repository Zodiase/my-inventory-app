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
