# Storybook Stories Inventory

**Date**: November 27, 2025  
**Purpose**: Document available Storybook stories for component testing

## Critical Components for MVP (Phase 3)

### ItemForm
**File**: `meteor-app/imports/ui/ItemForm.stories.tsx`  
**Title**: `UI/ItemForm`  
**Story IDs** (for Playwright tests):
- `ui-itemform--create-mode` - Default create mode, empty form
- `ui-itemform--edit-mode` - Edit mode with pre-filled data
- `ui-itemform--edit-container` - Edit container with isContainer=true
- `ui-itemform--submitting` - Form in loading state
- `ui-itemform--with-error` - Form showing validation error
- `ui-itemform--name-near-limit` - Name field near character limit
- `ui-itemform--name-at-limit` - Name field at character limit
- `ui-itemform--description-near-limit` - Description near limit
- `ui-itemform--description-at-limit` - Description at limit
- `ui-itemform--no-cancel-button` - Form without cancel button
- `ui-itemform--empty-invalid` - Empty form showing validation
- `ui-itemform--long-description` - Form with long description

**Recommended for MVP Testing**:
- `ui-itemform--create-mode` - Basic form submission (T007)
- `ui-itemform--with-error` - Validation testing (T007)

### TouchButton
**File**: `meteor-app/imports/ui/TouchButton.stories.tsx`  
**Title**: `UI/TouchButton`  
**Available**: Yes ✓  
**Usage**: Touch-optimized buttons with visual feedback

**Recommended for US2 Testing** (T010)

### LongPressContextMenu
**File**: `meteor-app/imports/ui/LongPressContextMenu.stories.tsx`  
**Title**: `UI/LongPressContextMenu`  
**Available**: Yes ✓  
**Usage**: iOS-style long-press context menus

**Recommended for US3 Testing** (T015)

## Additional Available Stories

All stories located in `meteor-app/imports/ui/*.stories.tsx`:
- AllItemsView
- AllTagsView
- BreadcrumbTrail
- ContainerSelector
- CreateTagDialog
- DeleteContainerDialog
- DragAndDrop
- FilterBar
- ItemDetailView
- ItemsByTagView
- LoadingSpinner
- SearchBar
- SearchFragmentBuilder
- SearchResultsView
- SearchScopeSelector
- SwipeNavigation
- TagChip
- TagSelector

## Story ID Format

Storybook story IDs follow the pattern:
```
{title-lowercase-dashed}--{story-name-lowercase-dashed}
```

Example:
- Title: `UI/ItemForm`
- Story: `CreateMode`
- ID: `ui-itemform--create-mode`

## Testing URL Pattern

To test a story in Playwright:
```typescript
const storyUrl = `http://localhost:6006/iframe.html?id=ui-itemform--create-mode&viewMode=story`;
await page.goto(storyUrl);
```

Or use the helper:
```typescript
import { gotoStory } from '/tests/e2e/helpers/storybook-helpers';
await gotoStory(page, 'ui-itemform', 'create-mode');
```

## Notes

- All stories exist and are ready for testing ✓
- No new stories needed for MVP (Phase 3)
- Additional stories available for comprehensive coverage (Phase 5)
