# Feature Specification: Inventory Import & Export

**Feature Branch**: `build-import-export-feature`
**Created**: 2026-05-24
**Status**: Draft
**Input**: User description: "Build import/export feature. Export the full inventory (items + tags + container hierarchy) to JSON or CSV. Import from either format, including Under My Roof's CSV exports, without losing fidelity."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export Inventory (Priority: P1)

Users can download the entire inventory — items, tags, and container hierarchy — as a single file in either native JSON or UMR-compatible CSV format. This protects against data loss and supports migration into or out of other inventory tools.

**Why this priority**: Export with zero loss is the baseline for any "your data is yours" promise. Without it, every later import path is unverifiable (no way to compare before/after). It also lets the developer hand-inspect what a clean dataset looks like before building import.

**Independent Test**: From the Settings page, click "Download JSON" → file downloads. Open the file → see `version`, `exportedAt`, all items, all tags. Click "Download CSV" → file downloads with UMR column order.

**Acceptance Scenarios**:

1. **Given** the inventory has N items and M tags, **When** the user clicks "Download JSON", **Then** a file `inventory-YYYYMMDD.json` downloads containing all N items and M tags with every field (including `createdAt`, `modifiedAt`, `containerId`, `tagIds`, all `properties.*`)
2. **Given** the inventory has items with container parents, **When** the user clicks "Download CSV", **Then** the `Location` column for each item shows the resolved container path joined with `→` (e.g. `Bedroom 2 → XH Bedroom`)
3. **Given** an item has tags under the Category tag-group, **When** CSV export runs, **Then** the Category column shows the child name (not the path), and the tag does NOT appear in the Tags column
4. **Given** an item has no Category or Collection tag, **When** CSV export runs, **Then** the corresponding columns show UMR sentinels (`(uncategorized)`, `(uncollected)`, etc.)
5. **Given** the user re-imports a freshly-exported JSON file, **When** the import completes, **Then** every row is classified as exact-duplicate and zero records are written (round-trip is a true no-op)

---

### User Story 2 - Import Under My Roof CSV (Priority: P2)

Users with an existing inventory in Under My Roof can upload its CSV export and have all items, tags, and locations created in this app with correct grouping. Sentinels are translated to empty values; Category and Collection become tag groups.

**Why this priority**: This is the migration path that justifies building the feature in the first place. UMR's CSV is the canonical foreign format. Once this works, importing any other CSV is a matter of column-mapping convention.

**Independent Test**: Upload `specs/004-import-export/fixtures/under-my-roof-sample.csv` via Settings → Preview shows ~135 items to create, expected category counts, no errors → Confirm → All items appear in the items list, "Apple products" tag exists under the Collection group, "Garage → Workbench" container hierarchy exists.

**Acceptance Scenarios**:

1. **Given** a valid UMR CSV with N rows, **When** the user previews the import, **Then** the preview shows: # to create, # exact-duplicate skips, # superset-merges, # warnings — with no rows written yet
2. **Given** a row has `Category = "Electronics"`, **When** the import runs, **Then** a `Category` root tag exists (created if needed), an `Electronics` tag exists with `parentTagId` pointing to Category, and the item's `tagIds` includes the Electronics tag id
3. **Given** a row has `Location = "Garage → Workbench"`, **When** the import runs, **Then** a `Garage` container item exists with `isContainer: true`, a `Workbench` container item exists with `containerId` pointing to Garage, and the imported item's `containerId` points to Workbench
4. **Given** a row has `Heir = "John"` or `Quantity = "2"`, **When** the import runs, **Then** the values are dropped and a warning is added to the report (e.g. `Row 42 'Apple TV': dropped Heir=John, Quantity=2`)
5. **Given** a row has `Category = "(uncategorized)"`, `Location = "(unspecified)"`, `Heir = "(unassigned)"`, **When** the import runs, **Then** the item is created with no Category tag, no container, and no warning (sentinels treated as empty)
6. **Given** a row has `Tags = "LiPo, Perhaps Return This"`, **When** the import runs, **Then** two free-form tags `LiPo` and `Perhaps Return This` are created (or reused) at the root level and added to the item's `tagIds`

---

### User Story 3 - Import Native JSON Round-trip (Priority: P3)

Users can re-import a previously-exported JSON file and end up with byte-identical inventory state (no duplicate items, original `createdAt` preserved). This supports backup/restore and instance migration.

**Why this priority**: Round-trip parity is what proves export and import are complementary. Without it the JSON export is just a one-way data dump.

**Independent Test**: Export inventory to JSON → re-import the same JSON → preview reports 100% exact-duplicates, 0 writes → confirm → no DB change.

**Acceptance Scenarios**:

1. **Given** a JSON payload with item `createdAt = 2017-11-02T10:00:00Z`, **When** the user imports it into an empty DB, **Then** the stored record has `createdAt = 2017-11-02T10:00:00Z` (NOT `new Date()`)
2. **Given** a JSON payload exported from this app, **When** the user re-imports it into the same DB, **Then** every row classifies as exact-duplicate and zero writes occur
3. **Given** a JSON payload with `version: 2` (unknown), **When** the user attempts to import, **Then** the import aborts with a clear error message and no writes occur
4. **Given** a JSON payload with extra unknown fields on items, **When** the user imports it, **Then** the import succeeds and unknown fields are silently ignored (forward-compat)

---

### User Story 4 - Settings UI for Import/Export (Priority: P4)

Users reach the import/export feature from a single, discoverable Settings page at `/settings/data`. Export is one click. Import is a guided 3-step flow: pick a file → see preview → confirm.

**Why this priority**: The UI is the only way most users will touch this feature. Without it, import/export is developer-only via Meteor methods.

**Independent Test**: Navigate to `/settings/data` → see Export card (JSON, CSV buttons) and Import card (file picker). Pick a CSV → click Preview → counts appear → click Import N items → success message.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** they navigate to `/settings/data`, **Then** the Settings page renders with Export and Import cards
2. **Given** the user picks a file, **When** the file extension is `.csv`, **Then** the form is configured for CSV mode; **When** it is `.json`, **Then** it is configured for JSON mode
3. **Given** the user clicks "Preview", **When** the dry-run finishes, **Then** counts and warnings are shown, and the "Import N items" button becomes enabled
4. **Given** the user clicks "Import N items" after a preview, **When** the import succeeds, **Then** a success message displays with the actual number of inserted/merged/skipped records
5. **Given** the import fails mid-flight, **When** the error returns, **Then** the error message is shown and partial-state risk is documented (or rolled back, per Wave 2G)

---

### Edge Cases

- **Embedded commas in names**: UMR row `"NEIKO ... | SAE | 1/4\" to 3/8\""` contains both commas and embedded quotes → parser must handle RFC-4180 quoting
- **Empty Tags column**: trailing comma in CSV row → parser yields empty Tags array, not `[""]`
- **Tag column with multiple values**: `"LiPo, Perhaps Return This"` (row 109) → split on `,`, trim, two tags created
- **Emoji collection names**: Row 11 (`One Fast Cat Wheel`) has `Collection = "🍙"` → preserved as-is, no normalization
- **Date `M/D/YY` with year ≥ 50**: `7/15/15` → 2015 (not 1915). Rule: years 00-49 → 20xx, years 50-99 → 19xx (document explicitly)
- **Price with thousands separator**: `$104,273.10` → 10427310 cents (parser strips `$` and `,` before parsing)
- **Missing price**: empty Price column → `properties.purchasePrice` is `undefined`, NOT 0
- **Duplicate names with same make/model but different serials**: Multiple "Bambu Lab AMS" rows in fixture → each becomes a separate item (create-new), surfaced in `info` as a likely-related-items group
- **Items with `Make = "Apple"` and no Model**: Some rows have no Model — that's fine, `properties.model` is undefined
- **Container path with single segment**: `Location = "Kitchen"` → one container `Kitchen` with no parent
- **Same container path used by multiple rows**: container resolver is idempotent within and across rows

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST export inventory state as a native JSON envelope `{ version, exportedAt, items, tags }` with byte-faithful round-trip of `createdAt` / `modifiedAt`
- **FR-002**: System MUST export inventory state as UMR-compatible CSV with the exact column order specified in `contracts/csv-schema.md`
- **FR-003**: CSV export MUST emit UMR sentinels (`(unspecified)`, `(uncategorized)`, `(uncollected)`, `(unassigned)`) for missing values when `umrCompat=true`
- **FR-004**: System MUST import CSV (UMR format) and create items, tags, and container items
- **FR-005**: System MUST import native JSON and create items + tags
- **FR-006**: Import MUST support a `dryRun: true` mode that returns a preview report without writing
- **FR-007**: Import MUST classify each row as `exact-duplicate`, `superset-merge`, or `create-new` using rules in `data-model.md`
- **FR-008**: Import MUST preserve source `createdAt` / `modifiedAt` from JSON; for CSV, generate `createdAt = now + rowIndex ms`
- **FR-009**: Import MUST treat UMR sentinels as empty / undefined values
- **FR-010**: Import MUST auto-create root tags `Category` and `Collection` (when needed) and add per-row Category/Collection values as their children
- **FR-011**: Import MUST resolve UMR `Location` strings (split on `→`) into a chain of container items, auto-creating missing intermediates
- **FR-012**: Import MUST drop non-default `Heir` / `Quantity` values and add a warning per dropped value
- **FR-013**: Import MUST parse UMR dates in `M/D/YY` format with years 00-49 → 20xx and 50-99 → 19xx
- **FR-014**: Import MUST parse UMR prices like `$1,234.56` into cents (`123456`), stripping `$` and `,`
- **FR-015**: System MUST expose `/settings/data` route showing Export buttons (JSON, CSV) and Import card (file picker → preview → confirm)
- **FR-016**: System MUST trigger a browser file download from the Settings page with filename `inventory-YYYYMMDD.{json,csv}`
- **FR-017**: System MUST NOT export attachments (binary blobs are out of scope for v1)
- **FR-018**: Re-importing a freshly-exported JSON file MUST report 100% exact-duplicates and write zero records
- **FR-019**: System MUST maintain TypeScript strict typing on all new modules and methods

### Key Entities

- **Inventory Export Envelope** (JSON): see `contracts/json-schema.md`. Fields: `version: 1`, `exportedAt: ISO string`, `items: InventoryItem[]`, `tags: TagRecord[]`
- **CSV Row** (UMR-compatible): see `contracts/csv-schema.md`. 15 columns in fixed order: Name, Make, Model, Serial Number, Category, Location, Collection, Condition, Heir, Purchased From, Purchase Date, Quantity, Price, Value, Tags
- **Import Report**: `{ toCreate, exactDuplicates, supersetMerges, warnings: string[], errors: string[], info: string[], samplePreview: Array<{ action, name, ... }> }` — see `tasks.md` Wave 2G
- **Normalized Row**: intermediate shape produced by the parser; consumed by the dedup classifier. See `data-model.md`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A freshly-exported JSON file re-imports as 100% exact-duplicates with zero writes (round-trip no-op)
- **SC-002**: The attached UMR sample CSV (`fixtures/under-my-roof-sample.csv`, ~135 rows) imports without errors and produces ≥ 130 items
- **SC-003**: After UMR import, ≥ 10 distinct Category tags exist under the `Category` root tag
- **SC-004**: After UMR import, every container path in the sample (e.g. `Garage → Workbench`) resolves to a chain of container items
- **SC-005**: All new pure-function modules (CSV, JSON, dedup) have ≥ 90% line coverage
- **SC-006**: `cd meteor-app && npm run check:type` and `npm run check:code-style` pass clean
- **SC-007**: At least one Playwright E2E test exports then re-imports an inventory created via the UI
- **SC-008**: Settings page renders at `/settings/data` and download/upload flows work in Chromium

## Assumptions *(optional)*

- `Category` and `Collection` columns map to dedicated **tag groups**: root tags named `Category` and `Collection`. Imported values become children of those roots. Roots are auto-created on first import.
- UMR sentinels (`(unspecified)`, `(uncategorized)`, `(uncollected)`, `(unassigned)`) are treated as empty on import. Export writes them when `umrCompat=true` for parity.
- `Condition` stays free-text. UMR's enum-ish values (`Excellent`, `Fair`, `Good`, `Sold`, `Unopened`, etc.) import as-is into `properties.condition`.
- **Conflict policy**: always-create-new by default. Two shortcut classifications: exact-duplicate → skip, imported strict-superset of existing → merge into existing.
- **Comparable fields** for dedup: `createdAt` (when source provides it — only JSON), `name`, `properties.make`, `properties.model`, `properties.serialNumber`, `properties.purchaseDate`. Matching `createdAt` is a strong identity signal.
- **Timestamp policy on insert**: JSON preserves source timestamps exactly. CSV (or JSON missing timestamps) generates `createdAt = now + rowIndex ms` so batch siblings stay distinguishable.
- `Heir` and `Quantity` are NOT added to `PropertyValues`. Non-default values become warnings and are dropped; the future custom-properties feature will own them.
- The Settings UI uses the existing Wouter routing from spec `003-url-routing/` — no new routing library.
- File parsing happens on the **server** via Meteor methods; the client uploads the raw text and renders the report.

## Out of Scope

- Attachments (binary blobs)
- Custom-property editing UI (the field exists in the data model but the import drops `Heir` / `Quantity`)
- Cross-instance migration ID remapping — every imported item always gets a fresh `_id`
- Streaming uploads for files > 10 MB (initial implementation reads the whole payload into memory)
- Drag-drop file upload in the UI (file input is enough for v1)
- "Merge whole inventory" import mode beyond per-row dedup policy


## Supported platforms

Desktop only (viewport >= 768px). Mobile users see a fallback view directing them to use a computer. Rationale: filesystem UX on mobile browsers is too limited for reliable import/export.

The `<DesktopOnly>` pattern is available as a reusable component for future desktop-only features, establishing a documented project convention for managing viewport-restricted functionality.

## Dependencies

- **Spec 003 (URL routing)**: provides the Wouter routing primitives used by `/settings/data`
- **Existing model layer**: `InventoryItem`, `TagRecord`, `CollectionItem`, `PropertyValues`, `ItemConstants` — unchanged
- **Existing API layer**: `items.ts` and `tags.ts` — server methods consumed for dedup lookups and insertion
- **New dependency**: `papaparse` (and `@types/papaparse`) — RFC-4180 CSV parser added to `meteor-app/package.json` (see Wave 1B)

## References

- Existing data model: `meteor-app/imports/model/{InventoryItem,TagRecord,PropertyValues,CollectionItem,ItemConstants}.ts`
- Existing item API: `meteor-app/imports/api/items.ts`
- Routing primitives: `specs/003-url-routing/quickstart.md`
- UMR sample CSV: `specs/004-import-export/fixtures/under-my-roof-sample.csv` (135 rows)
- Workspace planning note: [Spec](intent://local/note/spec)
- Companion docs: [plan.md](./plan.md), [data-model.md](./data-model.md), [contracts/csv-schema.md](./contracts/csv-schema.md), [contracts/json-schema.md](./contracts/json-schema.md), [tasks.md](./tasks.md), [quickstart.md](./quickstart.md)

