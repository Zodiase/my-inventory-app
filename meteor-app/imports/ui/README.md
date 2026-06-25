# UI Components - Routing Patterns

This directory contains React components for the inventory management application, with URL-based routing using Wouter.

## Design System Foundation

-   App-level Grommet theme and shared UI tokens live in `theme.ts`.
-   Prefer Grommet `Button` for standard actions and `TouchButton` when custom pressed-state feedback is needed.
-   `StyledButton` is deprecated and should not be used in new code.

### Remaining Migration Opportunities

-   Move remaining hardcoded colors, radii, and touch-target sizes in `SearchBar`, `SearchResultsView`,
    `SearchFragmentBuilder`, `FilterBar`, `BreadcrumbTrail`, `LongPressContextMenu`, and related stories onto
    `uiTokens`.
-   Replace remaining emoji UI icons in focused component passes. Search-related components were intentionally left
    alone during the design-system foundation cleanup to avoid conflicts with parallel search work.
-   Consider a `styled-components` theme provider bridge once most shared components consume tokens consistently.

## URL Routing Patterns

The application uses **Wouter v3** for client-side routing. All navigation is URL-driven.

### Route Definitions

| Route            | Component         | Parameters       | Description                    |
| ---------------- | ----------------- | ---------------- | ------------------------------ |
| `/`              | AllItemsView      | none             | Default home view (items list) |
| `/items`         | AllItemsView      | none             | Explicit items list view       |
| `/tags`          | AllTagsView       | none             | Tags list view                 |
| `/search`        | SearchResultsView | none             | Search interface               |
| `/items/:itemId` | ItemDetailView    | `itemId: string` | Single item detail view        |
| `/tags/:tagId`   | ItemsByTagView    | `tagId: string`  | Items filtered by tag          |
| `*` (catchall)   | NotFoundView      | none             | 404 error page                 |

### Using Route Parameters

Components that use route parameters should extract them with `useParams`:

```typescript
import { useParams } from 'wouter';

export const ItemDetailView = (): ReactElement => {
    const { itemId } = useParams<{ itemId: string }>();

    // Always validate - params are string | undefined
    if (!itemId) {
        return <ErrorMessage>Invalid item ID</ErrorMessage>;
    }

    // Use itemId to fetch data...
};
```

**Important**: Route parameters are always `string | undefined`. Always check for undefined before using them.

### Navigation Methods

#### 1. Link Components (Preferred)

Use `<Link>` from Wouter to wrap navigation elements:

```typescript
import { Link } from 'wouter';

<Link href="/tags">
    <Button label="Tags" />
</Link>
```

#### 2. Programmatic Navigation

Use `useLocation` hook for navigation after actions (e.g., after creating an item):

```typescript
import { useLocation } from 'wouter';

export const ItemForm = () => {
    const [, setLocation] = useLocation();

    const handleSubmit = async (data) => {
        const newItemId = await createItem(data);
        setLocation(`/items/${newItemId}`); // Navigate to new item
    };
};
```

#### 3. Checking Current Location

Use `useLocation` to get the current path:

```typescript
import { useLocation } from 'wouter';

const [location] = useLocation();
const isActive = location === '/tags';
```

### Error Handling

-   **Invalid routes**: Automatically show NotFoundView component
-   **Invalid IDs**: Components should check if ID exists in database
    -   If not found: Display error message with Link back to list view
-   **Undefined parameters**: Always validate route parameters before use

### State Management

**URL-managed state** (in route):

-   Current view (/, /items, /tags, /search)
-   Selected item ID (/items/:itemId)
-   Selected tag ID (/tags/:tagId)

**Component-local state** (NOT in URL):

-   Search query
-   Filter selections
-   Form input values
-   UI state (modals, dialogs)

### Migration Notes

This app was migrated from state-based navigation (`useState<View>`) to URL-based routing.

**Before**:

```typescript
const [currentView, setCurrentView] = useState<View>('items');
const [selectedItemId, setSelectedItemId] = useState<string>();

// Navigation
<Button onClick={() => setCurrentView('tags')} />
```

**After**:

```typescript
// Navigation state is in URL, not React state
<Link href="/tags">
    <Button />
</Link>
```

### Performance

-   **URL updates**: < 100ms (synchronous)
-   **Page refresh**: < 2s (includes data fetch)
-   **Bundle size**: +2.1 KB gzipped (Wouter library)

### Further Reading

-   Complete implementation guide: `/specs/003-url-routing/quickstart.md`
-   Route contracts: `/specs/003-url-routing/contracts/routes.yaml`
-   Technical decisions: `/specs/003-url-routing/research.md`
-   Wouter documentation: https://github.com/molefrog/wouter
