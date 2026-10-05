# Baseline toggle CI gate: timeline repair candidate

2026-10-05 America/Los_Angeles. Separate worktree inventory-toggle-gate-timeline,
branch codex/toggle-gate-timeline from frozen foundation53945f7. No QR/product changes.
Coordinator assigned bounded reliability repair; no descendants, data writes,
merge/deployment, style polish, tolerances increased, skips or hosted reruns.

## Evidence and classification

Read independent PR178_TOGGLE_CI_DIAGNOSIS_2026-10-05.md fully. Exact53945f7
hosted LTR/RTL tests failed on all six attempts at the wall-time movement envelope.
There were no downloadable Storybook failure artifacts; specific failing pixels
and animation timeline remain unknown. Local passing tests do not exonerate the
product or establish exact cause of those six failures.

Instrumented the unchanged envelope first (2 local passes). Native measurements
confirm CSS260ms while a reversed active transition lasts211.6946ms (initial
standalone observation211.6289ms). rAF/document clocks and performance.now callback
elapsed differ; final retained LTR/RTL traces contain native IDs, currentTime,
startTime, actual durations, eased progress, keyframes and request boundaries.
The initial-duration/wall-clock envelope is demonstrably not the actual timing
model. This supports a bounded model correction, not blanket product approval.

Normative source: https://www.w3.org/TR/css-transitions-1/#reversing describes
shortening incomplete reversals. https://www.w3.org/TR/web-animations-1/#the-iteration-progress
establishes native computed iteration progress includes timing-function easing.

## Repair

Match each observed position to the active transition's native keyframe endpoints
and eased progress; resolve logical/calc endpoints using a temporary invisible
clone, without moving the persistent observed node. Match consecutive observed
movement to consecutive model positions, retaining the original0.025 normalized
residual budget. Retain1px positional accuracy, cubic-bezier declaration,
persistent identity, containment, five exact requests with every subsequent
request in-flight, no teleport at request boundary and final destination/selection.
No product component/CSS/Storybook layout changed.

Capture both before-change and post-bubbling request positions. The original
capture-listener microtask can run before later native handlers; the unchanged
injected jump initially escaped (2 passed). Post-bubble observation now catches
both LTR/RTL jumps, normalized0.65016 vs unchanged0.025 budget. Both remounts
fail persistent-node identity. Failed first candidate evidence retained; never
accepted because normal tests passed.

Write request-correlated JSON to test-results as actual files as well as report
attachments. CI always uploads Chromium output before the separate WebKit run,
which resets test-results. WebKit output uploads separately if that run occurred.
Missing files warn; failing test steps remain failing. No retries/skip/bypass.

## Validation

Final source full affected Chromium matrix18/18,38.1s, zero retries:
16 composed size/text/name checks plus actual in-flight LTR/RTL trace checks.
Adjacent WebKit touch/reversal2/2,3.6s. Jump2/2 expected failures at teleport gate;
remount2/2 expected failures at identity gate. Native timings in normal-traces/.
Standalone strict TypeScript (esnext,dom,dom.iterable) passes, diff check passes,
Prettier API and workflow YAML checked. CI artifact order/always condition checked.
Initial type invocation omitted dom.iterable and initial parser lookup used a
noninstalled package; corrected invocation/install-existing parser passed.

No new visual approval is claimed: existing toggle aesthetics are explicitly
unapproved, and no rejected render was saved as an approved baseline. Only the
timing/diagnostic gate changed. Full hosted acceptance must run on the integrated
exact candidate; it has NOT run. Designer acceptance of QR is a separate gate.

Source commits7a651c7,5460c41; evidence commit follows without source changes.
Recommended next: independent source/model and negative-control review, coordinator
integration decision, then exact-head hosted checks with retained diagnostics.
