# JSON Schema Contract

**Format**: Native JSON envelope, UTF-8, no BOM.
**Owner module**: `meteor-app/imports/model/importExport/json.ts` (Wave 1C)
**Version**: `1`

This contract documents the native JSON export format. Field semantics live in [`../data-model.md`](../data-model.md); CSV interop lives in [`./csv-schema.md`](./csv-schema.md).

---

## Envelope

```json
{
  "version": 1,
  "exportedAt": "2026-05-24T18:30:00.000Z",
  "items": [...],
  "tags": [...]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `version` | integer | yes | Currently `1`. Bumped only on breaking shape changes. Importer rejects unknown versions with a hard error. |
| `exportedAt` | ISO-8601 string | yes | UTC timestamp when the export ran. Informational; not used to influence dedup. |
| `items` | `InventoryItem[]` | yes | The full set of items, including container items (those with `isContainer: true`). |
| `tags` | `TagRecord[]` | yes | The full set of tags, including root tags `Category` and `Collection` if they exist. |

Extra top-level fields are accepted on import and silently ignored (forward-compat).

---

## `InventoryItem` Element

Each element of `items[]` is the serialized form of `meteor-app/imports/model/InventoryItem.ts`. All fields are serialized; absent fields on parse become `undefined`.

```ts
interface SerializedItem {
  _id: string;                       // Mongo ObjectId hex (informational on import — fresh _id is generated)
  createdAt: string;                 // ISO-8601, e.g. "2017-11-02T10:00:00.000Z" — preserved exactly on import
  modifiedAt: string;                // ISO-8601, preserved exactly on import
  name: string;                      // Required, 1–500 chars
  description?: string;              // Optional, ≤ 5000 chars
  containerId?: string;              // _id of another item in the same payload (must have isContainer: true)
  isContainer: boolean;              // Required
  tagIds: string[];                  // _ids of TagRecord entries in the same payload
  properties?: {
    serialNumber?: string;
    make?: string;
    model?: string;
    purchaseDate?: string;           // ISO-8601 (date or date-time)
    purchaseFrom?: string;
    purchasePrice?: number;          // cents, non-negative integer
    marketValue?: number;            // cents, non-negative integer
    warranty?: string;
    condition?: string;
  };
}
```

### Field-by-field round-trip guarantee

| Field | Round-trip | Notes |
|---|---|---|
| `_id` | NO | Source `_id` is informational only — import always generates a fresh `_id` (per workspace Spec non-goals). Internal references (`containerId`, `tagIds`) are remapped using the source-to-new ID map built during import. |
| `createdAt` | YES (byte-faithful) | This is the identity signal for dedup. Re-importing a freshly-exported file relies on this matching. |
| `modifiedAt` | YES (byte-faithful) | |
| `name`, `description`, `isContainer` | YES | |
| `containerId` | YES, after ID remapping | If the referenced container is not in the same payload, the import emits a warning and leaves `containerId` undefined. |
| `tagIds` | YES, after ID remapping | If a referenced tag is missing from the payload, the import emits a warning and removes the missing id from the list. |
| `properties.*` | YES | All sub-fields preserved exactly. Dates serialize as ISO-8601 and parse back to `Date` instances. |

---

## `TagRecord` Element

Each element of `tags[]` is the serialized form of `meteor-app/imports/model/TagRecord.ts`.

```ts
interface SerializedTag {
  _id: string;                       // informational
  createdAt: string;
  modifiedAt: string;
  parentTagId: string;               // '' for root tags
  name: string;
  path: Array<{ _id: string; name: string }>;
                                     // Cached ancestor chain, source _ids — recomputed on import using new _ids
}
```

### Notes

- The two root tags `Category` and `Collection` are included **only if they exist** in the source DB. If absent, the import re-creates them on demand (via `pathResolvers.resolveTagByName` with `groupName`).
- `path` is rebuilt on import using the freshly-generated `_id`s, not the source ones. (The source `path` is read only to determine ordering / hierarchy.)
- Order of `tags[]` in the array does not matter — the importer topologically sorts by `parentTagId` chains before insertion.

---

## Version Policy

| Version | Status | Breaking change required to bump |
|---|---|---|
| `1` | current | Removing a field, changing a field's type, or adding a new required field |

Forward-compatibility:

- Unknown top-level keys → silently ignored
- Unknown keys inside an item or tag → silently ignored
- New optional fields can be added in any version without bumping

The importer parses `version` first. If it does not match a known version, it aborts with:

```
Error: Unsupported export version: <n>. This app supports version 1.
```

No partial write occurs.

---

## Error Cases on Import

| Condition | Behavior |
|---|---|
| Malformed JSON (parse error) | Hard error; no writes |
| Missing `version` field | Hard error; no writes |
| `version` not equal to `1` | Hard error; no writes |
| Missing `items` or `tags` arrays | Hard error; no writes |
| Item missing required `name` | Per-row error; row skipped; batch continues |
| Item `name` > 500 chars | Per-row error; row skipped |
| `containerId` references non-existent item in payload | Per-row warning; `containerId` cleared |
| `tagIds` references non-existent tag in payload | Per-row warning; missing id(s) removed |
| Extra unknown top-level or per-record fields | Silently accepted (forward-compat) |

Errors aggregate into `ImportReport.errors[]`; warnings into `ImportReport.warnings[]`.

---

## Round-Trip Example

**Step 1**: Export an inventory with one item:

```json
{
  "version": 1,
  "exportedAt": "2026-05-24T18:30:00.000Z",
  "items": [
    {
      "_id": "abc123abc123abc123abc123",
      "createdAt": "2017-11-02T10:00:00.000Z",
      "modifiedAt": "2026-05-24T18:30:00.000Z",
      "name": "Sony a7R3",
      "isContainer": false,
      "tagIds": ["tag_photography", "tag_collection_photography"],
      "properties": {
        "make": "Sony",
        "model": "ILCE7RM3",
        "serialNumber": "3371074",
        "condition": "Excellent",
        "purchaseFrom": "Amazon.com",
        "purchaseDate": "2017-11-02T00:00:00.000Z",
        "purchasePrice": 339788,
        "marketValue": 319800
      }
    }
  ],
  "tags": [
    {
      "_id": "tag_category_root",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "modifiedAt": "2026-01-01T00:00:00.000Z",
      "parentTagId": "",
      "name": "Category",
      "path": [{ "_id": "tag_category_root", "name": "Category" }]
    },
    {
      "_id": "tag_photography",
      "createdAt": "2017-11-02T10:00:00.000Z",
      "modifiedAt": "2017-11-02T10:00:00.000Z",
      "parentTagId": "tag_category_root",
      "name": "Photography Equipment",
      "path": [
        { "_id": "tag_category_root", "name": "Category" },
        { "_id": "tag_photography", "name": "Photography Equipment" }
      ]
    },
    {
      "_id": "tag_collection_photography",
      "createdAt": "2017-11-02T10:00:00.000Z",
      "modifiedAt": "2017-11-02T10:00:00.000Z",
      "parentTagId": "tag_collection_root",
      "name": "Photography stuff",
      "path": [
        { "_id": "tag_collection_root", "name": "Collection" },
        { "_id": "tag_collection_photography", "name": "Photography stuff" }
      ]
    },
    {
      "_id": "tag_collection_root",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "modifiedAt": "2026-01-01T00:00:00.000Z",
      "parentTagId": "",
      "name": "Collection",
      "path": [{ "_id": "tag_collection_root", "name": "Collection" }]
    }
  ]
}
```

**Step 2**: Re-import the same file into the same DB.

**Expected outcome**:

- `version` validates → continue
- Tags are topologically sorted: `tag_category_root`, `tag_collection_root`, `tag_photography`, `tag_collection_photography`
- For each tag, dedup looks for an existing tag with the same `name` + `parentTagId` (after ID remapping). All four found → 0 tag inserts.
- For the item, dedup finds an existing item with matching `createdAt = 2017-11-02T10:00:00Z` + matching name + matching `properties.serialNumber` → classifies as `exact-duplicate` → 0 item inserts.
- `ImportReport`: `{ toCreate: 0, exactDuplicates: 1, supersetMerges: 0, warnings: [], errors: [], info: [], samplePreview: [{ action: 'exact-duplicate', name: 'Sony a7R3' }] }`

This is the "round-trip no-op" success criterion (`SC-001` in [`../spec.md`](../spec.md)).

