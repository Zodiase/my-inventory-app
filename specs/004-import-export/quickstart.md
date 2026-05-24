# Quick Start: Inventory Import & Export

**Feature**: Inventory Import & Export
**Date**: 2026-05-24
**Audience**: Developers wiring up the Settings page, debugging an import, or running export/import from a Meteor method console

---

## Overview

This feature lets users export and import the full inventory in two formats:

- **Native JSON** — full-fidelity round-trip (preserves `createdAt`, `modifiedAt`, every `properties.*` field, tag hierarchy, container hierarchy)
- **UMR-compatible CSV** — Under My Roof's 15-column format with sentinels, suitable for migrating from / to UMR or hand-editing in a spreadsheet

Two ways to use it:

1. **UI**: navigate to `/settings/data`
2. **Programmatic**: call the Meteor methods directly (server tests, developer console, scripts)

---

## Prerequisites

- Meteor app running: `cd meteor-app && npm start` (port 3000)
- Routing in place (spec [`003-url-routing`](../003-url-routing/quickstart.md))
- `papaparse` installed (added in Wave 1B)
- A non-empty inventory if you want to test export

---

## Usage from the Settings Page UI

### Reach the page

Navigate to:

```
http://localhost:3000/settings/data
```

The page renders two cards:

- **Export** — two buttons: "Download JSON", "Download CSV"
- **Import** — file input + Preview button + (after preview) Import button + report panel

### Export flow

1. Click **Download JSON** or **Download CSV**.
2. The browser saves the file as `inventory-YYYYMMDD.json` (or `.csv`).
3. JSON contains the full envelope (`version`, `exportedAt`, `items`, `tags`).
4. CSV is UMR-compatible by default (15 columns, sentinels in place of empty values).

### Import flow

1. Click **Choose File**, pick a `.csv` or `.json` file.
2. Click **Preview**.
3. The page calls `inventory.import.<json|csv>(payload, { dryRun: true })` and renders the report:

   | Count | Meaning |
   |---|---|
   | `toCreate` | rows that will produce new items |
   | `exactDuplicates` | rows that already exist (will be skipped) |
   | `supersetMerges` | rows that will fill in undefined fields on an existing item |
   | `warnings.length` | non-fatal issues (dropped `Heir` / `Quantity`, unparseable dates, etc.) |
   | `errors.length` | rows that will be skipped due to validation failure |

4. Inspect the warnings and the first-20-rows sample preview.
5. Click **Import N items** to run the real import. The same call runs with `dryRun: false`.
6. A success message shows the actual counts.

**Rollback note**: if the import hits a hard error mid-flight after some writes, the method aborts and removes any rows it inserted in that run (see [data-model.md § "Error Cases"](./data-model.md)). Pre-existing data is never modified by the import path other than `superset-merge` updates.

---

## Usage from a Meteor Method Console

All four methods are registered server-side via the existing `asMeteorMethods` pattern (see `meteor-app/imports/api/items.ts` for the precedent).

### Export to JSON

```ts
import { Meteor } from 'meteor/meteor';

const json = await Meteor.callAsync('inventory.export.json');
// → string (the envelope)
console.log(JSON.parse(json));
```

### Export to UMR-compatible CSV

```ts
const csv = await Meteor.callAsync('inventory.export.csv', { umrCompat: true });
// → string (UMR's 15 columns + sentinels)
```

### Export to extended CSV (with description / warranty / createdAt)

```ts
const csv = await Meteor.callAsync('inventory.export.csv', { umrCompat: false });
// → 18 columns, empty cells in place of sentinels
```

### Preview an import (dry-run, no writes)

```ts
import type { ImportReport } from '/imports/api/importExport/import';

const csvText = await (await fetch('/fixtures/under-my-roof-sample.csv')).text();
const report: ImportReport = await Meteor.callAsync(
    'inventory.import.csv',
    csvText,
    { dryRun: true, umrCompat: true },
);
console.log(report.toCreate, report.exactDuplicates, report.warnings);
```

### Run the real import

```ts
const report = await Meteor.callAsync(
    'inventory.import.csv',
    csvText,
    { dryRun: false, umrCompat: true },
);
// report.toCreate now reflects rows actually inserted
```

### Round-trip a JSON export

```ts
const json = await Meteor.callAsync('inventory.export.json');
const reimport = await Meteor.callAsync('inventory.import.json', json, { dryRun: true });
// Expected: reimport.toCreate === 0, reimport.exactDuplicates === <total item count>
```

---

## Usage from a Pure Module (No Meteor)

The Wave 1 modules are intentionally pure — they can be imported anywhere (UI, tests, server, future CLI).

```ts
import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';
import { parseCsv, stringifyCsv } from '/imports/model/importExport/csv';
import { serializeJson, parseJson } from '/imports/model/importExport/json';
import { classify } from '/imports/model/importExport/dedup';
import { fromSentinel, toSentinel, UMR_SENTINELS } from '/imports/model/importExport/sentinels';

const rows = parseCsv(csvText);                          // ParsedRow[]
const text = stringifyCsv(exportRows, { umrCompat: true });

const payload = serializeJson({ items, tags });          // string
const state = parseJson(payload);                        // { version, exportedAt, items, tags }

const result = classify(candidateRow, existingMatches);  // { action, target?, mergeFields? }
const cleaned = fromSentinel('(unspecified)');           // undefined
const filled = toSentinel(undefined, 'unspecified');     // '(unspecified)'
```

---

## End-to-End Example: Migrate from Under My Roof

1. In UMR, export your inventory to CSV. Save it as `~/Downloads/umr-export.csv`.
2. Start this app and open `http://localhost:3000/settings/data`.
3. Click **Choose File** → select `umr-export.csv`.
4. Click **Preview**. Verify counts look sane and warnings are limited to dropped `Heir` / `Quantity` (those are by design).
5. Click **Import N items**.
6. Navigate to `/items` — your full UMR inventory should now appear here.
7. Navigate to `/tags` — root tags `Category` and `Collection` exist, each with children corresponding to the values in your CSV.

---

## Field Mapping Cheat Sheet

| UMR Column | Where it ends up |
|---|---|
| Name → Make → Model → Serial Number | `name`, `properties.make`, `properties.model`, `properties.serialNumber` |
| Category | Child tag under root tag `Category` |
| Location | Chain of container items (split on ` → `) |
| Collection | Child tag under root tag `Collection` |
| Condition | `properties.condition` (free text) |
| Heir, Quantity | Dropped with warning (per workspace Spec assumptions) |
| Purchased From | `properties.purchaseFrom` |
| Purchase Date | `properties.purchaseDate` (parsed `M/D/YY`) |
| Price, Value | `properties.purchasePrice`, `properties.marketValue` (cents) |
| Tags | Root-level free tags |

Full mapping with disposition codes lives in [data-model.md § "Field Mapping"](./data-model.md).

---

## Troubleshooting

### Preview shows "0 toCreate" on a freshly-exported file

This is the **expected** round-trip behavior: re-importing your own JSON classifies every row as `exact-duplicate`. Verified by the dedup classifier matching `createdAt` + name + make + model + serial. See [data-model.md § "Identity signals"](./data-model.md).

### CSV import drops a row I expected to keep

Check `ImportReport.errors[]`. Likely causes:
- Name field empty after trimming
- Name > 500 chars
- Required column missing in header

### Tag appears at the root instead of under Category

The mapping rule is **column-driven**, not name-driven. The Category column produces a child of root tag `Category`; the Tags column produces root-level tags. If you want a tag to live under Category, put it in the Category column.

### Container path didn't get created

The path separator is the **space-arrow-space** sequence ` → `. Plain `>` or `-` will not split. Check that your CSV uses the literal `→` character (U+2192).

### `M/D/YY` parses to the wrong century

Years 00-49 → 20xx (e.g. `4/1/20` → 2020); years 50-99 → 19xx (e.g. `7/15/85` → 1985). If you have data from before 1950 or after 2049, edit the CSV before importing.

### Quantity / Heir warnings flood the report

By design: every non-default value of Heir or Quantity produces a warning. To suppress, edit the CSV to set Heir to `(unassigned)` and Quantity to `1` (or empty) for affected rows. The future custom-properties feature will own these.

### Type / lint failures

```bash
cd meteor-app
npm run check:type
npm run check:code-style
```

If you see a TypeScript error like `Type 'unknown' is not assignable to type 'Date'`, the `json.ts` parser likely needs a manual Date conversion — date fields in JSON arrive as strings.

---

## Verification Commands

| What | Command |
|---|---|
| Unit tests for the new modules | `cd meteor-app && npm test -- --grep "(csv|json|dedup|pathResolvers|import|export)"` |
| Full Meteor unit test suite | `cd meteor-app && npm test` |
| Type check | `cd meteor-app && npm run check:type` |
| Lint + format check | `cd meteor-app && npm run check:code-style` |
| Storybook component tests | `npm run test:e2e:storybook` (root) |
| App-level E2E | `npm run test:e2e:app -- import-export.spec.js` (root) |
| Manual smoke test | open `/settings/data`, download JSON, re-import, verify report shows 100% duplicates |

---

## Related Docs

- [spec.md](./spec.md) — user stories, FRs, success criteria
- [plan.md](./plan.md) — implementation plan
- [data-model.md](./data-model.md) — field mapping + dedup truth table
- [contracts/csv-schema.md](./contracts/csv-schema.md) — wire format details
- [contracts/json-schema.md](./contracts/json-schema.md) — wire format details
- [tasks.md](./tasks.md) — wave-by-wave task index
- [`specs/003-url-routing/quickstart.md`](../003-url-routing/quickstart.md) — Wouter routing primitives used by `/settings/data`
- [Workspace Spec](intent://local/note/spec) — source of truth for assumptions and wave order

