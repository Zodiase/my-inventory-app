# Scanner foundation proof — implementation self-review

2026-10-05, America/Los_Angeles. Original implementation commit cca5d9d; this revision also repairs full-history retries. This is a bounded
synthetic foundation candidate for bd-un3, not app integration or hardware acceptance.

## Correction of prior evidence

Independent review held c4bc703 for full-history Retry and incomplete enlarged
button text. The earlier claim that all button labels were enlarged was unsupported
and is withdrawn. Original failed 125% captures, geometry and report are preserved
under `failed-text-scale/`; they are not acceptance evidence. New top-level captures
replace them. Text-only test overrides now measure every existing node before/after,
assert control fonts, and keep dynamically created record buttons enlarged. Browser
zoom and manager chrome remain 100%; product component styles are unchanged.

Existing-record Retry now uses the same `retryBlockReason` in UI and reducer.
100 error records with zero pending can retry the same ID without growing history;
eight pending resolutions disable Retry with a visible reason. Cancellation frees
capacity; prior outcomes, epoch checks and the three-attempt limit remain enforced.
The reducer regression and actual browser journey cover both capacity boundaries.

## Ownership and architecture

`ScannerFoundation/model.ts` owns pure state transitions, literal classification,
bounded records, attempts, epochs and shared `dispatchAction`. The DOM adapter
owns only its explicit focused input, the synthetic Enter delimiter, inactivity
cancellation, composition and browser interruptions. `ScannerFoundationProof`
owns a local read-only asynchronous fixture resolver and diagnostic controls.
Only the Storybook story imports the proof: no App import, household API call,
inventory write, migration, scanner setup or persistence was added.

Clean-boundary pauses resume Ready after an explicit local gesture. Interrupted
partial frames resume Draining, visibly instructing that the recovery read is
not added; its delimiter records a discard, and only a later complete frame can
resolve. This recovery policy is a synthetic hypothesis, not a measured C850
transport guarantee. Start/Resume do not work through scanned commands.

Reads preserve exact supported payloads, class, sequence, epoch, provenance,
attempt and outcome. Invalid/partial/discarded payload text is omitted. Duplicate
complete reads remain separate. Async results attach to their original ID and
attempt; stale epochs and cancelled attempts cannot change a later session.
Retries retain previous attempt outcomes, have a three-attempt bound, and do not
create another capture. Corrections are local evidence marks, not household edits.

Limits: 512 UTF-16 code units per frame, two-second inactivity cancellation, eight
pending resolutions, 100 records per temporary proof document, three attempts.
Capacity visibly pauses capture. Refresh clears state; navigation does not replay
reads or automatically resume. Browser back cache may retain paused memory; that
is not durable storage. Hardware provenance cannot be inferred from keyboard
input. Paste provenance is a distinct synthetic event, not a device claim.

## Validation and PR checks

- 65/65 repository script tests pass, including 13 scanner invariant tests.
- Four targeted source mutations fail their intended assertions: bypass uncertain
  boundary recovery, accept a stale epoch, accept a paused scan command, and
  create an extra record from an empty doubled delimiter.
- 18/18 Chromium Storybook integration tests pass without retries. Genuine browser
  keyboard/focus/dialog/navigation behavior is exercised. Visibility, composition,
  paste and key-repeat events are explicitly injected synthetic browser events.
- Scoped strict TypeScript check of all four new modules passes; type-aware ESLint
  passes. Formatting checked with the installed Prettier APIs.
- Full local Meteor TypeScript still reports the previously reproduced unchanged
  `App.tsx:269` TS2558 dependency-baseline error. The candidate does not alter App.
  Do not interpret the scoped check as a clean full-app type check.
- `npm run test:scripts` includes the new script automatically in the PR Script
  tests job. Existing PR `storybook-e2e` runs the entire Storybook Chromium suite,
  including the new spec; aggregate E2E gate depends on that job. These are
  assertions, not screenshot goldens. Exact remote CI remains a separate gate.

Logs are archived alongside this report. No physical H01–H07 checks were run.
No C850/iOS, HID profile, suffix, screen-QR, reconnect or scanner delivery claim
is made. Actual QR rendering is excluded; exact synthetic action payload text
is shown, and no QR dependency was installed.

## Matrix reconciliation

The independent Home Automation `SCANNER_FOUNDATION_MATRIX_2026-10-05.md` remains
the authority for acceptance. This mapping is implementer evidence, not independent sign-off.

| Cases   | Evidence                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| F01/F09 | Epoch cancellation, idempotent mode entry, late results after Exit/restart.                                        |
| F02/F03 | Literal UUID case/leading zeros/classes; invalid grammar, reserved commands, limits.                               |
| F04/F05 | Timeout cancels; clean resume versus discard recovery; empty/doubled/wrong delimiters.                             |
| F06/F07 | Repeats distinct; paste/composition/modifiers/repeat key/noise; ordinary editing.                                  |
| F08     | Captures remain ABC when resolutions arrive C/A/B, including a failed older response.                              |
| F10/F11 | Input, textarea, contenteditable, dialog, blur, hidden/visible, synthetic reconnect, explicit Resume.              |
| F12/F13 | Exact command allowlist; off/paused fail closed; tap/scan call shared semantic dispatcher.                         |
| F14     | Synthetic expected-kind fixture rejects wrong kind without erasing classification; unknown identity stays unknown. |
| F15/F16 | Offline/error/timeout, original-ID retry, cancellation/correction, stale attempts, bounded visible capacity.       |
| F17     | Reload clears evidence; browser return cannot resume or duplicate reads. No durable session claim.                 |
| F18     | Full manager self-review below, all required viewport/text combinations.                                           |
| H01–H07 | NOT RUN; later physical qualification remains necessary.                                                           |

## Story-specific visual self-review

Story: `scanner-foundation--interactive`. Contract lives in
`ScannerFoundation.stories.tsx` parameters.review, outside the render tree.
Required sizes 1280×720, 820×900, 390×844, 390×480, each at 100% and 125% text.
Thirty-two final full-manager artifacts were personally opened: overview,
interrupted recovery, resolved outcome and scrolled proof controls per combination.
The optional addon panel was closed using its manager control; manager navigation
and toolbar remain in the desktop captures. Earlier captures with the addon panel
open were superseded. These files are evidence, not approved golden baselines.

| Viewport | 100% / 125% judgment | Artifacts and concrete findings                                                                                                                                                                                                                                        |
| -------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1280×720 | PASS / PASS          | `manager-1280x720-{1,1.25}-{overview,recovery,outcome,controls}.png`: aligned frame/cards; capture actions stay on one row; outcome/record groups and fault controls readable; ordinary vertical scroll reaches later content.                                         |
| 820×900  | PASS / PASS          | `manager-820x900-{1,1.25}-{overview,recovery,outcome,controls}.png`: manager sidebar reduces canvas width; status and counters wrap without loss; capture actions retain one row; later action controls wrap naturally.                                                |
| 390×844  | PASS / PASS          | `manager-390x844-{1,1.25}-{overview,recovery,outcome,controls}.png`: sidebar becomes manager footer; Exit wraps to a separate row; status/outcome wrap in readable phrases; proof controls and disclosures remain reachable.                                           |
| 390×480  | PASS / PASS          | `manager-390x480-{1,1.25}-{overview,recovery,outcome,controls}.png`: the frame exceeds the short viewport intentionally; scrolling was exercised to reach the next-step hint, outcome, controls and return to Exit. No attempt to compress everything into one screen. |

All32 regenerated artifacts personally opened for this repair. All eight dimensions inspected at every combination: page frame, containment,
scale/proportions, internal composition, text, interaction cues, hierarchy/rhythm
and continuity across sizes. Cards retain consistent spacing and ownership;
no isolated-letter wrapping or overlapping controls was observed. The empty
capture field has visible focus outline. All measured buttons are at least
44px high, no document horizontal overflow, and no page errors were recorded
(`geometry.json`). Ordinary text-input placeholder clipping is native single-line
behavior; the visible label identifies the field, with paused-input warning above.

The browser tests also exercised disclosures, dialog close, manual editing,
scroll-to-controls and scroll-back-to-Exit. Viewport edges clipping scrolled cards
are ordinary viewport cropping, not inaccessible content or nested-scroll owners.
Measured normal control text is 16px; corrected125% is20px, including record
buttons created after capture. Start changes77.8125×44 to85.65625×47; Resume
100.890625×44 to114.28125×47. These changes occur at every required viewport.
The Storybook manager chrome and browser zoom remain100%. This is implementation self-review only: independent functional
review and designer acceptance are still required before integration.

## Next action

Review the frozen PR candidate with the existing design and verification owners.
Keep bd-un3 open. Do not merge into the product flow, deploy, configure hardware,
or expand PR177 while those acceptance and follow-on decisions remain pending.


## Subsequent recovery-copy correction

Designer found factual error text offered Cancel on a failed record, where Cancel
is intentionally disabled. Resolver detail now states only failure/no inventory
change. Live guidance beside last outcome and each record follows existing Retry,
epoch and correction guards; pending reads alone offer Cancel. Attempt limit and
already-marked correction are explicit. No model/adapter/action guard changed.
See copy-review/REVIEW.md for18 passing browser assertions, scoped types/lint,
16 full-manager captures+8 crops personally inspected, and remaining review gates.
