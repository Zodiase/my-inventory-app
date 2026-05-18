# Quickstart: Storybook-First E2E Testing

**Date**: November 27, 2025
**Feature**: How to write and run component and integration tests using the two-phase approach

**Last synced**: 2026-05-18 after the Storybook/App E2E implementation landed outside the original Speckit command flow.

**Current coverage snapshot**:
- Storybook project/config exists in `playwright.config.js` as `storybook-chromium`.
- Storybook component tests exist for `ItemForm`, `CreateTagDialog`, `TouchButton`, `LongPressContextMenu`, `SearchBar`, and `TagSelector`, plus Storybook helper behavior.
- Full-app tests exist under `tests/e2e/app/`; their current repair status is tracked in `tasks.md` and implementation tracker docs, not assumed green here.

## Prerequisites

Playwright can either auto-start Meteor and Storybook through `webServer` entries in `playwright.config.js`, or run against already-started local servers when `PLAYWRIGHT_SKIP_WEBSERVER=1` is set.

**Manual fast-iteration workflow**: keep Storybook and/or Meteor running in dedicated terminals throughout a testing session. Do not start/stop them for each test run.

```bash
# Terminal 1: Start Storybook from the repo root (keep this running)
npm run storybook
# Wait for Storybook 10.x to report it is ready
# Access at: http://localhost:6006

# Terminal 2: Run Storybook tests against the existing server
npm run test:e2e:skip-server:headless -- tests/e2e/storybook/ --project=storybook-chromium
```

**Why keep it running?**
- Storybook takes ~30 seconds to start
- Running tests repeatedly is much faster (no startup overhead)
- Matches existing workflow where Meteor app also stays running

**Additional prerequisites**:
- Meteor app running for manual full-app integration tests: `npm start` from the repo root (default: http://localhost:3000)
- Dependencies installed at the repo root and in `meteor-app/` via the documented setup/CI workflow

## Quick Reference

```bash
# Run all tests (Storybook + full app)
npm run test:e2e

# Run ONLY Storybook component tests (fast iteration)
npm run test:e2e:storybook -- --project=storybook-chromium

# Run ONLY full app integration tests
npm run test:e2e:app -- --project=chromium

# Run specific component test
npm run test:e2e:storybook -- tests/e2e/storybook/ItemForm.spec.ts --project=storybook-chromium

# Run a callback-driven harness example
npm run test:e2e:storybook -- tests/e2e/storybook/SearchBar.spec.ts --project=storybook-chromium

# Run a touch-target example
npm run test:e2e:storybook -- tests/e2e/storybook/TagSelector.spec.ts --project=storybook-chromium

# Run with UI (headed mode) for debugging
npm run test:e2e:headed -- tests/e2e/storybook/ItemForm.spec.ts --project=storybook-chromium

# Run against already-started local servers
npm run test:e2e:skip-server:headless -- tests/e2e/storybook/ --project=storybook-chromium

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
   http://localhost:6006/?path=/story/ui-itemform--test-submit-behavior
   Story ID: ui-itemform--test-submit-behavior
   ```

### Step 3: Create Test File

Create test file matching component name in `tests/e2e/storybook/`:

```typescript
// tests/e2e/storybook/ItemForm.spec.ts
import { test, expect } from '@playwright/test';
import { gotoStory } from '../helpers/storybook-helpers';
import { ItemFormPage } from '../helpers/page-objects';

test.describe('ItemForm Component', () => {
  test('should fill and submit form successfully', async ({ page }) => {
    // Navigate to story iframe
    await gotoStory(page, 'ui-itemform', 'test-submit-behavior');

    // Use page object (create if doesn't exist)
    const form = new ItemFormPage(page);
    await form.fillName('Test Item Name');
    await form.fillDescription('Test Description');
    await form.submit();

    // Verify interaction succeeded
    // NOTE: In Storybook, verify DOM state or console actions
    await expect(page.locator('[data-testid="submit-count"]')).toHaveText('1');
  });

  test('should show validation error for empty name', async ({ page }) => {
    await gotoStory(page, 'ui-itemform', 'test-submit-behavior');

    const form = new ItemFormPage(page);
    await expect(form.saveButton).toBeDisabled();

    await form.fillName('a');
    await expect(form.saveButton).toBeEnabled();
    await form.nameInput.clear();
    await expect(form.saveButton).toBeDisabled();
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
npm run test:e2e:storybook -- tests/e2e/storybook/ItemForm.spec.ts --project=storybook-chromium

# Run with UI for debugging
npm run test:e2e:headed -- tests/e2e/storybook/ItemForm.spec.ts --project=storybook-chromium
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

## US3 Examples: Callback Harnesses and Touch Targets

### Example: SearchBar callback-driven behavior

`SearchBar` is a good example of a component whose important behavior is mostly callback-driven. The `TestInteractions` story keeps the component realistic while rendering callback results into the DOM.

```typescript
test('should update query and execute search on Enter', async ({ page }) => {
  await gotoStory(page, 'ui-searchbar', 'test-interactions');

  const input = page.getByRole('textbox', { name: 'Search query' });
  await input.fill('camp stove');
  await input.press('Enter');

  await expect(page.getByTestId('last-search')).toHaveText('camp stove');
  await expect(page.getByTestId('search-count')).toHaveText('1');
});
```

**Why this pattern matters**:
- Storybook action logs are useful for manual inspection, but Playwright needs deterministic DOM-visible state.
- The harness keeps selectors user-facing (`role`, accessible name) and reserves `data-testid` for test-only state.
- The same story also validates scoped search UI and clear-button touch targets.

### Example: TagSelector hidden-input + touch-target behavior

`TagSelector` uses Grommet `CheckBox`, which renders a hidden native input. The reliable test target is the visible label/touch area, not the hidden input itself.

```typescript
test('should keep tag rows touch-friendly', async ({ page }) => {
  await gotoStory(page, 'ui-tagselector', 'test-interactions');

  const touchTarget = page.getByTestId('tag-touch-target-tag3');
  const box = await touchTarget.boundingBox();

  if (box === null) throw new Error('Tag touch target is not visible');
  expect(box.height).toBeGreaterThanOrEqual(44);
});
```

**What changed after T016**:
- The visible label content now exposes a real 44px touch target.
- Tests click the visible row/test harness target instead of trying to `check()` the hidden native input.
- This is the pattern to reuse when porting touch-heavy checkbox interactions into full-app tests.

### Example: LongPressContextMenu gesture timing

`LongPressContextMenu` is the main US3 example where one intentional gesture delay is still appropriate. Keep the threshold wait inside a single helper that matches the component's long-press contract instead of scattering arbitrary waits throughout the test.

```typescript
const longPress = async (page: Page, target: Locator): Promise<void> => {
  const box = await target.boundingBox();
  if (box === null) throw new Error('Long-press target is not visible');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
};
```

**Rule of thumb**: fixed waits are still an anti-pattern for general readiness checks, but gesture-threshold waits are acceptable when they model the product behavior directly and stay encapsulated in one helper.

---

## Workflow: Porting to Integration Test

### Step 1: Verify Component Test Passes

**Rule**: Never port to integration until ComponentTest has 100% pass rate.

```bash
# Verify component test passes
npm run test:e2e:storybook -- tests/e2e/storybook/ItemForm.spec.ts --project=storybook-chromium
# Should pass the file's active tests; skipped tests must remain intentional and documented.
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
npm run test:e2e:app -- tests/e2e/app/item-creation.spec.ts --project=chromium
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
   await page.goto('http://localhost:6006/iframe.html?id=ui-itemform--test-submit-behavior&viewMode=story');

   // ❌ Wrong
   await page.goto('http://localhost:6006/?path=/story/ui-itemform--test-submit-behavior');
   ```

**Common mistake**: Starting tests without Storybook running. Always verify http://localhost:6006 is accessible first.

### Issue: Selector works in Storybook but not in full app

**Symptom**: ComponentTest passes, IntegrationTest fails with "element not found"

**Debug steps**:
1. Run IntegrationTest with `--headed` flag to see what's happening
2. Check if element is in iframe/modal/shadow DOM in full app
3. Use Playwright Inspector to find working selector:
   ```bash
   npm run test:e2e:debug -- tests/e2e/app/item-creation.spec.ts --project=chromium
   ```
4. If selector needs to change, update page object AND re-verify ComponentTest

**Common cause**: Element inside modal in full app, but not in Storybook. Usually selectors still work - verify with Inspector.

### Issue: Callback-driven story works manually, but test has nothing stable to assert

**Symptom**: You can see Storybook actions firing, but Playwright has no deterministic DOM change to assert.

**Debug steps**:
1. Add a dedicated `TestInteractions` story instead of overloading the visual/default story.
2. Render callback counts and last payloads with `data-testid` values like `last-search`, `search-count`, or `last-toggle`.
3. Keep the component interaction realistic - user-facing controls should still use `getByRole()` / accessible names.
4. Re-run the Storybook test before porting anything to the full app.

**Common cause**: Relying on Storybook actions or console logging instead of DOM-visible harness state.

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

### Issue: Grommet checkbox exists, but clicking/checking is flaky or misses the touch target

**Symptom**: `getByRole('checkbox')` resolves, but the interaction is unreliable, or the measured touch area is smaller than 44px.

**Debug steps**:
1. Confirm whether the component uses Grommet `CheckBox` with a hidden native input.
2. Target the visible label/touch area instead of the hidden input.
3. Measure the visible interactive element with `boundingBox()` - not just a surrounding container.
4. If the visible label is undersized, fix the component so the label content itself reaches the 44px minimum.

**Common cause**: The native checkbox input is hidden, and the visually large row is not the real clickable element.

### Issue: Long-press menu never opens in Storybook

**Symptom**: The menu is never shown even though the pointer is over the correct target.

**Debug steps**:
1. Verify the story renders a deterministic long-press target such as `data-testid="long-press-target"`.
2. Use a helper that presses down, waits for the component's configured threshold, and then releases.
3. Keep that delay isolated to the long-press helper; do not translate it into generic waits elsewhere.
4. Assert the menu container directly (`context-menu`) after the gesture.

**Common cause**: The test releases too quickly, so it performs a click/tap instead of a long press.

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
- **Use deterministic harness stories** for callback-driven components instead of asserting Storybook actions
- **Measure the visible interactive element** when validating 44px touch targets

### DON'T ❌

- **Don't write IntegrationTest without ComponentTest** - always prove in isolation first
- **Don't use fixed timeouts** (`waitForTimeout`) - use assertions
- **Don't duplicate page objects** - keep them context-agnostic
- **Don't test Storybook UI chrome** - always use `iframe.html` view
- **Don't assume component behavior** - run tests to verify, don't claim "it works" without proof
- **Don't mix component and integration concerns** - keep test files separated
- **Don't assert against hidden native inputs** when Grommet renders a separate visible label target

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

	1. **Measure performance goals (T021)**: Record Storybook and full-app execution times back in `tasks.md`/`plan.md` when measured.
	2. **Repair/expand full-app E2E**: Keep porting proven Storybook selectors/page objects into `tests/e2e/app/` and record current app-suite status separately.
	3. **Maintain documentation**: Update `test-patterns.md`, this quickstart, and the story inventory whenever new patterns or stories become part of the testing contract.
