# Design System

This document is the product design baseline for the inventory app. It should stay practical: enough structure to keep new features consistent, not a separate design-system project.

## Product Feel

The app is a household operations tool. It should feel calm, quick, and touch-ready, with enough density for repeated inventory work.

- Prioritize scanning, comparison, and repeated action over decorative presentation.
- Keep the first screen of a workflow useful; avoid marketing-style hero layouts.
- Make state obvious: selected scope, active filters, item location, destructive actions, loading, and empty results.
- Optimize for iPhone and iPad touch use first, while keeping desktop efficient.
- Prefer predictable controls over clever custom interactions.

## Source Of Truth

Shared tokens live in `meteor-app/imports/ui/theme.ts`.

- `uiTokens` is the TypeScript source for component styles.
- `uiTokenCssVariables` mirrors core tokens into CSS custom properties for global CSS.
- `DesignSystemGlobalStyle` installs the CSS variables and base focus/body styles.
- `theme` adapts the tokens into the Grommet theme.

When adding or changing visual values, prefer updating `uiTokens` first and consuming the token from components.

## Tokens

### Color

- `brand`: primary app actions, active navigation, selected filters, links that move the user through app structure.
- `danger`: destructive actions such as delete, clear, irreversible import choices, and destructive confirmations.
- `success`: completed work, valid imports, available/healthy states.
- `warning`: recoverable problems, skipped import rows, missing attachments, or choices needing review.
- `text`, `textWeak`, `textMuted`, `textInverse`: hierarchy for content, secondary metadata, placeholder/empty text, and text on strong color.
- `surfaceRaised`, `surface`, `surfaceSubtle`, `surfaceSunken`: page backgrounds, list rows, panels, and low-emphasis controls.
- `border`, `borderSubtle`, `borderStrong`: dividers, cards, table rules, and selected/structured boundaries.

Use color to encode meaning, not decoration. A status color should answer "what state is this in?" or "how risky is this action?"

### Size And Spacing

- `size.touchTarget` is the minimum interactive target: 44px.
- Use `space` tokens for gaps and padding instead of one-off pixel values.
- Use stable dimensions for repeated controls, nav tabs, chips, rows, and icon buttons so hover/active/loading states do not shift layout.

### Radius And Shadow

- `radius.control` is the default for buttons, inputs, chips with text, and compact panels.
- `radius.small` is for small embedded elements.
- `radius.pill` is for badges and chips.
- Shadows should communicate layering or interactivity. Avoid decorative floating sections.

### Type

- Use the system font stack from `uiTokens.font.family`.
- Keep app chrome and repeated UI compact. Reserve large text for page titles or major empty states.
- Use `textWeak` and `textMuted` before shrinking text too far.

### Motion And Focus

- Use `motion.fast` for button feedback and `motion.standard` for overlays or view transitions.
- All keyboard-visible focus should use the shared focus ring.
- Touch feedback should be visible but subtle.

## Component Standards

### Buttons

- Use Grommet `Button` for standard app chrome and form actions.
- Use `TouchButton` when custom pressed-state feedback is needed.
- Use icon buttons for common tool actions when the icon is familiar.
- Destructive buttons must use `danger` styling and be paired with confirmation when data can be lost.
- Disabled buttons should not be the only explanation of an unavailable action.

### Inputs And Forms

- Inputs must preserve the 44px touch target.
- Put required fields first and keep optional inventory metadata grouped.
- Show validation close to the field that caused it.
- Prevent double submit while async work is pending.

### Lists, Tables, And Cards

- Inventory browsing should favor list/table density over decorative cards.
- Use cards only for repeated item summaries, modal content, or genuinely framed tools.
- Item rows and cards should show name, container/location context when relevant, tags or key metadata, and the primary action affordance.
- Empty states should say what is empty and provide the next useful action when one exists.

### Chips And Badges

- Tags use chips.
- Filters use strong selected chips with explicit removal controls.
- Status badges should use semantic colors and short labels.
- Chip remove targets must remain at least 44px.

### Navigation

- Desktop navigation can use compact icon-plus-text buttons.
- Mobile primary navigation is fixed to the bottom and uses the shared touch target.
- Active navigation state must be visually distinct and expose `aria-current="page"`.

### Dialogs And Destructive Flows

- Dialogs should focus the decision, not restate the whole screen.
- Destructive dialogs must name the affected object and consequences.
- Multi-outcome destructive flows, such as deleting a container with contents, should present each outcome as a distinct choice.

### Loading, Empty, And Error States

- Loading states should appear near the area being loaded unless the whole app is blocked.
- Use overlays only for blocking work.
- Error states should include the failing action and a recovery path when available.
- Import/export flows should distinguish success, warning, and failure clearly.

## Feature Design Requirements

Feature specs should include a small design section after functional requirements. Use this template when a feature changes UI:

```markdown
### Design Requirements

- Primary workflow:
- Entry points:
- Layout:
- Component patterns:
- States:
- Touch/mobile behavior:
- Accessibility:
- Empty/loading/error behavior:
- Destructive or irreversible actions:
- Storybook coverage:
- E2E/visual checks:
```

Good design requirements are concrete enough to test. For example:

- "The clear-all filters action uses danger styling and remains at least 44px high."
- "On mobile, the submit action stays visible after the keyboard opens."
- "The import summary separates imported, skipped, and failed records with semantic status colors."

## Adding New UI

1. Check for an existing component or pattern in `meteor-app/imports/ui`.
2. Use `uiTokens` for visual values.
3. Add or update a Storybook story for reusable components.
4. Add E2E coverage when the interaction crosses routing, Meteor methods, or persisted data.
5. Update this document when a new reusable pattern appears.

## Migration Notes

Current known migration opportunities:

- Continue moving hardcoded colors, radii, spacing, and touch sizes in search, breadcrumb, tag, and list components onto `uiTokens`.
- Replace remaining emoji or text-only tool affordances with Grommet icons where a familiar icon exists.
- Keep CSS custom properties in `uiTokenCssVariables` limited to values used by global CSS; component-level styles should import `uiTokens` directly.
