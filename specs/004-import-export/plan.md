# Implementation Plan: Inventory Import & Export

**Branch**: `build-import-export-feature` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-import-export/spec.md`

## Summary

Add export and import for the full inventory (items + tags + container hierarchy) in two formats: a native JSON envelope with round-trip parity, and an Under My Roof-compatible CSV. The implementation is layered: pure parser/serializer modules → server methods with a dry-run preview → a Settings page UI at `/settings/data` → end-to-end Playwright coverage. The feature is purely additive; no existing collections or APIs change.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node 20 (Meteor 3), React 18+
**Primary Dependencies**: Meteor 3, React 18, Grommet UI, Wouter (from spec 003), **`papaparse` (new — for RFC-4180 CSV parsing)**
**Storage**: MongoDB (existing collections `items` and `tags` — no schema changes; container items already use `isContainer: true` + `containerId`)
**Testing**: Mocha + Chai + Sinon for unit tests, Playwright for E2E
**Target Platform**: Web browsers (export downloads via `Blob` + `<a download>`; uploads via standard `<input type="file">`)
**Project Type**: Web application (Meteor monorepo — see root `AGENTS.md` for the split between root Playwright config and `meteor-app/`)
**Performance Goals**: 1000-item export completes in < 2s on server; 200-row UMR import preview completes in < 1s
**Constraints**: Zero breaking changes to existing collections / methods / UI; TypeScript strict + ESLint clean; `import type` for type-only imports; absolute `/imports/...` imports only
**Scale/Scope**: ~135-row UMR sample is the proof point; v1 targets inventories ≤ 5000 items (single-pass, in-memory)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Type Safety & Strict Typing ✅
- **Status**: PASS
- **Validation**: All new modules expose typed entry points (`ParsedRow`, `ExportRow`, `ImportReport`, `NormalizedRow`). `papaparse` ships its own `@types/papaparse`.
- **Action**: Wave 1B / 1C add explicit return types; no `any` allowed.

### Test-Driven Development ✅
- **Status**: PASS
- **Validation**: Every Wave 1 module ships with a `*.test.ts` next to it. Wave 4I is the cross-cutting E2E.
- **Action**: Verifier agents block each wave on test/lint/typecheck before the next starts.

### User Experience Consistency ✅
- **Status**: PASS
- **Validation**: Settings page reuses `TouchButton`, `LoadingSpinner`, and Grommet primitives. ≥ 44×44px touch targets per spec 001.
- **Action**: Wave 3H mirrors layout of existing form-driven views (e.g. `ItemForm`).

### Performance Requirements ✅
- **Status**: PASS
- **Validation**: Import is single-pass with batched in-memory caches for tag/container resolvers (no N+1). Dry-run never writes.
- **Action**: Wave 2G measures preview latency on the UMR fixture.

### Code Documentation & Maintainability ✅
- **Status**: PASS
- **Validation**: This `specs/004-import-export/` tree documents schema, mapping rules, and verification commands.
- **Action**: Quickstart includes both UI flow and direct Meteor.callAsync examples.

## Project Structure

### Documentation (this feature)

```
specs/004-import-export/
├── plan.md                        # This file
├── spec.md                        # Feature spec (user stories, FRs, success criteria)
├── data-model.md                  # Field mapping, sentinels, dedup rules
├── tasks.md                       # Mirror of workspace Spec task list
├── quickstart.md                  # Developer guide — UI + Meteor method usage
├── contracts/
│   ├── csv-schema.md              # UMR CSV column order, parsing rules
│   └── json-schema.md             # Native JSON envelope shape
└── fixtures/
    └── under-my-roof-sample.csv   # 135-row UMR export, canonical test fixture
```

### Source Code (repository root)

```
meteor-app/
├── imports/
│   ├── model/
│   │   └── importExport/                       # NEW — pure modules, no Meteor deps
│   │       ├── csv.ts                          # NEW — parseCsv / stringifyCsv (Wave 1B)
│   │       ├── csv.test.ts                     # NEW (Wave 1B)
│   │       ├── json.ts                         # NEW — serializeJson / parseJson (Wave 1C)
│   │       ├── json.test.ts                    # NEW (Wave 1C)
│   │       ├── sentinels.ts                    # NEW — UMR sentinel helpers (Wave 1B)
│   │       ├── sentinels.test.ts               # NEW (Wave 1B)
│   │       ├── dedup.ts                        # NEW — classify() comparator (Wave 1E)
│   │       └── dedup.test.ts                   # NEW (Wave 1E)
│   ├── api/
│   │   └── importExport/                       # NEW — server-side methods
│   │       ├── pathResolvers.ts                # NEW — tag + container resolvers (Wave 1D)
│   │       ├── pathResolvers.test.ts           # NEW (Wave 1D)
│   │       ├── export.ts                       # NEW — Meteor methods (Wave 2F)
│   │       ├── export.test.ts                  # NEW (Wave 2F)
│   │       ├── import.ts                       # NEW — Meteor methods + dry-run (Wave 2G)
│   │       └── import.test.ts                  # NEW (Wave 2G)
│   └── ui/
│       ├── App.tsx                             # MODIFIED — add /settings/data route
│       ├── SettingsDataView.tsx                # NEW (Wave 3H)
│       └── SettingsDataView.stories.tsx        # NEW (Wave 3H)
├── package.json                                # MODIFIED — add papaparse + @types/papaparse
└── tsconfig.json                               # UNCHANGED

tests/
└── e2e/
    └── import-export.spec.js                   # NEW (Wave 4I)
```

**Structure Decision**: Pure-function modules live under `meteor-app/imports/model/importExport/` so they can be unit-tested without Meteor stubs and re-used from any layer. Server-only logic (collection access, Meteor methods, path resolvers that read collections) lives under `meteor-app/imports/api/importExport/`. The UI is one new component plus one new route registration in `App.tsx`. This mirrors the layering already established in `meteor-app/imports/api/items.ts` and `meteor-app/imports/model/InventoryItem.ts`.

## Complexity Tracking

*No constitutional violations.*

The only new dependency is `papaparse` (a single well-maintained RFC-4180 CSV parser). No new collections, no schema migration, no new routing library. All work is additive on the `build-import-export-feature` branch and can be rolled back by reverting the branch.

---

## Phase 0: Research

**Output**: Decisions captured inline in spec / data-model / contracts (no separate `research.md` for this feature — the design space is small and the canonical UMR format is the only foreign format under consideration).

**Key Decisions**:

| Question | Decision | Rationale |
|----------|----------|-----------|
| CSV parser | `papaparse` | RFC-4180-compliant, handles quoted fields with embedded commas and quotes, BOM, streaming-capable. MIT licensed. |
| JSON envelope version | `1` | Start at 1; bump only on breaking shape changes |
| Tag-group representation | Root tags `Category` and `Collection` with children below | Reuses existing `TagRecord.parentTagId` + `path` model; no schema change |
| Container path separator | `→` (UTF-8 right-arrow) | Matches UMR's own export format and is already used in our test fixtures |
| Date interpretation | `M/D/YY` years 00-49 → 20xx, 50-99 → 19xx | Matches common spreadsheet defaults; documented in `contracts/csv-schema.md` |
| Money representation | Cents as positive integer (`123456` = `$1,234.56`) | Already the convention in `PropertyValues.purchasePrice` |
| Heir / Quantity handling | Drop non-default values, emit warning | Per workspace Spec assumptions; reserved for the future custom-properties feature |
| Conflict policy | always-create-new with exact-duplicate skip + strict-superset merge shortcuts | Per workspace Spec assumptions |

---

## Phase 1: Design

**Outputs**:
- `data-model.md` — field-by-field UMR ↔ existing model mapping, sentinel rules, tag-group conventions, dedup rules
- `contracts/csv-schema.md` — column order, sentinel values, type parsing rules
- `contracts/json-schema.md` — envelope shape, version policy, round-trip guarantees
- `quickstart.md` — UI walkthrough plus Meteor method examples
- `tasks.md` — mirror of the workspace Spec task list, by wave

**Key Design Decisions**:

### Module API surface

```ts
// model/importExport/csv.ts
export function parseCsv(text: string): ParsedRow[];
export function stringifyCsv(rows: ExportRow[], opts?: { umrCompat?: boolean }): string;

// model/importExport/json.ts
export function serializeJson(state: { items: InventoryItem[]; tags: TagRecord[] }): string;
export function parseJson(text: string): { version: 1; exportedAt: string; items: InventoryItem[]; tags: TagRecord[] };

// model/importExport/sentinels.ts
export const UMR_SENTINELS: { unspecified: '(unspecified)'; uncategorized: '(uncategorized)'; uncollected: '(uncollected)'; unassigned: '(unassigned)' };
export function fromSentinel(value: string | undefined): string | undefined;
export function toSentinel(value: string | undefined, kind: keyof typeof UMR_SENTINELS): string;

// model/importExport/dedup.ts
export function classify(candidate: NormalizedRow, existingMatches: InventoryItem[]): ClassifyResult;

// api/importExport/pathResolvers.ts (server)
export async function resolveContainerPath(path: string, opts: { autoCreate: boolean; separator?: string }): Promise<string | undefined>;
export async function resolveTagByName(name: string, opts: { groupName?: string; autoCreate: boolean }): Promise<string>;
export async function resolveTagList(names: string[], opts: { autoCreate: boolean }): Promise<string[]>;

// api/importExport/export.ts and import.ts (server) — exposed as Meteor methods
// inventory.export.json(): Promise<string>
// inventory.export.csv(opts?: { umrCompat?: boolean }): Promise<string>
// inventory.import.json(payload: string, opts: { dryRun: boolean }): Promise<ImportReport>
// inventory.import.csv(payload: string, opts: { dryRun: boolean; umrCompat?: boolean }): Promise<ImportReport>
```

### Round-trip guarantee

JSON: byte-faithful for `createdAt`, `modifiedAt`, `tagIds`, `containerId`, and every `properties.*` field. Re-importing a freshly-exported file produces 100% exact-duplicates (see `data-model.md` § "Dedup rules" and `tasks.md` Wave 2G test list).

CSV: UMR-compatible columns only. Round-trip from this app's data back to itself via CSV is **lossy** — it preserves only the 15 UMR columns + the Tags column. Items with no Category/Collection tag round-trip as empty (sentinel-cleared).

### Error model

- **Hard errors** abort the import (no writes in non-dry-run after the first hard error). Hard errors include: malformed CSV / JSON, unknown JSON `version`, missing required column, name field empty or > 500 chars.
- **Warnings** are logged but the row is still imported (or skipped per dedup). Warnings include: dropped `Heir` / `Quantity`, dropped row with no name, sentinel collisions, unparseable date (treated as missing).

---

## Constitution Check (Post-Design) ✅ RE-VALIDATED

All five gates still pass after Phase 1 design. The introduction of `papaparse` is the only new dependency; bundle impact is on the server (export/import methods) and not the client.

---

## Summary

**Decision**: Layered pure-function modules → server methods → Settings page → E2E test
**Impact**: ~10 new files in `meteor-app/`, 1 new dependency (`papaparse`), 1 new route (`/settings/data`), zero existing-file edits except `App.tsx` (route add) and `package.json` (dep add)
**Unblocks**: Future custom-properties feature (Heir/Quantity warnings already plumbed); migration from UMR for users with existing inventories

**Files Created in This Wave (1A)**:
- ✅ `spec.md`
- ✅ `plan.md`
- ✅ `data-model.md`
- ✅ `contracts/csv-schema.md`
- ✅ `contracts/json-schema.md`
- ✅ `tasks.md`
- ✅ `quickstart.md`
- ✅ `fixtures/under-my-roof-sample.csv` (135 rows, copied from the conversation attachment)

**Next Step**: Wave 1B–1E implementor agents pick up the pure modules in parallel; Wave 2 follows after the Verifier agent signs off.

