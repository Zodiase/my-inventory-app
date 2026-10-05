# Action Codes visual self-review

Story `scanner-foundation--action-codes`; contract in ScannerFoundation.stories.tsx review parameters outside render. Implementer personally opened all16 ready/code artifacts plus2 rejection captures after final viewport anchoring/fixed feedback source. Full Storybook manager on48436, addon panel closed.

| Viewport | Text factor | Judgment | Evidence |
|---|---|---|---|
| 1280×720 | 1 | pass | `1280x720-1-ready.png`, `1280x720-1-codes.png` |
| 1280×720 | 1.25 | pass | `1280x720-1.25-ready.png`, `1280x720-1.25-codes.png` |
| 820×900 | 1 | pass | `820x900-1-ready.png`, `820x900-1-codes.png` |
| 820×900 | 1.25 | pass | `820x900-1.25-ready.png`, `820x900-1.25-codes.png` |
| 390×844 | 1 | pass | `390x844-1-ready.png`, `390x844-1-codes.png` |
| 390×844 | 1.25 | pass | `390x844-1.25-ready.png`, `390x844-1.25-codes.png` |
| 390×480 | 1 | pass | `390x480-1-ready.png`, `390x480-1-codes.png` |
| 390×480 | 1.25 | pass | `390x480-1.25-ready.png`, `390x480-1.25-codes.png` |

For every row: reviewed frame/sidebar/toolbar boundaries, containment and scroll ownership, fixed square scale, card alignment/spacing, wrapping/readable labels, focus ring and touch controls, hierarchy/group separation, and continuity across responsive sizes. Desktop shows session beside cards; tablet/phones show vertical composition. Codes stay square with clear white quiet zones, dock is a distinct row with no shadow overlay. All controls/text are reachable through content scrolling; partial neighboring cards at the viewport edge are intentional, not a partially presented target QR. Short-phone125% can present a complete code, but its title/description require content scrolling; no claim that the entire card fits at once. Empty reserved feedback area is deliberate to prevent pause/rejection reflow. Dock remains reachable, focus visible, synthetic/read-only language present. No error overlays seen.

Interaction evidence: automated full-manager scrolling across all five codes, complete QR and quiet-zone pixel checks, label/button reachability at125%, stable code position during typing/mode changes and next scan; diagnostics opened and ordinary editor retained focus with capture Paused. Live implementer Start/capitalization rejection/valid command/Pause/Resume verified actual state in manager and empty error logs. Rejection captures show reason and exact expected payload; remainder scrolls within60px feedback region. Excludes physical scan/decode and native keyboard behavior. Conclusion: bounded self-review passes; independent design acceptance pending.
