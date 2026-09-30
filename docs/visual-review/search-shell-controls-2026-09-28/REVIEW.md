# Search shell controls — Storybook self-review

Story: `Prototypes / Direct Selection Tag Picker / One selected`.
Expectation: [EXPECTATIONS.md](EXPECTATIONS.md). This is a mock-only review of a proposed visual contract, not user approval or production acceptance.

| Viewport           | Page frame and banner                                                                                                  | Tags panel and applied filter                                                                               | Focus                          | Result |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| Desktop 1280 × 800 | One-row blue banner; all four toolbar controls are borderless; query boundary remains visible; no horizontal overflow. | Panel stays beneath Tags and within the viewport. Applied-tag chip reads as subordinate without an outline. | Amber outline visible on Tags. | Pass   |
| iPad 820 × 1100    | Same one-row hierarchy; query retains the flexible central span.                                                       | Panel remains on screen and does not cover the banner. Chip remains visible below it.                       | Amber outline visible on Tags. | Pass   |

The browser check asserts computed zero borders on the toolbar buttons and applied chip, a nonzero query border, a single aligned row, a 44 px minimum control height, and a visible focus outline. The focused picker interaction suite is run separately. No phone-width or production app assertion is made here.

Before: [desktop](screenshots/before-desktop.png), [iPad](screenshots/before-ipad.png). After: [desktop](screenshots/after-desktop.png), [iPad](screenshots/after-ipad.png). Focus: [desktop](screenshots/focus-desktop.png), [iPad](screenshots/focus-ipad.png).
