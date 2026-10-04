# Three-state tag picker visual contract

This is a mock-data Storybook proof for the proposed Search interaction in `docs/SEARCH_INTERACTION_DESIGN.md` (design revision `79a3b55`). It makes no production app, data, backend, or URL-state changes.

Every state is reviewed at desktop 1280 × 800 and iPad-width 820 × 1100. The Tags picker is attached to the search banner, and the hierarchical catalog fills at least 70% of its panel height with its own vertical scroll. Each tag has a single visibly movable three-position control: logical start Include, center Neutral, logical end Exclude. Every position is directly targetable and keyboard operable. The two-position Show selected only switch uses the same catalog, retaining search text and allowing removal with focus recovery. Group headings appear only for matches during filtering. The selected summary stays compact. Type stays separately anchored. No document overflow or Storybook error overlay is acceptable.

| Story | Expected composition |
| --- | --- |
| browse | Full hierarchy with neutral controls and catalog scroll. |
| one-selected | One included row and compact applied summary. |
| two-selected | Two included rows with OR behavior. |
| excluded | One excluded row and distinguishable NOT summary. |
| sixteen-selected | Large selection remains in the catalog without a chip wall. |
| review-selected | Same catalog shows selected rows with switch On. |
| selected-search | Selected-only view retains a search query and shows matching group hierarchy. |
| selected-empty | Selected-only query with no matches gives a clear empty state and clear-query affordance. |
| path-search | Tag name/path search shows Lens and its parent path. |
| type-open | Type control opens independently of Tags. |

Functional checks include direct position changes, touch and keyboard input, search and selected-only composition, removal and focus recovery, scroll retention, Type separation, RTL direction, and catalog-only scrolling.
