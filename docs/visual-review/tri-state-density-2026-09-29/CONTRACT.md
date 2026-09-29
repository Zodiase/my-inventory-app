# Compact tri-state pill — Storybook visual contract

This mock tests the revised [Search interaction design at `54f155b`](https://github.com/Zodiase/my-inventory-app/commit/54f155b). It replaces the rejected upper-label/underline layout documented in [BASELINE.md](BASELINE.md). The prototype is awaiting user visual judgment.

Purpose: show a directly selectable Include / Off / Exclude control at its actual list size, once in an ordinary example tag row and again in six repeated rows. Capture settled Off, Include, and Exclude states at desktop 1280 × 800 and iPad 820 × 900, then check a narrow 390 × 844 view.

The featured tag and the first repeated row start in the same state so the two presentations can be compared, but they represent different tags and must change independently. A shared selection makes the prototype imply a nonexistent cross-tag relationship.

Expected composition: one light recessed pill, 156–168 px wide and 28–30 px high, centered in a 48–52 px tag row. All three fixed words remain comfortably legible and vertically centered within 2 px of the pill midpoint. A translucent, unlabeled 22–26 px tall thumb overlaps the selected word and moves inside the pill. Each stop retains an invisible touch area of at least 44 × 44 px. Neutral repeated rows remain quiet; Include and Exclude receive modest emphasis. The example row uses the same size as the repeated rows; no enlarged demo or separate movement-button cluster appears.

Responsive expectation: the pill retains its size at desktop and iPad width. At narrow width, text and pill remain reachable without horizontal page overflow. The six-row density, spacing, and hierarchy remain legible.

Interaction checks: direct pointer and touch selection, keyboard focus and arrows, state-specific thumb travel, RTL order, and reduced-motion preference. The full story and six-row crop must be visually inspected at both primary widths; focus and narrow-width captures must also be inspected.

Exclusions: this is an isolated Storybook prototype. It makes no production app, route, data, deployment, or PR change and does not establish user approval of the design.
