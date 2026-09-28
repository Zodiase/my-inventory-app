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
- The blue-shell Search shortcut is shown on non-search pages and hidden while
  the current route is `/search` (including scoped search URLs). Search must
  not expose an active self-link that resets the current query, scope, or
  filters.
- Search remains represented in the opened primary-navigation menu as a
  non-interactive current-page label while the shortcut is hidden. It must not
  be a `/search` link that normalizes away scoped query state. The menu is the
  fallback discovery path and current-location cue; the page heading and
  `aria-current="page"` provide additional semantics. On non-search routes,
  Search is an ordinary menu link as well as the shell shortcut.
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

Provide an explicit exit action in that top region:

- For scoped search with a known container ID, use `Back to Kitchen` (with the
  actual container name) and navigate to that container route. This action is
  available after refresh or direct-link entry; it must not depend on browser
  history having originated in Kitchen.
- For global search, use `Exit search` and navigate to `/items`.
- Browser Back remains a normal history action and should return to the actual
  preceding page when one exists. The explicit exit action is a semantic scope
  exit, not a replacement for browser Back.

The exit action must be a normal same-tab anchor or equivalent semantic
navigation control, be keyboard and touch accessible, and make its destination
clear in its accessible name. A result’s location path may remain contextual
text; users should not have to infer that it is the way to leave Search.

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
- Give the scoped exit action an accessible name such as `Back to Kitchen` and
  keep it visible at desktop and mobile widths without competing with the
  query field.
- On desktop and mobile, selecting a result replaces search with item detail in
  the same tab; there is no required split view or new window.

## Search diagnostics

Traceability is useful for verification and support but is not a primary user
control. Every completed search must show an inconspicuous marker, for example
a muted `Search run · 1 result · ref srch-…` line beneath the result count.
Additional request/provider/timing details may be behind a “Search details”
disclosure. Do not include the query, descriptions, identities, or container
names in the trace value. Use an opaque, non-secret run ID with bounded
retention and avoid making it a stable user or inventory identifier.

The diagnostic contract should make it possible to cross-check the backend
response against rendered cards, and the visible marker must prove that a
server search actually ran rather than being a client-only cosmetic ID:

- the server returns a run ID, result count, and ordered result IDs for each
  completed search; the client renders the returned run ID with that result
  set;
- the client records the run as `loading`, `success`, `empty`, `error`, or
  `stale` and only renders the latest run;
- a stale response is never presented as the current result set or diagnostic
  line;
- errors show a user-safe message and retain the opaque run ID for support,
  without exposing backend stack traces or request data.

To preserve compatibility with the existing `items.search` array response,
keep that method unchanged and add a versioned or parallel traced search
contract that returns `{ results, runId, count, resultIds, status }`. The
visible run reference is required for success, empty, and error outcomes where
the server executed the request; diagnostics must never block search completion
or reveal private inventory data. A client-side request sequence number may
discard stale responses but is not a valid displayed run reference.

## Acceptance criteria

1. Opening search from `/container/:id` enters `/search` in the same tab,
   removes the stale container breadcrumb, and names the active scope in the
   search content.
2. While on any `/search` URL, the shell Search shortcut is absent; opening
   the navigation menu exposes Search as a non-interactive current-page label,
   so there is no action that can reset search state.
3. Search URL state reproduces query, filters, scope, and equivalent results
   after refresh; Back and Forward restore those states.
4. Each result is an accessible anchor to `/items/:itemId`. Ordinary click is
   same-tab, while modifier-click and context-menu new-tab behavior remain
   available.
5. Item detail provides a search return path, and returning restores the
   prior search state and preferably the prior result scroll position.
6. Long result sets have one intentional results scroll region at desktop,
   iPhone, and iPad widths, with no header/control overlap or competing body
   scroll.
7. Storybook covers neutral shell, shortcut-hidden/menu-visible search,
   global/scoped, idle/loading/empty/results,
   anchor semantics, responsive layout, focus, and scroll states with mock
   data. One narrow real-app acceptance test covers search-to-detail and Back.
8. Scoped search always exposes `Back to <container>` and direct/refreshed
   scoped URLs navigate to that container; global search exposes `Exit search`
   to `/items`.
9. Every completed search displays a server-correlated opaque run reference;
   its count and ordered result IDs match the rendered backend response, and
   empty, error, and stale runs are distinguishable without exposing query or
   inventory content.

## Open implementation details

- Choose a stable query-string encoding for repeated filters before wiring URL
  synchronization.
- Decide whether exact result scroll restoration is required for the first
  release or whether restoring the search state and scrolling to the top is
  sufficient.
- Keep any desktop split/detail experiment separate from the initial route and
  anchor contract.
