# Data Model: Touch-Friendly Inventory Management

**Feature**: 001-touch-friendly-inventory | **Date**: 2025-10-20
**Status**: Phase 1 Design

## Entity Relationship Diagram

```
┌─────────────┐
│    Item     │ 1
│  (location  │───┐
│  or thing)  │   │ containerId (self-reference)
└─────────────┘   │
      │           │
      │ 1       * └──(contains)
      │
      │ *
      ├───────────┐
      │           │
      │ *       * │
┌─────┴─────┐   ┌─┴──────────┐
│    Tag    │   │  Property  │
│           │   │  (optional)│
└───────────┘   └────────────┘
      │               │ 1
      │             * │
      │           ┌───┴───────────┐
      │         1 │  Attachment   │
      │           │ (photo / PDF) │
      │           └───────────────┘
      │                 │ 1
      └─────────────────┘
        * (via itemId)
```

**Key Relationships**:
- Item → Item: Self-referencing containerId for hierarchy (items-as-locations)
- Item ←→ Tag: Many-to-many via array of tag IDs on Item
- Item → Property: One-to-one embedded document (optional)
- Item → Attachment: One-to-many

---

## Collections & Schemas

### 1. Items Collection

**Collection Name**: `items`
**Extends**: `CollectionItem` (provides `_id`, `createdAt`, `modifiedAt`)

```typescript
interface InventoryItem extends CollectionItem {
  // Core fields
  _id: string;                    // MongoDB ObjectId as string
  name: string;                   // Required, indexed
  description?: string;           // Optional

  // Hierarchy
  containerId?: string;           // Reference to parent item (container)
  isContainer: boolean;           // Flag for UI/query optimization

  // Tags (many-to-many)
  tagIds: string[];               // Array of Tag._id, indexed

  // Properties (embedded, optional)
  properties?: PropertyValues;

  // Metadata
  createdAt: Date;                // From CollectionItem
  modifiedAt: Date;               // From CollectionItem
}

interface PropertyValues {
  serialNumber?: string;          // Max 500 chars
  make?: string;                  // Max 200 chars
  model?: string;                 // Max 200 chars
  purchaseDate?: Date;            // ISO 8601
  purchaseFrom?: string;          // Max 300 chars
  purchasePrice?: number;         // Cents (USD), positive integer
  marketValue?: number;           // Cents (USD), positive integer
  warranty?: string;              // Max 1000 chars, markdown
  condition?: string;             // Max 2000 chars, markdown
}
```

**Indexes**:
```typescript
items._ensureIndex({ name: 1 });                    // Text search
items._ensureIndex({ tagIds: 1 });                  // Tag filtering
items._ensureIndex({ containerId: 1 });             // Hierarchy queries
items._ensureIndex({ isContainer: 1 });             // Filter containers vs items
items._ensureIndex({ 'properties.make': 1 });       // Property search
items._ensureIndex({ 'properties.model': 1 });      // Property search
items._ensureIndex({ modifiedAt: -1 });             // Recently modified
```

**Validation Rules** (FR-001 to FR-009):
- `name`: Required, non-empty string, max 500 chars
- `containerId`: Must reference existing item with `isContainer: true`, cannot create cycles (FR-005)
- `tagIds`: Each ID must reference existing tag
- `properties.*`: All optional, validated by type
- `purchasePrice`, `marketValue`: If present, must be non-negative integers (cents)

**State Transitions**:
1. Create: Requires `name`, optional `containerId`, defaults `tagIds: []`, `isContainer: false`
2. Update: Use `strictSelector` with `_id`, `name`, `modifiedAt` to prevent race conditions
3. Delete: If `isContainer: true` and has children, prompt user for action (FR-009):
   - Option A: Move children to parent, add "no container" tag
   - Option B: Select new container
   - Option C: Delete all recursively with confirmation
4. Convert to container: Set `isContainer: true`

---

### 2. Tags Collection

**Collection Name**: `tags`
**Extends**: `CollectionItem`

```typescript
interface TagRecord extends CollectionItem {
  _id: string;
  name: string;                   // Unique (case-insensitive), indexed
  path: string[];                 // Full ancestor chain for hierarchy queries
  parentId?: string;              // Reference to parent tag (if hierarchical)

  // Metadata
  createdAt: Date;
  modifiedAt: Date;
}
```

**Indexes**:
```typescript
tags._ensureIndex({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });  // Case-insensitive unique
tags._ensureIndex({ path: 1 });                       // Hierarchy queries
```

**Validation Rules** (FR-010 to FR-018):
- `name`: Required, unique (case-insensitive), max 200 chars, no leading/trailing whitespace
- `path`: Computed from parent chain, max 10 levels deep
- `parentId`: If present, must reference existing tag, cannot create cycles

**Special Tags**:
- "no container": System-created tag (FR-018), applied when items lose container via location deletion

**State Transitions**:
1. Create: Requires unique `name`, computes `path` if `parentId` provided
2. Rename: Update `name`, must remain unique, updates all items using this tag
3. Delete: Remove from all items' `tagIds`, delete tag record

---

### 3. Attachments Collection

**Collection Name**: `attachments`
**Extends**: `CollectionItem`

```typescript
interface Attachment extends CollectionItem {
  _id: string;
  itemId: string;                 // Reference to Item, indexed
  type: 'photo' | 'pdf';

  // File storage
  fileId: string;                 // GridFS file ID
  thumbnailId?: string;           // GridFS ID for thumbnail (photos only)

  // Metadata
  label: string;                  // User-customizable, defaults to filename
  originalFilename: string;       // Preserved for export
  mimeType: string;               // e.g., 'image/jpeg', 'application/pdf'
  fileSize: number;               // Bytes, max 20MB = 20971520

  // Ordering (photos only)
  order: number;                  // Display order, 0-indexed
  isPrimary: boolean;             // First photo is primary thumbnail

  // Image metadata (photos only)
  width?: number;
  height?: number;
  exifOrientation?: number;       // 1-8, handled during processing

  // Timestamps
  createdAt: Date;
  modifiedAt: Date;
}
```

**Indexes**:
```typescript
attachments._ensureIndex({ itemId: 1, order: 1 });   // Ordered list per item
attachments._ensureIndex({ itemId: 1, type: 1 });    // Filter by type
attachments._ensureIndex({ fileId: 1 });             // GridFS lookup
```

**Validation Rules** (FR-046 to FR-059):
- `itemId`: Must reference existing item
- `type`: Must be 'photo' or 'pdf'
- `mimeType`: Must match allowed types:
  - Photos: 'image/jpeg', 'image/png', 'image/heic'
  - PDFs: 'application/pdf'
- `fileSize`: Max 20MB (20971520 bytes)
- `label`: Max 200 chars, defaults to `originalFilename`
- `order`: Non-negative integer, unique per item+type combination

**State Transitions**:
1. Upload: Validate file → process (if image) → store in GridFS → create attachment record
2. Reorder: Update `order` field, maintain sequential numbering
3. Set primary: Update `isPrimary` flags (only one true per item)
4. Rename label: Update `label` field
5. Delete: Remove attachment record → delete GridFS file(s) → reindex remaining attachments' `order`

**GridFS Storage**:
- Use MongoDB GridFSBucket API
- Chunk size: 256KB (default)
- Metadata stored in GridFS files: `{ attachmentId, itemId, type }`
- Thumbnails: ~300px width, proportional height, JPEG quality 85

---

## Computed Fields & Denormalization

### Item Location Path (Breadcrumb Trail)

**Purpose**: Display "Home > Living Room > Shelf > Box" without recursive queries

**Implementation**: Computed on-demand, not stored
```typescript
function getItemPath(itemId: string): Item[] {
  const path: Item[] = [];
  let current = Items.findOne(itemId);

  while (current) {
    path.unshift(current);
    current = current.containerId
      ? Items.findOne(current.containerId)
      : null;
  }

  return path;
}
```

**Performance**: Cached in UI component state during navigation

---

### Tag Hierarchy Path

**Purpose**: Efficient "get all descendants" queries without recursion

**Implementation**: Stored in `tags.path` array (existing pattern)
```typescript
// Example:
{
  _id: 'tag3',
  name: 'Winter Clothes',
  path: ['tag1', 'tag2', 'tag3'],  // [Clothing, Seasonal, Winter Clothes]
  parentId: 'tag2'
}

// Query all items with Winter Clothes or any sub-tags:
const descendants = Tags.find({ path: 'tag3' }).fetch().map(t => t._id);
Items.find({ tagIds: { $in: descendants } });
```

---

### Attachment Counts

**Purpose**: Show "3 photos, 2 documents" in item list without fetching all attachments

**Implementation**: Computed via aggregation when needed
```typescript
const counts = Attachments.aggregate([
  { $match: { itemId: { $in: visibleItemIds } } },
  { $group: {
      _id: { itemId: '$itemId', type: '$type' },
      count: { $sum: 1 }
  }}
]);
```

**Optimization**: Only compute for visible items in current view

---

## Search Query Transformations

### Query Fragments → MongoDB Query

**Input**: Typed search fragments from UI
```typescript
type SearchFragment =
  | { type: 'name', value: string }
  | { type: 'includeTags', tagIds: string[] }
  | { type: 'excludeTags', tagIds: string[] }
  | { type: 'containerType', pattern: string }
  | { type: 'property', field: keyof PropertyValues, value: string }
  | { type: 'scope', locationId?: string };  // Search root
```

**Output**: MongoDB query selector
```typescript
function buildQuery(fragments: SearchFragment[]): Mongo.Selector<InventoryItem> {
  const conditions: any[] = [];
  let scopeLocationId: string | undefined;

  for (const fragment of fragments) {
    switch (fragment.type) {
      case 'name':
        conditions.push({ name: { $regex: fragment.value, $options: 'i' } });
        break;

      case 'includeTags':
        conditions.push({ tagIds: { $all: fragment.tagIds } });  // AND logic
        break;

      case 'excludeTags':
        conditions.push({ tagIds: { $nin: fragment.tagIds } });  // NOT logic
        break;

      case 'containerType':
        const matchingContainers = Items.find({
          isContainer: true,
          $or: [
            { name: { $regex: fragment.pattern, $options: 'i' } },
            { tagIds: { $in: getTagsByPattern(fragment.pattern) } }
          ]
        }).map(item => item._id);

        conditions.push({ containerId: { $in: matchingContainers } });
        break;

      case 'property':
        const key = `properties.${fragment.field}`;
        conditions.push({ [key]: { $regex: fragment.value, $options: 'i' } });
        break;

      case 'scope':
        scopeLocationId = fragment.locationId;
        break;
    }
  }

  // Apply scope if present
  if (scopeLocationId) {
    // Find all items recursively under this location
    const descendants = getAllDescendantItems(scopeLocationId);
    conditions.push({ _id: { $in: descendants.map(d => d._id) } });
  }

  return conditions.length > 0 ? { $and: conditions } : {};
}
```

**Performance Notes**:
- Use indexes on `name`, `tagIds`, `containerId`, `properties.*`
- Limit results with pagination (100 items per page)
- Cache scope descendants for repeated queries

---

## Export/Import Data Format

### Bundle Structure

```
inventory-backup-2025-10-20.zip
├── manifest.json
├── data.json
└── attachments/
    ├── [fileId]-[originalFilename]
    └── ...
```

### manifest.json Schema

```typescript
interface BackupManifest {
  version: string;              // Semantic version, e.g., "1.0.0"
  exportDate: string;           // ISO 8601 timestamp
  appVersion: string;           // App version that created backup
  counts: {
    items: number;
    tags: number;
    attachments: number;
  };
}
```

### data.json Schema

```typescript
interface BackupData {
  version: string;              // Same as manifest
  items: InventoryItem[];       // Full item records
  tags: TagRecord[];            // Full tag records
  attachments: AttachmentMeta[]; // Metadata only, files separate
}

interface AttachmentMeta {
  _id: string;
  itemId: string;
  type: 'photo' | 'pdf';
  label: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  order: number;
  isPrimary: boolean;
  // File references
  fileId: string;               // Maps to attachments/[fileId]-[originalFilename]
  thumbnailId?: string;
  // Optional image metadata
  width?: number;
  height?: number;
}
```

### Import Process

1. **Extract ZIP** to temp directory
2. **Validate**:
   - Check `manifest.version` compatibility (major version must match)
   - Verify file integrity (counts match, referenced files exist)
3. **Clear existing data** (default "replace all" strategy)
4. **Import collections**:
   - Insert tags first (for referential integrity)
   - Insert items with tag references
   - Insert attachments metadata
5. **Import files**:
   - Copy files from `attachments/` to GridFS
   - Update attachment records with new GridFS IDs
6. **Validate relationships**:
   - All `containerId` references exist
   - All `tagIds` references exist
   - All `fileId` references exist in GridFS
7. **Report**:
   - Success: "Imported X items, Y tags, Z attachments"
   - Warnings: "3 unrecognized properties skipped", "2 attachment files missing"

---

## Data Integrity Constraints

### Referential Integrity

1. **Item.containerId** → Item._id
   - Orphan check: If parent deleted, handle per FR-009
   - Cycle check: Traverse ancestors, detect loops

2. **Item.tagIds[]** → Tag._id
   - Cascade: When tag deleted, remove from all items' tagIds

3. **Attachment.itemId** → Item._id
   - Cascade: When item deleted, delete all attachments + GridFS files

4. **Attachment.fileId** → GridFS file
   - Orphan cleanup: Periodic job to delete GridFS files without attachment records

### Uniqueness Constraints

1. **Tag.name**: Case-insensitive unique
2. **Attachment.order per itemId**: Sequential, 0-indexed, no gaps

### Validation at Insert/Update

- Use Meteor Methods with validation schemas
- Server-side validation always (client-side for UX only)
- Return detailed error messages with field names

---

## Migration Strategy

**Current State**: Items and Tags collections exist

**Required Migrations**:

1. **Add properties field to Items**:
   ```typescript
   Items.update({}, {
     $set: { properties: {} }
   }, { multi: true });
   ```

2. **Add isContainer flag to Items**:
   ```typescript
   Items.find({ containerId: { $exists: false } }).forEach(item => {
     const hasChildren = Items.findOne({ containerId: item._id });
     Items.update(item._id, {
       $set: { isContainer: !!hasChildren }
     });
   });
   ```

3. **Create Attachments collection**: New collection, no migration needed

4. **Create indexes**: Run index creation scripts

---

## Next Steps

Proceed to:
- **API Contracts**: Define Meteor Methods signatures for all operations
- **Quickstart Guide**: Developer setup instructions
- **Update Agent Context**: Add new dependencies to Copilot instructions
