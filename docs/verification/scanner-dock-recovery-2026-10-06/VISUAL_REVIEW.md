# Story-specific visual self-review

Review role: implementer, not independent. Bounds: fixed recovery affordance and adjacent composition; no overall app approval.

## scanner-move-simulation--interactive

Contract: corresponding story parameters.review (outside render tree).

|Viewport/text|Judgment|Personally opened evidence|
|---|---|---|
|820x900-text-1-25|PASS bounded recovery|final-renders/storybook-ScannerMoveSimul-3270b-reachable-820x900-text-1-25-storybook-chromium-paused-top.png; companion paused-cards.png|
|390x480-text-1-25|PASS bounded recovery|final-renders/storybook-ScannerMoveSimul-5cfbd-reachable-390x480-text-1-25-storybook-chromium-paused-top.png; companion paused-cards.png|
|390x480-text-1|PASS bounded recovery|final-renders/storybook-ScannerMoveSimul-60fd3-ns-reachable-390x480-text-1-storybook-chromium-paused-top.png; companion paused-cards.png|
|1280x720-text-1|PASS bounded recovery|final-renders/storybook-ScannerMoveSimul-85463-s-reachable-1280x720-text-1-storybook-chromium-paused-top.png; companion paused-cards.png|
|1280x720-text-1-25|PASS bounded recovery|final-renders/storybook-ScannerMoveSimul-900e6-eachable-1280x720-text-1-25-storybook-chromium-paused-top.png; companion paused-cards.png|
|390x844-text-1-25|PASS bounded recovery|final-renders/storybook-ScannerMoveSimul-98c18-reachable-390x844-text-1-25-storybook-chromium-paused-top.png; companion paused-cards.png|
|390x844-text-1|PASS bounded recovery|final-renders/storybook-ScannerMoveSimul-9fe5e-ns-reachable-390x844-text-1-storybook-chromium-paused-top.png; companion paused-cards.png|
|820x900-text-1|PASS bounded recovery|final-renders/storybook-ScannerMoveSimul-f3556-ns-reachable-820x900-text-1-storybook-chromium-paused-top.png; companion paused-cards.png|

Every listed viewport: Resume remains legible and visibly actionable beside the
input in the bottom region; controls retain at least 44 px, cross-axis centers
match, no horizontal escape or overlay of reserved content. Enlarged text wraps
in session/status; long fixed feedback scrolls within its 60 px region. General
inspection covered frame and story manager bounds, containment, proportions,
repeated QR/card composition, readable labels, action cues, spacing/hierarchy
and continuity between desktop/tablet/phone. Short 390×480 views show only part
of the session or card label; content scrolling makes the full 224 px QR/quiet
zone reachable, with Resume still visible. This is intentional viewport
scrolling, not a claim that an entire card fits at once. At 1280 the Action Codes
session remains a narrow column; on phones it stacks. Move's session remains
large. Broader density concerns stay with the coordinator.

Interaction evidence: automated traversal of every QR, keyboard focus/Enter,
partial drain then next complete read, and feedback scroll-end (shared Action
Codes). Move additionally exercises ordinary-field editing and destination
preservation. Still images do not establish those interactions alone. Actual
manual Move interaction at 390×480 confirmed explicit recovery and manual note
focus; other viewport interactive checks are automated, not manual acceptance.
Cross-viewport conclusion: fixed recovery defect passes this bounded self-review;
independent review remains required before acceptance/integration.

## scanner-foundation--action-codes

Contract: corresponding story parameters.review (outside render tree).

|Viewport/text|Judgment|Personally opened evidence|
|---|---|---|
|820x900-text-1-25|PASS bounded recovery|shared-renders/storybook-ScannerActionCod-05405--recovery-820x900-text-1-25-storybook-chromium-paused-top.png; companion paused-cards.png|
|1280x720-text-1-25|PASS bounded recovery|shared-renders/storybook-ScannerActionCod-18c3d-recovery-1280x720-text-1-25-storybook-chromium-paused-top.png; companion paused-cards.png|
|390x480-text-1|PASS bounded recovery|shared-renders/storybook-ScannerActionCod-35bc4-sed-recovery-390x480-text-1-storybook-chromium-paused-top.png; companion paused-cards.png|
|390x480-text-1-25|PASS bounded recovery|shared-renders/storybook-ScannerActionCod-390d7--recovery-390x480-text-1-25-storybook-chromium-paused-top.png; companion paused-cards.png|
|390x844-text-1-25|PASS bounded recovery|shared-renders/storybook-ScannerActionCod-42db1--recovery-390x844-text-1-25-storybook-chromium-paused-top.png; companion paused-cards.png|
|1280x720-text-1|PASS bounded recovery|shared-renders/storybook-ScannerActionCod-af375-ed-recovery-1280x720-text-1-storybook-chromium-paused-top.png; companion paused-cards.png|
|390x844-text-1|PASS bounded recovery|shared-renders/storybook-ScannerActionCod-bcd8a-sed-recovery-390x844-text-1-storybook-chromium-paused-top.png; companion paused-cards.png|
|820x900-text-1|PASS bounded recovery|shared-renders/storybook-ScannerActionCod-be8f9-sed-recovery-820x900-text-1-storybook-chromium-paused-top.png; companion paused-cards.png|

Every listed viewport: Resume remains legible and visibly actionable beside the
input in the bottom region; controls retain at least 44 px, cross-axis centers
match, no horizontal escape or overlay of reserved content. Enlarged text wraps
in session/status; long fixed feedback scrolls within its 60 px region. General
inspection covered frame and story manager bounds, containment, proportions,
repeated QR/card composition, readable labels, action cues, spacing/hierarchy
and continuity between desktop/tablet/phone. Short 390×480 views show only part
of the session or card label; content scrolling makes the full 224 px QR/quiet
zone reachable, with Resume still visible. This is intentional viewport
scrolling, not a claim that an entire card fits at once. At 1280 the Action Codes
session remains a narrow column; on phones it stacks. Move's session remains
large. Broader density concerns stay with the coordinator.

Interaction evidence: automated traversal of every QR, keyboard focus/Enter,
partial drain then next complete read, and feedback scroll-end (shared Action
Codes). Move additionally exercises ordinary-field editing and destination
preservation. Still images do not establish those interactions alone. Actual
manual Move interaction at 390×480 confirmed explicit recovery and manual note
focus; other viewport interactive checks are automated, not manual acceptance.
Cross-viewport conclusion: fixed recovery defect passes this bounded self-review;
independent review remains required before acceptance/integration.
