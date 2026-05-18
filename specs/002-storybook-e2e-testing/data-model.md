# Data Model: Storybook-First E2E Testing Strategy

**Date**: November 27, 2025  
**Feature**: Test entities and patterns for two-phase testing approach

## Overview

This feature is a **testing infrastructure enhancement** - it does not introduce new database entities or API endpoints. Instead, it defines the conceptual model for organizing and executing tests across two contexts (Storybook and full Meteor app).

## Test Entities

### ComponentTest

Represents a Playwright test targeting a single component in Storybook isolation.

**Attributes**:
- `storyId: string` - Storybook story identifier (e.g., "itemform--default")
- `storyUrl: string` - Full URL to isolated story iframe (e.g., "http://localhost:6006/iframe.html?id=itemform--default&viewMode=story")
- `componentName: string` - Component under test (e.g., "ItemForm")
- `testFilePath: string` - Path to test file (e.g., "tests/e2e/storybook/ItemForm.spec.ts")
- `pageObjects: PageObject[]` - Reusable page objects used in test
- `testedInteractions: string[]` - List of interaction patterns verified (e.g., ["form submission", "input validation"])

**Purpose**: Validates that a component works correctly in isolation before integrating into full app

**Example**:
```typescript
// tests/e2e/storybook/ItemForm.spec.ts
const componentTest = {
  storyId: 'itemform--default',
  storyUrl: 'http://localhost:6006/iframe.html?id=itemform--default&viewMode=story',
  componentName: 'ItemForm',
  testFilePath: 'tests/e2e/storybook/ItemForm.spec.ts',
  pageObjects: [ItemFormPage],
  testedInteractions: ['fill name field', 'submit form', 'validation error display']
};
```

**Validation Rules**:
- ✅ Story ID must exist in Storybook (verified by navigation succeeding)
- ✅ Component must render without errors in isolation
- ✅ All tested interactions must complete successfully before porting to IntegrationTest

---

### IntegrationTest

Represents a Playwright test targeting the full Meteor app with multiple components interacting.

**Attributes**:
- `userJourney: string` - Description of end-to-end workflow (e.g., "Create item with tag")
- `appUrl: string` - Starting URL in full app (e.g., "http://localhost:3000")
- `testFilePath: string` - Path to test file (e.g., "tests/e2e/app/item-creation.spec.ts")
- `pageObjects: PageObject[]` - Reusable page objects (same as ComponentTest)
- `dependencies: ComponentTest[]` - Component tests that must pass before this integration test is reliable
- `testedWorkflow: string[]` - Sequence of user actions (e.g., ["navigate to items", "click create", "fill form", "save", "verify in list"])

**Purpose**: Validates complete user workflows across multiple components and app integration points

**Example**:
```typescript
// tests/e2e/app/item-creation.spec.ts
const integrationTest = {
  userJourney: 'Create new inventory item',
  appUrl: 'http://localhost:3000',
  testFilePath: 'tests/e2e/app/item-creation.spec.ts',
  pageObjects: [InventoryPage, ItemFormPage],
  dependencies: [ItemFormComponentTest], // Must pass first
  testedWorkflow: [
    'click Create Item button',
    'fill item form',
    'submit form',
    'verify item appears in list',
    'verify item persisted to MongoDB'
  ]
};
```

**Validation Rules**:
- ✅ All dependent ComponentTests must have 100% pass rate
- ✅ Integration test uses proven selectors from ComponentTests
- ✅ End-to-end workflow includes data persistence verification (not just UI state)

---

### TestPattern

Represents a reusable testing approach (selectors + interactions + assertions) validated in Storybook.

**Attributes**:
- `patternName: string` - Descriptive name (e.g., "Form submission with validation")
- `selectors: Selector[]` - List of selectors used (e.g., 'input[name="name"]', 'button[type="submit"]')
- `interactionSequence: string[]` - Ordered steps (e.g., ["fill name", "fill description", "click submit"])
- `assertions: string[]` - Expected outcomes (e.g., ["form clears", "success message appears"])
- `validatedInStorybook: boolean` - Whether pattern proven in ComponentTest
- `portedToIntegration: boolean` - Whether pattern successfully used in IntegrationTest
- `knownIssues: string[]` - Context-specific quirks (e.g., ["Grommet FormField doesn't work with getByLabel"])

**Purpose**: Captures proven testing approaches that can be reused across multiple tests

**Example**:
```typescript
const formSubmissionPattern: TestPattern = {
  patternName: 'Submit Grommet form with name attribute selectors',
  selectors: [
    'input[name="name"]',
    'textarea[name="description"]',
    'button[type="submit"]'
  ],
  interactionSequence: [
    'page.fill("input[name=\\"name\\"]", value)',
    'page.fill("textarea[name=\\"description\\"]", value)',
    'page.click("button[type=\\"submit\\"]")'
  ],
  assertions: [
    'expect(page.locator(".success-message")).toBeVisible()',
    'expect(page.locator("input[name=\\"name\\"]")).toHaveValue("")' // Form clears
  ],
  validatedInStorybook: true,
  portedToIntegration: true,
  knownIssues: [
    'Cannot use getByLabel() with Grommet FormField - label association is not standard HTML',
    'Must use name attributes for form fields',
    'Submit button must be clicked, Enter key doesn\'t always work'
  ]
};
```

**Validation Rules**:
- ✅ Pattern must pass in ComponentTest before `validatedInStorybook = true`
- ✅ Pattern must pass in IntegrationTest before `portedToIntegration = true`
- ✅ Known issues must be documented with workarounds

---

### PageObject

Represents a test abstraction layer containing selectors and interaction methods, usable in both Storybook and full app tests.

**Attributes**:
- `className: string` - Class name (e.g., "ItemFormPage")
- `filePath: string` - File path (e.g., "tests/e2e/helpers/page-objects.ts")
- `selectors: Record<string, string>` - Named selectors (e.g., `nameInput: 'input[name="name"]'`)
- `methods: string[]` - Interaction methods (e.g., ["fillName()", "fillDescription()", "submit()"])
- `contextAgnostic: boolean` - Whether page object works in both Storybook and full app
- `usedInComponentTests: boolean` - Whether used in any ComponentTest
- `usedInIntegrationTests: boolean` - Whether used in any IntegrationTest

**Purpose**: Encapsulates selectors and interactions to keep tests readable and maintainable

**Example**:
```typescript
class ItemFormPage {
  constructor(private page: Page) {}
  
  // Selectors
  private selectors = {
    nameInput: 'input[name="name"]',
    descriptionInput: 'textarea[name="description"]',
    submitButton: 'button[type="submit"]',
    successMessage: '.success-message'
  };
  
  // Methods (context-agnostic)
  async fillName(name: string) {
    await this.page.fill(this.selectors.nameInput, name);
  }
  
  async fillDescription(description: string) {
    await this.page.fill(this.selectors.descriptionInput, description);
  }
  
  async submit() {
    await this.page.click(this.selectors.submitButton);
  }
  
  async expectSuccess() {
    await expect(this.page.locator(this.selectors.successMessage)).toBeVisible();
  }
}

// Usage is identical in both contexts
const itemForm = new ItemFormPage(page);
await itemForm.fillName('Test Item');
await itemForm.submit();
await itemForm.expectSuccess();
```

**Validation Rules**:
- ✅ Page object must work in ComponentTest (Storybook) before use in IntegrationTest
- ✅ Selectors must not assume full app DOM structure (e.g., no navigation selectors in form page object)
- ✅ Methods must use Playwright auto-waiting, not fixed timeouts

---

## Entity Relationships

```
ComponentTest (validates component in isolation)
    ├── uses PageObject (shared with IntegrationTest)
    ├── validates TestPattern (proven approach)
    └── prerequisite for IntegrationTest

IntegrationTest (validates full workflow)
    ├── uses PageObject (same as ComponentTest)
    ├── applies TestPattern (from ComponentTest)
    └── depends on ComponentTest passing

TestPattern (reusable approach)
    ├── validated in ComponentTest
    ├── ported to IntegrationTest
    └── captured in PageObject methods

PageObject (test abstraction)
    ├── used by ComponentTest
    ├── used by IntegrationTest
    └── implements TestPattern
```

---

## State Transitions

### TestPattern Lifecycle

```
1. [Unvalidated] → (ComponentTest passes) → [Validated in Storybook]
2. [Validated in Storybook] → (IntegrationTest passes) → [Ported to Integration]
3. [Ported to Integration] → (Known issues documented) → [Production Ready]
```

**Transition Rules**:
- Cannot skip Storybook validation - all patterns must prove in isolation first
- Cannot port to integration until ComponentTest has 100% pass rate
- Must document known issues encountered during porting

### ComponentTest → IntegrationTest Flow

```
1. Write ComponentTest for isolated component in Storybook
2. Run ComponentTest until 100% pass rate achieved
3. Document proven selectors and interaction patterns in TestPattern
4. Create/update PageObject with working patterns
5. Write IntegrationTest using same PageObject
6. Run IntegrationTest - if fails, isolate whether issue is:
   - Component bug (go back to ComponentTest)
   - Selector portability issue (update PageObject + TestPattern known issues)
   - Integration issue (fix integration, not component)
```

---

## Example: End-to-End Flow

**Scenario**: Test ItemForm component, then port to full app item creation workflow

**Phase 1: Component Test**
```typescript
// tests/e2e/storybook/ItemForm.spec.ts
test('ItemForm submits with valid data', async ({ page }) => {
  // Navigate to Storybook story
  await page.goto('http://localhost:6006/iframe.html?id=itemform--default&viewMode=story');
  
  // Use page object
  const form = new ItemFormPage(page);
  await form.fillName('Test Item');
  await form.fillDescription('Test Description');
  await form.submit();
  
  // Verify (proves TestPattern works)
  await form.expectSuccess();
});
```

**Result**: TestPattern validated in Storybook ✅

**Phase 2: Integration Test**
```typescript
// tests/e2e/app/item-creation.spec.ts
test('User can create new item', async ({ page }) => {
  // Navigate to full app
  await page.goto('http://localhost:3000');
  
  // Open create dialog
  const inventory = new InventoryPage(page);
  await inventory.clickCreateItem();
  
  // Use SAME page object with PROVEN pattern
  const form = new ItemFormPage(page);
  await form.fillName('Real Item');
  await form.fillDescription('Real Description');
  await form.submit();
  
  // Verify in full app context
  await inventory.expectItemInList('Real Item');
});
```

**Result**: TestPattern ported to integration successfully ✅

---

## Non-Goals

This data model does NOT include:

- **Database schema changes**: No MongoDB collections modified
- **API contracts**: No new Meteor Methods or REST endpoints
- **UI state models**: Component state is tested, not modeled
- **Test results storage**: Test outcomes stored by Playwright/CI, not custom system
- **Performance metrics**: Tracked separately in CI/CD, not part of data model

---

## Validation Summary

| Entity | Key Validation | Enforcement |
|--------|----------------|-------------|
| **ComponentTest** | Story must render, interactions must pass | Playwright test assertions |
| **IntegrationTest** | Dependencies must pass, workflow must complete | Playwright test assertions + documented prerequisites |
| **TestPattern** | Must validate in Storybook before porting | Manual checklist during code review |
| **PageObject** | Must work in both contexts | Integration test reuses same object |
