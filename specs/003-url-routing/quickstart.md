# Quick Start: URL Routing Implementation

**Feature**: URL Routing for Single-Page Application
**Date**: 2025-11-30
**Audience**: Developers implementing routing in Meteor + React + TypeScript app

---

## Overview

Replace state-based navigation with URL routing using Wouter library. This enables:
- ✅ Browser back/forward buttons
- ✅ Bookmarkable URLs
- ✅ Shareable links
- ✅ E2E tests that use `goto()` methods

**Time Estimate**: 7-11 hours total

---

## Prerequisites

- [ ] Meteor 3+ running
- [ ] React 18+ with hooks
- [ ] TypeScript strict mode enabled
- [ ] Existing App.tsx with useState navigation
- [ ] E2E tests expecting routing (currently failing)

---

## Installation

### Step 1: Install Wouter

```bash
cd meteor-app
npm install wouter@^3.0.0
```

**Verify**:
```bash
npm list wouter
# Should show: wouter@3.x.x
```

---

## Implementation

### Step 2: Update App.tsx - Replace State with Routes

**Before** (state-based navigation):
```typescript
import { useState } from 'react';

type View = 'items' | 'tags' | 'itemsByTag' | 'search';

export const App = (): ReactElement => {
    const [currentView, setCurrentView] = useState<View>('items');
    const [selectedTagId, setSelectedTagId] = useState<string | undefined>();
    const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

    // ... later in JSX:
    {currentView === 'items' && <AllItemsView />}
    {currentView === 'tags' && <AllTagsView />}
    {currentView === 'search' && <SearchResultsView />}
    {currentView === 'itemsByTag' && selectedTagId && (
        <ItemsByTagView tagId={selectedTagId} />
    )}
    {selectedItemId && (
        <ItemDetailView itemId={selectedItemId} />
    )}
};
```

**After** (URL-based routing):
```typescript
import { Route, Switch } from 'wouter';

export const App = (): ReactElement => {
    // Remove these lines:
    // const [currentView, setCurrentView] = useState<View>('items');
    // const [selectedTagId, setSelectedTagId] = useState<string | undefined>();
    // const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

    // Other state preserved (search, filters, etc.)
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsViewFilters, setItemsViewFilters] = useState<SearchFragment[]>([]);

    // ... later in JSX (replace view switching):
    <Switch>
        <Route path="/" component={AllItemsView} />
        <Route path="/items" component={AllItemsView} />
        <Route path="/tags" component={AllTagsView} />
        <Route path="/search" component={SearchResultsView} />
        <Route path="/items/:itemId" component={ItemDetailView} />
        <Route path="/tags/:tagId" component={ItemsByTagView} />
        <Route component={NotFoundView} />
    </Switch>
};
```

**Key Changes**:
- ❌ Remove `currentView` state (URL is source of truth now)
- ❌ Remove `selectedItemId` state (URL params replace this)
- ❌ Remove `selectedTagId` state (URL params replace this)
- ✅ Keep search/filter state (not in URL per spec)
- ✅ Wrap views in `<Switch>` with `<Route>` components

---

### Step 3: Update Navigation Buttons

**Before** (onClick sets state):
```typescript
<Nav direction="row" gap="small">
    <Button
        icon={<Apps />}
        label="Items"
        onClick={() => setCurrentView('items')}
        primary={currentView === 'items'}
    />
    <Button
        icon={<TagIcon />}
        label="Tags"
        onClick={() => setCurrentView('tags')}
        primary={currentView === 'tags'}
    />
    <Button
        icon={<SearchIcon />}
        label="Search"
        onClick={() => setCurrentView('search')}
        primary={currentView === 'search'}
    />
</Nav>
```

**After** (Link components):
```typescript
import { Link, useLocation } from 'wouter';

<Nav direction="row" gap="small">
    <Link href="/items">
        <Button
            icon={<Apps />}
            label="Items"
            primary={location === '/items' || location === '/'}
        />
    </Link>
    <Link href="/tags">
        <Button
            icon={<TagIcon />}
            label="Tags"
            primary={location === '/tags'}
        />
    </Link>
    <Link href="/search">
        <Button
            icon={<SearchIcon />}
            label="Search"
            primary={location === '/search'}
        />
    </Link>
</Nav>
```

**Alternative** (Grommet-specific pattern):
```typescript
// If Grommet Button supports 'as' prop:
<Button
    as={Link}
    href="/tags"
    icon={<TagIcon />}
    label="Tags"
    primary={location === '/tags'}
/>
```

**Key Changes**:
- Replace `onClick={() => setCurrentView(...)}` with `<Link href="...">`
- Replace `currentView === 'tags'` check with `location === '/tags'`
- Add `useLocation` hook to get current location for active state

---

### Step 4: Update View Components to Use Route Params

#### ItemDetailView - Read itemId from URL

**Before** (props passed from parent):
```typescript
interface ItemDetailViewProps {
    itemId: string;
    onClose: () => void;
}

export const ItemDetailView: React.FC<ItemDetailViewProps> = ({ itemId, onClose }) => {
    const item = useTracker(() => {
        return Items.findOne({ _id: itemId });
    }, [itemId]);

    // ...
};
```

**After** (read from URL params):
```typescript
import { useParams, useLocation } from 'wouter';

// No props needed - params come from URL
export const ItemDetailView: React.FC = () => {
    const { itemId } = useParams<{ itemId: string }>();
    const [, setLocation] = useLocation();

    const item = useTracker(() => {
        if (!itemId) return undefined;
        return Items.findOne({ _id: itemId });
    }, [itemId]);

    if (!itemId || !item) {
        return (
            <Box pad="medium">
                <Heading level={2}>Item Not Found</Heading>
                <Button
                    label="Back to Items"
                    onClick={() => setLocation('/items')}
                />
            </Box>
        );
    }

    // Original render logic...
};
```

**Key Changes**:
- Add `useParams<{ itemId: string }>()` to extract itemId from URL
- Add null check (itemId might be undefined on mount)
- Replace `onClose()` callback with `setLocation('/items')`

#### ItemsByTagView - Read tagId from URL

**Before**:
```typescript
interface ItemsByTagViewProps {
    tagId: string;
    onNavigateBack: () => void;
}

export const ItemsByTagView: React.FC<ItemsByTagViewProps> = ({ tagId, onNavigateBack }) => {
    const tag = useTracker(() => Tags.findOne({ _id: tagId }), [tagId]);
    const items = useTracker(() => {
        return Items.find({ tags: tagId }).fetch();
    }, [tagId]);
    // ...
};
```

**After**:
```typescript
import { useParams, useLocation } from 'wouter';

export const ItemsByTagView: React.FC = () => {
    const { tagId } = useParams<{ tagId: string }>();
    const [, setLocation] = useLocation();

    const tag = useTracker(() => {
        if (!tagId) return undefined;
        return Tags.findOne({ _id: tagId });
    }, [tagId]);

    const items = useTracker(() => {
        if (!tagId) return [];
        return Items.find({ tags: tagId }).fetch();
    }, [tagId]);

    if (!tagId || !tag) {
        return (
            <Box pad="medium">
                <Heading level={2}>Tag Not Found</Heading>
                <Button
                    label="Back to Tags"
                    onClick={() => setLocation('/tags')}
                />
            </Box>
        );
    }

    // Original render logic...
};
```

---

### Step 5: Create NotFoundView Component

**New file**: `meteor-app/imports/ui/NotFoundView.tsx`

```typescript
import React, { type ReactElement } from 'react';
import { Box, Heading, Paragraph, Button } from 'grommet';
import { Link } from 'wouter';

export const NotFoundView: React.FC = (): ReactElement => {
    return (
        <Box pad="large" align="center">
            <Heading level={2}>Page Not Found</Heading>
            <Paragraph>
                The page you're looking for doesn't exist.
            </Paragraph>
            <Box direction="row" gap="medium" margin={{ top: 'medium' }}>
                <Link href="/items">
                    <Button label="Go to Items" primary />
                </Link>
                <Link href="/tags">
                    <Button label="Go to Tags" />
                </Link>
            </Box>
        </Box>
    );
};
```

**Import in App.tsx**:
```typescript
import { NotFoundView } from './NotFoundView';
```

---

### Step 6: Update Item Navigation (Click to Detail)

**Before** (sets state):
```typescript
<Box onClick={() => setSelectedItemId(item._id)}>
    <Heading level={3}>{item.name}</Heading>
</Box>
```

**After** (navigates to URL):
```typescript
import { Link } from 'wouter';

<Link href={`/items/${item._id}`}>
    <Box>
        <Heading level={3}>{item.name}</Heading>
    </Box>
</Link>
```

**Alternative** (programmatic navigation):
```typescript
import { useLocation } from 'wouter';

const [, setLocation] = useLocation();

<Box onClick={() => setLocation(`/items/${item._id}`)}>
    <Heading level={3}>{item.name}</Heading>
</Box>
```

---

### Step 7: Update Tag Navigation (Click to Filter)

**Before**:
```typescript
<Box onClick={() => {
    setSelectedTagId(tag._id);
    setCurrentView('itemsByTag');
}}>
    <Text>{tag.name}</Text>
</Box>
```

**After**:
```typescript
import { Link } from 'wouter';

<Link href={`/tags/${tag._id}`}>
    <Box>
        <Text>{tag.name}</Text>
    </Box>
</Link>
```

---

## Testing

### Run E2E Tests

```bash
# From project root
npm run test:e2e:skip-server:headless -- tests/e2e/app/tag-management.spec.ts
```

**Expected**:
- ✅ T012 tests PASS (previously blocked)
- ✅ tagsPage.goto('/tags') navigates correctly
- ✅ Browser back button works
- ✅ Page refresh preserves view

### Manual Testing Checklist

- [ ] Navigate to http://localhost:3000 → shows Items view
- [ ] Click Tags button → URL changes to /tags, shows Tags view
- [ ] Click browser back → returns to Items view
- [ ] Click browser forward → returns to Tags view
- [ ] Click an item → URL changes to /items/:itemId, shows item detail
- [ ] Refresh page on item detail → same item still displays
- [ ] Type invalid URL /admin → shows Not Found view
- [ ] Bookmark /tags → opening bookmark shows Tags view

### Performance Validation

```typescript
// Measure URL update time
const startTime = performance.now();
setLocation('/tags');
// URL should update within 100ms (success criteria SC-007)
```

---

## Common Patterns

### Pattern 1: Navigate After Action

**Use Case**: Redirect after creating item

```typescript
import { useLocation } from 'wouter';

const [, setLocation] = useLocation();

const handleCreateItem = async (itemData) => {
    const newItemId = await Meteor.callAsync('items.create', itemData);
    setLocation(`/items/${newItemId}`); // Navigate to new item
};
```

### Pattern 2: Navigate with State

**Use Case**: Pass temporary state on navigation

```typescript
// NOT SUPPORTED in MVP - URL query params needed
// Future: setLocation('/search?q=camping')
// For now: State is lost on navigation (acceptable per spec)
```

### Pattern 3: Conditional Rendering Based on Route

```typescript
import { useRoute } from 'wouter';

const [isItemsRoute] = useRoute('/items');
const [isTagsRoute] = useRoute('/tags');

return (
    <Box>
        {isItemsRoute && <FilterBar />}
        {isTagsRoute && <TagHierarchy />}
    </Box>
);
```

### Pattern 4: Get Current Location

```typescript
import { useLocation } from 'wouter';

const [location] = useLocation();

console.log('Current path:', location);
// e.g., "/items" or "/tags/abc123"
```

---

## Troubleshooting

### Issue: "Cannot read property 'itemId' of undefined"

**Cause**: useParams returns undefined on initial mount

**Fix**: Add null check
```typescript
const { itemId } = useParams<{ itemId: string }>();
if (!itemId) {
    return <NotFound />;
}
```

### Issue: Navigation buttons don't update active state

**Cause**: Not using useLocation to track current route

**Fix**: Add useLocation hook
```typescript
const [location] = useLocation();
<Button primary={location === '/tags'} />
```

### Issue: E2E tests still fail after routing added

**Cause**: Tests might be clicking too fast (race condition)

**Fix**: Add wait for navigation
```typescript
await page.click('a[href="/tags"]');
await page.waitForURL('**/tags');
```

### Issue: Page refresh shows blank screen

**Cause**: Meteor server not configured for client-side routing

**Fix**: Add wildcard route in Meteor (if needed)
```javascript
// In meteor-app/server/main.ts (if using SSR)
// Not needed for standard Meteor - all routes serve same HTML
```

### Issue: TypeScript error "Type 'string | undefined' not assignable"

**Cause**: Route params are optional (might be undefined)

**Fix**: Use TypeScript optional chaining
```typescript
const { itemId } = useParams<{ itemId: string }>();
const item = Items.findOne({ _id: itemId });
// Type error: itemId might be undefined

// Fixed:
if (!itemId) return <NotFound />;
const item = Items.findOne({ _id: itemId }); // itemId is definitely string here
```

---

## Migration Checklist

### Phase 1: Setup (1-2 hours)
- [ ] Install wouter: `npm install wouter@^3.0.0`
- [ ] Verify installation: `npm list wouter`
- [ ] Read this quickstart guide

### Phase 2: App.tsx Changes (3-4 hours)
- [ ] Import `Route, Switch` from wouter
- [ ] Remove `currentView` state
- [ ] Remove `selectedItemId` state
- [ ] Remove `selectedTagId` state
- [ ] Replace view conditionals with `<Switch>` and `<Route>` components
- [ ] Add NotFoundView catchall route
- [ ] Update navigation buttons to use `<Link>`
- [ ] Update active state to use `useLocation`

### Phase 3: View Component Updates (2-3 hours)
- [ ] ItemDetailView: Add `useParams` hook
- [ ] ItemDetailView: Add null check for itemId
- [ ] ItemDetailView: Replace onClose with `setLocation('/items')`
- [ ] ItemsByTagView: Add `useParams` hook
- [ ] ItemsByTagView: Add null check for tagId
- [ ] ItemsByTagView: Replace onNavigateBack with `setLocation('/tags')`
- [ ] Create NotFoundView component

### Phase 4: Testing & Validation (1-2 hours)
- [ ] Run E2E tests: `npm run test:e2e:skip-server:headless`
- [ ] Verify T012 tests pass
- [ ] Test browser back button manually
- [ ] Test browser forward button manually
- [ ] Test page refresh at each route
- [ ] Test bookmarking/sharing URLs
- [ ] Test invalid routes show NotFound
- [ ] Measure URL update performance (<100ms)

### Phase 5: Cleanup (optional, <1 hour)
- [ ] Remove unused View type definition
- [ ] Remove unused navigation callbacks
- [ ] Update comments/documentation
- [ ] Run `npm run check:type` to verify no type errors
- [ ] Run `npm run check:code-style` to verify formatting

---

## Reference

### Wouter API

```typescript
// Navigation
import { Route, Switch, Link, useLocation, useParams, useRoute } from 'wouter';

// Basic route
<Route path="/tags" component={AllTagsView} />

// Parameterized route
<Route path="/items/:itemId" component={ItemDetailView} />

// Switch (renders first match)
<Switch>
  <Route path="/items" component={AllItemsView} />
  <Route component={NotFoundView} />
</Switch>

// Link component
<Link href="/tags">Click me</Link>

// Get current location
const [location, setLocation] = useLocation();
// location: string (e.g., "/items")
// setLocation: (path: string) => void

// Get route params
const { itemId } = useParams<{ itemId: string }>();
// itemId: string | undefined

// Check if route matches
const [isMatch, params] = useRoute('/items/:itemId');
// isMatch: boolean
// params: { itemId: string } | null
```

### TypeScript Types

```typescript
// Route component props (none passed by router)
interface ViewComponent extends React.FC {}

// Route params
interface ItemParams {
  itemId: string;
}

interface TagParams {
  tagId: string;
}

// Usage
const { itemId } = useParams<ItemParams>();
// itemId: string | undefined (always check for undefined!)
```

---

## Next Steps

After routing is implemented:
1. ✅ T012 integration tests should pass
2. ✅ All tag-management E2E tests should pass
3. ✅ Browser back/forward buttons work
4. ✅ URLs are bookmarkable/shareable

**Future Enhancements** (out of MVP scope):
- Add search query to URL: `/search?q=camping`
- Add filters to URL: `/items?container=true`
- Add scroll position restoration
- Add route transition animations

---

## Support

**Documentation**:
- Wouter README: https://github.com/molefrog/wouter
- TypeScript examples: https://github.com/molefrog/wouter/tree/main/examples
- This quickstart: `specs/003-url-routing/quickstart.md`

**Issues**:
- Check research.md for library evaluation
- Check data-model.md for route definitions
- Check contracts/routes.yaml for route specifications

**Questions**:
- Review constitution.md for code standards
- Review .github/copilot-instructions.md for project patterns
