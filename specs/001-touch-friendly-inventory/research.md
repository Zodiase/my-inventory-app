# Research: Touch-Friendly Inventory Management

**Feature**: 001-touch-friendly-inventory | **Date**: 2025-10-20
**Purpose**: Resolve technical unknowns and establish best practices for implementation

## Research Tasks Completed

All technical context items were pre-clarified:
- ✅ Language/Version: TypeScript with Meteor 3
- ✅ Dependencies: React 18+, MongoDB 6+, Grommet, styled-components
- ✅ Storage: MongoDB + GridFS
- ✅ Testing: Mocha + Chai + Sinon
- ✅ Performance/Constraints: Defined in spec
- ✅ Scale: 100-1000 items, local network deployment

## Key Technical Decisions

### 1. File Storage: GridFS vs Filesystem

**Decision**: Use MongoDB GridFS for attachment storage

**Rationale**:
- **Unified backup/restore**: Files and metadata export together via MongoDB dump
- **Transactional consistency**: File operations participate in MongoDB transactions
- **Simpler deployment**: No separate file system management or permissions
- **Network efficiency**: GridFS chunks large files automatically
- **Meteor integration**: Native GridFS support via `ostrio:files` or custom implementation

**Alternatives Considered**:
- **Filesystem storage**: Rejected because backup/restore would require separate file copying logic, complicating the "single bundle" export requirement (FR-071 to FR-078). Also introduces deployment complexity for file permissions and paths.

**Implementation Notes**:
- Use 256KB chunk size (GridFS default) for 20MB limit
- Store metadata in `attachments` collection with GridFS file ID reference
- Generate thumbnails on upload, store as separate GridFS entries (~300px width)

---

### 2. Image Processing: Client vs Server

**Decision**: Server-side image processing for thumbnails and EXIF orientation

**Rationale**:
- **Consistent results**: Server processing ensures all clients see corrected orientation
- **Performance**: Offload heavy image manipulation from mobile devices
- **Quality control**: Server can enforce consistent thumbnail dimensions and quality
- **Security**: Validate file types and sizes server-side before storage

**Alternatives Considered**:
- **Client-side processing**: Rejected because iOS Safari has inconsistent Canvas API support for EXIF, and processing on iPad/iPhone drains battery. Also can't enforce quality standards.

**Implementation Notes**:
- Use `sharp` library for Node.js image processing (fast, memory-efficient)
- Process pipeline: validate → rotate per EXIF → resize thumbnail → save both to GridFS
- Handle EXIF Orientation tags 1-8 with proper rotation/flip transformations
- HEIC support via `sharp` with `heif-convert` if needed

---

### 3. Search Query Architecture: UI State Management

**Decision**: Search query fragments as typed objects with unique field/operation combinations

**Rationale**:
- **Type safety**: Query fragments are strongly typed, preventing runtime errors
- **UI prevention of conflicts**: Each fragment represents unique field+operation (prevents "include tag A" and "exclude tag A" simultaneously)
- **Composable**: Fragments combine with AND logic, easy to serialize for URL params
- **Testable**: Pure functions transform fragments to MongoDB queries

**Alternatives Considered**:
- **String-based query DSL**: Rejected because requires parsing, error-prone, not type-safe
- **Allow conflicting criteria**: Rejected to avoid confusing UX (empty results)

**Implementation Notes**:
```typescript
type SearchFragment =
  | { type: 'name', value: string }
  | { type: 'includeTags', tagIds: string[] }
  | { type: 'excludeTags', tagIds: string[] }
  | { type: 'containerType', pattern: string }
  | { type: 'property', field: PropertyField, value: string }

// UI enforces uniqueness by fragment type
// MongoDB query builder combines with $and
```

---

### 4. Export/Import Format: Data Structure

**Decision**: ZIP bundle with versioned JSON schema + attachment files

**Rationale**:
- **Single file**: User downloads one .zip file, easy to manage
- **Version tolerance**: JSON schema includes `version` field, supports forward/backward compat
- **Human-readable**: JSON is inspectable, debuggable
- **Standard format**: ZIP is universal, no custom binary format

**Alternatives Considered**:
- **JSON only (base64 attachments)**: Rejected because 20MB photos would create massive JSON files (4/3 size increase), difficult to inspect/edit
- **Custom binary format**: Rejected due to complexity and poor debuggability

**Implementation Notes**:
```javascript
// Bundle structure:
inventory-backup-2025-10-20.zip
├── manifest.json          // Version, export date, counts
├── data.json             // Items, tags, properties (no file data)
└── attachments/
    ├── item-123-photo-1.jpg
    ├── item-123-receipt.pdf
    └── ...
```

Schema version: `1.0.0` (semantic versioning)
- Import validates version, warns on major version mismatch
- Unknown properties in JSON generate warnings but don't fail import

---

### 5. Touch Gesture Patterns: iOS Conventions

**Decision**: Follow iOS Human Interface Guidelines for all gestures

**Rationale**:
- **Familiar**: Users already know iOS patterns from native apps
- **Accessible**: 44x44px targets meet iOS accessibility standards
- **Predictable**: Standard gestures (tap, long-press, swipe, drag-drop)

**Grommet Touch Support**:
- Button components default to accessible tap targets
- Use `onLongPress` for context menus (via react-native-web patterns)
- Drag-and-drop via HTML5 Drag API with touch polyfill

**Implementation Notes**:
- All interactive elements: min 44x44px (FR-063)
- Long-press 500ms threshold for context menus
- Swipe gestures for navigation (breadcrumb trails)
- Pull-to-refresh via Grommet `InfiniteScroll` pattern

---

### 6. Reactive Data Patterns: Minimizing Re-renders

**Decision**: Use `useTracker` with specific field projections and computed selectors

**Rationale**:
- **Performance**: Only subscribe to fields actually displayed
- **Predictable re-renders**: Explicit dependencies in useTracker
- **Meteor patterns**: Follows Meteor best practices for reactive data

**Implementation Notes**:
```typescript
// Good: specific fields, memoized computation
const item = useTracker(() => {
  return Items.findOne(itemId, {
    fields: { name: 1, description: 1, tags: 1 }
  });
}, [itemId]);

// Avoid: full document, causes re-render on any field change
const item = useTracker(() => Items.findOne(itemId), [itemId]);
```

Use `useMemo` for derived state (e.g., filtered lists, computed properties)

---

### 7. Property Field Types: Validation Strategy

**Decision**: Optional fields with client + server validation, stored as nullable

**Rationale**:
- **Flexibility**: Users can fill in fields as needed
- **Clean UI**: Hide-empty behavior (FR-039) keeps display uncluttered
- **Type safety**: Each property has specific type (string, Date, number)

**Field Definitions**:
```typescript
interface PropertyValues {
  serialNumber?: string;        // freeform text
  make?: string;                // freeform text
  model?: string;               // freeform text
  purchaseDate?: Date;          // date picker
  purchaseFrom?: string;        // freeform text
  purchasePrice?: number;       // currency (USD, no symbol stored)
  marketValue?: number;         // currency
  warranty?: string;            // freeform text/markdown
  condition?: string;           // freeform text/markdown (notes)
}
```

Validation:
- Dates: ISO 8601 strings, validated with `Date` constructor
- Currency: Positive numbers, 2 decimal places, stored as cents (multiply by 100)
- Text fields: Max 1000 chars each

---

### 8. Optimistic Locking: Preventing Race Conditions

**Decision**: Use existing `strictSelector` pattern for all updates

**Rationale**:
- **Already established**: Pattern exists in codebase (`/imports/utility/strictSelector.ts`)
- **Race condition prevention**: Multi-field selector ensures update only succeeds if item unchanged
- **Explicit conflicts**: Returns affected count, can detect and handle conflicts

**Implementation Notes**:
```typescript
// Always include identifying fields beyond _id
const selector = strictSelector(item, ['_id', 'name', 'modifiedAt']);
const result = Items.update(selector, { $set: updates });

if (result === 0) {
  throw new Error('Item was modified by another user');
}
```

Apply to: item updates, tag assignments, attachment reordering, property changes

---

## Best Practices Summary

### MongoDB Query Patterns
- ✅ Always use `fields` projection to limit transferred data
- ✅ Use indexes on frequently queried fields: `tags`, `containerId`, `name`
- ✅ Use `limit` on multi-document queries to prevent full scans
- ✅ Denormalize tag paths for efficient hierarchy queries (existing pattern)

### Meteor Methods Pattern
- ✅ Export via `asMeteorMethods` (existing utility)
- ✅ Validate inputs with typed schemas
- ✅ Use `strictSelector` for updates
- ✅ Return meaningful results (affected count, created ID, etc.)

### React Component Patterns
- ✅ Functional components only (no classes)
- ✅ `useTracker` for Meteor reactive data
- ✅ `useMemo` for expensive computations
- ✅ `useCallback` for event handlers passed to children
- ✅ Styled-components for all styling (no inline styles)

### Testing Strategy
- ✅ Unit tests: Pure functions, utilities, data transformations
- ✅ Integration tests: Meteor Methods, collection operations
- ✅ Mock Meteor APIs in tests (existing pattern in `*.test.ts` files)
- ✅ Test edge cases from spec (22 documented edge cases)

### Error Handling
- ✅ User-facing errors: Clear messages, actionable guidance
- ✅ Validation errors: Field-level feedback in UI
- ✅ Network errors: Graceful degradation, retry UX
- ✅ File upload errors: Progress indication, cancel support

---

## 6. Testing Infrastructure (Storybook + Playwright)

### Storybook Integration with Meteor

**Decision**: Use Storybook 7+ with custom Webpack configuration for Meteor absolute imports

**Rationale**:
- **Component Isolation**: Develop and test UI components independently without running full Meteor app
- **Visual Documentation**: Stories serve as living documentation of component states and API
- **AI Development**: AI assistants can generate stories alongside components for instant verification
- **State Coverage**: Demonstrate all component states (loading, error, empty, populated, edge cases)
- **Meteor Compatibility**: Custom webpack alias maps `/imports/` to work with Meteor's absolute import convention

**Alternatives Considered**:
- **Jest + React Testing Library only**: Rejected because lacks visual testing and state demonstration valuable for documentation
- **No component testing**: Rejected because AI assistants need isolated component verification
- **Storybook 6**: Rejected due to slower build times and less mature TypeScript support

**Implementation Notes**:
```javascript
// meteor-app/.storybook/main.ts
const config = {
  framework: '@storybook/react-webpack5',
  stories: ['../imports/ui/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-actions'],
  webpackFinal: async (config) => {
    // Map Meteor absolute imports to work in Storybook
    config.resolve.alias = {
      ...config.resolve.alias,
      '/imports': path.resolve(__dirname, '../imports'),
    };
    return config;
  },
};
```

**Story Best Practices**:
- Co-locate stories with components (`ComponentName.stories.tsx`)
- Use `action()` addon for event handler logging
- Create mock data factories for realistic demonstrations
- Cover all states: default, loading, error, empty, populated, edge cases
- Use `args` and `argTypes` for interactive controls
- Export named stories for each state variant

---

### Playwright E2E Testing

**Decision**: Use Playwright with mobile viewport emulation for comprehensive acceptance testing

**Rationale**:
- **Acceptance Verification**: Each user story has dedicated test file verifying all acceptance scenarios
- **Mobile Testing**: Excellent iPad/iPhone viewport emulation for touch UX verification
- **Cross-Browser**: Tests on Chromium, Firefox, WebKit catch compatibility issues
- **AI Confidence**: AI can run E2E tests after changes to verify no regressions
- **Reliability**: Auto-waiting and retry logic reduce flaky tests
- **Debugging**: Screenshot and video capture on failures aid troubleshooting

**Alternatives Considered**:
- **Cypress**: Rejected due to weaker mobile emulation and no cross-browser support (Chromium only)
- **Selenium**: Rejected for complex setup and less reliable auto-waiting
- **Puppeteer**: Rejected because limited to Chromium (no Firefox/WebKit)

**Implementation Notes**:
```typescript
// playwright.config.js
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'iPad', use: { ...devices['iPad Pro'] } },
    { name: 'iPhone', use: { ...devices['iPhone 13'] } },
  ],
});
```

**Test Organization**:
- One test file per user story (e.g., `item-creation.spec.ts` for User Story 1)
- Each acceptance scenario becomes a test case
- Use `test.describe()` to group related tests
- Reset database before each test for isolation

**Test Data Management**:
- Factory functions create consistent, realistic test data
- Database reset via Meteor method before each E2E test
- Deterministic IDs for reliable assertions
- Seed data created via Meteor methods in test setup

**Testing Meteor Reactivity**:
- Use Playwright's `waitForSelector` for reactive UI updates
- Simulate data changes via `page.evaluate(() => Meteor.call(...))`
- Test both optimistic updates and server confirmations
- Verify loading states during async operations

---

### CI/CD Integration

**Decision**: Run tests in parallel GitHub Actions jobs (unit, Storybook build, E2E)

**Rationale**:
- Parallel execution speeds up CI pipeline
- Clear failure isolation per test type
- Storybook build catches story compilation errors
- E2E runs headless for CI environment

**Implementation Notes**:
```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: cd meteor-app && npm test

  storybook-build:
    runs-on: ubuntu-latest
    steps:
      - run: cd meteor-app && npm run build-storybook

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: cd meteor-app && npm start &
      - run: npm run test:e2e:machine
```

---

## Dependencies to Add

### Production Dependencies
```json
{
  "sharp": "^0.33.0",              // Server-side image processing
  "archiver": "^6.0.0",            // ZIP creation for exports
  "unzipper": "^0.11.0",           // ZIP extraction for imports
  "mime-types": "^2.1.35"          // File type validation
}
```

### Dev Dependencies
```json
{
  "@types/archiver": "^6.0.0",
  "@types/unzipper": "^0.11.0",
  "@types/mime-types": "^2.1.0",
  "@storybook/react-webpack5": "^7.0.0",
  "@storybook/addon-essentials": "^7.0.0",
  "@storybook/addon-actions": "^7.0.0",
  "@playwright/test": "^1.40.0"
}
```

### Meteor Packages
- Consider `ostrio:files` for GridFS if custom implementation too complex
- Otherwise, use native MongoDB GridFSBucket API

---

## Testing Strategy Summary

The comprehensive testing approach using Storybook + Playwright enables:

1. **Component Isolation**: Develop UI components independently with all states demonstrated
2. **Visual Documentation**: Stories serve as living component API documentation
3. **Automated Verification**: E2E tests verify all acceptance criteria automatically
4. **AI Development Confidence**: AI assistants can run tests to verify changes work correctly
5. **Regression Prevention**: Comprehensive coverage catches bugs before they reach production
6. **Mobile Testing**: Playwright device emulation properly tests touch-optimized UX

This aligns with Constitution Principle II (Test-Driven Development) and extends it beyond unit tests to include component and end-to-end testing.

---

## Open Questions

**None** - All technical context is clear and decisions are documented above.

---

## Next Steps

Proceed to **Phase 1: Design & Contracts**
- Generate `data-model.md` with entity schemas
- Generate API contracts in `contracts/` directory
- Create `quickstart.md` for developer onboarding
- Update agent context with new dependencies
