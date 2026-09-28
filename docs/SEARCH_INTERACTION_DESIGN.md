# Search Interaction Design

## Decision

Search is a dedicated `/search` page with same-tab, full-screen navigation. A
result opens the existing item-detail route in the same tab. Browser Back and
an explicit “Back to search” action return to the prior search state.

Do not add a persistent desktop split view, drawer, new tab, or overlay for the
initial implementation. Those patterns create a second focus and scroll
context, especially on mobile, without solving a demonstrated workflow need.

## Shell and scope

- The `/search` shell header is neutral: it must not retain the originating
  container breadcrumb. The search page itself is the active navigation item.
- Search scope is explicit in the content, for example “Search in Kitchen” or
  “All items”. Scope is not communicated only by the shell breadcrumb.
- Search launched from a container may default to that container and its
  descendants, but the scope must be represented in URL state and survive
  refresh, Back, and Forward.
- Query, filters, scope, and a stable scoped container ID should be encoded in
  `/search` URL state. Human-readable names are derived display values, not
  identity.

## Search page

Place the query field, submit/clear actions, scope selector, filter summary,
and expandable advanced filters in a compact top control region. Keep the
controls visually distinct from result cards and expose loading, result count,
and empty states.

When results are long, the results region is the deliberate vertical scroll
owner. The document, shell header, and an accidental nested page region must
not compete with it. On small screens, controls may scroll away if a sticky
control region would consume too much viewport; focus and the active control
must remain reachable.

## Result navigation

Search results must be semantic anchors pointing to `/items/:itemId`:

- ordinary activation stays in the current tab;
- modifier-click, context-menu “open in new tab”, keyboard link commands, and
  assistive technology retain their normal browser behavior;
- no click-handler-only button should be used as the sole navigation mechanism.

The item detail page may show “Back to search” when entered from search. Both
that action and browser Back should restore the exact search URL, including
query, filters, scope, and results; restoring the prior result scroll position
is preferred when practical. Forward should return to the same item detail.

Result location paths are contextual information inside the result card. They
must not become the active shell breadcrumb. If path segments are clickable,
their navigation must clearly leave search and open the selected container.

## Accessibility and responsive behavior

- Use a labelled search landmark and a single clear heading hierarchy.
- Mark Search as the current navigation page with `aria-current="page"`.
- Give scope controls labelled pressed states and give filter disclosure an
  accurate `aria-expanded` state.
- Announce loading, result count changes, and empty results through an
  appropriate live region.
- Preserve visible keyboard focus and provide at least 44px touch targets.
- Do not communicate scope, item type, or state through color alone.
- On desktop and mobile, selecting a result replaces search with item detail in
  the same tab; there is no required split view or new window.

## Acceptance criteria

1. Opening search from `/container/:id` enters `/search` in the same tab,
   removes the stale container breadcrumb, and names the active scope in the
   search content.
2. Search URL state reproduces query, filters, scope, and equivalent results
   after refresh; Back and Forward restore those states.
3. Each result is an accessible anchor to `/items/:itemId`. Ordinary click is
   same-tab, while modifier-click and context-menu new-tab behavior remain
   available.
4. Item detail provides a search return path, and returning restores the
   prior search state and preferably the prior result scroll position.
5. Long result sets have one intentional results scroll region at desktop,
   iPhone, and iPad widths, with no header/control overlap or competing body
   scroll.
6. Storybook covers neutral shell, global/scoped, idle/loading/empty/results,
   anchor semantics, responsive layout, focus, and scroll states with mock
   data. One narrow real-app acceptance test covers search-to-detail and Back.

## Open implementation details

- Choose a stable query-string encoding for repeated filters before wiring URL
  synchronization.
- Decide whether exact result scroll restoration is required for the first
  release or whether restoring the search state and scrolling to the top is
  sufficient.
- Keep any desktop split/detail experiment separate from the initial route and
  anchor contract.

