# Compact filter prototype — bd-9i7

Working Storybook-only composition on base8e0657d2. No production component/CSS
changes, deployment, household writes or screenshot goldens. Existing standalone
app menus and shared controls remain unchanged.

Preview: http://mini-m4.local:48428/?path=/story/prototypes-compactfilterproof--many-tags

Review contract: Home Automation docs/verification/COMPACT_FILTER_PROOF_DESIGN_2026-10-05.md.

Implementation: bounded native dialog, compact Scope/Type choice journeys,
adaptive content height, one primary list scroll owner, deliberate whole-sheet
fallback below128px useful list context. Scope/Type have small disclosure cues
and collapsed aria-expanded semantics; the choices replace the summary, with
Back and restored summary focus. This refinement is prototype-scoped.

Validation:50/50 Chromium cases passed35.2s without retries:48story/viewport/text/
surface cases plus2whole-sheet fallback cases at390×240. Source ESLint, Prettier,
and standalone e2e TypeScript passed. Full Meteor local check:type does NOT pass:
App.tsx(269,31) TS2558. Exact same error reproduced in unchanged9211d7c baseline
checkout with the same borrowed dependencies and TypeScript5.9.3; App.tsx has
zero diff against candidate base8e0657d2. Logs retained; no broad workaround.

Measurements at390×480 content:sheet366×412 at(12,60); summary53px; Tags52px;
Find44px; list252px; four complete normal leaves/three enlarged. Row50px(normal);
rail162×29; handle52×24; radio hit53.33×44. Header fixed in normal mode.
Outer manager390×480 yields canvas390×399,list171px/two complete leaves;
recorded separately without resizing/hiding browser chrome. Desktop/tablet
manager uses its native fullscreen control, preserving40px toolbar.

Developer personally inspected24final manager screenshots plus2qualifying
content captures and4fallback captures. Actual CUA manager desktop and short
phone interactions were checked; final disclosure Scope→Home journey passed
with restored summary focus and no console errors. Temporary viewport reset.
Text125% enlarges direct text and inputs, not browser zoom/artwork/hit targets.

Story-specific reports:many-tags.md,empty.md,selected-only.md. Geometry records
include browser/canvas dimensions and row/rail/handle/hit measurements. No
independent or designer acceptance is implied by the implementation review.

Reproduce: start Storybook48428; use a Playwright config with testDir tests/e2e/
storybook,testMatch CompactFilterProof.spec.ts,Chromium,workers1,retries0,
baseURL http://127.0.0.1:48428. Loopback is internal diagnostics only.
