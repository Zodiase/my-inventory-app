# Row actions: isolated design review

This is a Storybook-first proposal, not application integration or ticket closure.
The main inventory app and existing preview were not changed.

## Decisions and boundaries

- Keep the primary row link and trailing overflow button as siblings. A visible
  quiet ellipsis reveals secondary actions without requiring long-press discovery.
- The trigger occupies 44 × 44 CSS px and centers vertically; the mock row is
  64px tall. The visible icon is 20px, not a 44px decoration.
- Show only supplied actions. The current app supplies View Details; mock Edit
  and Delete demonstrate future available actions, not new mutation authority.
- Use Grommet's existing anchored dropdown rather than duplicating positioning.
  Available, disabled, and empty-control stories live under UI/ItemRowActions;
  list compositions remain under Prototypes/Item Row Actions.
- Confirmation uses shared TouchButton controls, a bounded centered dialog,
  initial focus on Cancel, and focus return to the originating trigger on cancel.
  Focus is transferred when portal content mounts; parent effects run too early.
- No global button styles changed. Real hoisted/structured components, gesture
  acceleration, routing, delete confirmation, and backend mutations remain outside
  this proof. They require integration checks before bd-bv8.2.6 can close.

## Manual evidence

Full manager at `http://mini-m4.local:48378/`, prototype Full, Available Only,
and Constrained Height were opened and operated at desktop1280×800 and
iPad820×900; corrected confirmation also operated at phone390×844.
Addon panel was closed to expose the preview canvas; this is explicitly not a
claim about usability with an arbitrarily tiny canvas under the addon panel.

Measured desktop rows64px, primary link44px high, trigger44×44px,
trigger-to-row vertical center delta−0.5px (divider contributes1px).
Inspected long-label truncation, folder and navigation icons, quiet trigger,
anchored menu, danger treatment, constrained scrolling, and surrounding rows.
Keyboard Enter opens, Escape dismisses and returns focus. Delete opens a mock
confirmation; Cancel returns focus and leaves the mock status unchanged.
Corrected phone Cancel measured44px high and was the active element.
Browser error log was empty during the inspected journey.

Initial findings corrected: confirmation buttons36px, focus lost to Layer's
hidden focus target, and Grommet responsive full-screen treatment inside the
narrow manager canvas. Resting dimensions must be measured after entrance
animation; a mid-animation37.25px bound is not the resting44px target.

## Verification status

The full-manager automated matrix covers four compositions at1280×720,
820×900,390×844 and1280×480. Final composition matrix passed16/16;
dedicated empty/disabled control regression passed1/1. Changed-source ESLint passes.
Independent verifier review is pending. No claim of app integration readiness is made here.
Shared checkout dependencies report existing App.tsx TS2558 at unchanged
Meteor.callAsync; production source was not altered to hide that limitation.
