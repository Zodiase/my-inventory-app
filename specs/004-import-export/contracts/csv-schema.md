# CSV Schema Contract

**Format**: Under My Roof-compatible CSV (RFC-4180 quoting), UTF-8 with optional BOM.
**Owner module**: `meteor-app/imports/model/importExport/csv.ts` (Wave 1B)
**Sample fixture**: [`../fixtures/under-my-roof-sample.csv`](../fixtures/under-my-roof-sample.csv) (135 rows)

This contract documents the on-the-wire CSV format. Field semantics and the mapping to our model live in [`../data-model.md`](../data-model.md).

---

## Column Order (UMR-Compatible)

Columns are in fixed order. Export emits this exact order with the header row; import reads the header row and tolerates extra columns (ignored with a single warning per unknown column).

| # | Header | Required | Example values |
|---|---|---|---|
| 1 | `Name` | yes | `Elgato CAM LINK 4K` |
| 2 | `Make` | no | `Elgato` |
| 3 | `Model` | no | `CAM LINK 4K` |
| 4 | `Serial Number` | no | `FX13J1A01512` |
| 5 | `Category` | no | `Computer Peripherals`, `(uncategorized)` |
| 6 | `Location` | no | `Garage → Workbench`, `(unspecified)` |
| 7 | `Collection` | no | `Apple products`, `🍙`, `(uncollected)` |
| 8 | `Condition` | no | `Excellent`, `Fair`, `(unspecified)` |
| 9 | `Heir` | no | `(unassigned)`, free-text |
| 10 | `Purchased From` | no | `CORSAIR.com`, `https://www.fully.com` |
| 11 | `Purchase Date` | no | `4/1/20`, `1/25/24` |
| 12 | `Quantity` | no | `1`, blank |
| 13 | `Price` | no | `$141.69`, `$1,616.22`, blank |
| 14 | `Value` | no | `$129.99`, `$104,273.10`, blank |
| 15 | `Tags` | no | `Apple`, `LiPo, Perhaps Return This`, blank |

**Extended-superset mode** (`umrCompat: false` on export): same column order, with sentinels replaced by empty cells, plus three trailing columns:

| # | Header | Notes |
|---|---|---|
| 16 | `Description` | The `InventoryItem.description` field |
| 17 | `Warranty` | `properties.warranty` |
| 18 | `Created At` | ISO-8601 string of `createdAt` |

Extended-superset export is **not** parseable by Under My Roof. It exists so users can round-trip more fields through a spreadsheet without losing description / warranty / timestamps. Import auto-detects extended columns from the header and reads them; missing extended columns are simply not populated.

---

## Quoting & Escaping (RFC-4180)

- Fields containing `,`, `"`, `\n`, or `\r` MUST be enclosed in double quotes.
- A literal `"` inside a quoted field is escaped as `""`.
- The parser MUST handle a UTF-8 BOM at the start of the file (`\uFEFF`) and strip it.
- The parser MUST accept both `\n` and `\r\n` line endings.
- Trailing blank lines are ignored.

`papaparse` handles all of the above out of the box.

---

## Sentinel Values

When `umrCompat: true` on export, missing values in these columns are written as the matching sentinel; otherwise an empty cell.

| Column | Sentinel | Meaning |
|---|---|---|
| Category | `(uncategorized)` | No Category tag |
| Location | `(unspecified)` | No container |
| Collection | `(uncollected)` | No Collection tag |
| Condition | `(unspecified)` | No condition recorded |
| Heir | `(unassigned)` | No heir recorded |

On import, the same sentinels are normalized back to empty via `fromSentinel()` (see [`../data-model.md`](../data-model.md) § "Sentinel rules").

Whitespace-only cells are also treated as empty.

---

## Type Parsing Rules

### Dates (`Purchase Date`, column 11)

- Input format: `M/D/YY` (e.g. `4/1/20`, `12/30/19`, `1/25/24`)
- Year disambiguation: years `00`–`49` → `20xx`; years `50`–`99` → `19xx`
- Output (export): `M/D/YY` in the same convention
- Unparseable → `undefined` + warning (`Row N '<name>': unparseable Purchase Date '<value>'`)
- Examples: `4/1/20` → `2020-04-01`; `7/15/15` → `2015-07-15`; `6/30/23` → `2023-06-30`

Time-of-day is **not** represented in CSV; imported dates are at `T00:00:00.000Z`. On export, the date portion of a stored `Date` is used (UTC).

### Money (`Price` column 13, `Value` column 14)

- Input format: optional `$`, optional thousands `,`, optional decimal `.` followed by 1–2 digits
- Examples: `$141.69`, `$1,616.22`, `$104,273.10`, `141.69` (no `$`), blank
- Parse: strip leading `$` and all `,`, parse the remainder as a decimal, multiply by 100, round to nearest integer
- Storage: `number` (positive integer cents)
- Output (export): `$` + `value/100` formatted with thousands separator and 2 decimal places. Examples: `123456` cents → `$1,234.56`; `9999` cents → `$99.99`. Empty / undefined → blank cell (UMR-compat) or empty (extended).
- Negative / non-numeric → `undefined` + warning

### Integers (`Quantity` column 12)

- Per `../data-model.md`, non-default Quantity is dropped with a warning. The parser still reads the cell so the warning can quote the value.
- Parse: trim, parse as base-10 integer. Empty or `1` → no warning. Any other valid integer → warning + drop. Non-integer → warning + drop.

### Strings (`Name`, `Make`, `Model`, `Serial Number`, `Category`, `Location`, `Collection`, `Condition`, `Heir`, `Purchased From`)

- Trim leading and trailing whitespace.
- Apply per-column sentinel normalization on import.
- Length limits per `data-model.md`. Over-length → warning + truncate to limit (export and import) so subsequent steps don't crash on length validation in `createInventoryItem`.

### Tags column (`Tags`, column 15)

- Input format: comma-separated, with optional spaces around commas. Example: `"LiPo, Perhaps Return This"` produces `['LiPo', 'Perhaps Return This']`.
- The whole field is single-quoted by RFC-4180 because it contains commas, so split happens **after** CSV-unquoting.
- Empty / sentinel → `[]`.
- Whitespace-only tokens are dropped silently.

### Location column (`Location`, column 6)

- Input format: segments separated by ` → ` (space, `→` = U+2192, space). Example: `Garage → Workbench` → `['Garage', 'Workbench']`.
- Empty or sentinel → `[]` → `containerId` undefined.
- Single segment → one container.
- Segments are trimmed individually after split.

---

## Export Policy for Category / Collection

Items can have multiple tags. When exporting to UMR-compatible CSV, the parser must collapse the item's tag set into the two columnar fields:

- `Category` = name of the **first** child tag found under the `Category` root tag (by `_id` order), or `(uncategorized)`.
- `Collection` = name of the **first** child tag found under the `Collection` root tag, or `(uncollected)`.
- All other tags (root-level, or under other roots) are joined by `, ` into the `Tags` column.

If an item has 0 Category-group tags, the Category column is the sentinel. If it has > 1, the others are silently dropped from CSV (logged as `info` in the export report when emitted via the Meteor method; the function return is just the string). **JSON export preserves the full tag list with no loss** — use JSON if you need fidelity.

---

## Validation on Import

Per row, in order:

1. CSV-level: number of columns matches header length (extra columns → ignored with warning, fewer → row error)
2. Sentinel normalization (per `data-model.md`)
3. Type parsing (see above) — failures → field undefined + warning
4. Field validation (length, range — see `data-model.md` § "Validation rules")
5. Hand off normalized row to dedup classifier (Wave 1E)

A failing row produces an entry in `errors[]` and is **not** inserted; the batch continues. Hard CSV-level errors (missing header, malformed quoting that papaparse cannot recover from) abort the whole import.

---

## Encoding

- Files are UTF-8. Latin-1 / Windows-1252 are NOT supported (the test fixture contains emoji `🍙` and right-arrow `→`, which only round-trip in UTF-8).
- Optional UTF-8 BOM is accepted on input and **omitted** on output.
- Newlines on output: `\n` (LF). Mac Excel and Google Sheets accept this.

---

## Example: Round-trip

Input row (UMR sample, row 4):

```
"Anker 347 Power Bank","Anker","PowerCore 40K","AKFW7J0D07302100","Power banks","(unspecified)","Power banks","(unspecified)","(unassigned)","Amazon.com","6/30/23","1","$85.69","$99.99","LiPo"
```

Parsed `NormalizedRow`:

```ts
{
  name: 'Anker 347 Power Bank',
  description: undefined,
  containerId: undefined,                                  // Location was sentinel
  isContainer: false,
  categoryName: 'Power banks',                             // → tag under Category root
  collectionName: 'Power banks',                           // → tag under Collection root (same string is fine; different parent)
  freeTags: ['LiPo'],                                      // → root-level tag(s)
  properties: {
    make: 'Anker',
    model: 'PowerCore 40K',
    serialNumber: 'AKFW7J0D07302100',
    condition: undefined,                                  // sentinel
    purchaseFrom: 'Amazon.com',
    purchaseDate: new Date('2023-06-30T00:00:00.000Z'),
    purchasePrice: 8569,                                   // cents
    marketValue: 9999,                                     // cents
  },
  warnings: [],                                            // Quantity=1 is default; Heir=(unassigned)
}
```

Re-export with `umrCompat: true` (after a clean import) produces a byte-equivalent row for every UMR-defined column. Empty cells where the source had `undefined` are rendered as the matching sentinel.

