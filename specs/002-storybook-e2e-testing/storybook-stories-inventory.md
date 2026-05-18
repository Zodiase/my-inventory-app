# Storybook Stories Inventory

**Date**: November 27, 2025
**Purpose**: Document available Storybook stories for component testing

**Last synced**: 2026-05-18 against `meteor-app/imports/ui/*.stories.tsx` and current Playwright Storybook tests.

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
- `ui-itemform--test-submit-behavior` - Test harness exposing submit callback data/count
- `ui-itemform--test-cancel-behavior` - Test harness exposing cancel callback behavior

**Recommended for MVP Testing**:
- `ui-itemform--test-submit-behavior` - Basic form submission and double-submit behavior (T007/T014)
- `ui-itemform--with-error` - Validation testing (T007)
- `ui-itemform--test-cancel-behavior` - Cancellation behavior (T014)

**Current Playwright coverage**: `tests/e2e/storybook/ItemForm.spec.ts`

### TouchButton
**File**: `meteor-app/imports/ui/TouchButton.stories.tsx`
**Title**: `UI/TouchButton`
**Available**: Yes ✓
**Usage**: Touch-optimized buttons with visual feedback

**Story IDs**:
- `ui-touchbutton--primary`
- `ui-touchbutton--secondary`
- `ui-touchbutton--danger`
- `ui-touchbutton--ghost`
- `ui-touchbutton--with-icon`
- `ui-touchbutton--icon-only`
- `ui-touchbutton--loading`
- `ui-touchbutton--disabled`
- `ui-touchbutton--full-width`
- `ui-touchbutton--all-variants`
- `ui-touchbutton--common-actions`
- `ui-touchbutton--sizes`
- `ui-touchbutton--form-buttons`
- `ui-touchbutton--mobile-action-sheet`
- `ui-touchbutton--touch-targets`

**Recommended for US2 Testing** (T010)

**Current Playwright coverage**: `tests/e2e/storybook/TouchButton.spec.ts` (some visual-only states intentionally skipped)

### CreateTagDialog
**File**: `meteor-app/imports/ui/CreateTagDialog.stories.tsx`
**Title**: `UI/CreateTagDialog`
**Available**: Yes ✓
**Usage**: Dialog/form flow used to validate Grommet Layer + form patterns

**Story IDs**:
- `ui-createtagdialog--closed`
- `ui-createtagdialog--open`
- `ui-createtagdialog--with-local-validation-error`
- `ui-createtagdialog--with-duplicate-name-error`
- `ui-createtagdialog--with-network-error`
- `ui-createtagdialog--loading`
- `ui-createtagdialog--with-success-message`
- `ui-createtagdialog--with-long-tag-name`
- `ui-createtagdialog--fully-interactive`
- `ui-createtagdialog--keyboard-navigation`
- `ui-createtagdialog--state-sequence`
- `ui-createtagdialog--test-submit-behavior`

**Current Playwright coverage**: `tests/e2e/storybook/CreateTagDialog.spec.ts`

### LongPressContextMenu
**File**: `meteor-app/imports/ui/LongPressContextMenu.stories.tsx`
**Title**: `UI/LongPressContextMenu`
**Available**: Yes ✓
**Usage**: iOS-style long-press context menus

**Story IDs**:
- `ui-longpresscontextmenu--basic`
- `ui-longpresscontextmenu--item-card`
- `ui-longpresscontextmenu--multiple-items`
- `ui-longpresscontextmenu--disabled-actions`
- `ui-longpresscontextmenu--fast-activation`
- `ui-longpresscontextmenu--sensitive-scroll`
- `ui-longpresscontextmenu--with-callbacks`
- `ui-longpresscontextmenu--touch-targets`
- `ui-longpresscontextmenu--test-interactions` (deterministic Playwright harness)

**Recommended for US3 Testing** (T015). No Playwright Storybook spec exists yet.

## Additional Available Stories

All stories located in `meteor-app/imports/ui/*.stories.tsx`:
- AllItemsView
- AllTagsView
- BreadcrumbTrail
- ContainerSelector
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
import { gotoStory } from '../helpers/storybook-helpers';
await gotoStory(page, 'ui-itemform', 'create-mode');
```

## Notes

- MVP stories exist and are covered for ItemForm; TouchButton and CreateTagDialog also have Storybook Playwright specs.
- LongPressContextMenu stories are complete; Playwright coverage added via `TestInteractions` harness (T015 ✅).
- Additional stories remain available for comprehensive coverage in T016; prioritize critical user workflows before visual-only states.
