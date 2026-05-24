# E2E Test Organization

This directory contains end-to-end tests for the inventory app using Playwright. Tests are organized by testing context and dependencies.

## Directory Structure

```
tests/e2e/
├── app/              # Integration tests (full app)
├── storybook/        # Component tests (Storybook isolation)
└── helpers/          # Shared utilities (page objects, factories, helpers)
```

## Where to Put Test Files

### `app/` - Full Application Integration Tests

**When to use**: Testing features that require the complete application with backend (Meteor + MongoDB).

**Characteristics**:

- Requires Meteor server running (`npm run dev` in meteor-app/)
- Tests real database operations
- Tests Meteor method calls
- Tests full user workflows
- Tests integration between components

**Examples**:

- `item-creation.spec.ts` - Creating items through the UI with database persistence
- `tag-management.spec.ts` - Managing tags with parent/child relationships
- `search-and-filter.spec.ts` - Searching and filtering with real data

**Playwright Config**: Uses `chromium` project with `baseURL: http://localhost:3000`

### `storybook/` - Component Isolation Tests

**When to use**: Testing individual components in isolation before integrating them.

**Characteristics**:

- Requires Storybook running (`npm run storybook` in meteor-app/)
- No backend/database required
- Tests component rendering and behavior
- Tests component props and states
- Validates selectors and interaction patterns
- **Include helper validation tests** - Tests for helper utilities that require Storybook

**Examples**:

- `ItemForm.spec.ts` - Testing ItemForm component in isolation
- `storybook-helpers.spec.ts` - Validating the `gotoStory()` helper function

**Playwright Config**: Uses `storybook-chromium` project with `baseURL: http://localhost:6006`

**Why helper tests go here**: Helper functions like `gotoStory()` depend on Storybook running, so their tests belong in the `storybook/` directory even though they're testing helper utilities.

### `helpers/` - Shared Test Utilities

**When to use**: Code that is used by multiple tests but is not itself a test.

**Characteristics**:

- **No `.spec.ts` files** - This directory contains utilities, not tests
- Page objects (e.g., `ItemFormPage`, `InventoryPage`)
- Test data factories (e.g., `createTestItem()`)
- Helper functions (e.g., `gotoStory()`)
- Shared selectors and constants

**Examples**:

- `page-objects.ts` - Page object classes for common UI components
- `factories.ts` - Functions to generate test data
- `storybook-helpers.ts` - Utilities for navigating Storybook stories

**Important**: If a helper needs testing (like `storybook-helpers.ts`), the test file goes in `storybook/` or `app/` depending on dependencies, NOT in `helpers/`.

## Testing Strategy: Storybook-First Approach

1. **Component Tests First** (`storybook/`)
    - Validate components work in isolation
    - Prove selectors and interactions work
    - Achieve 100% pass rate before integration

2. **Integration Tests Second** (`app/`)
    - Port proven patterns from component tests
    - Test full workflows with backend
    - Debug integration layer issues

This two-phase approach helps isolate failures:

- If component test passes but integration test fails → integration layer issue
- If component test fails → component or selector issue

## Running Tests

```bash
# Component tests (Storybook must be running)
npm run test:e2e:skip-server:headless -- tests/e2e/storybook/ --project=storybook-chromium

# Integration tests (Meteor must be running)
npm run test:e2e:skip-server:headless -- tests/e2e/app/ --project=chromium

# Specific test file
npm run test:e2e:skip-server:headless -- tests/e2e/storybook/ItemForm.spec.ts --project=storybook-chromium

# Interactive debugging
npm run test:e2e:skip-server:ui
```

## File Naming Conventions

- Test files: `*.spec.ts` (e.g., `ItemForm.spec.ts`, `item-creation.spec.ts`)
- Helper files: `*.ts` (e.g., `page-objects.ts`, `storybook-helpers.ts`)
- Helper test files: Match the helper name (e.g., `storybook-helpers.spec.ts` tests `storybook-helpers.ts`)

## Key Principles

1. **Context-Agnostic Page Objects** - Page objects in `helpers/` should work in both Storybook and full app contexts
2. **No Tests in `helpers/`** - Test files (`.spec.ts`) only go in `app/` or `storybook/`
3. **Helper Tests by Dependency** - If a helper requires Storybook, its tests go in `storybook/`. If it requires the full app, tests go in `app/`
4. **DRY (Don't Repeat Yourself)** - Share common code via `helpers/`, don't duplicate page objects or factories


## App-Mode E2E Test Authoring Guide

This section documents the patterns for writing app-mode Playwright tests (testing the full Meteor application) to ensure consistency and prevent context-loss when writing new specs.

### 1. Helpers

- **Location**: `tests/e2e/helpers/database.ts`
- **Usage**:
  - `waitForMeteorReady(page)`: Ensures Meteor DDP connection is fully established before running assertions.
  - `resetDatabase(page)`: Calls a dev-only HTTP endpoint (`/api/test/reset-database`) to wipe the database. Use this before each test to ensure a clean slate.

### 2. Page Objects

- **Location**: `tests/e2e/helpers/page-objects.ts`
- **Usage**: We use context-agnostic page objects like `InventoryPage` and `ItemFormPage` that work in both isolated Storybook and full-app environments.
- **When to Extend vs Create New**: Extend existing page objects when interacting with forms, lists, or tags that they already cover. Create a new page object if you are building an entirely new feature area. Note: Do not use `getByLabel` for Grommet inputs; use `input[name="..."]` instead.

### 3. Standard `beforeEach`

Every app-mode test uses a standard goto/wait/reset pattern in its `beforeEach` block to ensure test isolation:

```typescript
test.beforeEach(async ({ page }) => {
    // Navigate to app and wait for Meteor to be ready
    await page.goto('/');
    await waitForMeteorReady(page);

    // Reset database before each test for isolation
    await resetDatabase(page);
});
```

### 4. Server-Side Test Helpers

- **Location**: `meteor-app/server/test-helpers.ts`
- **Usage**: Provides dev-only capabilities to manipulate the backend during tests.
  - `test.resetDatabase`: A Meteor method to reset all collections.
  - `POST /api/test/reset-database`: An HTTP endpoint for Playwright to easily reset the DB without needing a client-side Meteor connection.

### 5. File Uploads

Use Playwright's `setInputFiles` on the actual `<input type="file">`:

```typescript
const filePath = path.resolve(__dirname, 'fixture.csv');
await page.locator('input[type="file"]').setInputFiles(filePath);
```

### 6. Download Capture

Capture the `download` event and handle the file via Playwright:

```typescript
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download JSON' }).click();
const download = await downloadPromise;

// Verify suggested name
expect(download.suggestedFilename()).toMatch(/^inventory-.*\.json$/);

// Save to disk if needed
const jsonPath = path.resolve(__dirname, 'temp-download.json');
await download.saveAs(jsonPath);
```

### 7. Minimal Annotated Example

A minimal, copy-pasteable ~30-line "hello world" app-mode test (`tests/e2e/app/my-feature.spec.ts`):

```typescript
import { test, expect } from '@playwright/test';
import { InventoryPage, ItemFormPage } from '../helpers/page-objects';
import { waitForMeteorReady, resetDatabase } from '../helpers/database';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
});

test.describe('My Feature Integration', () => {
    test('should create an item and display it', async ({ page }) => {
        const inventoryPage = new InventoryPage(page);
        const itemForm = new ItemFormPage(page);

        await inventoryPage.goto();
        await inventoryPage.clickCreateItem();

        // Wait for modal visibility
        await expect(page.getByRole('heading', { name: /create.*item/i })).toBeVisible();

        // Use context-agnostic helpers (Grommet-safe)
        await itemForm.fillName('Test Item');
        await itemForm.submit();

        // Assert modal closed and item exists
        await expect(page.getByRole('heading', { name: /create.*item/i })).not.toBeVisible();
        await inventoryPage.expectItemInList('Test Item');
    });
});
```

### 8. What NOT to do

- ❌ **Do not iterate to green in one agent turn**: A previous agent building the Wave 4 import/export tests encountered a streaming failure because it tried to repeatedly debug and iterate complex UI flows in a single long session. Instead, write a focused test, run it, observe the output, and iteratively expand.
- ❌ **Do not use `isBackground: true`**: When using terminal tools, `isBackground: true` processes will be killed when another command is run. Use `nohup` instead (detailed in `docs/TESTING_GUIDE.md`).
- ❌ **Do not try to parallelize app-mode tests**: App-mode tests share the same Meteor database instance and depend on global `resetDatabase` calls. Running them in parallel will cause unpredictable failures. Playwright workers default to `1`.