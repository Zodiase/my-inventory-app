# Agent Working Agreement

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
