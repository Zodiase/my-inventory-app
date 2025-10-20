# Feature Specification: Touch-Friendly Inventory Management

**Feature Branch**: `001-touch-friendly-inventory`
**Created**: 2025-10-20
**Status**: Draft
**Input**: User description: "Develop an inventory web app for my own use. this app will be running on local network in my home and access is controlled by anyone with access to the LAN, so no auth is needed. The app will be accessed from iPads and my iPhone from anywhere in the house. So touch friendliness is very important. The app in general provides basic inventory management features like creating, displaying, updating and deleting items. A typical inventory app might have independent concepts like groups, locations and collections. In my design, however, locations are just items that contain other items. Collections can be achieved by looking up items tagged with the same tag, and/or under certain locations (items). So the app needs to also provide creating, displaying, updating and deleting tags, and querying items by a combination of including and excluding tags. Groups are conceptual/logical grouping of items under specific locations, while collections span across locations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Organize Items (Priority: P1)

As a household user, I want to add items to my inventory and organize them by location (container items) so that I can track what I own and where it's stored.

**Why this priority**: This is the core value proposition - without the ability to create and organize items, there is no inventory system. This delivers immediate value by letting users start cataloging their possessions.

**Independent Test**: Can be fully tested by creating a single item, creating a location item (e.g., "Kitchen Cabinet"), and placing the first item inside the location. Delivers the fundamental value of knowing what you have and where it is.

**Acceptance Scenarios**:

1. **Given** I'm on the inventory main screen, **When** I tap the "Add Item" button, **Then** a touch-friendly form appears with fields for item name and optional description
2. **Given** I've filled in item details, **When** I tap "Save", **Then** the item appears in my inventory list
3. **Given** I have an item and a location item, **When** I drag the item onto the location or select "Move to Location", **Then** the item is nested under that location
4. **Given** I'm viewing a location item, **When** I tap to expand it, **Then** I see all items contained within that location
5. **Given** I'm viewing any item, **When** I tap the item, **Then** I see full details including its location path (breadcrumb trail)

---

### User Story 2 - Tag Items for Cross-Location Collections (Priority: P2)

As a household user, I want to tag items with descriptive labels so that I can find all related items across different locations without physically moving them.

**Why this priority**: Tags enable flexible organization beyond physical locations. Essential for finding items by category (e.g., "winter clothes", "electronics", "gift wrap") regardless of where they're stored.

**Independent Test**: Can be fully tested by creating a tag (e.g., "Camping Gear"), applying it to items in different locations, and viewing all items with that tag. Delivers value by enabling logical grouping across physical boundaries.

**Acceptance Scenarios**:

1. **Given** I'm viewing an item, **When** I tap "Add Tag", **Then** I see a touch-friendly tag selection interface
2. **Given** I'm in the tag selector, **When** I type a new tag name and tap "Create", **Then** the new tag is created and applied to the item
3. **Given** I'm in the tag selector, **When** I tap an existing tag, **Then** that tag is applied to the item
4. **Given** I'm on the main screen, **When** I tap a tag from the tag list, **Then** I see all items with that tag across all locations
5. **Given** I'm viewing an item with multiple tags, **When** I tap a tag chip on the item, **Then** I can remove that tag with a confirmation prompt
6. **Given** I'm viewing a tag with multiple items, **When** I long-press the tag name, **Then** I can rename or delete the tag (with warning if items use it)

---

### User Story 3 - Global Search and Context Filtering (Priority: P3)

As a household user, I want to search across my entire inventory with complex queries and filter the current view to focus on relevant items, so that I can quickly find what I need whether I'm browsing or searching.

**Why this priority**: Separating search (global queries) from filter (refine current view) enables both broad discovery ("find all screwdrivers anywhere") and focused refinement ("show only power tools in this toolbox"). This dual approach supports different user workflows efficiently.

**Independent Test**: Can be fully tested by: (1) Using global search to find items across the entire inventory with complex criteria, (2) Browsing a location and applying filters to narrow down what's visible, (3) Applying filters to search results to further refine them. Delivers value by providing flexible discovery and refinement patterns.

**Acceptance Scenarios**:

**Global Search Mode:**

1. **Given** I'm viewing a location, **When** I tap the "Search" button, **Then** I enter search mode with that location as the default search root (scope indicator visible)
2. **Given** I'm on the main screen (no location selected), **When** I tap the "Search" button, **Then** I enter search mode with global scope (all items)
3. **Given** I'm in search mode with a location root, **When** I tap the root/scope indicator, **Then** I can dismiss it to search globally or select a different location root
4. **Given** I'm in search mode, **When** I enter text in the search field, **Then** I see items whose names contain that text (case-insensitive) within the current search scope
5. **Given** I'm in search mode, **When** I select tags to include, **Then** I see only items that have ALL selected tags within the current scope
6. **Given** I'm in search mode, **When** I select tags to exclude, **Then** I see only items that DON'T have any excluded tags within the current scope
7. **Given** I'm in search mode, **When** I specify a container type (by name or tag), **Then** I see only items directly contained within items matching that container specification within the current scope
8. **Given** I'm in search mode, **When** I combine multiple criteria (name + tags + container), **Then** I see only items matching ALL criteria within the current scope
9. **Given** I'm viewing search results, **When** I tap an item, **Then** I see its full details including its location path
10. **Given** I'm in search mode, **When** I tap "Clear" or navigate away, **Then** I exit search mode and return to my previous view

**Context-Aware Filtering:**

9. **Given** I'm viewing a location's contents, **When** I tap the "Filter" button, **Then** I see filter options relevant to items in THIS location only
10. **Given** I'm viewing a location with filters active, **When** I select tags to include/exclude, **Then** I see only items within THIS location that match the filter criteria
11. **Given** I'm viewing search results, **When** I tap the "Filter" button, **Then** I see filter options that will refine the current search results
12. **Given** I have filters active on a view, **When** I navigate to a different location, **Then** the filters are cleared (each location starts with no filters)
13. **Given** I have filters active, **When** I tap "Clear Filters", **Then** all filters are removed and I see the full unfiltered view

---

### User Story 4 - Manage and Delete Items and Tags (Priority: P2)

As a household user, I want to edit or remove items and tags so that I can keep my inventory accurate as things change.

**Why this priority**: Essential for maintaining data quality over time. Items get consumed, locations change, tags become obsolete. Without this, the inventory becomes stale.

**Independent Test**: Can be fully tested by editing an item's name/description, moving it to a different location, and deleting an item or unused tag. Delivers value by enabling ongoing maintenance.

**Acceptance Scenarios**:

1. **Given** I'm viewing an item, **When** I tap the "Edit" button, **Then** I see a touch-friendly form pre-filled with current item details
2. **Given** I've made changes to an item, **When** I tap "Save", **Then** the item is updated and I see the new details
3. **Given** I'm viewing an item, **When** I tap "Delete" and confirm, **Then** the item is permanently removed from the inventory
4. **Given** I'm deleting a location item with contents, **When** I tap "Delete", **Then** I see three options:
   - **Option A**: "Move to parent (mark as 'no container')" - moves all contained items to the parent location and tags them as having lost their container
   - **Option B**: "Choose new container" - prompts me to select a different location for the contained items before deletion
   - **Option C**: "Delete all contents" - shows a list of all items that will be deleted and requires explicit confirmation with item count
5. **Given** I'm viewing the tag list, **When** I tap "Edit" on a tag, **Then** I can rename the tag across all items that use it
6. **Given** I'm deleting a tag, **When** I confirm, **Then** the tag is removed from all items and deleted from the system

---

### User Story 5 - Touch-Optimized Navigation and Interaction (Priority: P1)

As a mobile user on iPad or iPhone, I want all interactions to be touch-friendly with adequate tap targets and intuitive gestures so that I can efficiently manage inventory without a mouse or keyboard.

**Why this priority**: This is a fundamental requirement - without touch optimization, the app fails its primary use case. Must be implemented alongside other features.

**Independent Test**: Can be fully tested by attempting all core actions (create, edit, delete, navigate) using only touch on an iPad or iPhone. Delivers value by making the app actually usable on mobile devices.

**Acceptance Scenarios**:

1. **Given** I'm using an iPad or iPhone, **When** I tap any button or link, **Then** the tap target is at least 44x44 pixels (iOS Human Interface Guidelines)
2. **Given** I'm viewing a list of items or tags, **When** I scroll, **Then** the scrolling is smooth and responsive with momentum
3. **Given** I'm typing in any text field, **When** the keyboard appears, **Then** the input field remains visible and scrolls into view
4. **Given** I need to perform an action on an item, **When** I long-press the item, **Then** a context menu appears with relevant actions (Edit, Delete, Move, Tag)
5. **Given** I'm viewing nested locations, **When** I swipe left or use breadcrumbs, **Then** I can easily navigate up the hierarchy
6. **Given** I'm dragging an item to move it, **When** I drag over a valid drop target (location), **Then** the target visually indicates it can accept the item
7. **Given** any user action is processing, **When** I wait, **Then** I see a clear loading indicator appropriate for mobile (not just a cursor change)

---

### User Story 6 - Item Properties and Attachments (Priority: P1)

As a household user, I want to add detailed properties and attach photos/documents to items so that I can track complete information including serial numbers, purchase details, and visual references.

**Why this priority**: Essential for tracking detailed inventory information. Without properties and attachments, users cannot track serial numbers, warranties, purchase information, or visual references - making the app unusable as a replacement for existing inventory solutions.

**Independent Test**: Can be fully tested by creating an item, adding optional properties (serial number, purchase date), uploading multiple photos with custom labels, attaching a PDF receipt, and duplicating the item as a template. Delivers value by enabling complete item documentation.

**Acceptance Scenarios**:

1. **Given** I'm viewing an item, **When** I tap "Add Property", **Then** I see optional property fields (serial number, make/model, purchase date/from/price, market value, warranty info, condition/notes)
2. **Given** I've added properties to an item, **When** I view the item details, **Then** only properties with values are displayed (empty properties are hidden)
3. **Given** I'm viewing an item, **When** I tap "Upload Photo", **Then** I can select and upload multiple photos, each with a default label (filename) that I can rename
4. **Given** I've uploaded multiple photos, **When** I view the item, **Then** the first photo appears as the thumbnail/preview
5. **Given** I have multiple photos on an item, **When** I long-press a photo, **Then** I can reorder photos or change which is the primary photo
6. **Given** I'm viewing an item, **When** I tap "Attach Document", **Then** I can upload multiple PDF files (receipts, warranty docs), each with a default label (filename) that I can rename
7. **Given** I'm viewing an item in a list, **When** I tap "Open in New Window", **Then** the item opens in a separate browser tab for reference while editing other items
8. **Given** I'm viewing an item, **When** I tap "Duplicate Item", **Then** a new item is created with all properties and attachments copied as a template
9. **Given** I'm editing an item, **When** I have another item open in a different window, **Then** I can copy data between items
10. **Given** I have photos or PDFs attached, **When** I tap an attachment, **Then** I can view it full-screen, rename its label, or delete it

---

### Edge Cases

- What happens when I try to make an item a location of itself (circular reference)?
- What happens when I try to create a location hierarchy that's very deep (e.g., 20 levels)?
- What happens when I delete a location that contains other location items (nested hierarchies)?
- What happens when I search with conflicting criteria (include tag A, exclude tag A)?
- What happens when I search for items in container type "box" but hundreds of items match?
- What happens when I apply filters to a location view that has no items matching the criteria?
- What happens when I'm in search mode and navigate to a location - does search mode persist or exit?
- What happens when I have filters active and then enter search mode?
- What happens when I try to move an item while offline on the local network?
- What happens when the same tag name is created with different capitalization?
- What happens when I try to rename a tag to an existing tag name?
- What happens when I tap rapidly on action buttons (double-submit prevention)?
- What happens when I try to upload a very large photo (>10MB) on a slow local network?
- What happens when a photo has incorrect EXIF orientation data?
- What happens when I duplicate an item that has many attachments (photos and PDFs)?
- What happens when a file upload fails or is corrupted?
- What happens when I rename a photo/PDF label to an empty string?
- What happens when I try to reorder photos while another photo is uploading?
- What happens when I try to export data while attachments are still uploading?
- What happens when I import a backup that was created from a different version of the app?
- What happens when I import a backup with conflicting item IDs?
- What happens when the backup bundle is missing attachment files referenced in the JSON?

## Requirements *(mandatory)*

### Functional Requirements

#### Item Management

- **FR-001**: System MUST allow users to create items with a name (required) and optional description
- **FR-002**: System MUST allow users to update item name and description at any time
- **FR-003**: System MUST allow users to delete items with a confirmation prompt
- **FR-004**: System MUST allow users to designate any item as a "location" that can contain other items
- **FR-005**: System MUST prevent circular references when nesting items (item cannot contain itself directly or indirectly)
- **FR-006**: System MUST display items in a browsable list with clear visual hierarchy for nested items
- **FR-007**: System MUST show the location path (breadcrumb trail) for any item showing its containment hierarchy
- **FR-008**: System MUST persist all item data including relationships (tags, locations)
- **FR-009**: When deleting a location item with contents, system MUST present three options:
  - Move contained items to parent location and mark with "no container" indicator
  - Prompt user to select a new container location for the items before deletion
  - Delete all contained items recursively with explicit confirmation showing all affected items

#### Tag Management

- **FR-010**: System MUST allow users to create tags with a unique name
- **FR-011**: System MUST allow users to apply multiple tags to any item
- **FR-012**: System MUST allow users to remove tags from items
- **FR-013**: System MUST allow users to rename tags, updating all items that use the tag
- **FR-014**: System MUST allow users to delete tags with a confirmation prompt
- **FR-015**: System MUST prevent duplicate tag names (case-insensitive comparison)
- **FR-016**: System MUST display all available tags in a browsable list
- **FR-017**: System MUST show tag usage count (how many items have each tag)
- **FR-018**: System MUST automatically create and apply a "no container" tag when items lose their container due to location deletion

#### Search and Filtering

**Global Search (Dedicated Search Mode):**

- **FR-019**: System MUST provide a dedicated search mode/view accessible from any screen
- **FR-020**: System MUST default search scope to the current location when entering search mode from a location view
- **FR-021**: System MUST default search scope to global (entire inventory) when entering search mode from the main screen
- **FR-022**: System MUST display the current search scope/root prominently with ability to change it
- **FR-023**: System MUST allow users to dismiss the location root to search globally
- **FR-024**: System MUST allow users to select a different location as the search root
- **FR-025**: System MUST allow users to search items by name using text input (case-insensitive partial match) within the current scope
- **FR-026**: System MUST allow users to search by multiple included tags (AND logic - must have all selected tags) within the current scope
- **FR-027**: System MUST allow users to search by excluded tags (NOT logic - must not have any excluded tags) within the current scope
- **FR-028**: System MUST allow users to search by container type (items directly contained in items matching name or tags) within the current scope
- **FR-029**: System MUST allow combining all search criteria simultaneously (name + included tags + excluded tags + container type)
- **FR-030**: System MUST display search results in a list with location paths (breadcrumbs) for context
- **FR-031**: System MUST allow users to clear search criteria and exit search mode

**Context-Aware Filtering (Refines Current View):**

- **FR-032**: System MUST provide filtering controls in location/container views that refine what's displayed
- **FR-033**: System MUST allow filtering the current view by item name (text input, case-insensitive partial match)
- **FR-034**: System MUST allow filtering the current view by tags (multiple selection)
- **FR-035**: System MUST allow filtering the current view by item type (location vs physical item)
- **FR-036**: System MUST show filter status clearly when active (e.g., "Filtering by: tag1, tag2")
- **FR-037**: System MUST allow clearing filters to return to full unfiltered view

#### Item Properties

- **FR-038**: System MUST provide optional property fields for items: serial number, make/model, purchase date, purchase from, purchase price, market value, warranty info, condition/notes
- **FR-039**: System MUST hide properties with empty/null values when displaying item details (only show properties that have values)
- **FR-040**: System MUST allow users to add, edit, and remove any property value at any time
- **FR-041**: System MUST allow users to search/filter items by property values (e.g., find all items with specific make/model)
- **FR-042**: System MUST support date picker for purchase date property on touch devices
- **FR-043**: System MUST support currency input for purchase price and market value properties
- **FR-044**: System MUST display property values in a clear, scannable format in item details view
- **FR-045**: System MUST preserve property values when duplicating an item as a template

#### Attachments (Photos and Documents)

- **FR-046**: System MUST allow users to upload multiple photos per item with no maximum limit
- **FR-047**: System MUST automatically set the first uploaded photo as the item's thumbnail/preview
- **FR-048**: System MUST allow users to reorder photos and change which photo is the primary thumbnail
- **FR-049**: System MUST assign each photo a default label (original filename) that users can rename
- **FR-050**: System MUST allow users to upload multiple PDF documents per item (receipts, warranty docs, manuals)
- **FR-051**: System MUST assign each PDF a default label (original filename) that users can rename
- **FR-052**: System MUST support viewing photos full-screen with zoom and pan gestures
- **FR-053**: System MUST support viewing PDF documents inline or downloading them
- **FR-054**: System MUST allow users to delete individual attachments with confirmation
- **FR-055**: System MUST handle photo EXIF orientation data correctly for proper display
- **FR-056**: System MUST generate optimized thumbnails for photos for fast loading on mobile
- **FR-057**: System MUST enforce reasonable file size limits (e.g., 20MB per file) with clear error messages
- **FR-058**: System MUST support common image formats (JPEG, PNG, HEIC) and PDF documents only
- **FR-059**: System MUST copy all attachments when duplicating an item as a template

#### Advanced Item Operations

- **FR-060**: System MUST allow users to open an item in a new browser window/tab for side-by-side reference
- **FR-061**: System MUST provide a "Duplicate Item" action that creates a new item copying all properties and attachments as a template
- **FR-062**: System MUST support copying and pasting data between item forms across different browser windows

#### Touch Interaction

- **FR-063**: System MUST provide touch targets at least 44×44 pixels for all interactive elements per iOS Human Interface Guidelines
- **FR-064**: System MUST use standard touch gestures (tap, long-press, swipe) that match iOS conventions
- **FR-065**: System MUST support drag-and-drop for moving items between locations on touch devices
- **FR-066**: System MUST support long-press gestures to reveal context menus for items and tags
- **FR-067**: System MUST provide visual feedback for all touch interactions (tap highlights, loading states)
- **FR-068**: System MUST ensure text input fields remain visible when the virtual keyboard appears
- **FR-069**: System MUST support pull-to-refresh for refreshing the current view
- **FR-070**: System MUST prevent double-submission of forms from rapid tapping

#### Data Export and Import

- **FR-071**: System MUST provide a full data export function that creates a single downloadable backup bundle
- **FR-072**: System MUST export all items, tags, properties, and relationships to JSON format within the backup bundle
- **FR-073**: System MUST include all attachment files (photos and PDFs) in the backup bundle with their original filenames and metadata
- **FR-074**: System MUST provide a data import function that accepts a previously exported backup bundle
- **FR-075**: System MUST validate imported data structure and show clear error messages for invalid or corrupted backups
- **FR-076**: System MUST support conflict resolution during import (e.g., "replace all", "keep existing", "merge with new IDs")
- **FR-077**: System MUST restore all attachment files from the backup bundle to the appropriate storage location
- **FR-078**: System MUST preserve all relationships (item containment, tags, properties, attachments) when importing data

#### Network and Access

- **FR-079**: System MUST be accessible via web browser on iOS devices (iPad and iPhone)
- **FR-080**: System MUST work on local network (LAN) without internet connectivity
- **FR-081**: System MUST NOT require user authentication (network access control is sufficient)
- **FR-082**: System MUST handle network interruptions gracefully with appropriate user feedback

### Key Entities *(include if feature involves data)*

- **Item**: Represents anything in the inventory. Has a name, optional description, can contain other items (acting as a location), can have multiple tags applied, and can have optional properties and attachments. Items have timestamps for creation and modification. One-to-many relationship with Properties and Attachments.

- **Property**: Represents optional metadata fields for an item. Includes: serial number, make/model, purchase date, purchase from, purchase price, market value, warranty info, and condition/notes. All fields are optional and nullable. Only non-empty properties are displayed. Properties are copied when duplicating an item.

- **Attachment**: Represents a file (photo or PDF document) attached to an item. Has a type (photo/pdf), a customizable label (defaults to filename), a display order (for photos), a file reference (storage path or GridFS ID), and metadata (file size, mime type, upload timestamp). Photos support full-screen viewing with zoom/pan. First photo serves as item thumbnail. Multiple attachments per item with no maximum limit. Attachments are copied when duplicating an item.

- **Tag**: Represents a descriptive label that can be applied to items. Has a unique name. Tags enable logical grouping across physical locations. A tag can be applied to many items, and an item can have many tags (many-to-many relationship).

- **Containment Relationship**: Represents the parent-child relationship between items where one item (location) contains another. Must prevent circular references. Forms a hierarchical tree structure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new item and place it in a location in under 30 seconds from the main screen
- **SC-002**: Users can find a specific item using tag filters in under 10 seconds when the item is in their inventory
- **SC-003**: All tap targets are accessible with a single finger tap without zooming on iPhone (minimum 44x44 pixel targets)
- **SC-004**: Users can successfully complete all core tasks (create, edit, delete, tag, search) using only touch input on an iPad
- **SC-005**: The application responds to user interactions within 500ms for all UI actions on local network
- **SC-006**: Users can navigate through a location hierarchy of at least 5 levels deep without performance degradation
- **SC-007**: The tag search can filter results from an inventory of at least 1000 items within 1 second
- **SC-008**: Zero data loss occurs during normal operations when creating, updating, or deleting items and tags
- **SC-009**: Users can upload a photo and attach it to an item in under 15 seconds on local network
- **SC-010**: Users can find items by property values (e.g., specific make/model) in under 10 seconds
- **SC-011**: Photo thumbnails load and display within 1 second when browsing items
- **SC-012**: Users can duplicate an item with properties and multiple attachments in under 5 seconds
- **SC-013**: Users can export a complete backup of their inventory (including all attachments) and download it to their device
- **SC-014**: Users can import a backup bundle and restore their complete inventory with zero data loss

## Assumptions

- **Network**: The application runs on a stable local network (home WiFi/LAN) with typical home network latency (<10ms)
- **Devices**: Primary devices are modern iPads and iPhones running iOS 15 or later with Safari or Chrome browsers
- **Concurrent Users**: Typically 1-2 concurrent users (single household), no need for real-time collaboration or conflict resolution beyond basic optimistic locking
- **Data Volume**: Expected inventory size of 100-1000 items with 10-50 tags
- **Location Depth**: Location hierarchies typically 2-5 levels deep (e.g., Room → Shelf → Box → Container)
- **Location Deletion**: User chooses one of three options when deleting a location with contents (move to parent with "no container" tag, choose new container, or delete all with confirmation)
- **Tag Casing**: Tag names are case-insensitive for uniqueness but preserve the original capitalization for display
- **"No Container" Tag**: System-created tag applied to items that lose their container; can be removed manually once items are reorganized
- **File Storage**: Photos and PDFs will be stored using MongoDB GridFS or filesystem, with metadata in MongoDB. Local network bandwidth supports file uploads up to 20MB per file.
- **Image Processing**: Server-side image processing for thumbnail generation and EXIF orientation correction. Thumbnails generated at reasonable resolution for mobile display (~300px width).
- **File Formats**: Supports JPEG, PNG, HEIC for photos and PDF for documents. Modern iOS browsers handle these formats natively.
- **Property Data**: All properties are optional and stored as nullable fields. Empty/null properties are not displayed in UI but are preserved in data model.
- **Attachment Limits**: No hard limit on number of attachments per item, but reasonable usage expected (typically <20 photos, <10 PDFs per item).
- **Item Duplication**: When duplicating items, all properties and attachments are deep-copied. Attachment files are duplicated in storage to maintain independence.
- **Offline Support**: Not required - assumes continuous local network connectivity
- **Browser Compatibility**: Modern mobile browsers with ES6+ support, WebSockets, File API, and touch event APIs
- **Backup Format**: Export creates a single file bundle (e.g., ZIP or custom format) containing JSON metadata and all attachment files. Bundle structure preserves attachment relationships via file references in JSON.
- **Import Behavior**: Default import strategy replaces all existing data. Advanced merge strategies can be added in future iterations.

## Out of Scope

The following are explicitly NOT included in this feature:

- User authentication or authorization systems
- Multi-user collaboration with real-time updates
- Offline mode or Progressive Web App functionality
- Barcode or QR code scanning
- Item quantity tracking or inventory counts
- Batch operations (bulk edit, bulk delete, bulk tag)
- Advanced photo editing (crop, rotate, filters) - only upload and display supported
- Video attachments - only photos and PDFs supported
- Expiration date tracking or reminders
- User-defined custom property types beyond the predefined common properties
- Item sharing or public listings
- Integration with external inventory systems or APIs
- Mobile native apps (web-only for this phase)
- Optical Character Recognition (OCR) for receipts
- Automatic data extraction from photos or PDFs
