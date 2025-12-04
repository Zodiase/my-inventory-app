# Feature Specification: URL Routing for Single-Page Application

**Feature Branch**: `003-url-routing`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "URL Routing for Single-Page App - The inventory app uses state-based navigation (useState) but E2E tests assume URL routing exists. Tests navigate to /tags, /items, /search but the app shows the default view regardless of URL."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct URL Navigation (Priority: P1)

Users can navigate directly to specific views by typing or pasting URLs into the browser address bar. This enables bookmarking, sharing links, and returning to specific views without navigating through the UI.

**Why this priority**: Foundation for all URL-based features. Without this, browser back/forward and bookmarking cannot work. Critical for E2E test infrastructure.

**Independent Test**: Navigate to `/tags` in browser → Tags view displays. Navigate to `/items` → Items view displays. Navigate to `/search` → Search view displays.

**Acceptance Scenarios**:

1. **Given** user is on any page, **When** user navigates to `/` or `/items`, **Then** Items view displays with all items listed
2. **Given** user is on any page, **When** user navigates to `/tags`, **Then** Tags view displays with all tags listed
3. **Given** user is on any page, **When** user navigates to `/search`, **Then** Search view displays with search interface
4. **Given** user has an item ID, **When** user navigates to `/items/:itemId`, **Then** item detail view displays for that specific item
5. **Given** user has a tag ID, **When** user navigates to `/tags/:tagId`, **Then** items-by-tag view displays showing all items with that tag
6. **Given** user navigates to an invalid URL, **When** page loads, **Then** user sees a "not found" message or redirects to home view

---

### User Story 2 - Browser Navigation Controls (Priority: P2)

Users can use browser back/forward buttons to navigate between views they've visited. URL in address bar updates to reflect current view.

**Why this priority**: Expected behavior for all web applications. Users rely on back/forward buttons as primary navigation. Necessary for good user experience.

**Independent Test**: Click Tags button → URL shows `/tags`. Click Items button → URL shows `/items`. Click browser back button → Returns to `/tags`. Click browser forward button → Returns to `/items`.

**Acceptance Scenarios**:

1. **Given** user is on Items view, **When** user clicks Tags button, **Then** URL updates to `/tags` and Tags view displays
2. **Given** user navigated from Items to Tags, **When** user clicks browser back button, **Then** URL updates to `/items` and Items view displays
3. **Given** user clicked back from Tags to Items, **When** user clicks browser forward button, **Then** URL updates to `/tags` and Tags view displays
4. **Given** user views multiple items, **When** user clicks back button repeatedly, **Then** user navigates backward through viewed items in correct order
5. **Given** user is on Search view with search query, **When** user navigates to Items then back, **Then** Search view restores with previous search query intact

---

### User Story 3 - Shareable and Bookmarkable URLs (Priority: P3)

Users can bookmark specific views or share URLs with others. Opening a bookmarked or shared URL navigates directly to the intended view with appropriate data.

**Why this priority**: Enhances collaboration and workflow efficiency. Users can share "found this item" or "check this tag" links. Supports mobile "add to home screen" workflows.

**Independent Test**: Navigate to specific item detail view → Copy URL → Paste URL in new browser tab → Same item detail view displays.

**Acceptance Scenarios**:

1. **Given** user is viewing an item detail, **When** user bookmarks the URL, **Then** opening bookmark navigates to same item detail view
2. **Given** user is viewing tags list, **When** user copies URL and shares with colleague, **Then** colleague opening URL sees tags list
3. **Given** user is viewing items with specific tag, **When** user bookmarks that view, **Then** opening bookmark shows items with that tag
4. **Given** user bookmarked a search view, **When** user opens bookmark, **Then** search view displays (search query state may not persist unless encoded in URL)
5. **Given** user shares item detail URL, **When** recipient has no permissions or item is deleted, **Then** recipient sees appropriate error message

---

### Edge Cases

- What happens when user navigates to `/items/invalid-id` (item doesn't exist)?
  - Display "Item not found" message with link to return to Items list
- What happens when user navigates to `/tags/invalid-id` (tag doesn't exist)?
  - Display "Tag not found" message with link to return to Tags list
- What happens when URL contains item ID but user navigates away before item data loads?
  - Show loading spinner until data loads or timeout, handle navigation cancellation gracefully
- What happens when user rapidly clicks navigation buttons (Items → Tags → Items → Tags)?
  - Each click updates URL and view state, browser history accurately records each navigation
- What happens when user uses browser refresh while viewing item detail?
  - Page reloads, fetches item data again, displays same item detail view
- What happens when multiple URL parameters are invalid (e.g., `/items/123/tags/456`)?
  - Ignore invalid route structure, redirect to home or show 404 error

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST map root URL `/` to Items view (default view)
- **FR-002**: System MUST map `/items` URL to Items list view
- **FR-003**: System MUST map `/tags` URL to Tags list view
- **FR-004**: System MUST map `/search` URL to Search view
- **FR-005**: System MUST map `/items/:itemId` URL to item detail view for specific item
- **FR-006**: System MUST map `/tags/:tagId` URL to items-by-tag view for specific tag
- **FR-007**: System MUST update browser URL when user clicks navigation buttons (Items, Tags, Search)
- **FR-008**: System MUST update browser URL when user navigates to item detail or tag detail views
- **FR-009**: System MUST support browser back button to navigate to previously visited views
- **FR-010**: System MUST support browser forward button to navigate to next view in history
- **FR-011**: System MUST preserve view state when navigating back/forward (e.g., scroll position, selected filters)
- **FR-012**: System MUST handle invalid URLs gracefully with error message or redirect to home
- **FR-013**: System MUST handle deleted/invalid item IDs in URLs with "not found" error message
- **FR-014**: System MUST handle deleted/invalid tag IDs in URLs with "not found" error message
- **FR-015**: System MUST NOT break existing UI components (AllItemsView, AllTagsView, ItemsByTagView, SearchResultsView)
- **FR-016**: System MUST maintain TypeScript type safety for route parameters (itemId, tagId)
- **FR-017**: System MUST work with Meteor's client-side rendering architecture
- **FR-018**: System MUST integrate with existing Grommet UI components without visual regressions
- **FR-019**: System MUST pass existing E2E tests in `tests/e2e/app/tag-management.spec.ts` and `tests/e2e/app/items-and-tags.spec.ts`
- **FR-020**: System MUST support page refresh at any URL without losing view state (deep linking)

### Key Entities

- **Route**: URL pattern mapping to specific view
  - Path pattern (e.g., `/items/:itemId`)
  - Associated view component (e.g., ItemDetailView)
  - Route parameters (e.g., `itemId`, `tagId`)
  - Parameter validation rules (e.g., itemId must exist in database)

- **Navigation State**: Browser history and URL state
  - Current URL path
  - URL parameters (itemId, tagId)
  - History stack (for back/forward navigation)
  - View-specific state (e.g., search query, filters)

- **View**: Application screen/component displayed for a route
  - Items view (list all items)
  - Tags view (list all tags)
  - Search view (search interface)
  - Item Detail view (single item with :itemId parameter)
  - Items-by-Tag view (items filtered by :tagId parameter)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to any view by entering URL directly in browser address bar
- **SC-002**: Browser back button navigates to previously viewed page 100% of the time
- **SC-003**: Browser forward button navigates to next page in history 100% of the time
- **SC-004**: All existing E2E tests in `tests/e2e/app/` pass without modification to test assertions (only navigation code changes allowed)
- **SC-005**: Blocked task T012 integration tests pass after routing implementation
- **SC-006**: Page refreshed at any URL returns user to same view within 2 seconds (including data fetch)
- **SC-007**: URL in browser address bar updates within 100ms of user clicking navigation button
- **SC-008**: No visual regressions in existing UI components (verified by screenshot comparison or manual QA)
- **SC-009**: TypeScript compilation succeeds with no new type errors introduced
- **SC-010**: Users can share URLs and recipients open to correct view 100% of the time (assuming permissions and valid data)

## Assumptions *(optional)*

- Routing library will be added as dependency (React Router or similar TypeScript-compatible library recommended)
- Existing state management pattern (`useState<View>`) will be replaced with URL-driven view state
- Navigation buttons will use routing library's Link/NavLink components or imperative navigation APIs
- Route parameter validation will use existing Meteor Collections APIs to check if IDs exist
- Error handling for invalid routes will use existing Grommet UI patterns (Layer, Heading, Button)
- Search query and filter state will initially NOT persist in URL (can be added in future enhancement)
- Browser history will use standard HTML5 History API (not hash-based routing)
- Application will continue to be single-page application (no server-side rendering)
- Existing Meteor.methods and Collection subscriptions will not require changes
- Mobile browser back gesture (swipe from edge) will trigger same back behavior as desktop back button

## Out of Scope

- Search query parameters in URL (e.g., `/search?q=camping`) - can be added later
- Filter state in URL (e.g., `/items?filter=container:true`) - can be added later
- Nested routes beyond two levels (e.g., `/items/:itemId/edit`)
- Server-side rendering or static site generation
- Route-level code splitting or lazy loading
- Route transition animations
- Breadcrumb component updates (existing breadcrumb implementation can remain unchanged)
- Authentication/authorization per route (no login/permissions system exists yet)
- Analytics or route change tracking
- Custom 404 page design (simple error message acceptable)

## Dependencies

- **Blocked Tasks**: T012 "Port CreateTagDialog to full app integration" in spec 002-storybook-e2e-testing
  - Cannot complete until routing allows navigation to `/tags` route
  - Tests written but failing due to missing routing
- **Affected Tests**: All E2E tests using page object `goto()` methods
  - `TagsPage.goto()` expects `/tags` route
  - `InventoryPage.goto()` expects `/` or `/items` route
  - Tests assume URL navigation works but currently shows default view regardless of URL
- **Current Architecture**: App.tsx uses `useState<View>` for navigation
  - Lines 83: `const [currentView, setCurrentView] = useState<View>('items')`
  - Lines 239-255: Navigation buttons call `setCurrentView()`
  - Must be replaced with routing library's navigation system

## References

- Current architecture: `meteor-app/imports/ui/App.tsx`
- Test expectations: `tests/e2e/helpers/page-objects.ts` (TagsPage.goto, InventoryPage.goto)
- Blocked integration tests: `tests/e2e/app/tag-management.spec.ts`
- Related spec: `specs/002-storybook-e2e-testing/tasks.md` (T012 blocked by routing)
