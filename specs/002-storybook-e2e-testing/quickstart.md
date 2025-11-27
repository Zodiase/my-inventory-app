# Quickstart: Storybook-First E2E Testing

**Date**: November 27, 2025  
**Feature**: How to write and run component and integration tests using the two-phase approach

## Prerequisites

**IMPORTANT**: Keep Storybook running in a dedicated terminal throughout your testing session. Do not start/stop it for each test run.

```bash
# Terminal 1: Start Storybook (keep this running)
cd meteor-app && npm run storybook
# Wait for: "Storybook 7.x.x started"
# Access at: http://localhost:6006

# Terminal 2: Run tests
npx playwright test tests/e2e/storybook/
```

**Why keep it running?**
- Storybook takes ~30 seconds to start
- Running tests repeatedly is much faster (no startup overhead)
- Matches existing workflow where Meteor app also stays running

**Additional Prerequisites**:
- Meteor app running (for integration tests only): `cd meteor-app && npm start` (default: http://localhost:3000)
- Playwright installed: `npm install` (already done at workspace root)

## Quick Reference

```bash
# Run all tests (Storybook + full app)
npm run test:e2e

# Run ONLY Storybook component tests (fast iteration)
npx playwright test tests/e2e/storybook/

# Run ONLY full app integration tests
npx playwright test tests/e2e/app/

# Run specific component test
npx playwright test tests/e2e/storybook/ItemForm.spec.ts

# Run with UI (headed mode) for debugging
npx playwright test --headed --project=chromium tests/e2e/storybook/ItemForm.spec.ts

# Generate test code (Playwright codegen)
npx playwright codegen http://localhost:6006
```

---

## Workflow: Writing a New Component Test

### Step 1: Verify Storybook Story Exists

Check that the component has a Storybook story in `meteor-app/imports/ui/`:

```bash
# Example: ItemForm.stories.tsx should exist
ls meteor-app/imports/ui/ItemForm.stories.tsx
```

If no story exists, create one first (see Storybook docs). **Don't test components without stories** - the story defines the isolated test environment.

### Step 2: Find Story ID

1. Open Storybook: http://localhost:6006
2. Navigate to your component story (e.g., "ItemForm" → "Default")
3. Look at browser URL - the ID is after `id=`:
   ```
   http://localhost:6006/?path=/story/itemform--default
   Story ID: itemform--default
   ```

### Step 3: Create Test File

Create test file matching component name in `tests/e2e/storybook/`:

```typescript
// tests/e2e/storybook/ItemForm.spec.ts
import { test, expect } from '@playwright/test';
import { ItemFormPage } from '../helpers/page-objects';

test.describe('ItemForm Component', () => {
  test('should fill and submit form successfully', async ({ page }) => {
    // Navigate to story iframe
    await page.goto('http://localhost:6006/iframe.html?id=itemform--default&viewMode=story');
    
    // Use page object (create if doesn't exist)
    const form = new ItemFormPage(page);
    await form.fillName('Test Item Name');
    await form.fillDescription('Test Description');
    await form.submit();
    
    // Verify interaction succeeded
    // NOTE: In Storybook, verify DOM state or console actions
    await expect(page.locator('.success-message')).toBeVisible();
  });
  
  test('should show validation error for empty name', async ({ page }) => {
    await page.goto('http://localhost:6006/iframe.html?id=itemform--default&viewMode=story');
    
    const form = new ItemFormPage(page);
    await form.submit(); // Submit without filling
    
    await expect(page.locator('.error-message')).toContainText('Name is required');
  });
});
```

### Step 4: Create/Update Page Object

If page object doesn't exist, add it to `tests/e2e/helpers/page-objects.ts`:

```typescript
// tests/e2e/helpers/page-objects.ts
export class ItemFormPage {
  constructor(private page: Page) {}
  
  async fillName(name: string) {
    await this.page.fill('input[name="name"]', name);
  }
  
  async fillDescription(description: string) {
    await this.page.fill('textarea[name="description"]', description);
  }
  
  async submit() {
    await this.page.click('button[type="submit"]');
  }
}
```

**IMPORTANT**: Use selectors that work in both Storybook AND full app:
- ✅ `name` attributes: `input[name="name"]`
- ✅ `type` attributes: `button[type="submit"]`
- ✅ `data-testid` attributes: `[data-testid="item-form"]`
- ❌ Avoid: `getByLabel()` with Grommet (label association non-standard)
- ❌ Avoid: Complex CSS selectors that depend on app layout

### Step 5: Run Component Test

```bash
# Run test
npx playwright test tests/e2e/storybook/ItemForm.spec.ts

# Run with UI for debugging
npx playwright test --headed tests/e2e/storybook/ItemForm.spec.ts
```

**Goal**: Achieve 100% pass rate before porting to integration test.

### Step 6: Document Test Pattern

If you discover a new working pattern, document it:

```typescript
// Add comment in page object
export class ItemFormPage {
  // PATTERN: Grommet forms use name attributes, not label association
  // Works in both Storybook and full app contexts
  async fillName(name: string) {
    await this.page.fill('input[name="name"]', name);
  }
}
```

---

## Workflow: Porting to Integration Test

### Step 1: Verify Component Test Passes

**Rule**: Never port to integration until ComponentTest has 100% pass rate.

```bash
# Verify component test passes
npx playwright test tests/e2e/storybook/ItemForm.spec.ts
# Should show: 2 passed
```

### Step 2: Identify User Journey

Integration tests represent complete user workflows:
- "Create new item" (navigation → form → save → verify in list)
- "Edit existing item" (find item → open → edit → save → verify changes)
- "Delete item with confirmation" (find → delete → confirm → verify removed)

### Step 3: Create Integration Test

Use the **same page object** proven in Storybook:

```typescript
// tests/e2e/app/item-creation.spec.ts
import { test, expect } from '@playwright/test';
import { InventoryPage, ItemFormPage } from '../helpers/page-objects';

test.describe('Item Creation User Journey', () => {
  test('User can create new item from main screen', async ({ page }) => {
    // Navigate to full app
    await page.goto('http://localhost:3000');
    
    // Open create dialog (app-specific navigation)
    const inventory = new InventoryPage(page);
    await inventory.clickCreateItem();
    
    // Use PROVEN page object from ComponentTest
    const form = new ItemFormPage(page);
    await form.fillName('Integration Test Item');
    await form.fillDescription('Created in full app');
    await form.submit();
    
    // Verify in full app context (data persistence)
    await inventory.expectItemInList('Integration Test Item');
  });
});
```

### Step 4: Run Integration Test

```bash
# Run integration test
npx playwright test tests/e2e/app/item-creation.spec.ts
```

**If it fails**:
1. Check if ComponentTest still passes → YES: Integration issue, NO: Component regression
2. Check if same selectors work → NO: Document selector portability issue
3. Check timing (full app slower) → Add proper assertions, don't add timeouts

### Step 5: Update Test Pattern Documentation

If you encounter differences between Storybook and full app:

```typescript
// In page object, add comment
export class ItemFormPage {
  async submit() {
    // PATTERN: Click button works in both contexts
    // NOTE: In full app, form is in modal - no additional waiting needed
    await this.page.click('button[type="submit"]');
  }
}
```

---

## Debugging Common Issues

### Issue: "Story not found" when navigating to Storybook URL

**Symptom**: Test fails with timeout on `page.goto()` to story URL

**Solution**:
1. **Verify Storybook is running**: Open http://localhost:6006 in your browser
   - If it's not running, start it: `cd meteor-app && npm run storybook`
   - **Keep it running** - don't stop it between test runs
2. Check story ID is correct (visit story in browser, check URL)
3. Use `iframe.html` view, not main Storybook UI:
   ```typescript
   // ✅ Correct
   await page.goto('http://localhost:6006/iframe.html?id=itemform--default&viewMode=story');
   
   // ❌ Wrong
   await page.goto('http://localhost:6006/?path=/story/itemform--default');
   ```

**Common mistake**: Starting tests without Storybook running. Always verify http://localhost:6006 is accessible first.

### Issue: Selector works in Storybook but not in full app

**Symptom**: ComponentTest passes, IntegrationTest fails with "element not found"

**Debug steps**:
1. Run IntegrationTest with `--headed` flag to see what's happening
2. Check if element is in iframe/modal/shadow DOM in full app
3. Use Playwright Inspector to find working selector:
   ```bash
   npx playwright test --debug tests/e2e/app/item-creation.spec.ts
   ```
4. If selector needs to change, update page object AND re-verify ComponentTest

**Common cause**: Element inside modal in full app, but not in Storybook. Usually selectors still work - verify with Inspector.

### Issue: Form doesn't submit in test

**Symptom**: Button clicks, but form doesn't submit (modal stays open)

**Debug steps**:
1. Verify button selector: `button[type="submit"]` (not text-based)
2. Check if button is actually clickable:
   ```typescript
   await expect(page.locator('button[type="submit"]')).toBeEnabled();
   ```
3. Try explicit wait before clicking:
   ```typescript
   const submitButton = page.locator('button[type="submit"]');
   await submitButton.waitFor({ state: 'visible' });
   await submitButton.click();
   ```
4. Check browser console for JavaScript errors (run with `--headed`)

**Common cause**: In Grommet forms, sometimes Enter key doesn't work - always click button explicitly.

### Issue: Test is flaky (passes sometimes, fails sometimes)

**Symptom**: Same test passes locally, fails in CI, or vice versa

**Debug steps**:
1. Remove all `page.waitForTimeout()` calls - use assertions instead:
   ```typescript
   // ❌ Flaky
   await page.click('button');
   await page.waitForTimeout(1000);
   await expect(page.locator('.result')).toBeVisible();
   
   // ✅ Reliable
   await page.click('button');
   await expect(page.locator('.result')).toBeVisible(); // Auto-retries
   ```
2. Use Playwright's auto-waiting - don't manually wait for elements:
   ```typescript
   // ❌ Manual waiting
   await page.waitForSelector('input[name="name"]');
   await page.fill('input[name="name"]', 'Test');
   
   // ✅ Auto-waiting
   await page.fill('input[name="name"]', 'Test'); // Waits automatically
   ```
3. Check if test depends on specific data - clean up between tests

---

## Best Practices

### DO ✅

- **Write ComponentTest first**, verify 100% pass rate, then port to IntegrationTest
- **Use same page objects** in both contexts - if you need different selectors, that's a red flag
- **Use Playwright assertions** (`expect()`) for auto-retry instead of manual waits
- **Test one interaction pattern at a time** in ComponentTest
- **Document known issues** when selectors/patterns differ between contexts
- **Run tests frequently** during development (fast iteration on Storybook tests)

### DON'T ❌

- **Don't write IntegrationTest without ComponentTest** - always prove in isolation first
- **Don't use fixed timeouts** (`waitForTimeout`) - use assertions
- **Don't duplicate page objects** - keep them context-agnostic
- **Don't test Storybook UI chrome** - always use `iframe.html` view
- **Don't assume component behavior** - run tests to verify, don't claim "it works" without proof
- **Don't mix component and integration concerns** - keep test files separated

---

## Test Organization Checklist

Before committing new tests:

- [ ] ComponentTest exists for component in `tests/e2e/storybook/`
- [ ] ComponentTest has 100% pass rate
- [ ] Page object created/updated in `tests/e2e/helpers/page-objects.ts`
- [ ] Page object uses context-agnostic selectors (name, type, data-testid)
- [ ] IntegrationTest uses same page object (no duplication)
- [ ] IntegrationTest covers complete user journey (not just component interaction)
- [ ] All tests use assertions, not fixed timeouts
- [ ] Known issues documented in page object comments
- [ ] Test file names are descriptive (component name for ComponentTest, user journey for IntegrationTest)

---

## Next Steps

After mastering this workflow:

1. **Expand coverage**: Add ComponentTests for more components (TouchButton, LongPressContextMenu, etc.)
2. **Refactor existing tests**: Port existing IntegrationTests to use proven patterns from ComponentTests
3. **CI/CD integration**: Run Storybook tests on every commit, full E2E on merge to main
4. **Test documentation**: Maintain list of proven test patterns in this guide
