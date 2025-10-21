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
  "@types/mime-types": "^2.1.0"
}
```

### Meteor Packages
- Consider `ostrio:files` for GridFS if custom implementation too complex
- Otherwise, use native MongoDB GridFSBucket API

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
