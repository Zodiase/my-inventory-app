# Persistent scanner recovery control — bounded candidate

Base: frozen PR182 `6055b0cd4bf6473507b2d138870e39bd7e016fef`.
Separate branch `codex/scanner-dock-recovery`; no diagnostic-stack ancestry.

The coordinator measured the paused Move recovery button outside the scroll
viewport at 390×480 while the fixed dock instructed the user to tap Resume.
The shared QR workspace now presents its single Resume button beside the input
in the existing reserved bottom row, only while paused. Activation calls the
unchanged explicit resume dispatcher/guard. No automatic focus restoration,
reducer changes, new inventory behavior or household writes. The row centers
input/button across its axis, preserves 44 px targets and allows the input to
shrink horizontally. The existing 60 px feedback area wraps and scrolls; the grid
continues reserving the dock height instead of covering workspace content.

## Validation

Final stable isolated-runtime rerun: **41/41 affected Storybook Chromium checks
passed in 1.7 minutes**, one worker, zero retries. This supersedes the split
33+8 runs below while retaining their original evidence.

- 33 affected Storybook Chromium checks passed in 1.5 min, worker 1/retries 0.
- 8 additional shared Action Codes recovery checks passed in 18.5 s, worker 1/retries 0.
- 32 focused scanner Node tests passed; prepared app types, both affected test
 types, scoped lint and formatting passed.
-PR187's independent literal eight-card contract is preserved in this182-based
 candidate. Its deliberate wrong-image-plus-attribute control again fails at
 the semantic assertion: expected Move, received Inspect; setup/old oracle pass.
- Each shared story exercised 1280×720,820×900,390×844,390×480 at normal/125% text:
 paused recovery at content top and after scrolling all QR images;44 px input and
 Resume; viewport containment/cross-axis center; explicit keyboard activation;
 partial interrupted frame drains before subsequent read. Move also exercises
 ordinary editing without stolen focus and retains destination/no-op/delayed
 cancellation behavior. QR pixels remain independently decoded and full images
 reachable above the reserved dock.

Initial recovery-only run had 7 passes and 1 Playwright trace-collection failure
(`file data stream has unexpected number of bytes`, truncated ZIP), with no
product assertion failure reported. Failed artifacts/log preserved. Formatting
settled before the complete 33 case run; no cause is claimed for the collector
failure. Initial unprepared app type run lacked generated Meteor types and
could not write incremental metadata under sandbox; copied unchanged frozen
baseline generated declarations, then normal prepared type check passed.

## Visual scope and handoff

Both affected stories have expectation metadata outside rendering. Implementer
personally opened paused-top and QR-scroll screenshots for all eight viewport/
text combinations per story, and separately interacted with actual live Move
Storybook at 390×480: explicit Resume entered Recovering; ordinary-field typing
kept its focus and showed Paused. Per-story self-review in VISUAL_REVIEW.md.
This is bounded self-review, not independent/designer acceptance. Short screens
still require scrolling the large session block; its broader density and actual
app header/Leave composition are not redesigned or accepted here. No candidate
Meteor app integration/build/run before Storybook review. Native iOS keyboard,
physical scanner and broader release/security gates remain unqualified.

Synthetic review preview: http://mini-m4.local:48466/?path=/story/scanner-move-simulation--interactive
Same-source shared story: ?path=/story/scanner-foundation--action-codes.
Frozen182 source/app48440 and diagnostic artifacts preserved. Separate authorized
frozen Storybook runtime recovery evidence is archived with raw evidence; it
changes no source. Next: independent exact-head regression and visual review,
then coordinator decides integration. No merge/deploy/security waiver.

## Runtime isolation and measured comparison

The comparison preview initially returned an empty iframe with repeating public
HMR missing-update/reload warnings despite HTTP 200 and a live listener.
Coordinator authorized a scoped graceful restart of frozen 182 Storybook only:
PID78062 →51393, identical checkout/head/arguments. Both its manager and direct
iframe then rendered. Restart exposed a reciprocal candidate reload problem:
these worktrees share a dependency symlink, and installed Storybook's default
cache resolver puts generated preview/virtual files in the same dependency
`.cache` path using the same relative-config hash. Candidate alone now uses
`CACHE_DIR=/private/tmp/scanner-dock-recovery-storybook-cache`, an existing
installed resolver option, with PID52757. No cache deletion, source/config
change, dependency installation, shared service kill or backend diagnostic run.
Launch arguments, installed-source reference and both logs archived.

Final actual manager/direct checks: frozen manager48438, frozen direct48438,
candidate manager48466 all render, no public page errors or HMR warnings, no
navigation during a three-second settled observation. Frozen source remains
6055b0c; app48440 PID78832 and shared search untouched. This is bounded runtime
health evidence, not a claim of indefinite availability.

At 390×480 full manager, both versions reserve the same 150 px dock and 249 px
workspace (manager chrome owns the rest). Frozen Resume bounds y 379–423 lie
outside workspace y 40–289 and are clipped/covered. Candidate Resume y 323–367
lies inside dock y 289–439. The 44 px target becomes reachable without shrinking
workspace height. Comparison images and structured geometry are archived under
runtime-final. Storybook's update toast may appear in the manager; it is outside
the product render and is not a scanner feature.

## Bounded feedback wording revision — 2026-10-06

The session rejected-read prefix is now “Last read rejected.”; the window-blur
handler now says “Page focus left. Resume explicitly.” Events, historical read
detail, current-state reason updates, reducer guards and explicit drain remain
unchanged. Historical and current messages may legitimately differ after two
interruptions. This copy does not claim an OS-window switch.

Fresh affected Storybook suite43/43 passed with one worker/zero retries;
33 focused Node tests, normal app types, targeted test types, scoped lint and
format passed. Added two-pause reducer check preserves one historical rejection
and latest current reason/uncertain drain. Short-phone normal/125% browser cases
exercise real in-page focus transfer to ordinary editing (page remains focused),
then explicit synthetic window-blur dispatch to isolate the second handler;
assert historical/current wording, retained record and explicit recovery.
Synthetic blur is not a physical browser/OS focus qualification. Actual-app
revised-head runtime/copy captures and acceptance are reported separately in
Home Automation verification records; no product release is implied here.

## Fixed QR cache optimization — 2026-10-06

Only the eight literal demo payloads retain their generated image strings.
Arbitrary values still encode without retention. Fixed images reuse encoding
across per-character workspace renders; matrix parameters/SVG/quiet zones are
unchanged. Capture/input/reducer/history/drain/focus code is unchanged.

34 focused Node and43 affected Storybook Chromium checks passed, including
byte-for-byte uncached parity for all8images, encoding-call reuse/dynamic-input
nonretention, and independent literal rendered pixel semantics. The deliberate
wrong Move image+attribute still fails at the expected semantic assertion.
App types/scoped lint/format passed. Exact signed runtime before/after timing
comparison is archived separately in Home Automation verification records.
Avoidable QR generation is addressed; the physical phone slowdown is not proven
fixed without same-device comparison. No merge or production deployment.
