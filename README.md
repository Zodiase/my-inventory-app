# My Inventory App

A Meteor 3 application for managing inventory items and tags.

## Development

Install dependencies (Meteor manages most server/client deps):

```bash
meteor npm install
```

Start the app with throwaway local Meteor data:

```bash
npm run start:throwaway
```

The app will be available at http://localhost:3000/.

Start the app with personal data from `NAS_MONGO_URL` in `.env`:

```bash
npm run start:personal
```

E2E tests treat local Meteor Mongo as disposable and may reset it. The test reset endpoint only runs when Playwright starts Meteor with `E2E_RESET_DATABASE=1` and refuses non-test Mongo URLs.

## Features

### Design System

The app uses a lightweight design language for touch-friendly inventory workflows. See [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) for product feel, shared tokens, component standards, and the feature design requirements template.

### URL Routing

The app uses client-side URL routing (via [Wouter](https://github.com/molefrog/wouter)) for navigation:

- **`/` or `/items`** - Items list view (root level)
- **`/items/:itemId`** - Individual item detail view
- **`/tags`** - Tag management view
- **`/tags/:tagId`** - Items filtered by specific tag
- **`/search`** - Search results view

Features:

- ✅ Browser back/forward buttons work
- ✅ Bookmarkable and shareable URLs
- ✅ Direct URL navigation
- ✅ Page refresh maintains view state

## Testing

This project uses a **two-phase E2E testing strategy** to ensure reliable test coverage:

### Two-Phase Testing Strategy

**Phase 1: Component Tests (Storybook)**

- Test UI components in isolation using Storybook
- Faster execution, clearer failure messages
- Validates interaction patterns before full integration

**Phase 2: Integration Tests (Full App)**

- Port proven patterns to full Meteor app E2E tests
- Verifies end-to-end functionality with backend
- Uses same page objects as component tests

### Running Tests

```bash
# Run Storybook component tests (fast, isolated)
npm run test:e2e:storybook

# Run full app integration tests (complete E2E)
npm run test:e2e:app

# Run all E2E tests
npm run test:e2e:all

# Run the local route audit sweep
npm run test:e2e:audit

# Run unit tests
npm test
npm run test-app
```

### Prerequisites

Before running E2E tests, ensure:

1. **Storybook is running**: `npm run storybook` (for component tests)
2. **Meteor app is running**: `npm start` (for integration tests)

### Quick Reference

- **Component Tests**: Located in `tests/e2e/storybook/`
- **Integration Tests**: Located in `tests/e2e/app/`
- **Local Route Audit**: `npm run test:e2e:audit` writes ignored screenshots and reports under `tests/e2e/audit/artifacts/`
- **Page Objects**: Shared helpers in `tests/e2e/helpers/page-objects.ts`
- **Test Patterns**: Documented in `specs/002-storybook-e2e-testing/test-patterns.md`

For detailed testing guidance, see [Testing Quickstart Guide](specs/002-storybook-e2e-testing/quickstart.md)

## Code Quality

Check code formatting, linting, and types:

```bash
npm run check:code-style    # Prettier + ESLint
npm run check:type          # TypeScript compilation
```

To reproduce CI quality checks from a clean generated-Meteor state while preserving the local dev database:

```bash
npm run check:ci:fresh
```

For a categorized list of npm scripts and when to use them, see [`docs/NPM_SCRIPTS.md`](docs/NPM_SCRIPTS.md).

### Current Status

- ✅ **TypeScript**: Clean compilation (0 errors)
- ✅ **Prettier**: All files formatted correctly
- ✅ **Tests**: 18 passing unit tests
- ⚠️ **ESLint**: 46 issues from strict `eslint-config-love` rules (see docs/DEVELOPMENT_NOTES.md)

The ESLint issues are mostly stylistic (magic numbers, strict typing) and don't affect functionality.

## Known Issues

See `docs/KNOWN_ISSUES.md` for a list of currently known non-blocking issues (e.g. expected deprecation warnings from upstream dependencies).

## Development Notes

See `docs/DEVELOPMENT_NOTES.md` for technical context on the Meteor 3 upgrade, CI/runtime environment choices, lint fixes, and Docker image adjustments.

## License

Private project.
