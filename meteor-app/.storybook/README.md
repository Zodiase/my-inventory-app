# Storybook Configuration

This directory contains Storybook configuration for the My Inventory App.

## Setup

Storybook is configured to work with:

-   **Meteor's absolute imports**: Paths starting with `/` (e.g., `/imports/ui/ItemForm`)
-   **TypeScript**: Full TypeScript support with type checking
-   **Grommet**: Global Grommet theme provider wraps all stories
-   **styled-components**: Fully supported via babel plugin

## Running Storybook

```bash
npm run storybook
```

Storybook will start on [http://localhost:6006](http://localhost:6006)

## Building Storybook

```bash
npm run build-storybook
```

## Creating Stories

Stories should be placed alongside their components with a `.stories.tsx` extension:

```
meteor-app/imports/ui/
├── ItemForm.tsx
├── ItemForm.stories.tsx
├── BreadcrumbTrail.tsx
└── BreadcrumbTrail.stories.tsx
```

### Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import YourComponent from '/imports/ui/YourComponent';

const meta: Meta<typeof YourComponent> = {
  title: 'UI/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // your props here
  },
};

export const AnotherVariant: Story = {
  args: {
    // different props
  },
};
```

## Configuration Files

-   **main.ts**: Storybook configuration, webpack customization for Meteor imports
-   **preview.tsx**: Global decorators (Grommet theme provider), parameters
-   **README.md**: This file

## Container/Presentation Pattern for Meteor Components

When a component needs Meteor data (via `useTracker`, collections, or methods), use a **folder structure with separated concerns**:

### Why This Pattern?

Storybook runs in a Node/Webpack environment where Meteor modules (`meteor/meteor`, `meteor/mongo`, etc.) don't exist. Webpack tries to bundle all imports at build time, causing "Cannot find module 'meteor/meteor'" errors.

**Solution**: Separate the presentation layer (UI only) from the container layer (Meteor data fetching) into different files so Storybook can import only the presentation component.

### Folder Structure

```
ComponentName/
├── ComponentNamePresentation.tsx  # Pure UI, props-based, no Meteor deps
├── ComponentNameContainer.tsx     # Meteor data fetching with useTracker
└── index.ts                       # Barrel export
```

### Example: AllItemsView

#### 1. Presentation Component (`AllItemsViewPresentation.tsx`)

```typescript
import type { ComponentProps } from 'react';
import type { InventoryItem } from '/imports/model/InventoryItem';  // Types only!

export interface AllItemsViewPresentationProps extends ComponentProps<'div'> {
  items: InventoryItem[];
  containerPath: InventoryItem[];
  onNavigateToContainer: (containerId: string | null) => void;
  onItemClick: (itemId: string) => void;
}

export function AllItemsViewPresentation({
  items,
  containerPath,
  onNavigateToContainer,
  onItemClick,
  ...props
}: AllItemsViewPresentationProps) {
  // Pure UI implementation - no useTracker, no Meteor imports
  return (/* JSX */);
}
```

**Key points:**

-   Import types from `/imports/model/*` (not `/imports/api/*`)
-   Props-based interface for all data and callbacks
-   No Meteor dependencies whatsoever
-   Fully testable in Storybook

#### 2. Container Component (`AllItemsViewContainer.tsx`)

```typescript
import type { ComponentProps } from 'react';
import { InventoryItemsCollection } from '/imports/api/items';
import { useTracker } from '/imports/utility/reactMeteorData';
import { AllItemsViewPresentation } from './AllItemsViewPresentation';

export interface AllItemsViewContainerProps extends ComponentProps<'div'> {
  initialContainerId?: string | null;
  onNavigate?: (containerId: string | null) => void;
}

export function AllItemsViewContainer({
  initialContainerId = null,
  onNavigate,
  ...props
}: AllItemsViewContainerProps) {
  // Meteor data fetching
  const { items, containerPath } = useTracker(() => {
    // Query collections, subscribe to publications, etc.
    return {
      items: InventoryItemsCollection.find(/* ... */).fetch(),
      containerPath: [/* ... */],
    };
  }, [/* deps */]);

  // Pass fetched data to presentation component
  return (
    <AllItemsViewPresentation
      items={items}
      containerPath={containerPath}
      onNavigateToContainer={handleNavigate}
      onItemClick={handleItemClick}
      {...props}
    />
  );
}
```

**Key points:**

-   Uses Meteor-specific imports freely
-   Wraps presentation component with data
-   Manages local state if needed
-   Handles Meteor subscriptions

#### 3. Barrel Export (`index.ts`)

```typescript
export { AllItemsViewPresentation } from './AllItemsViewPresentation';
export type { AllItemsViewPresentationProps } from './AllItemsViewPresentation';
export { AllItemsViewContainer } from './AllItemsViewContainer';
export type { AllItemsViewContainerProps } from './AllItemsViewContainer';

// Default export for convenient imports in Meteor app
export { AllItemsViewContainer as AllItemsView } from './AllItemsViewContainer';
export type { AllItemsViewContainerProps as AllItemsViewProps } from './AllItemsViewContainer';
```

#### 4. Stories File (`ComponentName.stories.tsx`)

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { AllItemsViewPresentation } from '/imports/ui/AllItemsView/AllItemsViewPresentation';

const meta: Meta<typeof AllItemsViewPresentation> = {
  title: 'UI/AllItemsView',
  component: AllItemsViewPresentation,
  // ...
};

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyRoot: Story = {
  args: {
    items: [],
    containerPath: [],
    onNavigateToContainer: () => {},
    onItemClick: () => {},
  },
};
```

**Key points:**

-   Import only the **Presentation** component
-   Never import from `/imports/api/*` in stories
-   Provide mock data for all props
-   Use `fn()` from `@storybook/test` for action callbacks

### When to Use This Pattern

Use folder structure when:

-   ✅ Component uses `useTracker` or Meteor reactive data
-   ✅ Component imports from `/imports/api/*` (collections, methods)
-   ✅ Component uses Meteor-specific APIs

Skip folder structure when:

-   ❌ Component is purely presentational (already props-based)
-   ❌ Component only uses types from `/imports/model/*`
-   ❌ Component has no Meteor dependencies

### Import Guidelines

**For Presentation Components:**

```typescript
import type { InventoryItem } from '/imports/model/InventoryItem';  // ✅ Types only
import { getItemById } from '/imports/api/items';  // ❌ NO! Pulls in Meteor
```

**For Container Components:**

```typescript
import { InventoryItemsCollection } from '/imports/api/items';  // ✅ OK here
import { useTracker } from '/imports/utility/reactMeteorData';  // ✅ OK here
```

**For Stories:**

```typescript
import { ComponentPresentation } from '/imports/ui/Component/ComponentPresentation';  // ✅ Presentation only
import { ComponentContainer } from '/imports/ui/Component';  // ❌ NO! Pulls in Meteor
```

### In the Meteor App

The app imports components normally thanks to barrel exports:

```typescript
// Both work, import the container automatically:
import { AllItemsView } from '/imports/ui/AllItemsView';
import AllItemsView from '/imports/ui/AllItemsView';

// Explicit if you need the presentation component (rare):
import { AllItemsViewPresentation } from '/imports/ui/AllItemsView';
```

## Notes

-   All stories automatically wrapped in Grommet theme provider (iOS-style)
-   Webpack configured to resolve Meteor's `/imports` absolute paths
-   TypeScript errors in config files about missing modules are expected (VS Code limitation) but don't affect runtime
-   **Code formatting**: Stage your changes with `git add`, then run `npx prettier --write $(git diff --cached --name-only --diff-filter=ACM | grep '^meteor-app/')` to format all staged files before committing
