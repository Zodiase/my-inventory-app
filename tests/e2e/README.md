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
