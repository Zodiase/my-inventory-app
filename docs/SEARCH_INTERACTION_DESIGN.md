# Search Interaction Design

## Decision

Search is a dedicated `/search` page with same-tab, full-screen navigation. A
result opens the existing item-detail route in the same tab. Browser Back and
an explicit “Back to search” action return to the prior search state.

Do not add a persistent desktop split view, drawer, new tab, or overlay for the
initial implementation. Those patterns create a second focus and scroll
context, especially on mobile, without solving a demonstrated workflow need.

## Shell and scope

- The blue shell banner becomes the search interface on `/search`. It must not
  retain the originating container breadcrumb. The page itself is the active
  navigation item.
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
- The scope selector in the banner explicitly shows “Kitchen” or “All Items”.
  It is the one visible place that names the active scope; do not repeat the
  same scope in a subtitle or a separate Back link below the banner.
- Search launched from a container may default to that container and its
  descendants, but the scope must be represented in URL state and survive
  refresh, Back, and Forward.
- Query, filters, scope, and a stable scoped container ID should be encoded in
  `/search` URL state. Human-readable names are derived display values, not
  identity.

## Search banner and page

The blue banner owns the complete primary search control group: an exit
chevron, query field, clear and submit actions, scope selector, and Filters
control. The exit belongs at the leading edge of that group, beside the query
field, so its relationship to Search is clear. The menu remains the global
navigation control. Expanded filter editing may open below the banner or in a
responsive panel, but its summary, active state, and disclosure control remain
in the banner. Keep the controls visually distinct from result cards.

On desktop, use the available banner width for a compact query row and a scope
and filter row when needed. On mobile, use a full-width query row followed by
a compact scope and filter row. The banner may grow to two rows, but must not
consume most of the viewport or hide the active input behind the keyboard.
The exit chevron, query, and scope must remain readily reachable. Do not add a
second Search heading, “Search in…” subtitle, or detached Back link in the
white page body; the banner's labelled controls and Search landmark provide
the page identity.

```text
Desktop banner: [Menu] [Inventory] [‹] [Search inventory…            ] [Search]
                                    [All Items | Kitchen] [Filters (2)]
Mobile banner:  [Menu] [‹] [Search inventory…          ] [Search]
                [All Items | Kitchen]                 [Filters (2)]
White body:     [Result count · subtle run reference]
                [Scrollable results / status state]
```

The sketch shows grouping, not fixed pixel positions; controls may wrap as
needed without moving the search controls into the white body.

The exit chevron has a deterministic destination. For scoped search it opens
the selected container route, including after refresh or direct-link entry;
for global search it opens `/items`. Its accessible name states that
destination, for example `Return to Kitchen` or `Exit search to All Items`.
Browser Back remains normal history navigation and returns to the actual
preceding page when one exists. A result’s location path remains contextual
text; it is not the hidden way to leave Search.

The white content area begins with result status/count, then the results or an
idle, loading, empty, or error state. When results are long, the results
region is the deliberate vertical scroll owner. The document, banner, and an
accidental nested page region must not compete with it. The banner stays
visible while the results scroll.

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

- Use a labelled search landmark in the banner. A visually hidden `Search`
  heading is acceptable when needed for the page heading hierarchy.
- Mark Search as the current navigation page with `aria-current="page"`.
- Give scope controls labelled pressed states and give filter disclosure an
  accurate `aria-expanded` state.
- Announce loading, result count changes, and empty results through an
  appropriate live region.
- Preserve visible keyboard focus and provide at least 44px touch targets.
- Do not communicate scope, item type, or state through color alone.
- Give the banner exit chevron an accessible destination name and a visible
  focus state; keep it visible at desktop and mobile widths beside the search
  controls.
- On desktop and mobile, selecting a result replaces search with item detail in
  the same tab; there is no required split view or new window.

## Search diagnostics

Traceability is useful for verification and support but is not a primary user
control. Every completed search must show an inconspicuous marker, for example
a muted `Search run · 1 result · ref srch-…` line beneath the result count.
Additional safe request/timing details may be behind a “Search details”
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
   replaces the container breadcrumb with the search banner, and names the
   active scope in the banner selector.
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
6. The blue banner contains the exit chevron, query, clear/submit, scope, and
   Filters controls at desktop, iPhone, and iPad widths. The white body has no
   duplicate Search heading, scope subtitle, or detached Back link.
7. Long result sets have one intentional results scroll region, with no banner
   overlap or competing body scroll. Search controls stay available while
   results scroll.
8. Storybook covers the full search banner, shortcut-hidden/menu-visible
   search, global/scoped, idle/loading/empty/results, anchor semantics,
   responsive layout, focus, and scroll states with mock data. One narrow
   real-app acceptance test covers search-to-detail and Back.
9. The banner exit chevron opens the scoped container from direct or refreshed
   URLs and opens `/items` for global search; its accessible name states the
   destination. Browser Back still returns to the actual prior history entry.
10. Every completed search displays a server-correlated opaque run reference;
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
