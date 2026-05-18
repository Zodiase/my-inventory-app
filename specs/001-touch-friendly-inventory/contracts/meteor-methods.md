# Meteor Methods API Contracts

**Feature**: 001-touch-friendly-inventory
**Date**: 2025-10-20
**Protocol**: Meteor Methods (DDP)

## Overview

All API operations use Meteor Methods pattern for RPC-style communication. Methods are defined server-side, exported via `asMeteorMethods`, and called client-side via `Meteor.call()` or `Meteor.callAsync()`.

**Authentication**: Not required (local network deployment, FR-073)

**Error Handling**: All methods throw `Meteor.Error` with:
- `error` code (string)
- `reason` message (human-readable)
- `details` object (optional, structured error info)

**Validation**: All inputs validated server-side with explicit type checking

---

## Item Management Methods

### items.create

**Purpose**: Create a new inventory item (FR-001)

**Input**:
```typescript
{
  name: string;                // Required, max 500 chars
  description?: string;        // Optional, max 5000 chars
  containerId?: string;        // Optional, must reference existing container item
  tagIds?: string[];           // Optional, each must reference existing tag
  isContainer?: boolean;       // Optional, defaults to false
}
```

**Output**:
```typescript
{
  itemId: string;              // Created item _id
}
```

**Errors**:
- `validation-error`: Invalid input (missing name, name too long, etc.)
- `not-found`: containerId references non-existent item
- `invalid-container`: containerId references non-container item
- `circular-reference`: containerId would create cycle (FR-005)

**Example**:
```typescript
const { itemId } = await Meteor.callAsync('items.create', {
  name: 'Tool Box',
  description: 'Red metal tool box',
  containerId: 'garageId',
  tagIds: ['toolsTagId'],
  isContainer: true
});
```

---

### items.update

**Purpose**: Update an existing item (FR-002)

**Input**:
```typescript
{
  itemId: string;              // Required
  updates: {
    name?: string;
    description?: string;
    containerId?: string;
    isContainer?: boolean;
  };
  currentState: {              // For optimistic locking
    name: string;
    modifiedAt: Date;
  };
}
```

**Output**:
```typescript
{
  success: boolean;            // true if updated
  affectedCount: number;       // 0 if conflict detected
}
```

**Errors**:
- `not-found`: itemId doesn't exist
- `validation-error`: Invalid updates
- `conflict`: Item modified by another process (affectedCount = 0)
- `circular-reference`: New containerId would create cycle

**Example**:
```typescript
const result = await Meteor.callAsync('items.update', {
  itemId: 'box123',
  updates: { name: 'Large Tool Box' },
  currentState: {
    name: 'Tool Box',
    modifiedAt: item.modifiedAt
  }
});
```

---

### items.delete

**Purpose**: Delete an item (FR-003, FR-009)

**Input**:
```typescript
{
  itemId: string;
  // If item is location with children, specify strategy:
  deleteStrategy?: 'move-to-parent' | 'choose-container' | 'delete-all';
  newContainerId?: string;     // Required if strategy = 'choose-container'
}
```

**Output**:
```typescript
{
  deletedItemIds: string[];    // All deleted item IDs (recursive if delete-all)
  movedItemIds?: string[];     // IDs of moved children (if applicable)
}
```

**Errors**:
- `not-found`: itemId doesn't exist
- `has-children`: Item is location with children but no strategy provided
- `invalid-strategy`: Strategy not recognized or missing newContainerId

**Example**:
```typescript
// Delete location and move children to parent
const result = await Meteor.callAsync('items.delete', {
  itemId: 'shelfId',
  deleteStrategy: 'move-to-parent'
});

// Delete and specify new container
const result = await Meteor.callAsync('items.delete', {
  itemId: 'shelfId',
  deleteStrategy: 'choose-container',
  newContainerId: 'cabinetId'
});
```

---

### items.move

**Purpose**: Move item to different container (FR-003, drag-drop support)

**Input**:
```typescript
{
  itemId: string;
  newContainerId?: string;     // undefined = move to root (no container)
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

**Errors**:
- `not-found`: itemId or newContainerId doesn't exist
- `circular-reference`: Would create cycle

---

### items.getPath

**Purpose**: Get breadcrumb trail for item (FR-007)

**Input**:
```typescript
{
  itemId: string;
}
```

**Output**:
```typescript
{
  path: Array<{
    _id: string;
    name: string;
    isContainer: boolean;
  }>;
}
```

**Example**:
```typescript
const { path } = await Meteor.callAsync('items.getPath', {
  itemId: 'wrench123'
});
// path = [
//   { _id: 'garage', name: 'Garage', isContainer: true },
//   { _id: 'cabinet', name: 'Tool Cabinet', isContainer: true },
//   { _id: 'toolbox', name: 'Red Toolbox', isContainer: true },
//   { _id: 'wrench123', name: 'Wrench', isContainer: false }
// ]
```

---

## Property Management Methods

### items.updateProperties

**Purpose**: Update item properties (FR-040)

**Input**:
```typescript
{
  itemId: string;
  properties: Partial<PropertyValues>;  // Any property fields
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

**Errors**:
- `not-found`: itemId doesn't exist
- `validation-error`: Invalid property values (negative price, invalid date, etc.)

**Example**:
```typescript
await Meteor.callAsync('items.updateProperties', {
  itemId: 'laptop123',
  properties: {
    serialNumber: 'SN123456',
    make: 'Dell',
    model: 'XPS 15',
    purchaseDate: new Date('2023-01-15'),
    purchasePrice: 129999,      // $1299.99 in cents
    warranty: '3 year manufacturer warranty'
  }
});
```

---

### items.clearProperty

**Purpose**: Remove a specific property value (FR-040)

**Input**:
```typescript
{
  itemId: string;
  propertyField: keyof PropertyValues;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

---

## Tag Management Methods

### tags.create

**Purpose**: Create a new tag (FR-010)

**Input**:
```typescript
{
  name: string;                // Required, max 200 chars
  parentId?: string;           // Optional parent tag
}
```

**Output**:
```typescript
{
  tagId: string;
  path: string[];              // Computed ancestor chain
}
```

**Errors**:
- `validation-error`: Invalid name (empty, too long, etc.)
- `duplicate-name`: Tag with this name already exists (case-insensitive)
- `not-found`: parentId doesn't exist

---

### tags.rename

**Purpose**: Rename a tag (FR-013)

**Input**:
```typescript
{
  tagId: string;
  newName: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  affectedItemCount: number;   // Number of items using this tag
}
```

**Errors**:
- `not-found`: tagId doesn't exist
- `duplicate-name`: New name conflicts with existing tag

---

### tags.delete

**Purpose**: Delete a tag (FR-014)

**Input**:
```typescript
{
  tagId: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  removedFromItemCount: number;  // Number of items it was removed from
}
```

---

### tags.addToItem

**Purpose**: Apply tag to item (FR-011)

**Input**:
```typescript
{
  itemId: string;
  tagId: string;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

**Errors**:
- `not-found`: itemId or tagId doesn't exist
- `already-tagged`: Item already has this tag (idempotent, not an error)

---

### tags.removeFromItem

**Purpose**: Remove tag from item (FR-012)

**Input**:
```typescript
{
  itemId: string;
  tagId: string;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

---

## Attachment Management Methods

### attachments.upload

**Purpose**: Upload photo or PDF (FR-046, FR-050)

**Input** (via Meteor file upload or HTTP POST):
```typescript
{
  itemId: string;
  file: File;                  // Browser File object
  label?: string;              // Optional custom label, defaults to filename
  type: 'photo' | 'pdf';
}
```

**Process**:
1. Validate file size (max 20MB)
2. Validate MIME type
3. If photo: Process image (EXIF rotation, generate thumbnail)
4. Store file in GridFS
5. Create attachment record

**Output**:
```typescript
{
  attachmentId: string;
  fileId: string;              // GridFS ID
  thumbnailId?: string;        // For photos
}
```

**Errors**:
- `file-too-large`: File exceeds 20MB limit
- `invalid-type`: MIME type not supported
- `upload-failed`: GridFS storage error

**Example** (using Meteor HTTP):
```typescript
const formData = new FormData();
formData.append('file', photoFile);
formData.append('itemId', 'laptop123');
formData.append('type', 'photo');

const response = await fetch('/api/attachments/upload', {
  method: 'POST',
  body: formData
});
```

---

### attachments.delete

**Purpose**: Delete attachment (FR-054)

**Input**:
```typescript
{
  attachmentId: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  deletedFiles: string[];      // GridFS file IDs deleted
}
```

---

### attachments.reorder

**Purpose**: Change photo order (FR-048)

**Input**:
```typescript
{
  itemId: string;
  attachmentIds: string[];     // New order (array of IDs)
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

**Errors**:
- `validation-error`: attachmentIds don't all belong to itemId or aren't all photos

---

### attachments.setPrimary

**Purpose**: Set primary photo/thumbnail (FR-048)

**Input**:
```typescript
{
  attachmentId: string;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

**Errors**:
- `not-photo`: Attachment is not a photo

---

### attachments.updateLabel

**Purpose**: Rename attachment label (FR-049, FR-051)

**Input**:
```typescript
{
  attachmentId: string;
  newLabel: string;
}
```

**Output**:
```typescript
{
  success: boolean;
}
```

---

## Search & Filter Methods

### items.search

**Purpose**: Global search with query fragments (FR-019 to FR-031)

**Input**:
```typescript
{
  fragments: SearchFragment[];
  limit?: number;              // Default 100
  skip?: number;               // For pagination
}

type SearchFragment =
  | { type: 'name', value: string }
  | { type: 'includeTags', tagIds: string[] }
  | { type: 'excludeTags', tagIds: string[] }
  | { type: 'containerType', pattern: string }
  | { type: 'property', field: string, value: string }
  | { type: 'scope', locationId?: string };
```

**Output**:
```typescript
{
  items: InventoryItem[];      // Matched items with full data
  totalCount: number;          // Total matches (for pagination)
}
```

**Example**:
```typescript
const results = await Meteor.callAsync('items.search', {
  fragments: [
    { type: 'name', value: 'tool' },
    { type: 'includeTags', tagIds: ['metalTagId'] },
    { type: 'scope', locationId: 'garageId' }
  ],
  limit: 50
});
```

---

## Export/Import Methods

### backup.export

**Purpose**: Create full backup bundle (FR-071 to FR-073)

**Input**:
```typescript
{
  // No input, exports all data
}
```

**Process**:
1. Fetch all items, tags, attachments
2. Create manifest.json
3. Create data.json
4. Copy GridFS files to temp directory
5. Create ZIP bundle
6. Return download URL

**Output**:
```typescript
{
  downloadUrl: string;         // Temporary URL for ZIP download
  manifest: {
    version: string;
    exportDate: string;
    counts: {
      items: number;
      tags: number;
      attachments: number;
    };
  };
}
```

**Errors**:
- `export-failed`: Error during export process

---

### backup.import

**Purpose**: Restore from backup bundle (FR-074 to FR-078)

**Input** (via file upload):
```typescript
{
  file: File;                  // ZIP bundle
  strategy: 'replace-all';     // Only strategy supported in v1
}
```

**Process**:
1. Extract and validate ZIP structure
2. Check version compatibility
3. Clear existing data (if strategy = replace-all)
4. Import data.json (tags, items, attachments metadata)
5. Import GridFS files
6. Validate referential integrity

**Output**:
```typescript
{
  success: boolean;
  imported: {
    items: number;
    tags: number;
    attachments: number;
  };
  warnings: string[];          // e.g., "3 attachment files missing"
}
```

**Errors**:
- `invalid-bundle`: ZIP structure invalid
- `version-mismatch`: Major version incompatible
- `import-failed`: Critical error during import

**Example**:
```typescript
const formData = new FormData();
formData.append('file', backupZipFile);
formData.append('strategy', 'replace-all');

const response = await fetch('/api/backup/import', {
  method: 'POST',
  body: formData
});
```

---

## Publication Subscriptions

Meteor uses pub/sub for reactive data. These publications provide real-time updates.

### `items.all`
- **Data**: All items
- **Use**: Main inventory view

### `items.byContainer`
- **Params**: `{ containerId?: string }`
- **Data**: Items in specific container or root items
- **Use**: Location browsing

### `items.byTags`
- **Params**: `{ tagIds: string[] }`
- **Data**: Items with all specified tags
- **Use**: Tag filtering

### `tags.all`
- **Data**: All tags
- **Use**: Tag selector, tag management

### `attachments.byItem`
- **Params**: `{ itemId: string }`
- **Data**: All attachments for specific item
- **Use**: Item detail view

---

## Rate Limiting

**Not implemented in Phase 1** - Local network, trusted users (1-2 concurrent)

If needed later:
- File uploads: 10 per minute per client
- Search queries: 30 per minute per client
- Export: 1 per 5 minutes per client

---

## Performance Considerations

1. **Pagination**: Always use `limit` and `skip` for search results
2. **Field projection**: Subscribe only to needed fields
3. **Reactive updates**: Minimize `useTracker` dependencies
4. **File streaming**: Use HTTP streaming for large file uploads/downloads
5. **Background processing**: Image processing runs async, returns immediately with pending status

---

## Version History

- **v1.0.0** (2025-10-20): Initial API design for Phase 1
