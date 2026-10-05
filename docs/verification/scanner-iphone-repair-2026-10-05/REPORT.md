# Scanner iPhone repair candidate — 2026-10-05

Source commit: `3ed656e7096466f855bc0f44a9e483973d892ad8`, based on frozen QR candidate `8c55a434f0b6f1ae1cd7a50d7abe6ec99c2ef99e`. Isolated branch `codex/scanner-iphone-repair`. No integration, deployment, household writes, scanner programming or security bypass.

## Recording and resulting behavior

The supplied 8.765-second physical recording was inspected at 2s and 8s. It shows capital-I `Inventory-action:v1:insp…` and `Inventory-action:v1:show-actio…`, generic prior rejection, and movement of the content relative to the browser chrome. Browser capitalization as the cause is a hypothesis, not established by this recording. Private recording and extracted frames were not added to this public code repository.

Both capture sinks now opt out of browser capitalization, autocorrection and spellcheck. Validation remains exact-case. Known capitalization mismatches explain the expected exact payload without dispatching it. Invalid and interrupted raw input survives as bounded temporary capture evidence, rendered through escaped React text/JSON; oversize frames retain only a 512-character prefix. Diagnostics are local, read-only and reset on refresh, with no new egress/persistence.

The action-code frame is fixed to its own viewport (`position: fixed; inset: 0; height: 100dvh`). A grid reserves a bottom row for capture and a distinct scrollable content row. This same product composition follows the standalone viewport or Storybook iframe viewport, without a Storybook-only layout override. Feedback reserves 60px so pause/rejection cannot change the content height midway through a disclosure click. Long feedback scrolls in that region. Start/Resume use preventScroll; interruption never automatically steals focus from another editor.

## Verification

- 71 script tests pass (including 18 model tests); `scripts-final.log`.
- 39 browser checks pass without retries: 37 Chromium and 2 desktop WebKit simulations; `browser-final.log`. Covers all five actual pixel-decoded QR codes across eight manager size/text combinations (40 decodes), strict quiet-zone/content bounds, uppercase rejection, escaped raw diagnostics, interruption recovery, stable image position through typing/mode/next scan, ordinary editing focus, and two standalone short-phone anchoring checks.
- Scoped strict TypeScript and app ESLint pass; empty successful logs retained. Pinned app Prettier 2.8.8 checks all changed TS files; root Prettier formats the model test. `git diff --check` passed.
- Full application typecheck remains blocked by unchanged `App.tsx:269 TS2558`, recorded in `baseline-full-types.log`; no full-typecheck pass claim.
- Implementer self-reviewed every regenerated full-manager artifact for both affected stories, 26 screenshots; story-specific reports below. This is not independent acceptance.
- Live implementer interaction in the exact LAN Storybook manager: Start, uppercase command rejected with exact reason and Inspect retained, valid command changed mode to Show actions, Pause then explicit Resume restored Ready and input focus. No visible error overlay; browser error logs empty.
- Preview wildcard listener PID36356 on48436, LAN URL returned HTTP200: http://mini-m4.local:48436/?path=/story/scanner-foundation--action-codes . Earlier48434 frozen preview preserved.

Failed iterations are retained: overlay obscured codes, shadow contaminated quiet zones, redundant reason copy shifted the card, dynamic dock feedback moved diagnostics during click. Those were repaired rather than relaxing geometry/pixel assertions. `failed-final4.log` has 34/35 passing and disclosure timeout. `failed-environment-final5.log` is a mistaken invocation using the tests' default6006 URL; rerun on configured48436. Final checks supersede these failures; physical qualification does not.

## Measured manager geometry

`geometry.jsonl` records all eight dimensions. Dock height150px normally/160px enlarged; short phone content249px/239px respectively, complete QR224px. At390x480 normal QR y52.39..276.39 inside content y40..289; enlarged QR y47..271 inside content y40..279. No overlap. Standalone regression proves dock bottom480px, zero document scroll and stable complete QR/input across command+next fixture. These measurements do not simulate native iOS software keyboard or prove dynamic browser visual viewport handling.

## Remaining gate and physical retest

Independent code/design review remains required. Physical iPhone behavior unverified: reload the candidate, Start, scroll the complete Show actions code into view, scan exact code + delimiter, observe raw text/mode/focus/viewport, then scan a fixture without Resume. Exercise interruption then explicit Resume and one discarded boundary before rescan. Report raw capture if it differs from printed exact payload. No scanner configuration change is requested. Existing PR179 GuardRails failure remains unresolved; this repair neither waives nor diagnoses it.
