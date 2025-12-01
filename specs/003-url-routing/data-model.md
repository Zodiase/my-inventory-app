# Data Model: URL Routing

**Date**: 2025-11-30
**Feature**: URL Routing for Single-Page Application
**Context**: Client-side routing with Wouter - no database schema changes

## Overview

This feature introduces **route definitions** as a configuration concept, not a database entity. Routes map URL patterns to React components and define parameter types for type-safe navigation.

**Key Point**: No database changes required. All routing is client-side navigation state managed by Wouter library and browser History API.

## Entities

### Route (Configuration Entity - Not Persisted)

**Definition**: URL pattern that maps to a specific view component

**Attributes**:
- `path`: String - URL pattern (e.g., `/items/:itemId`)
- `component`: React Component - View to render
- `exact`: Boolean - Whether path must match exactly (default: false)
- `params`: Type definition - Shape of URL parameters (TypeScript)

**Example**:
```typescript
interface ItemDetailParams {
  itemId: string;
}

const route = {
  path: '/items/:itemId',
  component: ItemDetailView,
  params: ItemDetailParams
};
```

**Routes List**:

| Path | Component | Params | Description |
|------|-----------|--------|-------------|
| `/` | AllItemsView | none | Default/home view |
| `/items` | AllItemsView | none | Explicit items list |
| `/tags` | AllTagsView | none | Tags list |
| `/search` | SearchResultsView | none | Search interface |
| `/items/:itemId` | ItemDetailView | `{ itemId: string }` | Single item detail |
| `/tags/:tagId` | ItemsByTagView | `{ tagId: string }` | Items filtered by tag |
| `/:rest*` | NotFoundView | none | 404 catchall |

**Validation Rules**:
- `itemId` must be valid MongoDB ObjectId format (24-char hex)
- `tagId` must be valid MongoDB ObjectId format (24-char hex)
- Invalid IDs show "Not Found" error, don't crash app

**State Transitions**: None (routes are stateless configuration)

---

### Navigation State (Browser-Managed - Not Persisted)

**Definition**: Current location and history stack managed by browser

**Attributes**:
- `location.pathname`: String - Current URL path
- `location.search`: String - Query parameters (future use)
- `location.hash`: String - URL hash (not used)
- `history`: Array<Location> - Browser history stack

**Managed By**: Browser History API + Wouter hooks

**Example**:
```typescript
import { useLocation } from 'wouter';

const [location, setLocation] = useLocation();
// location = '/items/abc123'
// setLocation('/tags') → navigate to /tags
```

**Lifecycle**:
1. User clicks Link or Button → `setLocation(newPath)` called
2. Browser history stack updated (enables back/forward)
3. Wouter triggers re-render with new location
4. Route matching runs → correct component renders

---

### Route Parameters (Derived from URL - Not Persisted)

**Definition**: Dynamic segments extracted from URL path

**Example for `/items/:itemId`**:
```typescript
import { useParams } from 'wouter';

const { itemId } = useParams<{ itemId: string }>();
// If URL is /items/abc123, itemId = 'abc123'
```

**Type Safety**:
- TypeScript enforces param types
- Runtime validation happens in components (check if item exists in DB)
- Invalid params → show error message, don't crash

---

## Relationships

```
┌─────────────┐
│   Route     │ 1:1 matches → React Component
└─────────────┘
      │
      │ extracts
      ↓
┌─────────────┐
│  Params     │ 1:1 → Component props
└─────────────┘
      │
      │ used to fetch
      ↓
┌─────────────┐
│  Database   │ Existing Meteor Collections
│  Entities   │ (InventoryItem, TagRecord)
└─────────────┘
```

**Flow**:
1. URL `/items/abc123` → Route matched
2. Params extracted: `{ itemId: 'abc123' }`
3. ItemDetailView component receives params
4. Component fetches InventoryItem with `_id: 'abc123'` from MongoDB
5. If item not found → display error message

---

## No Database Schema Changes

**Existing Collections Unchanged**:
- `InventoryItem` - No changes
- `TagRecord` - No changes
- `Attachment` - No changes

**Why No Changes Needed**:
- Routes are URL → Component mappings (client-side config)
- Navigation state managed by browser History API
- Parameters are transient (extracted from URL on each navigation)
- Existing MongoDB collections already support fetching by `_id`

---

## View State Preservation

**Problem**: When navigating back/forward, should view state (scroll position, filters) be preserved?

**Solution** (per spec assumptions):
- **Initial implementation**: No state preservation beyond what React provides
- **Future enhancement**: Store view state in URL query params (e.g., `/search?q=camping`)

**Current Approach**:
- Each view re-mounts on navigation
- Scroll position resets (standard browser behavior)
- Filters/search state lost on navigation

**Example**:
```typescript
// User on /search with query "camping"
// User clicks /items → SearchResultsView unmounts
// User clicks back → SearchResultsView mounts fresh
// Query "camping" is lost

// Future: /search?q=camping would preserve query
```

---

## Type Definitions

```typescript
// Route configuration type
interface AppRoute {
  path: string;
  component: React.ComponentType;
}

// Route with parameters
interface ParamRoute<T> extends AppRoute {
  params: T;
}

// Example usage
type ItemDetailRoute = ParamRoute<{ itemId: string }>;
type TagDetailRoute = ParamRoute<{ tagId: string }>;

// Route params hook return type
type RouteParams<T> = T | Record<string, never>;

// Example component
const ItemDetailView: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  // itemId is type: string | undefined

  const item = useTracker(() => {
    return Items.findOne({ _id: itemId });
  }, [itemId]);

  if (!item) {
    return <NotFound message="Item not found" />;
  }

  return <div>{item.name}</div>;
};
```

---

## Migration Impact

**Before Routing**:
```typescript
// App.tsx state
const [currentView, setCurrentView] = useState<View>('items');
const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
const [selectedTagId, setSelectedTagId] = useState<string | undefined>();

// Navigation
setCurrentView('items');
setSelectedItemId('abc123');
```

**After Routing**:
```typescript
// No state needed - URL is source of truth
import { useLocation, useParams } from 'wouter';

// Navigation
const [, setLocation] = useLocation();
setLocation('/items/abc123');

// Reading current view
const { itemId } = useParams<{ itemId: string }>();
```

**State Removed**:
- ❌ `currentView` - replaced by `location.pathname`
- ❌ `selectedItemId` - replaced by route params
- ❌ `selectedTagId` - replaced by route params

**State Preserved**:
- ✅ `searchQuery` - kept (not in URL initially per spec)
- ✅ `itemsViewFilters` - kept (not in URL initially per spec)
- ✅ All other component-local state unchanged

---

## Error Handling

**Invalid Routes**:
- URL: `/invalid/path/123`
- Match: Catchall route `/:rest*`
- Display: NotFoundView component with "Page not found" message

**Invalid Parameters**:
- URL: `/items/not-a-valid-id`
- Match: `/items/:itemId` route
- Component: ItemDetailView receives `itemId = "not-a-valid-id"`
- MongoDB Query: `Items.findOne({ _id: "not-a-valid-id" })` returns `undefined`
- Display: NotFound message within ItemDetailView

**Deleted Resources**:
- URL: `/items/abc123` (item was deleted)
- Match: `/items/:itemId` route
- Component: ItemDetailView fetches, gets `undefined`
- Display: "Item not found" error message

---

## Summary

**What Changes**:
- App.tsx: Replace `useState<View>` with Wouter `<Route>` components
- Navigation buttons: Wrap in `<Link>` or use `setLocation()`
- View components: Add `useParams()` hook to read route parameters

**What Stays the Same**:
- All database collections and schemas
- All Meteor.methods and data fetching logic
- All UI components (just change how they're rendered)
- All useTracker reactive data patterns

**No Persistence Needed**:
- Routes are code configuration, not data
- Browser manages navigation history
- URL parameters are transient (parsed from URL string)
