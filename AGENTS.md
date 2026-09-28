# Agent Working Agreement

For candidate previews, user acceptance, merge, and primary deployment, follow
[the release verification workflow](docs/RELEASE_VERIFICATION.md). Port 48372
shares production MongoDB: no mutating tests or browser writes there. Run
write-path tests only against disposable isolated services.

## User-facing UI verification

Do not claim that a UI change was visually checked from unit tests, a build, an isolated
Storybook iframe, or component-level assertions alone. Before reporting a user-facing UI
surface as working:

1. Open the exact URL and shell the user will open, including Storybook's manager when the
   deliverable is a Storybook story.
2. Wait for the intended content to render after the latest build or deployment.
3. Check the rendered surface for visible error overlays and inspect relevant browser errors.
4. Capture and inspect at least one screenshot at the user's representative viewport; check
   every explicitly supported responsive breakpoint when layout behavior is part of the work.
5. State precisely which surface and viewport were checked. Treat isolated iframe checks as
   component diagnostics, never as proof that the full user-facing surface works.

Prefer an automated smoke test for the full shell so regressions fail deterministically.

## Frontend regression boundaries

- Use Storybook for component and frontend-integration coverage that does not require Meteor:
  composed views, interactions, responsive layout, accessibility, callbacks, and the full
  Storybook manager shell.
- Use app tests for Meteor and system integration: publications, methods, persistence,
  reactive updates, real application routing, and complete user workflows.
- Do not duplicate every assertion across both layers. Prove detailed UI states in Storybook,
  then keep app tests focused on the backend boundary and critical end-to-end path.

## Design and code review priorities

- Start with the stated requirement and acceptance criteria. Identify a concrete failure path
  before calling an edge case a defect or a merge blocker.
- Move quickly and accept bounded, recoverable imperfections. Do not require speculative
  hardening or exhaustive tests when a focused check establishes the requested behavior.
- Treat a plausible path to irreversible data loss, an unintended mutation of another record,
  or a silent wrong identity or location as a blocker. A failed operation is recoverable only
  when the affected data and intended action can be identified and repaired from retained
  evidence; merely returning an error does not establish recoverability.
- For other data risks, state what could change, how the failure would be detected, what
  evidence survives, and how it would be repaired. Recommend the smallest safeguard or test
  that closes a material gap. Distinguish requirement gaps from optional follow-up work.
