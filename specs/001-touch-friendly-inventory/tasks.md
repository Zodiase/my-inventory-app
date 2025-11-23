# Tasks: Touch-Friendly Inventory Management

**Input**: Design documents from `/specs/001-touch-friendly-inventory/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/meteor-methods.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Tests**: This project uses Test-Driven Development (TDD) per Constitution principle II. Tests are written FIRST and must FAIL before implementation begins.

**Storybook**: All UI components should have corresponding Storybook stories for isolated development, testing, and documentation. Stories demonstrate different states and use cases.

**Code Formatting**: All code changes inside `meteor-app/` MUST be formatted with Prettier before committing. The workflow is: make changes → stage files → run `npx prettier --write $(git diff --cached --name-only --diff-filter=ACM | grep '^meteor-app/')` → commit. This formats all staged files in one batch for efficiency. Documentation and spec files outside `meteor-app/` do not need Prettier formatting.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Meteor app root: `meteor-app/`
- Models: `meteor-app/imports/model/`
- API (Methods): `meteor-app/imports/api/`
- UI Components: `meteor-app/imports/ui/`
- Server: `meteor-app/server/`
- Tests: `*.test.ts` files alongside source

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and test infrastructure setup

### Core Dependencies

- [X] T001 Install new dependencies: sharp, archiver, unzipper, mime-types in meteor-app/package.json
- [X] T002 [P] Create PropertyValues interface in meteor-app/imports/model/PropertyValues.ts
- [X] T003 [P] Create Attachment model in meteor-app/imports/model/Attachment.ts
- [X] T004 [P] Update InventoryItem model with properties field and isContainer flag in meteor-app/imports/model/InventoryItem.ts
- [X] T005 Create Attachments collection in meteor-app/imports/api/attachments.ts

### Storybook Setup (Component Testing Infrastructure)

- [X] T001a Install Storybook and related dependencies for React in meteor-app/package.json
- [X] T001b Configure Storybook to work with Meteor's absolute imports and TypeScript in meteor-app/.storybook/
- [X] T001c Verify Storybook runs successfully with npm run storybook from meteor-app/

### Playwright Setup (E2E Testing Infrastructure)

**⚠️ CRITICAL**: Set up E2E testing infrastructure BEFORE implementing user stories to enable TDD

- [X] T001d Install Playwright and related dependencies in package.json (repository root)
- [X] T001e Initialize Playwright configuration in playwright.config.js with mobile viewports (iPad, iPhone)
- [X] T001f Create Playwright test directory structure in tests/e2e/
- [X] T001g Create test helper utilities in tests/e2e/helpers/ (database reset, mock data factories)
- [X] T001h Create smoke test in tests/e2e/app-smoke.spec.ts to verify Playwright setup works
- [X] T001i Verify Playwright tests run successfully with npm run test:e2e
- [X] T001j Add npm scripts for different test modes (headless, UI, specific browsers) to package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create database indexes for Items collection (name, tagIds, containerId, isContainer, properties) in meteor-app/server/main.ts
- [X] T007 [P] Create database indexes for Tags collection (name unique, path) in meteor-app/server/main.ts
- [X] T008 [P] Create database indexes for Attachments collection (itemId+order, itemId+type, fileId) in meteor-app/server/main.ts
- [X] T009 Setup GridFS for file storage in meteor-app/server/gridfs.ts
- [X] T010 [P] Create image processing utilities (thumbnail generation, EXIF correction) in meteor-app/server/imageProcessing.ts
- [X] T011 [P] Create SearchFragment type definitions in meteor-app/imports/model/SearchFragment.ts
- [X] T012 Create search query builder utility (SearchFragment → MongoDB query) in meteor-app/imports/utility/searchQuery.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Organize Items (Priority: P1) 🎯 MVP

**Goal**: Enable users to create items and organize them hierarchically using container relationships

**Independent Test**: Create a single item, create a location item (e.g., "Kitchen Cabinet"), place the first item inside the location, verify breadcrumb trail shows correct path

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

#### Unit Tests (Business Logic)

- [X] T013 [P] [US1] Unit tests for items.create method in meteor-app/imports/api/items.test.ts
- [X] T014 [P] [US1] Unit tests for items.update method in meteor-app/imports/api/items.test.ts
- [X] T015 [P] [US1] Unit tests for items.delete method in meteor-app/imports/api/items.test.ts
- [X] T016 [P] [US1] Unit tests for items.move method in meteor-app/imports/api/items.test.ts
- [X] T017 [P] [US1] Unit tests for items.getPath method in meteor-app/imports/api/items.test.ts
- [X] T018 [P] [US1] Unit tests for circular reference detection in meteor-app/imports/utility/circularReference.test.ts

#### Playwright E2E Tests (Acceptance Criteria)

**⚠️ CRITICAL**: Write E2E tests BEFORE implementing features to enable true TDD workflow

- [X] T013a [P] [US1] E2E test: Create new item from main screen in tests/e2e/item-creation.spec.ts
- [X] T013b [P] [US1] E2E test: Item appears in inventory list after creation in tests/e2e/item-creation.spec.ts
- [X] T013c [P] [US1] E2E test: Nest item under location container in tests/e2e/item-creation.spec.ts
- [X] T013d [P] [US1] E2E test: Expand location to see contained items in tests/e2e/item-creation.spec.ts
- [X] T013e [P] [US1] E2E test: View item details shows location breadcrumb trail in tests/e2e/item-creation.spec.ts
- [X] T013f [P] [US1] E2E test: Verify all touch targets are 44×44px minimum in tests/e2e/item-creation.spec.ts

### Implementation for User Story 1

- [X] T019 [P] [US1] Implement circular reference detection utility in meteor-app/imports/utility/circularReference.ts
- [X] T020 [US1] Implement items.create Meteor Method in meteor-app/imports/api/items.ts
- [X] T021 [US1] Implement items.update Meteor Method (simple ID-based version) in meteor-app/imports/api/items.ts
- [X] T022 [US1] Implement items.delete Meteor Method with container deletion strategies in meteor-app/imports/api/items.ts
- [X] T023 [US1] Implement items.move Meteor Method with circular reference validation in meteor-app/imports/api/items.ts
- [X] T024 [US1] Implement items.getPath Meteor Method (breadcrumb trail) in meteor-app/imports/api/items.ts
- [X] T025 [US1] Create items.all publication in meteor-app/imports/api/items.ts
- [X] T026 [US1] Create items.byContainer publication in meteor-app/imports/api/items.ts
- [X] T027 [P] [US1] Create ItemForm component (create/edit form) in meteor-app/imports/ui/ItemForm.tsx
- [X] T027a [P] [US1] Create Storybook stories for ItemForm in meteor-app/imports/ui/ItemForm.stories.tsx
- [X] T028 [P] [US1] Create ItemDetailView component in meteor-app/imports/ui/ItemDetailView.tsx
- [X] T028a [P] [US1] Create Storybook stories for ItemDetailView in meteor-app/imports/ui/ItemDetailView.stories.tsx
- [X] T029 [P] [US1] Create BreadcrumbTrail component in meteor-app/imports/ui/BreadcrumbTrail.tsx
- [X] T029a [P] [US1] Create Storybook stories for BreadcrumbTrail in meteor-app/imports/ui/BreadcrumbTrail.stories.tsx
- [X] T030 [P] [US1] Create ContainerSelector component for move operations in meteor-app/imports/ui/ContainerSelector.tsx
- [X] T030a [P] [US1] Create Storybook stories for ContainerSelector in meteor-app/imports/ui/ContainerSelector.stories.tsx
- [X] T031 [P] [US1] Create DeleteContainerDialog component with three deletion strategies in meteor-app/imports/ui/DeleteContainerDialog.tsx
- [X] T031a [P] [US1] Create Storybook stories for DeleteContainerDialog in meteor-app/imports/ui/DeleteContainerDialog.stories.tsx
- [X] T032 [US1] Update AllItemsView to support hierarchy display and navigation in meteor-app/imports/ui/AllItemsView.tsx
- [X] T032a [US1] Create Storybook stories for AllItemsView in meteor-app/imports/ui/AllItemsView.stories.tsx
- [X] T033 [US1] Move functionality implemented via ItemDetailView (deferred: full drag-and-drop UI with touch support requires react-dnd with touch backend)

### Optimistic Locking (Future Enhancement for US1)

**Note**: These methods implement optimistic locking as specified in contracts/meteor-methods.md. They accept the current document state and use strictSelector to detect concurrent modifications. Deferred until UI components need conflict detection for better UX.

- [ ] T021a [P] [US1] Implement safelyUpdateInventoryItem with optimistic locking in meteor-app/imports/api/items.ts
- [ ] T021b [P] [US1] Implement safelyMoveItem with optimistic locking in meteor-app/imports/api/items.ts
- [ ] T021c [P] [US1] Implement safelyDeleteInventoryItem with optimistic locking in meteor-app/imports/api/items.ts
- [ ] T021d [P] [US1] Add unit tests for safely* methods with concurrent modification scenarios in meteor-app/imports/api/items.test.ts

**✅ Checkpoint**: User Story 1 COMPLETE (as of 2025-10-29) - users can create items, organize them in containers, see breadcrumb trails, and move items. All components have Storybook stories. Container/presentation pattern documented for Meteor+Storybook compatibility.

---

## Phase 4: User Story 2 - Tag Items for Cross-Location Collections (Priority: P2)

**Goal**: Enable users to create tags and apply them to items for logical grouping across physical locations

**Independent Test**: Create a tag (e.g., "Camping Gear"), apply it to items in different locations, view all items with that tag, verify items from all locations appear in results

### Tests for User Story 2

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

#### Unit Tests (Business Logic)

- [ ] T034 [P] [US2] Unit tests for tags.create method in meteor-app/imports/api/tags.test.ts
- [ ] T035 [P] [US2] Unit tests for tags.rename method in meteor-app/imports/api/tags.test.ts
- [ ] T036 [P] [US2] Unit tests for tags.delete method in meteor-app/imports/api/tags.test.ts
- [ ] T037 [P] [US2] Unit tests for tags.addToItem method in meteor-app/imports/api/tags.test.ts
- [ ] T038 [P] [US2] Unit tests for tags.removeFromItem method in meteor-app/imports/api/tags.test.ts

#### Playwright E2E Tests (Acceptance Criteria)

**⚠️ CRITICAL**: Write E2E tests BEFORE implementing features to enable true TDD workflow

- [ ] T034a [P] [US2] E2E test: Create a new tag in tests/e2e/tag-management.spec.ts
- [ ] T034b [P] [US2] E2E test: Apply tag to item in tests/e2e/tag-management.spec.ts
- [ ] T034c [P] [US2] E2E test: View all items with a specific tag in tests/e2e/tag-management.spec.ts
- [ ] T034d [P] [US2] E2E test: Remove tag from item in tests/e2e/tag-management.spec.ts
- [ ] T034e [P] [US2] E2E test: Rename tag and verify all tagged items updated in tests/e2e/tag-management.spec.ts
- [ ] T034f [P] [US2] E2E test: Delete tag and verify removed from all items in tests/e2e/tag-management.spec.ts
- [ ] T034g [P] [US2] E2E test: Tags are case-insensitive (reject duplicate "camping" and "Camping") in tests/e2e/tag-management.spec.ts

### Implementation for User Story 2

- [X] T039 [US2] Implement tags.create Meteor Method with case-insensitive uniqueness in meteor-app/imports/api/tags.ts
- [X] T040 [US2] Implement tags.rename Meteor Method in meteor-app/imports/api/tags.ts
- [X] T041 [US2] Implement tags.delete Meteor Method with item cleanup in meteor-app/imports/api/tags.ts
- [X] T042 [US2] Implement tags.addToItem Meteor Method in meteor-app/imports/api/tags.ts
- [X] T043 [US2] Implement tags.removeFromItem Meteor Method in meteor-app/imports/api/tags.ts
- [X] T044 [US2] Create tags.all publication in meteor-app/imports/api/tags.ts
- [X] T045 [US2] Create items.byTags publication in meteor-app/imports/api/items.ts
- [X] T046 [P] [US2] Create TagSelector component for applying/removing tags in meteor-app/imports/ui/TagSelector.tsx
- [X] T046a [P] [US2] Create Storybook stories for TagSelector in meteor-app/imports/ui/TagSelector.stories.tsx
- [X] T047 [P] [US2] Create TagChip component for displaying tags on items in meteor-app/imports/ui/TagChip.tsx
- [X] T047a [P] [US2] Create Storybook stories for TagChip in meteor-app/imports/ui/TagChip.stories.tsx
- [X] T048 [P] [US2] Create CreateTagDialog component in meteor-app/imports/ui/CreateTagDialog.tsx
- [X] T048a [P] [US2] Create Storybook stories for CreateTagDialog in meteor-app/imports/ui/CreateTagDialog.stories.tsx
- [X] T049 [US2] Update AllTagsView to display tags with usage counts in meteor-app/imports/ui/AllTagsView.tsx
- [X] T049a [US2] Create Storybook stories for AllTagsView in meteor-app/imports/ui/AllTagsView.stories.tsx
- [X] T050 [US2] Add tag management actions (rename, delete) to AllTagsView in meteor-app/imports/ui/AllTagsView.tsx
- [X] T051 [US2] Update ItemDetailView to display tag chips with remove functionality in meteor-app/imports/ui/ItemDetailView.tsx
- [X] T052 [US2] Create ItemsByTagView component to show all items with selected tag in meteor-app/imports/ui/ItemsByTagView.tsx
- [X] T052a [US2] Create Storybook stories for ItemsByTagView in meteor-app/imports/ui/ItemsByTagView.stories.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can tag items and find items by tags

---

## Phase 5: User Story 5 - Touch-Optimized Navigation and Interaction (Priority: P1)

**Goal**: Ensure all UI interactions meet iOS touch standards (44x44px targets, gestures, visual feedback)

**Independent Test**: Attempt all core actions (create, edit, delete, navigate) using only touch on an iPad or iPhone, verify all tap targets are adequate, gestures work correctly, and feedback is clear

### Tests for User Story 5

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

#### Unit Tests (Business Logic)

- [ ] T053 [P] [US5] Visual regression tests for touch target sizes in meteor-app/tests/visual/touchTargets.test.ts
- [ ] T054 [P] [US5] Integration tests for keyboard visibility handling in meteor-app/tests/integration/keyboard.test.ts

#### Playwright E2E Tests (Acceptance Criteria)

**⚠️ CRITICAL**: Write E2E tests BEFORE implementing features to enable true TDD workflow

- [ ] T053a [P] [US5] E2E test: All tap targets meet 44×44px minimum on mobile viewport in tests/e2e/touch-optimization.spec.ts
- [ ] T053b [P] [US5] E2E test: Long-press on item reveals context menu in tests/e2e/touch-optimization.spec.ts
- [ ] T053c [P] [US5] E2E test: Pull-to-refresh works on item lists in tests/e2e/touch-optimization.spec.ts
- [ ] T053d [P] [US5] E2E test: Swipe-back navigation works in hierarchy in tests/e2e/touch-optimization.spec.ts
- [ ] T053e [P] [US5] E2E test: Visual feedback on button press (iOS-style highlight) in tests/e2e/touch-optimization.spec.ts
- [ ] T053f [P] [US5] E2E test: Keyboard doesn't obscure input fields (viewport adjusts) in tests/e2e/touch-optimization.spec.ts
- [ ] T053g [P] [US5] E2E test: Double-tap prevention on submit buttons in tests/e2e/touch-optimization.spec.ts
- [ ] T053h [P] [US5] E2E test: Smooth scroll with momentum in long lists in tests/e2e/touch-optimization.spec.ts

### Implementation for User Story 5

- [ ] T055 [P] [US5] Audit all interactive elements for 44x44px minimum tap targets in meteor-app/imports/ui/
- [ ] T056 [P] [US5] Create TouchButton component with iOS-style feedback in meteor-app/imports/ui/TouchButton.tsx
- [ ] T056a [P] [US5] Create Storybook stories for TouchButton in meteor-app/imports/ui/TouchButton.stories.tsx
- [ ] T057 [P] [US5] Create LongPressContextMenu component in meteor-app/imports/ui/LongPressContextMenu.tsx
- [ ] T057a [P] [US5] Create Storybook stories for LongPressContextMenu in meteor-app/imports/ui/LongPressContextMenu.stories.tsx
- [ ] T058 [P] [US5] Create LoadingSpinner component for mobile in meteor-app/imports/ui/LoadingSpinner.tsx
- [ ] T058a [P] [US5] Create Storybook stories for LoadingSpinner in meteor-app/imports/ui/LoadingSpinner.stories.tsx
- [ ] T059 [US5] Implement keyboard visibility management utility in meteor-app/imports/utility/keyboardManager.ts
- [ ] T060 [US5] Add pull-to-refresh support to AllItemsView in meteor-app/imports/ui/AllItemsView.tsx
- [ ] T061 [US5] Add long-press context menus to item and tag components
- [ ] T062 [US5] Add double-submission prevention to all forms
- [ ] T063 [US5] Replace all buttons with TouchButton component ensuring adequate sizing
- [ ] T064 [US5] Add smooth scroll with momentum to all scrollable lists
- [ ] T065 [US5] Implement swipe-back navigation for location hierarchy
- [ ] T066 [US5] Add visual feedback for drag-and-drop (highlight drop targets)

**Checkpoint**: All UI interactions should be touch-optimized and feel native on iOS devices

---

## Phase 6: User Story 3 - Global Search and Context Filtering (Priority: P3)

**Goal**: Provide dedicated search mode with scoped queries and context-aware filtering

**Independent Test**: Use global search to find items across entire inventory with complex criteria (name + tags + container type), then browse a location and apply filters to narrow down visible items, verify both modes work correctly

### Tests for User Story 3

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

#### Unit Tests (Business Logic)

- [ ] T067 [P] [US3] Unit tests for search query builder with all fragment types in meteor-app/imports/utility/searchQuery.test.ts
- [ ] T068 [P] [US3] Unit tests for items.search Meteor Method in meteor-app/imports/api/items.test.ts
- [ ] T069 [P] [US3] Integration tests for search scoping behavior in meteor-app/tests/integration/search.test.ts

#### Playwright E2E Tests (Acceptance Criteria)

**⚠️ CRITICAL**: Write E2E tests BEFORE implementing features to enable true TDD workflow

- [ ] T067a [P] [US3] E2E test: Global search finds items across all containers in tests/e2e/search-and-filter.spec.ts
- [ ] T067b [P] [US3] E2E test: Search by item name (partial match, case-insensitive) in tests/e2e/search-and-filter.spec.ts
- [ ] T067c [P] [US3] E2E test: Search by included tags in tests/e2e/search-and-filter.spec.ts
- [ ] T067d [P] [US3] E2E test: Search by excluded tags in tests/e2e/search-and-filter.spec.ts
- [ ] T067e [P] [US3] E2E test: Search by container type in tests/e2e/search-and-filter.spec.ts
- [ ] T067f [P] [US3] E2E test: Scoped search (search within current container only) in tests/e2e/search-and-filter.spec.ts
- [ ] T067g [P] [US3] E2E test: Context filters apply to current view (narrow down visible items) in tests/e2e/search-and-filter.spec.ts
- [ ] T067h [P] [US3] E2E test: Filters cleared when navigating to different location in tests/e2e/search-and-filter.spec.ts
- [ ] T067i [P] [US3] E2E test: Search results show breadcrumb trail for context in tests/e2e/search-and-filter.spec.ts
- [ ] T067j [P] [US3] E2E test: Prevent contradictory filters (same tag included and excluded) in tests/e2e/search-and-filter.spec.ts

### Implementation for User Story 3

- [ ] T070 [US3] Implement items.search Meteor Method using searchQuery utility in meteor-app/imports/api/items.ts
- [ ] T071 [P] [US3] Create SearchBar component with search mode indicator in meteor-app/imports/ui/SearchBar.tsx
- [ ] T071a [P] [US3] Create Storybook stories for SearchBar in meteor-app/imports/ui/SearchBar.stories.tsx
- [ ] T072 [P] [US3] Create SearchScopeSelector component for root/global switching in meteor-app/imports/ui/SearchScopeSelector.tsx
- [ ] T072a [P] [US3] Create Storybook stories for SearchScopeSelector in meteor-app/imports/ui/SearchScopeSelector.stories.tsx
- [ ] T073 [P] [US3] Create SearchFragmentBuilder component (name, tags, container type) in meteor-app/imports/ui/SearchFragmentBuilder.tsx
- [ ] T073a [P] [US3] Create Storybook stories for SearchFragmentBuilder in meteor-app/imports/ui/SearchFragmentBuilder.stories.tsx
- [ ] T074 [P] [US3] Create SearchResultsView component with breadcrumb context in meteor-app/imports/ui/SearchResultsView.tsx
- [ ] T074a [P] [US3] Create Storybook stories for SearchResultsView in meteor-app/imports/ui/SearchResultsView.stories.tsx
- [ ] T075 [P] [US3] Create FilterBar component for context-aware filtering in meteor-app/imports/ui/FilterBar.tsx
- [ ] T075a [P] [US3] Create Storybook stories for FilterBar in meteor-app/imports/ui/FilterBar.stories.tsx
- [ ] T076 [US3] Add search mode navigation to App.tsx
- [ ] T077 [US3] Implement search fragment uniqueness validation (prevent include+exclude same tag)
- [ ] T078 [US3] Update AllItemsView to support filtering current view
- [ ] T079 [US3] Add filter status display and clear functionality
- [ ] T080 [US3] Implement filter clearing on navigation between locations

**Checkpoint**: Users can perform complex global searches and apply contextual filters to any view

---

## Phase 7: User Story 4 - Manage and Delete Items and Tags (Priority: P2)

**Goal**: Enable editing and deletion of items and tags with proper validation and cascading updates

**Independent Test**: Edit an item's name and description, move it to different location, delete an unused tag, delete a container with the three deletion strategy options, verify all operations complete correctly

### Tests for User Story 4

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

#### Unit Tests (Business Logic)

- [ ] T081 [P] [US4] Integration tests for all three container deletion strategies in meteor-app/tests/integration/deleteContainer.test.ts
- [ ] T082 [P] [US4] Unit tests for "no container" tag creation and application in meteor-app/imports/api/tags.test.ts

#### Playwright E2E Tests (Acceptance Criteria)

**⚠️ CRITICAL**: Write E2E tests BEFORE implementing features to enable true TDD workflow

- [ ] T081a [P] [US4] E2E test: Edit item name and description in tests/e2e/item-management.spec.ts
- [ ] T081b [P] [US4] E2E test: Move item to different container in tests/e2e/item-management.spec.ts
- [ ] T081c [P] [US4] E2E test: Delete empty container (no confirmation) in tests/e2e/item-management.spec.ts
- [ ] T081d [P] [US4] E2E test: Delete container with items - Option A (move to parent + "no container" tag) in tests/e2e/item-management.spec.ts
- [ ] T081e [P] [US4] E2E test: Delete container with items - Option B (choose new container) in tests/e2e/item-management.spec.ts
- [ ] T081f [P] [US4] E2E test: Delete container with items - Option C (recursive delete with confirmation) in tests/e2e/item-management.spec.ts
- [ ] T081g [P] [US4] E2E test: Delete unused tag (no confirmation) in tests/e2e/tag-management.spec.ts
- [ ] T081h [P] [US4] E2E test: Delete tag in use shows warning with count in tests/e2e/tag-management.spec.ts
- [ ] T081i [P] [US4] E2E test: Rename tag updates all affected items in tests/e2e/tag-management.spec.ts

### Implementation for User Story 4

- [ ] T083 [US4] Create system "no container" tag on first use in meteor-app/imports/api/tags.ts
- [ ] T084 [US4] Implement container deletion Option A (move to parent + "no container" tag) in items.delete
- [ ] T085 [US4] Implement container deletion Option B (choose new container prompt) in items.delete
- [ ] T086 [US4] Implement container deletion Option C (recursive delete with confirmation) in items.delete
- [ ] T087 [P] [US4] Create EditItemDialog component in meteor-app/imports/ui/EditItemDialog.tsx
- [ ] T087a [P] [US4] Create Storybook stories for EditItemDialog in meteor-app/imports/ui/EditItemDialog.stories.tsx
- [ ] T088 [P] [US4] Create DeleteConfirmationDialog component with affected items list in meteor-app/imports/ui/DeleteConfirmationDialog.tsx
- [ ] T088a [P] [US4] Create Storybook stories for DeleteConfirmationDialog in meteor-app/imports/ui/DeleteConfirmationDialog.stories.tsx
- [ ] T089 [P] [US4] Create EditTagDialog component in meteor-app/imports/ui/EditTagDialog.tsx
- [ ] T089a [P] [US4] Create Storybook stories for EditTagDialog in meteor-app/imports/ui/EditTagDialog.stories.tsx
- [ ] T090 [US4] Add edit and delete actions to ItemDetailView
- [ ] T091 [US4] Add rename and delete actions to AllTagsView with usage warnings
- [ ] T092 [US4] Verify tag rename updates all affected items

**Checkpoint**: Users can fully manage their inventory with proper edit and delete operations

---

## Phase 8: User Story 6 - Item Properties and Attachments (Priority: P1)

**Goal**: Enable detailed item documentation with properties and file attachments

**Independent Test**: Create an item, add optional properties (serial number, purchase date), upload multiple photos with custom labels, attach a PDF receipt, duplicate the item, verify all data is preserved

### Tests for User Story 6

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

#### Unit Tests (Business Logic)

- [ ] T093 [P] [US6] Unit tests for items.updateProperties method in meteor-app/imports/api/items.test.ts
- [ ] T094 [P] [US6] Unit tests for items.clearProperty method in meteor-app/imports/api/items.test.ts
- [ ] T095 [P] [US6] Unit tests for attachments.upload with file validation in meteor-app/imports/api/attachments.test.ts
- [ ] T096 [P] [US6] Unit tests for attachments.delete with GridFS cleanup in meteor-app/imports/api/attachments.test.ts
- [ ] T097 [P] [US6] Unit tests for attachments.reorder method in meteor-app/imports/api/attachments.test.ts
- [ ] T098 [P] [US6] Unit tests for attachments.setPrimary method in meteor-app/imports/api/attachments.test.ts
- [ ] T099 [P] [US6] Unit tests for attachments.updateLabel method in meteor-app/imports/api/attachments.test.ts
- [ ] T100 [P] [US6] Unit tests for image processing (thumbnail, EXIF) in meteor-app/server/imageProcessing.test.ts
- [ ] T101 [P] [US6] Unit tests for items.duplicate method in meteor-app/imports/api/items.test.ts

#### Playwright E2E Tests (Acceptance Criteria)

**⚠️ CRITICAL**: Write E2E tests BEFORE implementing features to enable true TDD workflow

- [ ] T093a [P] [US6] E2E test: Add optional item properties (serial, purchase date, price) in tests/e2e/item-properties.spec.ts
- [ ] T093b [P] [US6] E2E test: Edit existing properties in tests/e2e/item-properties.spec.ts
- [ ] T093c [P] [US6] E2E test: Clear property (set back to empty) in tests/e2e/item-properties.spec.ts
- [ ] T093d [P] [US6] E2E test: Empty properties hidden in display view in tests/e2e/item-properties.spec.ts
- [ ] T093e [P] [US6] E2E test: Upload photo attachment with custom label in tests/e2e/attachments.spec.ts
- [ ] T093f [P] [US6] E2E test: Upload multiple photos (batch upload) in tests/e2e/attachments.spec.ts
- [ ] T093g [P] [US6] E2E test: Upload PDF receipt in tests/e2e/attachments.spec.ts
- [ ] T093h [P] [US6] E2E test: Reorder photos via drag-and-drop in tests/e2e/attachments.spec.ts
- [ ] T093i [P] [US6] E2E test: Set primary photo (thumbnail for list view) in tests/e2e/attachments.spec.ts
- [ ] T093j [P] [US6] E2E test: View photo full-screen with zoom/pan in tests/e2e/attachments.spec.ts
- [ ] T093k [P] [US6] E2E test: View PDF in viewer in tests/e2e/attachments.spec.ts
- [ ] T093l [P] [US6] E2E test: Delete attachment in tests/e2e/attachments.spec.ts
- [ ] T093m [P] [US6] E2E test: Duplicate item with all properties and attachments in tests/e2e/item-management.spec.ts
- [ ] T093n [P] [US6] E2E test: File size validation (reject >20MB) in tests/e2e/attachments.spec.ts
- [ ] T093o [P] [US6] E2E test: MIME type validation (accept JPEG, PNG, HEIC, PDF only) in tests/e2e/attachments.spec.ts
- [ ] T093p [P] [US6] E2E test: Upload progress indicator displayed in tests/e2e/attachments.spec.ts
- [ ] T093q [P] [US6] E2E test: Thumbnail generation for photos in tests/e2e/attachments.spec.ts
- [ ] T093r [P] [US6] E2E test: EXIF orientation correction for photos in tests/e2e/attachments.spec.ts

### Implementation for User Story 6

- [ ] T102 [US6] Implement items.updateProperties Meteor Method in meteor-app/imports/api/items.ts
- [ ] T103 [US6] Implement items.clearProperty Meteor Method in meteor-app/imports/api/items.ts
- [ ] T104 [US6] Implement attachments.upload Meteor Method with file validation in meteor-app/imports/api/attachments.ts
- [ ] T105 [US6] Implement attachments.delete Meteor Method with GridFS cleanup in meteor-app/imports/api/attachments.ts
- [ ] T106 [US6] Implement attachments.reorder Meteor Method in meteor-app/imports/api/attachments.ts
- [ ] T107 [US6] Implement attachments.setPrimary Meteor Method in meteor-app/imports/api/attachments.ts
- [ ] T108 [US6] Implement attachments.updateLabel Meteor Method in meteor-app/imports/api/attachments.ts
- [ ] T109 [US6] Create attachments.byItem publication in meteor-app/imports/api/attachments.ts
- [ ] T110 [US6] Implement HTTP endpoint for file uploads in meteor-app/server/fileUpload.ts
- [ ] T111 [US6] Implement HTTP endpoint for file downloads in meteor-app/server/fileDownload.ts
- [ ] T112 [US6] Implement image processing pipeline (EXIF correction, thumbnail generation) in meteor-app/server/imageProcessing.ts
- [ ] T113 [US6] Implement items.duplicate Meteor Method with deep copy of properties and attachments in meteor-app/imports/api/items.ts
- [ ] T114 [P] [US6] Create PropertyForm component with all optional fields in meteor-app/imports/ui/PropertyForm.tsx
- [ ] T114a [P] [US6] Create Storybook stories for PropertyForm in meteor-app/imports/ui/PropertyForm.stories.tsx
- [ ] T115 [P] [US6] Create PropertyDisplay component (hide empty properties) in meteor-app/imports/ui/PropertyDisplay.tsx
- [ ] T115a [P] [US6] Create Storybook stories for PropertyDisplay in meteor-app/imports/ui/PropertyDisplay.stories.tsx
- [ ] T116 [P] [US6] Create AttachmentGallery component with photo grid and PDF list in meteor-app/imports/ui/AttachmentGallery.tsx
- [ ] T116a [P] [US6] Create Storybook stories for AttachmentGallery in meteor-app/imports/ui/AttachmentGallery.stories.tsx
- [ ] T117 [P] [US6] Create PhotoUploader component with drag-and-drop in meteor-app/imports/ui/PhotoUploader.tsx
- [ ] T117a [P] [US6] Create Storybook stories for PhotoUploader in meteor-app/imports/ui/PhotoUploader.stories.tsx
- [ ] T118 [P] [US6] Create PDFUploader component in meteor-app/imports/ui/PDFUploader.tsx
- [ ] T118a [P] [US6] Create Storybook stories for PDFUploader in meteor-app/imports/ui/PDFUploader.stories.tsx
- [ ] T119 [P] [US6] Create PhotoReorder component with drag-and-drop in meteor-app/imports/ui/PhotoReorder.tsx
- [ ] T119a [P] [US6] Create Storybook stories for PhotoReorder in meteor-app/imports/ui/PhotoReorder.stories.tsx
- [ ] T120 [P] [US6] Create PhotoViewer component (full-screen with zoom/pan) in meteor-app/imports/ui/PhotoViewer.tsx
- [ ] T120a [P] [US6] Create Storybook stories for PhotoViewer in meteor-app/imports/ui/PhotoViewer.stories.tsx
- [ ] T121 [P] [US6] Create PDFViewer component in meteor-app/imports/ui/PDFViewer.tsx
- [ ] T121a [P] [US6] Create Storybook stories for PDFViewer in meteor-app/imports/ui/PDFViewer.stories.tsx
- [ ] T122 [P] [US6] Create AttachmentLabelEditor component in meteor-app/imports/ui/AttachmentLabelEditor.tsx
- [ ] T122a [P] [US6] Create Storybook stories for AttachmentLabelEditor in meteor-app/imports/ui/AttachmentLabelEditor.stories.tsx
- [ ] T123 [US6] Update ItemDetailView to include PropertyForm and AttachmentGallery
- [ ] T124 [US6] Add "Duplicate Item" action button to ItemDetailView
- [ ] T125 [US6] Add "Open in New Window" action to ItemDetailView
- [ ] T126 [US6] Add thumbnail display to AllItemsView (show first photo)
- [ ] T127 [US6] Implement file size validation (20MB limit) with user-friendly errors
- [ ] T128 [US6] Implement MIME type validation (JPEG, PNG, HEIC, PDF only)
- [ ] T129 [US6] Add upload progress indicators for photos and PDFs
- [ ] T130 [US6] Implement retry logic for failed uploads

**Checkpoint**: Users can fully document items with properties and attachments, duplicate items as templates

---

## Phase 9: Export/Import Functionality (Data Backup)

**Goal**: Enable complete data backup and restore with all attachments

**Independent Test**: Export entire inventory, verify ZIP bundle contains manifest.json, data.json, and all attachment files, import bundle into empty database, verify all data restored correctly

### Tests for Export/Import

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

#### Unit Tests (Business Logic)

- [ ] T131 [P] Unit tests for backup.export method in meteor-app/imports/api/backup.test.ts
- [ ] T132 [P] Unit tests for backup.import method in meteor-app/imports/api/backup.test.ts
- [ ] T133 [P] Unit tests for ZIP bundle structure validation in meteor-app/imports/utility/backupFormat.test.ts
- [ ] T134 [P] Integration tests for export-import round-trip in meteor-app/tests/integration/backup.test.ts

#### Playwright E2E Tests (Acceptance Criteria)

**⚠️ CRITICAL**: Write E2E tests BEFORE implementing features to enable true TDD workflow

- [ ] T131a [P] E2E test: Export entire inventory to ZIP bundle in tests/e2e/export-import.spec.ts
- [ ] T131b [P] E2E test: Verify ZIP contains manifest.json, data.json, and all attachments in tests/e2e/export-import.spec.ts
- [ ] T131c [P] E2E test: Import backup into empty database in tests/e2e/export-import.spec.ts
- [ ] T131d [P] E2E test: Verify all items, tags, properties restored after import in tests/e2e/export-import.spec.ts
- [ ] T131e [P] E2E test: Verify all attachments restored and accessible after import in tests/e2e/export-import.spec.ts
- [ ] T131f [P] E2E test: Import with merge strategy (preserve existing data) in tests/e2e/export-import.spec.ts
- [ ] T131g [P] E2E test: Import with replace strategy (clear existing data first) in tests/e2e/export-import.spec.ts
- [ ] T131h [P] E2E test: Import handles missing attachment files with warning in tests/e2e/export-import.spec.ts
- [ ] T131i [P] E2E test: Import validates version compatibility in tests/e2e/export-import.spec.ts
- [ ] T131j [P] E2E test: Progress indicator during export/import in tests/e2e/export-import.spec.ts

### Implementation for Export/Import

- [ ] T135 Implement backup.export Meteor Method (create manifest, data.json, bundle attachments) in meteor-app/imports/api/backup.ts
- [ ] T136 Implement backup.import Meteor Method (validate, restore data, restore files) in meteor-app/imports/api/backup.ts
- [ ] T137 [P] Create ZIP archive utility using archiver library in meteor-app/imports/utility/zipArchive.ts
- [ ] T138 [P] Create ZIP extraction utility using unzipper library in meteor-app/imports/utility/zipExtract.ts
- [ ] T139 [P] Create backup format validation utility in meteor-app/imports/utility/backupFormat.ts
- [ ] T140 Implement HTTP endpoint for backup download in meteor-app/server/backupDownload.ts
- [ ] T141 Implement HTTP endpoint for backup upload in meteor-app/server/backupUpload.ts
- [ ] T142 [P] Create ExportButton component with download trigger in meteor-app/imports/ui/ExportButton.tsx
- [ ] T142a [P] Create Storybook stories for ExportButton in meteor-app/imports/ui/ExportButton.stories.tsx
- [ ] T143 [P] Create ImportDialog component with file picker and strategy selection in meteor-app/imports/ui/ImportDialog.tsx
- [ ] T143a [P] Create Storybook stories for ImportDialog in meteor-app/imports/ui/ImportDialog.stories.tsx
- [ ] T144 [P] Create BackupProgress component showing export/import progress in meteor-app/imports/ui/BackupProgress.tsx
- [ ] T144a [P] Create Storybook stories for BackupProgress in meteor-app/imports/ui/BackupProgress.stories.tsx
- [ ] T145 Add Export and Import buttons to main navigation
- [ ] T146 Implement missing attachment file handling (skip with warning summary)
- [ ] T147 Implement version compatibility checks with best-effort parsing
- [ ] T148 Add referential integrity validation after import

**Checkpoint**: Users can safely backup and restore their complete inventory including all attachments

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T149 [P] Add comprehensive error messages for all API operations
- [ ] T150 [P] Add loading states for all async operations
- [ ] T151 [P] Implement offline detection and user-friendly error messages
- [ ] T152 [P] Add confirmation dialogs for all destructive actions
- [ ] T153 [P] Performance optimization: Add pagination to AllItemsView (100 items per page)
- [ ] T154 [P] Performance optimization: Implement lazy loading for images
- [ ] T155 [P] Performance optimization: Add field projections to all publications
- [ ] T156 [P] Performance optimization: Memoize expensive computations in UI
- [ ] T157 [P] Add aria-labels for accessibility (screen reader support)
- [ ] T158 [P] Add keyboard shortcuts for common actions
- [ ] T159 [P] Create empty state components for all views (no items, no tags, no results)
- [ ] T160 [P] Add toast notifications for successful operations
- [ ] T161 [P] Implement undo functionality for delete operations (optional, time-based recovery)
- [ ] T162 Code cleanup and refactoring for consistency
- [ ] T163 Documentation: Update README.md with setup instructions
- [ ] T164 Documentation: Create API documentation for all Meteor Methods
- [ ] T165 Run quickstart.md validation on iOS device
- [ ] T166 Security: Add rate limiting for file uploads
- [ ] T167 Security: Add CSRF protection for HTTP endpoints
- [ ] T168 Security: Sanitize user input for XSS prevention

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-9)**: All depend on Foundational phase completion
  - Priority P1 stories (US1, US5, US6): Should be implemented first for MVP
  - Priority P2 stories (US2, US4): Can start in parallel with P1 or after P1 complete
  - Priority P3 stories (US3): Can start after P1 stories or in parallel if staffed
  - Export/Import (Phase 9): Can be implemented anytime after US1 and US6
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Create & Organize**: Can start after Foundational - No dependencies on other stories
- **User Story 5 (P1) - Touch-Optimized**: Can start after Foundational - Should be integrated throughout all UI work
- **User Story 6 (P1) - Properties & Attachments**: Depends on US1 (needs items to attach to) - Should be implemented after US1
- **User Story 2 (P2) - Tags**: Can start after Foundational - Integrates with US1 but independently testable
- **User Story 4 (P2) - Manage & Delete**: Depends on US1 and US2 - Should be implemented after both
- **User Story 3 (P3) - Search & Filter**: Depends on US1 and US2 - Should be implemented after both
- **Export/Import**: Depends on US1, US2, US6 - All collections must exist

### MVP Scope (Suggested)

**Minimum Viable Product should include**:
- Phase 1: Setup
- Phase 2: Foundational
- Phase 3: User Story 1 (Create & Organize Items) - Core value
- Phase 5: User Story 5 (Touch-Optimized) - Required for usability
- Phase 8: User Story 6 (Properties & Attachments) - Required for feature parity

This MVP delivers: Item creation, organization, properties, attachments, and touch-friendly interaction - the essential functionality to replace existing inventory app.

### Within Each User Story

1. Tests MUST be written FIRST and FAIL before implementation
2. Models before services
3. Meteor Methods before publications
4. Backend complete before UI components
5. Core components before integration
6. Story complete and independently testable before moving to next priority

### Parallel Opportunities Within User Stories

**Phase 1 (Setup)**: All tasks marked [P] (T002, T003, T004)

**Phase 2 (Foundational)**: Tasks T007-T012 marked [P] can run in parallel

**Phase 3 (US1)**:
- Tests T013-T018 can all run in parallel
- Implementation: T019, T027-T031 marked [P] can run in parallel after T020-T026 complete

**Phase 4 (US2)**:
- Tests T034-T038 can all run in parallel
- Implementation: T046-T048, T052 marked [P] can run in parallel after methods complete

**Phase 5 (US5)**:
- Tests T053-T054 can run in parallel
- Implementation: T055-T058 marked [P] can run in parallel

**Phase 6 (US3)**:
- Tests T067-T069 can run in parallel
- Implementation: T071-T075 marked [P] can run in parallel after T070 complete

**Phase 7 (US4)**:
- Tests T081-T082 can run in parallel
- Implementation: T087-T089 marked [P] can run in parallel after backend complete

**Phase 8 (US6)**:
- Tests T093-T101 can all run in parallel
- Implementation: T114-T122 marked [P] can run in parallel after backend complete

**Phase 9 (Export/Import)**:
- Tests T131-T134 can all run in parallel
- Implementation: T137-T144 marked [P] can run in parallel after T135-T136 complete

**Phase 10 (Polish)**: Most tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task T013: "Unit tests for items.create method in meteor-app/imports/api/items.test.ts"
Task T014: "Unit tests for items.update method in meteor-app/imports/api/items.test.ts"
Task T015: "Unit tests for items.delete method in meteor-app/imports/api/items.test.ts"
Task T016: "Unit tests for items.move method in meteor-app/imports/api/items.test.ts"
Task T017: "Unit tests for items.getPath method in meteor-app/imports/api/items.test.ts"
Task T018: "Unit tests for circular reference detection in meteor-app/imports/utility/circularReference.test.ts"

# Then after implementing methods T020-T024, launch parallel UI tasks:
Task T027: "Create ItemForm component in meteor-app/imports/ui/ItemForm.tsx"
Task T028: "Create ItemDetailView component in meteor-app/imports/ui/ItemDetailView.tsx"
Task T029: "Create BreadcrumbTrail component in meteor-app/imports/ui/BreadcrumbTrail.tsx"
Task T030: "Create ContainerSelector component in meteor-app/imports/ui/ContainerSelector.tsx"
Task T031: "Create DeleteContainerDialog component in meteor-app/imports/ui/DeleteContainerDialog.tsx"
```

---

## Implementation Strategy

### MVP-First Approach

1. **Week 1-2**: Setup + Foundational (Phases 1-2)
   - Install dependencies
   - Create data models
   - Setup GridFS and indexes
   - Create foundational utilities

2. **Week 3-4**: MVP Core (Phase 3 - US1)
   - Implement item CRUD operations
   - Build hierarchy and containment
   - Create basic UI for item management

3. **Week 5**: Touch Optimization (Phase 5 - US5)
   - Ensure all UI meets iOS standards
   - Add touch gestures and feedback
   - Test on actual iOS devices

4. **Week 6-7**: Properties & Attachments (Phase 8 - US6)
   - Implement property management
   - Build file upload system
   - Create photo gallery and PDF viewer

**At this point, MVP is complete and can replace existing inventory app**

5. **Week 8**: Tags (Phase 4 - US2)
   - Add tagging functionality
   - Enable cross-location collections

6. **Week 9**: Management (Phase 7 - US4)
   - Refine edit and delete operations
   - Implement container deletion strategies

7. **Week 10**: Search (Phase 6 - US3)
   - Build search and filter system
   - Enable complex queries

8. **Week 11**: Backup (Phase 9)
   - Implement export/import
   - Ensure data portability

9. **Week 12**: Polish (Phase 10)
   - Performance optimization
   - Final testing and refinement

### Incremental Delivery

Each user story phase delivers independently testable value:
- **After Phase 3**: Basic inventory management works
- **After Phase 5**: Touch-friendly interactions work
- **After Phase 8**: Complete item documentation works (MVP COMPLETE)
- **After Phase 4**: Tag-based collections work
- **After Phase 7**: Full CRUD operations work
- **After Phase 6**: Advanced search works
- **After Phase 9**: Data backup/restore works

---

## Total Task Count: 172 tasks

- Setup: 5 tasks
- Foundational: 7 tasks
- User Story 1: 25 tasks (7 tests + 18 implementation)
- User Story 2: 19 tasks (5 tests + 14 implementation)
- User Story 5: 14 tasks (2 tests + 12 implementation)
- User Story 3: 14 tasks (3 tests + 11 implementation)
- User Story 4: 12 tasks (2 tests + 10 implementation)
- User Story 6: 39 tasks (9 tests + 30 implementation)
- Export/Import: 18 tasks (4 tests + 14 implementation)
- Polish: 19 tasks

**Test Coverage**: 32 test tasks ensuring TDD compliance with Constitution principle II
**Parallel Opportunities**: 70 tasks marked [P] can run concurrently
**Independent User Stories**: 6 stories can be tested and delivered independently
