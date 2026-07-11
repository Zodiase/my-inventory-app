# My Inventory App

A Meteor 3 application for managing inventory items and tags.

## Development

Install the root tooling and Meteor application dependencies from the repository root:

```bash
npm ci
npm ci --prefix meteor-app
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
npm test --prefix meteor-app
```

### Prerequisites

Playwright starts the required Meteor and Storybook servers automatically. Use the `test:e2e:skip-server:*` scripts only when intentionally testing against servers you started yourself.

### Quick Reference

- **Component Tests**: Located in `tests/e2e/storybook/`
- **Integration Tests**: Located in `tests/e2e/app/`
- **Local Route Audit**: `npm run test:e2e:audit` writes ignored screenshots and reports under `tests/e2e/audit/artifacts/`
- **Page Objects**: Shared helpers in `tests/e2e/helpers/page-objects.ts`
- **Test Patterns**: Documented in `specs/002-storybook-e2e-testing/test-patterns.md`

For detailed testing guidance, see [Testing Quickstart Guide](specs/002-storybook-e2e-testing/quickstart.md)

## Code Quality

Run the repository's CI-equivalent quality path:

```bash
npm run check:ci
```

For faster targeted feedback, run `npm run format:check` from the root, or run `npm run check:type` and `npm run check:code-style` from `meteor-app/`.

To reproduce CI quality checks from a clean generated-Meteor state while preserving the local dev database:

```bash
npm run check:ci:fresh
```

For a categorized list of npm scripts and when to use them, see [`docs/NPM_SCRIPTS.md`](docs/NPM_SCRIPTS.md).

Current pass/fail state and test totals belong in command output and GitHub Actions, not in this README. Run the commands above or inspect the latest CI run for live project health.

## Known Issues

See `docs/KNOWN_ISSUES.md` for a list of currently known non-blocking issues (e.g. expected deprecation warnings from upstream dependencies).

## Development Notes

See `docs/DEVELOPMENT_NOTES.md` for technical context on the Meteor 3 upgrade, CI/runtime environment choices, lint fixes, and Docker image adjustments.

## License

Private project.
