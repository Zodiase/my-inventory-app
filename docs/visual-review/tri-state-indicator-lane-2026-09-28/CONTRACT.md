# Separate indicator lane comparison contract

This is a mock-only Storybook alternative to the [overlaid translucent handle](../tri-state-toggle-2026-09-28/REVIEW.md). The overlaid version remains available for comparison. This alternative responds to its remaining ambiguity: the selected word appears visually attached to a white handle even though the handle element contains no text.

One uninterrupted recessed rail contains fixed `Include`, `Off`, and `Exclude` words. A translucent, unlabeled indicator moves in a **separate lower lane**, with visible vertical separation from every word. Off is especially quiet when repeated down a list; Include and Exclude gain only modest emphasis. Every stop remains directly tappable and keyboard accessible, logical order mirrors in RTL, direct end-to-end motion is continuous, and reduced-motion preference disables the transition.

Review the three settled states at 1280 × 800 desktop and 820 × 900 iPad-width. Each screenshot includes the enlarged interactive example and six compact normal-size rows. The story's movement buttons are review scaffolding only; no controls are added to the Search mock or running app. No production app, route, data, deployment, or PR change is part of this alternative.
