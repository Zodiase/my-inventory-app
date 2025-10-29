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

## Notes

-   All stories automatically wrapped in Grommet theme provider (iOS-style)
-   Webpack configured to resolve Meteor's `/imports` absolute paths
-   TypeScript errors in config files about missing modules are expected (VS Code limitation) but don't affect runtime
-   **Always format your story files with Prettier before committing**: Run `npx prettier --write <file>` or use the project's Prettier script
