# Direct-selection tag picker visual contract

This is a mock-data Storybook interaction proof for the proposed Search tag picker. It does not use Meteor, inventory records, or saved URL state. Its source is `meteor-app/imports/ui/DirectSelectionTagPicker.stories.tsx`.

Required viewports for every story: desktop **1280 × 800** and iPad-width tablet **820 × 1100**. The picker stays attached to Tags in the blue search banner at both sizes. The tag catalog owns vertical scrolling, occupies at least 70% of the panel height, and leaves the document without horizontal overflow. The title, search field, and active-view control stay visible while scrolling. Rows have a direct include checkbox, readable tag name and parent path, and a touch-size options button. Groups expand without selecting descendants. Type remains a separate anchored control. The applied-filter summary remains compact outside the panel. Phone adaptation and real search/data integration are excluded from this proof.

| Story ID suffix | Purpose and expected composition |
| --- | --- |
| `browse` | Default hierarchy: Workflow, Handling, Equipment; leaf checkboxes and options visible; catalog scrolls to nested tags. |
| `one-selected` | One included row and one removable applied tag; panel remains open. |
| `two-selected` | Two included rows; applied summary presents their OR relationship. |
| `excluded` | Fragile row is visibly excluded, with parent path; summary distinguishes the exclusion from included tags. |
| `sixteen-selected` | Long selected set is still a scroll catalog; outside summary collapses to counts and Review selected. |
| `review-selected` | Same catalog surface shows only sixteen selected rows, with Browse as return path and individual removal. |
| `path-search` | Searching `lens` leaves a single matching row with Equipment / Camera visible; name and path queries both work. |
| `type-open` | Separate Type menu is attached to Type, shows Items selected, and does not present the Tags panel. |

Interactions to verify beyond screenshots: one-click include and OR addition without closing the panel; per-row Exclude/Include/Remove without losing scroll position; review and remove one of sixteen; name/path search; group expansion; separate Type menu; Escape focus return; catalog-only scrolling; exact Storybook manager route without an error overlay.
