# Implementation Plan: Touch-Friendly Inventory Management with Comprehensive Testing

**Branch**: `001-touch-friendly-inventory` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-touch-friendly-inventory/spec.md`

**Note**: This plan has been updated to include comprehensive Storybook component testing and Playwright end-to-end testing to ensure AI assistants can verify functionality during development.

## Summary

Build a touch-optimized web-based inventory management system for household use on iOS devices (iPad/iPhone) with hierarchical item organization, tag-based collections, and comprehensive testing infrastructure. The system supports nested locations, flexible tagging, detailed item properties, photo/document attachments, and full data backup/restore capabilities. All features must be validated through Storybook component stories (demonstrating all UI states) and Playwright E2E tests (covering all acceptance criteria) to enable AI-assisted development with automated verification.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20+ (via Meteor 3)
**Primary Dependencies**:
- **Runtime**: Meteor 3 (full-stack framework with MongoDB integration and reactive data)
- **UI Framework**: React 18+ with Hooks
- **Component Library**: Grommet (touch-friendly UI components)
- **Styling**: styled-components
- **Database**: MongoDB 6+ (bundled with Meteor)
- **File Storage**: GridFS (MongoDB) for photos and PDFs
- **Image Processing**: sharp (server-side thumbnail generation and EXIF correction)

**Testing Stack**:
- **Unit/Integration**: Mocha + Chai + Sinon (Meteor standard)
- **Component Testing**: Storybook 7+ (for isolated component development and visual testing)
- **E2E Testing**: Playwright (for automated browser testing covering all acceptance criteria)
- **Test Coverage**: Each UI component MUST have Storybook stories demonstrating all states
- **Test Coverage**: Each user story MUST have Playwright tests verifying all acceptance scenarios

**Storage**: MongoDB with collections for Items, Tags, Attachments. GridFS for file storage (photos/PDFs up to 20MB each)

**Target Platform**: Web application accessed via Safari/Chrome on iOS 15+ (iPad and iPhone). Optimized for touch interaction. Runs on local network server (Node.js on Linux/macOS/Windows)

**Project Type**: Full-stack web application (Meteor monolith with client and server code)

**Performance Goals**:
- UI response time <500ms for all interactions on local network
- Tag search filtering 1000+ items in <1 second
- Photo thumbnail load <1 second
- Support location hierarchies 5+ levels deep without degradation

**Constraints**:
- Touch targets minimum 44×44 pixels (iOS HIG compliance)
- File uploads limited to 20MB per file
- Assumes stable local network (<10ms latency)
- No authentication required (LAN access control sufficient)
- No offline support required

**Scale/Scope**:
- Expected inventory: 100-1000 items with 10-50 tags
- Concurrent users: 1-2 (single household)
- Location depth: typically 2-5 levels
- Attachments per item: typically <20 photos, <10 PDFs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I - Type Safety & Strict Typing**: ✅ PASS
- TypeScript strict mode enforced
- ESLint config-love provides strict typing rules
- No `any` types without justification required

**Principle II - Test-Driven Development**: ✅ PASS (ENHANCED WITH STORYBOOK + PLAYWRIGHT)
- Unit tests: Mocha + Chai + Sinon for business logic
- **NEW: Component tests**: Storybook stories for every UI component demonstrating all states
- **NEW: E2E tests**: Playwright tests for every user story covering all acceptance criteria
- This ensures AI assistants can run tests and verify functionality during development

**Principle III - User Experience Consistency**: ✅ PASS
- styled-components + Grommet for consistent UI
- React functional components with hooks
- Touch-optimized interactions (44×44px targets, gestures, feedback)

**Principle IV - Performance Requirements**: ✅ PASS
- MongoDB indexes for efficient queries
- Optimistic locking via `strictSelector` for updates
- Photo thumbnail generation for fast mobile loading
- Denormalized tag paths for efficient hierarchical queries

**Principle V - Code Documentation & Maintainability**: ✅ PASS
- JSDoc for complex utilities (e.g., `strictSelector`, `getTagPath`)
- Meteor absolute imports required (`/imports/...`)
- Comments explaining business logic intent

**Testing Requirements (Extended)**:
- All UI components MUST have Storybook stories showing:
  - Default state
  - Loading state
  - Error state
  - Edge cases (empty data, max data, etc.)
  - Interactive states (hover, focus, disabled)
- All user stories MUST have Playwright E2E tests covering:
  - All acceptance scenarios from spec
  - Happy path flows
  - Error handling
  - Touch interactions
  - Mobile viewport testing (iPad and iPhone sizes)

**No Constitutional Violations**: This project fully adheres to all principles with enhanced testing infrastructure.

## Project Structure

### Documentation (this feature)

```
specs/001-touch-friendly-inventory/
├── plan.md              # This file (implementation plan with testing strategy)
├── research.md          # Technology decisions and best practices
├── data-model.md        # Entity definitions and relationships
├── quickstart.md        # Development workflow and test execution guide
├── contracts/           # API contracts (Meteor Methods)
│   └── meteor-methods.md
├── tasks.md             # Actionable task breakdown
└── checklists/          # Quality validation checklists
```

### Source Code (Meteor monolith structure)

```
meteor-app/
├── client/
│   ├── main.html        # Root HTML template
│   ├── main.tsx         # Client entry point
│   └── main.css         # Global styles
├── server/
│   ├── main.ts          # Server entry point, database indexes
│   ├── gridfs.ts        # GridFS file storage setup
│   └── imageProcessing.ts  # Photo thumbnail generation, EXIF correction
├── imports/
│   ├── model/           # TypeScript interfaces and types
│   │   ├── CollectionItem.ts
│   │   ├── InventoryItem.ts
│   │   ├── TagRecord.ts
│   │   ├── Attachment.ts
│   │   ├── PropertyValues.ts
│   │   └── SearchFragment.ts
│   ├── api/             # Meteor Methods and Publications
│   │   ├── items.ts     # CRUD operations for items
│   │   ├── tags.ts      # CRUD operations for tags
│   │   └── attachments.ts  # File upload/download operations
│   ├── ui/              # React components (all with Storybook stories)
│   │   ├── App.tsx
│   │   ├── ItemForm.tsx
│   │   ├── ItemDetailView.tsx
│   │   ├── BreadcrumbTrail.tsx
│   │   ├── ContainerSelector.tsx
│   │   ├── TagSelector.tsx
│   │   ├── AllItemsView.tsx
│   │   ├── AllTagsView.tsx
│   │   ├── ItemsByTagView.tsx
│   │   └── *.stories.tsx    # Storybook stories for each component
│   └── utility/         # Helper functions
│       ├── circularReference.ts
│       ├── searchQuery.ts
│       └── reactMeteorData.ts
├── tests/
│   └── main.ts          # Unit test entry point
├── .storybook/          # Storybook configuration
│   ├── main.ts
│   └── preview.ts
└── package.json

tests/                   # E2E tests (repository root)
├── e2e/
│   ├── app-smoke.spec.ts           # Basic app loading
│   ├── item-creation.spec.ts       # User Story 1 tests
│   ├── items-and-tags.spec.ts      # User Story 2 tests
│   ├── search-and-filter.spec.ts   # User Story 3 tests (when implemented)
│   ├── item-management.spec.ts     # User Story 4 tests (when implemented)
│   ├── touch-interaction.spec.ts   # User Story 5 tests (when implemented)
│   └── attachments.spec.ts         # User Story 6 tests (when implemented)
└── playwright.config.js
```

**Structure Decision**: Meteor monolith structure chosen because:
1. Single deployment unit for local network server
2. Meteor provides integrated client/server code sharing
3. Reactive data flow built-in (MongoDB → Server → Client)
4. TypeScript absolute imports work seamlessly in Meteor
5. Storybook runs separately for component development
6. Playwright runs externally for full E2E testing

## Complexity Tracking

*No constitutional violations - this section left empty per template instructions.*

## Testing Strategy (Storybook + Playwright)

### Component Testing with Storybook

**Purpose**: Enable isolated component development, visual testing, and comprehensive state coverage for AI-assisted development.

**Requirements**:
- Every UI component in `meteor-app/imports/ui/` MUST have a corresponding `.stories.tsx` file
- Each story file MUST demonstrate all component states:
  - Default/initial state
  - Loading state (where applicable)
  - Error state (where applicable)
  - Empty data state (no items, no tags, etc.)
  - Populated data state (with realistic mock data)
  - Edge cases (max length text, many items, etc.)
  - Interactive states (hover, focus, disabled, active)

**Benefits for AI Development**:
- AI can generate stories alongside components
- Visual regression testing possible
- Component isolation ensures testability
- Documentation of component API and usage
- Quick iteration without running full app

**Storybook Configuration**:
- Located in `meteor-app/.storybook/`
- Configured to work with Meteor's absolute imports
- Supports TypeScript and styled-components
- Run with `npm run storybook` from `meteor-app/`

**Example Story Structure**:
```typescript
// ItemForm.stories.tsx
export default {
  title: 'Components/ItemForm',
  component: ItemForm,
};

export const Empty = () => <ItemForm onSubmit={action('submit')} />;
export const EditMode = () => <ItemForm item={mockItem} onSubmit={action('submit')} />;
export const WithValidationErrors = () => <ItemForm errors={mockErrors} onSubmit={action('submit')} />;
export const Loading = () => <ItemForm isLoading={true} onSubmit={action('submit')} />;
```

### End-to-End Testing with Playwright

**Purpose**: Verify all user stories and acceptance criteria work correctly in a real browser environment.

**Requirements**:
- Each user story MUST have a dedicated test file in `tests/e2e/`
- Each acceptance scenario from spec MUST have a corresponding test case
- Tests MUST run on mobile viewports (iPad and iPhone sizes)
- Tests MUST verify touch interactions where applicable
- Tests MUST cover both happy paths and error cases

**Benefits for AI Development**:
- AI can run tests after making changes to verify functionality
- Automated verification of acceptance criteria
- Catch regressions immediately
- Provide confidence before commits
- Document expected behavior through executable tests

**Playwright Configuration**:
- Located in `playwright.config.js` at repository root
- Configured for:
  - Chromium (primary), Firefox, and WebKit browsers
  - Mobile viewport emulation (iPad and iPhone)
  - Video recording on failure
  - Screenshots on failure
  - Parallel test execution
- Base URL: `http://localhost:3000` (Meteor dev server)

**Test Organization**:
- `app-smoke.spec.ts`: Basic app loading and navigation
- `item-creation.spec.ts`: User Story 1 (Create and Organize Items)
- `items-and-tags.spec.ts`: User Story 2 (Tag Items for Cross-Location Collections)
- `search-and-filter.spec.ts`: User Story 3 (Global Search and Context Filtering)
- `item-management.spec.ts`: User Story 4 (Manage and Delete Items and Tags)
- `touch-interaction.spec.ts`: User Story 5 (Touch-Optimized Navigation)
- `attachments.spec.ts`: User Story 6 (Item Properties and Attachments)

**Example Test Structure**:
```typescript
// item-creation.spec.ts
test.describe('User Story 1 - Create and Organize Items', () => {
  test('should create a new item', async ({ page }) => {
    await page.goto('/');
    await page.click('button:text("Add Item")');
    await page.fill('input[name="name"]', 'Test Item');
    await page.click('button:text("Save")');
    await expect(page.locator('text=Test Item')).toBeVisible();
  });

  test('should nest item under location', async ({ page }) => {
    // Test acceptance scenario 3
  });
});
```

**Running Tests**:
- Unit tests: `npm test` (from `meteor-app/`)
- Storybook: `npm run storybook` (from `meteor-app/`)
- E2E tests: `npm run test:e2e` (from repository root, requires running Meteor server)
- E2E tests (headless): `npm run test:e2e:headless` (CI/CD friendly)

### AI Development Workflow

1. **Implement feature** → Write unit tests for business logic
2. **Create UI component** → Write Storybook stories showing all states
3. **Implement user story** → Write Playwright E2E tests covering acceptance criteria
4. **Run all tests** → Verify everything passes before committing
5. **AI can verify** → Run tests after any code changes to ensure no regressions

This comprehensive testing approach ensures that AI assistants (like Copilot) can confidently make changes and verify that the application still functions correctly without manual testing.
