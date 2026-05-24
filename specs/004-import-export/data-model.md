# Data Model: Inventory Import & Export

**Date**: 2026-05-24
**Feature**: Inventory Import & Export
**Context**: No schema changes. Existing collections `items` (`InventoryItem extends CollectionItem`) and `tags` (`TagRecord extends CollectionItem`) carry all import/export data.

## Overview

This feature introduces no new persisted entities. Instead, it defines:

1. **Field mapping rules** between the UMR CSV schema and the existing `InventoryItem` / `TagRecord` / `PropertyValues` types
2. **Sentinel value conventions** that translate UMR's `(unspecified)`, `(uncategorized)`, etc. to/from empty fields
3. **Tag-group conventions** that interpret the CSV `Category` and `Collection` columns as children of dedicated root tags
4. **Container-path conventions** that turn `Location` strings (e.g. `Garage → Workbench`) into chains of container items
5. **Dedup classification rules** used during import to decide create / merge / skip

See the companion docs for the concrete on-the-wire shapes: [contracts/csv-schema.md](./contracts/csv-schema.md) and [contracts/json-schema.md](./contracts/json-schema.md).

---

## Field Mapping: UMR CSV ↔ Existing Model

The table below covers **every** UMR column. The "Disposition" column is one of:

- **Direct** — value maps to a single field
- **Derived (tag)** — value is normalized into a tag under a specific group
- **Derived (container)** — value is normalized into a container item
- **Dropped (warn)** — non-default value is dropped and a warning is added to the import report

| # | UMR Column | Disposition | Target | Parsing / Notes |
|---|---|---|---|---|
| 1 | `Name` | Direct | `InventoryItem.name` (required) | Trim; reject if empty or > 500 chars (`MAX_ITEM_NAME_LENGTH`). |
| 2 | `Make` | Direct | `InventoryItem.properties.make` | Trim; max 200 chars. Empty → undefined. |
| 3 | `Model` | Direct | `InventoryItem.properties.model` | Trim; max 200 chars. Empty → undefined. |
| 4 | `Serial Number` | Direct | `InventoryItem.properties.serialNumber` | Trim; max 500 chars. Empty → undefined. VINs and product codes pass through unchanged. |
| 5 | `Category` | Derived (tag) | `tagIds += [<tag under "Category" group>]` | Sentinel `(uncategorized)` → no tag added. Non-empty value → ensure child tag exists under root `Category` and add its id. |
| 6 | `Location` | Derived (container) | `InventoryItem.containerId` | Sentinel `(unspecified)` → undefined. Non-empty → split on ` → ` (space-arrow-space), traverse/create container chain, set `containerId` to leaf. |
| 7 | `Collection` | Derived (tag) | `tagIds += [<tag under "Collection" group>]` | Sentinel `(uncollected)` → no tag added. Non-empty → ensure child tag exists under root `Collection` and add its id. Emoji-only names (`🍙`) preserved verbatim. |
| 8 | `Condition` | Direct | `InventoryItem.properties.condition` | Free-text. Sentinel `(unspecified)` → undefined. Non-default UMR enum values (`Excellent`, `Fair`, `Good`, `Sold`, `Unopened`, `Not received yet`, etc.) pass through as-is. Max 2000 chars. |
| 9 | `Heir` | Dropped (warn) | (none) | Sentinel `(unassigned)` → no warning. Any other value → drop and add `Row N '<name>': dropped Heir=<value>` to `warnings`. |
| 10 | `Purchased From` | Direct | `InventoryItem.properties.purchaseFrom` | Trim; max 300 chars. Empty → undefined. |
| 11 | `Purchase Date` | Direct | `InventoryItem.properties.purchaseDate` (Date) | Parse `M/D/YY` with year 00-49 → 20xx, 50-99 → 19xx. Unparseable → undefined + warning. |
| 12 | `Quantity` | Dropped (warn) | (none) | Empty or `1` → no warning. Any other integer → drop and add `Row N '<name>': dropped Quantity=<value>` to `warnings`. |
| 13 | `Price` | Direct | `InventoryItem.properties.purchasePrice` (cents) | Strip `$` and `,`, parse as decimal, multiply by 100, round. Empty → undefined. |
| 14 | `Value` | Direct | `InventoryItem.properties.marketValue` (cents) | Same parsing as Price. |
| 15 | `Tags` | Direct | `InventoryItem.tagIds += [<root-level tags>]` | Split on `,`, trim each, drop empty. Each non-empty token becomes a root-level tag (`parentTagId: ''`), auto-created on first use. |

### Fields NOT in UMR CSV but in our model

These are exported in the native JSON envelope and round-tripped exactly. On CSV import they are set to either undefined or computed defaults:

| Model Field | Behavior on CSV Import | Behavior on JSON Import |
|---|---|---|
| `_id` | Generated fresh (Mongo ObjectId) | Generated fresh — source `_id` is NOT preserved (per workspace Spec non-goals: no cross-instance ID remapping). The dedup classifier uses `createdAt` + other comparable fields to detect re-imports, not `_id`. |
| `createdAt` | `now + rowIndex ms` (so batch siblings have distinct sort order) | Source value preserved exactly |
| `modifiedAt` | `now` (current insert time) | Source value preserved exactly |
| `description` | undefined (CSV has no description column) | Source value preserved |
| `isContainer` | `false` (UMR CSV rows are never containers themselves; containers are created on-the-fly from `Location`) | Source value preserved |
| `properties.warranty` | undefined (no UMR column) | Source value preserved |

---

## Sentinel Rules

UMR uses literal text sentinels in place of empty fields. The `sentinels.ts` module exposes:

```ts
export const UMR_SENTINELS = {
  unspecified: '(unspecified)',
  uncategorized: '(uncategorized)',
  uncollected: '(uncollected)',
  unassigned: '(unassigned)',
} as const;

export function fromSentinel(value: string | undefined): string | undefined;
export function toSentinel(value: string | undefined, kind: keyof typeof UMR_SENTINELS): string;
```

### On import

- `fromSentinel(v)` returns `undefined` if `v` matches any sentinel; otherwise returns `v` unchanged.
- Applied **per column** (the table above maps each column to a specific sentinel).
- Whitespace-only values are also treated as empty.

### On export (UMR-compat mode)

- `toSentinel(v, kind)` returns `v` if defined and non-empty; otherwise returns the sentinel string for `kind`.
- Applied to `Category`, `Location`, `Collection`, `Condition`, `Heir`.
- Outside UMR-compat mode (`umrCompat: false`), empty cells are emitted instead of sentinels.

---

## Tag-Group Convention

Two **root tags** carry the UMR Category and Collection semantics:

| Root tag name | `parentTagId` | Purpose |
|---|---|---|
| `Category` | `''` | Parent of every child tag derived from the UMR Category column |
| `Collection` | `''` | Parent of every child tag derived from the UMR Collection column |

### Rules

1. Root tags are auto-created on **first import** that needs them. The name match is **case-sensitive**.
2. A child tag with the given name is created under the appropriate root if it does not already exist. The `path` field is set to `[{ _id: rootId, name: 'Category' }, { _id: childId, name: '<value>' }]`.
3. The Tags column (column 15) produces root-level tags (`parentTagId: ''`). Their names do not conflict with Category/Collection children because root tags can share names with children under different parents (uniqueness in the existing model is per-parent).
4. On CSV export, child tags under `Category` are flattened into the Category column (one tag per item; if an item has multiple Category-group children, only the first is exported — see `contracts/csv-schema.md` for the policy). Tags NOT under Category or Collection roots become the Tags column.

### Rationale

This keeps the existing `TagRecord` model unchanged while giving Category and Collection enough structure to be exported back into UMR's columnar format without ambiguity.

---

## Container-Path Convention

UMR's `Location` column is a single string with `→` as the separator (e.g. `Bedroom 2 → XH Bedroom`, `Garage → Workbench`, `Kitchen`).

### Rules

1. **Separator**: ` → ` (space, U+2192 RIGHT ARROW, space). Trim each segment after splitting.
2. **Resolution**: each segment maps to a container item (an `InventoryItem` with `isContainer: true`).
3. **Lookup order**: For each segment, find an existing item with `isContainer: true`, the given `name`, and the parent from the previous segment (or no parent for the root segment). If found, reuse. If not, create with a fresh `_id`, `createdAt`, `modifiedAt`.
4. **Linkage**: each newly-created container's `containerId` is set to the previously-resolved segment's `_id` (or undefined for the root).
5. **Leaf**: the importing item's `containerId` is set to the **leaf** segment's `_id`.
6. **Empty path**: `(unspecified)`, empty string, or whitespace → `containerId: undefined`, no containers created.
7. **Idempotency**: resolving the same path twice yields the same `_id`s.

The `pathResolvers.ts` module owns this logic and uses a per-import in-memory cache to avoid repeated DB lookups.

---

## Dedup / Conflict Classification

The `classify(candidate, existingMatches)` function (Wave 1E) returns one of:

- `exact-duplicate` — skip the candidate (do not write)
- `superset-merge` — update the existing record by filling its undefined fields from the candidate
- `create-new` — insert a fresh item

### Comparable fields

The classifier compares only this fixed set:

```
name
properties.make
properties.model
properties.serialNumber
properties.purchaseDate (when both sides have a value)
createdAt (only when both sides have a value — JSON-sourced candidates have it, CSV-sourced candidates do NOT)
```

### Classification truth table

| Condition | Action |
|---|---|
| All comparable fields equal AND no other field differs | `exact-duplicate` |
| All defined comparable fields equal AND candidate fills at least one previously-undefined field AND no defined field on the existing side conflicts | `superset-merge` |
| Otherwise | `create-new` |

### Identity signals

- **JSON re-import**: a candidate with the same `createdAt` as an existing item is treated as identity-matching. Combined with matching name / make / model / serialNumber, this yields `exact-duplicate` and the round-trip is a true no-op.
- **CSV re-import**: candidates have no `createdAt` (it's generated on insert), so identity falls back to name + make + model + serialNumber + purchaseDate. A re-import of the same CSV against the same DB classifies all rows as `exact-duplicate` (no writes) for the rows that uniquely identify themselves via the comparable fields. Rows with insufficient identity (e.g. no serial number and many same-name siblings) fall through to `create-new` — surfaced in the `info` section of the report.

### Multiple existing matches

If the lookup returns multiple existing matches:

1. Prefer the match with the strictly highest "comparability score" (number of defined comparable fields that equal the candidate's defined fields).
2. Ties → prefer `exact-duplicate` over `superset-merge` over `create-new`.
3. If still tied → return `create-new` and log a warning (`Row N '<name>': multiple existing matches, creating new`).

### Related-items info

Even though the classifier is local to each row, the import method (Wave 2G) groups create-new rows by `(make, model)` and emits an `info` summary like:

```
3× Bambu Lab AMS
4× SanDisk 400GB Extreme
```

This feeds the future "related items" UI (see workspace Spec follow-ups) — it has no effect on the actual import.

---

## Validation Rules

Applied during import (post-mapping, pre-classify):

- `name` is required, trimmed, ≤ 500 chars
- `description` (JSON only) ≤ 5000 chars
- `properties.make`, `properties.model` ≤ 200 chars
- `properties.serialNumber`, `properties.purchaseFrom` ≤ 500 / 300 chars
- `properties.purchasePrice`, `properties.marketValue` are non-negative integers (cents)
- `properties.purchaseDate` parses to a valid `Date`
- `containerId` references an item with `isContainer: true` (enforced by `pathResolvers` and by `createInventoryItem`)
- `tagIds` references existing tag records (enforced by `pathResolvers`)

A failed validation produces an error in `errors[]` for that row; the row is **not** inserted. The rest of the batch continues.

---

## Summary

**What changes**: behaviorally — items, tags, and container items are created from imported data and serialized back out. Structurally — nothing. The existing model carries the full payload.

**What stays the same**: all collection schemas, the `createInventoryItem` validation pipeline, the `TagRecord.path` cache, and every existing API method.

**No persistence needed beyond the existing collections.** Sentinels, separators, tag-group names, and dedup rules are all enforced in code by the modules listed in [plan.md](./plan.md) § "Project Structure".

