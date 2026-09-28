# Search Interaction Design

## Decision

Search is a dedicated `/search` page with same-tab, full-screen navigation. A
result opens the existing item-detail route in the same tab. Browser Back and
an explicit “Back to search” action return to the prior search state.

Do not add a persistent desktop split view, drawer, new tab, or overlay for the
initial implementation. Those patterns create a second focus and scroll
context, especially on mobile, without solving a demonstrated workflow need.

## Shell and scope

- The blue shell banner becomes a single-row search interface on `/search`.
  It replaces the hamburger menu, Inventory brand, and originating container
  breadcrumb for this mode. Other app views keep their normal shell.
- The blue-shell Search shortcut is shown on non-search pages and hidden while
  the current route is `/search` (including scoped search URLs). Search must
  not expose an active self-link that resets the current query, scope, or
  filters.
- On non-search routes, the existing menu and Search shortcut remain the entry
  points. In Search mode, the leading exit control returns to the selected
  container or `/items`, where normal app navigation is available again.
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

Keep the banner to one row. The leading exit control and scope control occupy
the navigation position, followed by a flexible query field. Give the query
field the remaining width. Search results update about 350 ms after typing
stops and text composition finishes. Enter or the mobile keyboard Search
action runs immediately. Clearing the query updates the URL and results.
There is no separate Search submit button
or second `Search by name` filter: the query field owns free-text search.

Use three progressive layouts, selected by available width rather than a
device label or a fixed breakpoint:

```text
Roomy:   [‹] [Kitchen ▾] [Search items…             ×] [Tags · 2 ▾] [Type: Items ▾]
Tighter: [‹] [Kitchen ▾] [Search items…             ×] [Filters · 3 ▾]
Narrow:  [‹] [Kitchen + 3 ▾] [Search items…                    ×]
Body:    [Result count · subtle run reference]
         [Scrollable results / quiet status state]
```

The query field has a minimum usable width of 160 CSS px at a 320 px viewport;
reserve that space before showing optional separate controls. The exit target
is at least 44 × 44 px. The narrow combined button may truncate a long scope
name visually, but its accessible name exposes the full name and active-filter
summary. The `+ 3` example counts the two selected tags and active type
constraint beyond the already named scope; it must never imply three
additional scopes. Controls do not wrap into a second banner row or overflow
horizontally.

When the scope, Tags, and Type controls are separate, each reflects its active
state. When space first becomes tight, Tags and Type fold into one `Filters`
button while Scope remains visible. When the query would otherwise fall below
its minimum width, Scope joins that menu. The combined button still identifies
the selected scope, for example `Kitchen + 3`; its menu contains the same
Scope, Tags, and Type controls. A generic Filters button is unnecessary while
all three controls fit independently.

Do not place an active-filter chip row, second Search heading, “Search in…”
subtitle, or detached Back link in the white body. The banner controls show
the active state; the white area is for result count/status and results. The
idle state should be quiet and useful, without a large repeated search icon
and instructional hero.

### Filter controls

- **Scope:** A single button displays `All Items` or the selected container
  name. Its menu offers All Items and the current container scope; if a
  location picker is available, it can also select a different container. Scope
  is also the first section of the combined filter menu; both presentations
  edit the same URL-backed state. Changing scope updates the current search
  rather than leaving Search.
- **Tags:** A `Tags` button shows the number of active tag constraints and
  opens one picker with `Include` and `Exclude` sections. Selecting or removing
  a tag applies immediately, without a second Add action. Included tags are
  all required; excluded tags must not appear. A tag already included cannot
  also be excluded (and vice versa); explain the unavailable choice. Retained
  contradictory legacy URL state shows a clear warning instead of silently
  changing the request.
- **Type:** A compact single-choice control offers `Any`, `Items`, and
  `Containers`. Choosing one applies immediately; `Any` clears the type
  constraint. Only one type constraint may be active, so repeated choices
  replace rather than stack.
- **Combined menu:** On narrower screens, present Scope, Tags, and Type in
  that order in one anchored menu or mobile sheet. Show the current values,
  offer `Reset filters` to restore All Items/Any type/no tags while preserving
  the query, and return focus to the trigger when closed. Scope and tag/type
  counts must be unambiguous.

Changing a filter runs the search using the current query. With an empty
query and no tag or type constraint, show the quiet idle state rather than a
copy of the full Items list. A tag or type constraint can run a structured-only
search even when the query is empty. Clearing the query while filters remain
active leaves those filters in force.

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
- Normal navigation is absent in Search mode. On other routes, the Search
  shortcut and menu entry retain their ordinary accessible names and behavior.
- Give scope, Tags, Type, and combined-menu triggers descriptive accessible
  names, current values, and accurate expanded state. The popup or sheet must
  be keyboard operable and dismiss with Escape.
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
2. While on any `/search` URL, the shell Search shortcut, hamburger menu, and
   Inventory brand are absent. Exiting restores the normal shell; there is no
   active self-link that can reset search state.
3. Search URL state reproduces query, filters, scope, and equivalent results
   after refresh; Back and Forward restore those states.
4. Each result is an accessible anchor to `/items/:itemId`. Ordinary click is
   same-tab, while modifier-click and context-menu new-tab behavior remain
   available.
5. Item detail provides a search return path, and returning restores the
   prior search state and preferably the prior result scroll position.
6. The blue banner stays one row at desktop, iPhone, and iPad widths, without
   the hamburger menu or Inventory brand. It contains exit, scope/filter
   controls, and a query field at least 160 CSS px wide at 320 px. There is no
   separate submit button or duplicate name filter. The white body has no
   duplicate Search heading, scope subtitle, detached Back link, or filter-chip
   toolbar.
7. Long result sets have one intentional results scroll region, with no banner
   overlap or competing body scroll. Search controls stay available while
   results scroll.
8. Storybook covers roomy, tighter, and narrow banner layouts; scope, tag,
   type, and combined-menu states; idle/loading/empty/results; anchor
   semantics, focus, and scroll behavior with mock data. A narrow real-app
   acceptance test covers query debounce/Enter, URL state, scoped exit after
   refresh, and search-to-detail/Back.
9. The banner exit chevron opens the scoped container from direct or refreshed
   URLs and opens `/items` for global search; its accessible name states the
   destination. Browser Back still returns to the actual prior history entry.
10. Every completed search displays a server-correlated opaque run reference;
    its count and ordered result IDs match the rendered backend response, and
    empty, error, and stale runs are distinguishable without exposing query or
    inventory content.
11. Tag Include/Exclude selections and Type changes apply without extra Add
    actions; duplicate name input is absent. Active filters remain
    understandable and editable when controls collapse into one menu. Reset
    filters clears scope/tags/type but retains the query.

## Open implementation details

- Choose a stable query-string encoding for repeated filters before wiring URL
  synchronization.
- Decide whether exact result scroll restoration is required for the first
  release or whether restoring the search state and scrolling to the top is
  sufficient.
- Keep any desktop split/detail experiment separate from the initial route and
  anchor contract.
