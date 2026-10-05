# Same-input command continuation proposal — 2026-10-05

Scope: isolated proposal from frozen PR178 head607b0c1, branch
codex/scanner-command-continuation. Existing PR/48430 remain frozen. Proposed
manager: http://mini-m4.local:48432/?path=/story/scanner-foundation--interactive
(HTTP200, wildcard TCP\*:48432). Not integrated, independently accepted, or deployed.

## Finding and policy

The reducer unconditionally paused every changed mode, including a complete
show-actions scan that retained the same focused sink. This forced a tap in the
scanner-as-button journey. The adapter now checks connected input, active input,
visible document, focused document and absence of an open dialog at Enter. An
unsafe context pauses/rejects rather than dispatching the command.

A verified delimiter passes continuation context to the shared dispatcher. Only
inspect-demo/show-actions qualify, only from scan origin at a clean ready boundary
with no uncertain partial. Modes retain the same input and perform no household
writes. Unverified context and tap mode changes retain explicit Resume. Start and
Resume still require a local gesture. Pause/Exit still stop. Partial drain,
timeout, focus loss, dialog, background and reconnect guards remain in force.

Epoch increments and cancellation remain unchanged; old pending results cannot
mutate the new session. Repeated same-mode commands remain idempotent. Bounds and
backpressure remain unchanged. This is contextual capture continuation, not an
exception to semantic dispatch parity. No future mode that changes focus/input,
opens a dialog or writes data is qualified by this proposal.

Affected matrix: F01/F09 epoch/cancellation; F04/F10/F11 interruption and boundary;
F12 commands; F13 shared semantic dispatch with contextual continuation;
F16 unchanged capacity. No physical H checks. No scanner, suffix, QR-screen,
transport or household-write qualification. Coordinator policy reconciliation
and independent exact-revision review remain required before integrating.

## Verification

- 68 repository script tests pass, including16 scanner tests.
- Five source mutation guards fail their intended assertions; the added negative
  control removes the verified-context gate and demonstrates unsafe Ready.
- 22 Chromium Storybook tests pass without retries. New browser journeys verify
  same DOM input/focus, immediate next scan, old pending cancellation, and refusal
  for hidden/unfocused-document/open-dialog contexts even before lifecycle events.
  Existing real editor/focus/navigation and injected interruption cases pass.
- Strict scoped TypeScript and type-aware lint pass for the four proof modules.
  Installed Prettier APIs and git diff whitespace checks pass.
- First browser run's four added tests failed because I incorrectly read session
  labels from the counters paragraph. Corrected locators use Capture session;
  the established18 cases passed initially. Initial type/lint narrowing conflict
  resolved by separating retry/cancel/correct discriminated event variants.
- Full-app type baseline and hosted CI incident limitations from the frozen
  candidate still apply. No remote CI retry, bypass or merge performed here.

## Personal visual review — Scanner/Foundation/Interactive

Expectations live in story metadata outside the render: visible Ready and focused
sink after a complete read-only mode command; explicit Resume after interruption;
readable guidance/Exit, wrapping controls, vertical scroll/no horizontal overflow,
44px targets and actual125% text. I opened all16 settled full-manager captures
plus both short-phone session captures. Earlier capture during button animation
was replaced after a300ms settle; it was not accepted as missing Resume UI.

| Viewport | Normal text                                                                                                           | 125% text                                                                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1280x720 | Ready/paused guidance and input contained; single control row, visible focus and Resume.                              | Larger text/control targets remain contained; outcomes visible, lower proof content scrolls.                                                                                                |
| 820x900  | Guidance wraps to two lines; session/outcome hierarchy readable, controls in one row.                                 | Expected extra wrapping and taller cards; no overlap or clipping within owners.                                                                                                             |
| 390x844  | Three controls then Exit; focused sink and next-step text clear; outcomes below.                                      | Same control grouping; expanded text readable; vertical scroll reaches lower content.                                                                                                       |
| 390x480  | Short screen scrolls to the session; all capture controls and next step reachable, Resume visible after interruption. | Session exceeds viewport, so scrolling is necessary; top heading and bottom guidance are not simultaneously visible. Resume/Exit and focused sink remain reachable; no horizontal overflow. |

Interaction evidence: Tab pauses without changing mode/epoch; explicit Resume
restores the sink; each viewport/scale exercised Resume and measured controls.
Geometry logs show button fonts16→20px, minimum44px heights and no document
horizontal overflow. No product style or browser zoom changed. This self-review
covers the proposed transition guidance; it is not independent acceptance.

Recommended next action: coordinator review this bounded policy and exact local
commit, then decide whether to integrate it into PR178 and request independent
review. Keep frozen607b0c1/48430 and its CI gate unchanged meanwhile.
