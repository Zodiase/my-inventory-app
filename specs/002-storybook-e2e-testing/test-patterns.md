# Test Pattern Catalog

**Purpose**: Document proven test patterns for the Storybook-first E2E testing strategy

**Status**: Living document - update as new patterns are discovered

**Last synced**: 2026-05-18 against current Storybook specs (`ItemForm`, `CreateTagDialog`, `TouchButton`, `LongPressContextMenu`, `SearchBar`, `TagSelector`) and app E2E helpers.

---

## Pattern 1: Grommet Form Submission Pattern

**Status**: ✅ Validated in Storybook (T007) | ✅ Ported to Integration (T008)

**Use Case**: Testing forms built with Grommet FormField components

**Problem Solved**: Grommet's FormField component breaks the standard `getByLabel()` selector pattern because labels are not properly associated with inputs via `for`/`id` attributes.

### Selectors Used

```typescript
// ✅ CORRECT - Use name attribute selectors
const nameInput = page.locator('input[name="name"]');
const descriptionInput = page.locator('textarea[name="description"]');
const submitButton = page.locator('button[type="submit"]');

// ❌ INCORRECT - Do NOT use getByLabel with Grommet
const nameInput = page.getByLabel('Name'); // FAILS - label not associated
const nameInput = page.getByRole('textbox', { name: 'Name' }); // FAILS - no accessible name
```

### Interaction Sequence

1. Navigate to form (Storybook story or app page)
2. Fill fields using `fill()` method with name attribute selectors
3. Click submit button using `type="submit"` selector
4. Verify submission via DOM changes or callback data

### Example Implementation

```typescript
// Page Object Pattern
export class ItemFormPage {
    constructor(public readonly page: Page) {}

    get nameInput() { return this.page.locator('input[name="name"]'); }
    get descriptionInput() { return this.page.locator('textarea[name="description"]'); }
    get submitButton() { return this.page.locator('button[type="submit"]'); }

    async fillName(value: string) { await this.nameInput.fill(value); }
    async fillDescription(value: string) { await this.descriptionInput.fill(value); }
    async submit() { await this.submitButton.click(); }
}

// Test Usage
test('should submit form', async ({ page }) => {
    const form = new ItemFormPage(page);
    await form.fillName('Test Item');
    await form.fillDescription('Test Description');
    await form.submit();

    // Verify submission
    await expect(page.locator('[data-testid="submit-count"]')).toHaveText('1');
});
```

### Behavior Validation

- **Successful submission**: Form clears, callback fires with correct data
- **Validation errors**: Error messages appear in DOM when data is invalid
- **Double-submission prevention**: useRef guard prevents multiple submissions
- **Field state**: Input values persist during interaction until submit

### Known Limitations

- **Grommet-specific**: This pattern only applies to Grommet FormField components
- **No accessible names**: Cannot use ARIA-based selectors
- **Must use `name` attributes**: All form fields must have explicit `name` attributes

### References

- Validated in: `tests/e2e/storybook/ItemForm.spec.ts` (T014)
- Ported to: `tests/e2e/app/item-creation.spec.ts` (T008)
- Page Object: `tests/e2e/helpers/page-objects.ts` → `ItemFormPage`

---

## Pattern 2: Grommet Dialog Form Submission Pattern

**Status**: ✅ Validated in Storybook (T011) | ✅ Ported to Integration (T012)

**Use Case**: Testing forms displayed inside Grommet Layer/Dialog components

**Problem Solved**: Grommet dialogs use portals and overlays which can interfere with test selectors and timing

### Key Differences from Standard Form Pattern

1. **Wait for dialog open**: Must wait for dialog Layer to be visible before interacting
2. **Wait for dialog close**: Must wait for dialog to close after submission
3. **Separate logic from presentation**: Test the form component directly, not the dialog wrapper

### Component Architecture

```typescript
// Logic Component (Testable)
export const CreateTagForm: React.FC<Props> = ({ onSubmit, onClose }) => {
    // All form logic here
    return <Form>...</Form>;
};

// Presentation Wrapper (Uses logic component)
export const CreateTagDialog: React.FC<Props> = ({ isOpen, ...props }) => {
    if (!isOpen) return null;
    return <Layer><CreateTagForm {...props} /></Layer>;
};
```

### Test Story Pattern

```typescript
// Create test-specific story that exposes behavior in DOM
export const TestSubmitBehavior: Story = {
    render: () => {
        const [submitData, setSubmitData] = useState(null);
        const [submitCount, setSubmitCount] = useState(0);

        return (
            <>
                <CreateTagForm
                    onSubmit={async (data) => {
                        setSubmitData(data);
                        setSubmitCount((c) => c + 1);
                        // Include realistic delay for double-submit testing
                        await new Promise((resolve) => setTimeout(resolve, 5000));
                    }}
                />
                <pre data-testid="submit-data">{JSON.stringify(submitData)}</pre>
                <div data-testid="submit-count">{submitCount}</div>
            </>
        );
    },
};
```

### Selectors Used

```typescript
// FormField and TextInput MUST have matching name attributes for validation to work
const nameInput = page.locator('input[name="name"]');  // NOT input[name="tagName"]
const submitButton = page.locator('button[type="submit"]');

// Read callback data from test story's DOM output
const submitData = page.locator('[data-testid="submit-data"]');
const submitCount = page.locator('[data-testid="submit-count"]');
```

### Critical Requirements

1. **Matching names**: FormField `name` and TextInput `name` attributes must match
   ```tsx
   <FormField name="tagName" label="Tag Name">
       <TextInput name="tagName" {...} />  {/* Names match ✅ */}
   </FormField>
   ```

2. **No `required` on FormField**: HTML5 validation conflicts with Grommet
   ```tsx
   {/* ❌ WRONG */}
   <FormField name="name" required>

   {/* ✅ CORRECT */}
   <FormField name="name">
       <TextInput name="name" required />
   </FormField>
   ```

3. **Double-submit testing requires realistic delays**:
   ```typescript
   onSubmit={async (data) => {
       setSubmitCount((c) => c + 1);
       await new Promise((resolve) => setTimeout(resolve, 5000)); // Required!
   }}
   ```

### Integration Test Pattern

```typescript
test('should create tag via CreateTagDialog', async ({ page }) => {
    await page.goto('/tags');

    // Wait for page load
    await page.getByRole('heading', { name: 'All Tags' }).waitFor();

    // Open dialog
    await page.getByRole('button', { name: /add tag/i }).click();

    // Wait for dialog to open
    await page.locator('input[name="name"]').waitFor();

    // Fill and submit
    await page.locator('input[name="name"]').fill('My New Tag');
    await page.locator('button[type="submit"]').click();

    // Wait for dialog to close
    await page.locator('input[name="name"]').waitFor({ state: 'hidden' });

    // Verify tag appears in list
    await expect(page.locator('.tag-body').filter({ hasText: 'My New Tag' })).toBeVisible();
});
```

### Known Limitations

- **Portal rendering**: Dialogs render in document body, not in component tree
- **Z-index issues**: Multiple dialogs can layer incorrectly
- **Timing sensitivity**: Must explicitly wait for dialog open/close transitions
- **Test story overhead**: Requires creating wrapper components to expose state

### References

- Validated in: `tests/e2e/storybook/CreateTagDialog.spec.ts` (T011)
- Ported to: `tests/e2e/app/tag-management.spec.ts` (T012)
- Page Object: N/A (dialog interactions inline in tests)

---

## Pattern 3: Grommet List Item Selection Pattern

**Status**: ✅ Validated in multiple integration tests

**Use Case**: Finding and clicking items in Grommet List components

**Problem Solved**: Grommet's List component doesn't render ARIA `listitem` roles, breaking `getByRole('listitem')` selectors

### Selectors Used

```typescript
// ✅ CORRECT - Use text locators or class selectors
const item = page.locator('text="Item Name"').first();
const tag = page.locator('.tag-body').filter({ hasText: 'Tag Name' });

// ❌ INCORRECT - Do NOT use role selectors
const item = page.getByRole('listitem'); // FAILS - no listitem role
const item = page.locator('ul[role="list"] > li'); // FAILS - no li elements
```

### Example Implementation

```typescript
// Page Object Pattern
export class InventoryPage {
    constructor(public readonly page: Page) {}

    itemByName(name: string): Locator {
        return this.page.locator(`text="${name}"`).first();
    }

    async openItem(name: string): Promise<void> {
        await this.itemByName(name).click();
    }
}

export class TagsPage {
    constructor(public readonly page: Page) {}

    tagByName(name: string): Locator {
        // Use .tag-body class for specificity in tag hierarchy
        return this.page.locator('.tag-body').filter({ hasText: name });
    }

    async openTag(name: string): Promise<void> {
        await this.tagByName(name).click();
    }
}
```

### When to Use Class Selectors vs Text Locators

- **Use class selectors** (`.tag-body`) when:
  - Elements are in a hierarchy (parent/child tags)
  - Text appears in multiple places
  - Need to filter by specific component type

- **Use text locators** (`text="..."`) when:
  - Flat list structure
  - Unique text content
  - Simpler selector is sufficient

### Known Limitations

- **No semantic HTML**: Grommet List doesn't use `<ul>/<li>` structure
- **Styled-components classes**: May change between versions (use stable classes like `.tag-body`)
- **Text uniqueness**: Text locators fail if multiple elements have same text

### References

- Validated in: `tests/e2e/app/items-and-tags.spec.ts`
- Page Objects: `InventoryPage.itemByName()`, `TagsPage.tagByName()`

---

## Pattern 4: Double-Submit Prevention Testing

**Status**: ✅ Validated in Storybook (T014, T011) | ✅ Ported to Integration (T012)

**Use Case**: Verifying that forms prevent double-submission when users rapidly click submit

**Implementation Pattern**: useRef synchronous guard + button disability

### Component Implementation

```typescript
export const MyForm: React.FC<Props> = ({ onSubmit }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingRef = useRef(false);  // Synchronous guard

    const handleSubmit = async (data) => {
        if (submittingRef.current) return;  // Guard before async operation

        submittingRef.current = true;  // Set BEFORE async call
        setIsSubmitting(true);

        try {
            await onSubmit(data);  // Async I/O operation
        } finally {
            submittingRef.current = false;  // Reset even if error
            setIsSubmitting(false);
        }
    };

    return (
        <Form onSubmit={handleSubmit}>
            <button
                type="submit"
                disabled={isSubmitting || !isValid}  // Disable during submit
            >
                Submit
            </button>
        </Form>
    );
};
```

### Test Story Pattern

```typescript
export const TestDoubleSubmit: Story = {
    render: () => {
        const [submitCount, setSubmitCount] = useState(0);

        return (
            <>
                <MyForm
                    onSubmit={async (data) => {
                        setSubmitCount((c) => c + 1);
                        // CRITICAL: Must include realistic delay
                        await new Promise((resolve) => setTimeout(resolve, 5000));
                    }}
                />
                <div data-testid="submit-count">{submitCount}</div>
            </>
        );
    },
};
```

### Test Implementation

```typescript
test('should prevent double-submission', async ({ page }) => {
    await page.locator('input[name="name"]').fill('Test');

    // Fire rapid clicks using force:true to bypass button disability
    const submitButton = page.locator('button[type="submit"]');
    submitButton.click({ force: true });  // Don't await!
    submitButton.click({ force: true });  // Don't await!
    submitButton.click({ force: true });  // Don't await!

    // Wait for async operation to complete
    await page.waitForTimeout(6000);

    // Verify only 1 submission occurred
    await expect(page.locator('[data-testid="submit-count"]')).toHaveText('1');
});
```

### Critical Requirements

1. **Realistic delay in test story**: Without delay, callback completes before next click
   ```typescript
   await new Promise((resolve) => setTimeout(resolve, 5000)); // Required!
   ```

2. **Use `force: true` in tests**: Bypasses button disability to test ref guard directly
   ```typescript
   submitButton.click({ force: true });  // Tests ref guard
   ```

3. **Don't await rapid clicks**: Fire clicks without waiting for them to complete
   ```typescript
   submitButton.click({ force: true });  // Fire and forget
   submitButton.click({ force: true });  // Fire and forget
   submitButton.click({ force: true });  // Fire and forget
   await page.waitForTimeout(6000);      // Then wait for callback
   ```

### Why This Works

- **Async operations have realistic I/O delays** (database, network)
- **During delay, ref guard catches subsequent clicks**
- **Without delay, callback completes instantly** - no time between clicks to protect
- **Real-world async operations always have delays**, making this pattern effective

### Known Limitations

- **Test requires delay**: Can't test without realistic async delay in callback
- **Force clicks bypass accessibility**: Not testing real user experience, just ref guard
- **Timing-dependent**: Test may be flaky if delay too short

### References

- Validated in: `tests/e2e/storybook/ItemForm.spec.ts`, `tests/e2e/storybook/CreateTagDialog.spec.ts`
- Pattern documented in: `.github/copilot-instructions.md` → Double-Submit Prevention

---

## Pattern 5: Grommet CheckBox Interaction Pattern

**Status**: ✅ Validated in Storybook (T014)

**Use Case**: Testing checkbox interactions in Grommet forms

**Problem Solved**: Grommet CheckBox uses hidden native input + custom styled elements

### Selectors Used

```typescript
// ✅ CORRECT - Click the label text
await page.getByText('Is Container').click();

// ✅ CORRECT - Or find hidden input by name
await page.locator('input[name="isContainer"]').check();

// ❌ INCORRECT - Visual checkbox element is not interactive
await page.locator('.custom-checkbox').click(); // FAILS
```

### Example Implementation

```typescript
test('should handle container checkbox selection', async ({ page }) => {
    // Click the label text to toggle checkbox
    await page.getByText('Is Container').click();

    // Verify hidden input is checked
    const checkbox = page.locator('input[name="isContainer"]');
    await expect(checkbox).toBeChecked();

    // Verify submission includes checkbox value
    await page.locator('button[type="submit"]').click();
    const data = JSON.parse(await page.locator('[data-testid="submit-data"]').textContent());
    expect(data.isContainer).toBe(true);
});
```

### Known Limitations

- **Hidden input**: Native checkbox is `visibility: hidden`, not `display: none`
- **Custom styling**: Visual checkbox is separate element, not the actual input
- **Label click area**: Must click label text, not just checkbox visual

### References

- Validated in: `tests/e2e/storybook/ItemForm.spec.ts` (T014)

---

## Pattern 6: Context-Agnostic Page Objects

**Status**: ✅ Core pattern enabling two-phase testing strategy

**Use Case**: Creating page objects that work in both Storybook and full app

**Problem Solved**: Eliminates duplicate test code between component and integration tests

### Design Principles

1. **Use semantic selectors**: Prefer `name`, `type`, `role` attributes over class names
2. **Avoid context-specific navigation**: Don't hardcode URLs or story IDs in page objects
3. **Provide flexible navigation**: Let tests control how to reach the component
4. **Document context limitations**: Note when methods only work in one context

### Example Implementation

```typescript
/**
 * Page Object for item form (create/edit).
 *
 * **Context-Agnostic Design**: Works in both:
 * - Storybook: http://localhost:6006/iframe.html?id=...
 * - Full app: http://localhost:3000
 */
export class ItemFormPage {
    constructor(public readonly page: Page) {}

    // ✅ Context-agnostic selectors (work everywhere)
    get nameInput() { return this.page.locator('input[name="name"]'); }
    get submitButton() { return this.page.locator('button[type="submit"]'); }

    // ✅ Context-agnostic actions (work everywhere)
    async fillName(value: string) { await this.nameInput.fill(value); }
    async submit() { await this.submitButton.click(); }

    // ❌ Context-specific method (only works in full app)
    async goto() {
        await this.page.goto('/items/new'); // Don't call this in Storybook tests!
    }
}

// Component Test Usage (Storybook)
test('should submit form', async ({ page }) => {
    await gotoStory(page, 'ui-itemform', 'test-submit-behavior');  // Test handles navigation

    const form = new ItemFormPage(page);  // Same page object
    await form.fillName('Test');
    await form.submit();
});

// Integration Test Usage (Full App)
test('should submit form', async ({ page }) => {
    await page.goto('/');  // Test handles navigation
    await page.getByRole('button', { name: /create item/i }).click();

    const form = new ItemFormPage(page);  // Same page object
    await form.fillName('Test');
    await form.submit();
});
```

### Validation Checklist

- [ ] All selectors use semantic attributes (`name`, `type`, `role`, `data-testid`)
- [ ] No hardcoded URLs or story IDs in page object methods
- [ ] Navigation methods clearly documented as context-specific
- [ ] Page object tested in both Storybook and full app contexts
- [ ] JSDoc comments explain context limitations

### Known Limitations

- **Navigation must be handled in tests**: Page objects can't know how to reach themselves
- **Assertions may differ by context**: Success indicators vary (DOM vs network)
- **Some methods only work in one context**: Clearly document these exceptions

### References

- Pattern validated across all page objects in `tests/e2e/helpers/page-objects.ts`
- Examples: `ItemFormPage`, `InventoryPage`, `TagsPage`

---

## Pattern 7: TouchButton Interaction Pattern

**Status**: ✅ Validated in Storybook (T010) | ✅ Ported to touch-optimization app coverage (T012b)

**Use Case**: Testing touch-optimized button states and variants without coupling to layout-specific visual details.

**Problem Solved**: Touch components often mix semantic button behavior with visual/touch-target requirements. The reliable test layer should first prove clickability, disabled state, variants, and accessible names before adding lower-level mobile/touch measurements.

### Selectors Used

```typescript
// ✅ CORRECT - Prefer accessible button roles/names when stories expose them
const button = page.getByRole('button', { name: /primary button/i });

// ✅ CORRECT - Use the Storybook story as the state boundary
await gotoStory(page, 'ui-touchbutton', 'disabled');

// ❌ AVOID - Do not couple tests to Grommet/styled-components generated class names
await page.locator('.sc-aXZVg').click();
```

### References

- Validated in: `tests/e2e/storybook/TouchButton.spec.ts`
- Candidate follow-up: `tests/e2e/app/touch-optimization.spec.ts`

---

## Pattern 8: Deterministic Interaction Harness Stories

**Status**: ✅ Validated in Storybook (T015, T016)

**Use Case**: Testing callback-driven components that do not naturally render callback state in the DOM.

**Problem Solved**: Storybook actions and console logs are useful for humans, but Playwright needs deterministic DOM-visible state for assertions.

### Selectors Used

```typescript
await gotoStory(page, 'ui-searchbar', 'test-interactions');
await page.getByRole('textbox', { name: 'Search query' }).fill('camp stove');
await page.getByRole('textbox', { name: 'Search query' }).press('Enter');
await expect(page.getByTestId('last-search')).toHaveText('camp stove');
```

### Harness Requirements

1. Render callback counts and last callback payloads with `data-testid` attributes.
2. Keep the component under test realistic; do not bypass normal user interactions.
3. Use accessible selectors for user-facing controls, and `data-testid` only for harness state or intentional touch-target probes.

### References

- Validated in: `tests/e2e/storybook/LongPressContextMenu.spec.ts` (T015)
- Validated in: `tests/e2e/storybook/SearchBar.spec.ts` (T016)
- Validated in: `tests/e2e/storybook/TagSelector.spec.ts` (T016)

---

## Pattern 9: Grommet CheckBox Touch Target Pattern

**Status**: ✅ Validated in Storybook (T016)

**Use Case**: Verifying touch-friendly checkbox rows when Grommet renders the native checkbox input as hidden.

**Problem Solved**: `getByRole('checkbox').check()` can resolve to a hidden native input. The visible label may also be smaller than the required 44px touch target unless the label content is explicitly sized.

### Selectors Used

```typescript
await page.getByTestId('tag-touch-target-tag2').click();
const box = await page.getByTestId('tag-touch-target-tag2').boundingBox();
expect(box?.height).toBeGreaterThanOrEqual(44);
```

### Component Pattern

```tsx
<CheckBox
  label={
    <Box data-testid={`tag-touch-target-${tag._id}`} justify="center" style={{ minHeight: '44px' }}>
      <Text>{tag.name}</Text>
    </Box>
  }
/>
```

### References

- Validated in: `tests/e2e/storybook/TagSelector.spec.ts` (T016)
- Component: `meteor-app/imports/ui/TagSelector.tsx`

---

## Pattern Summary Table

| Pattern | Status | Storybook Test | Integration Test | Key Challenge |
|---------|--------|----------------|------------------|---------------|
| Grommet Form Submission | ✅ Validated | T007, T014 | T008 | getByLabel() doesn't work |
| Grommet Dialog Form | ✅ Validated | T011 | T012 | Portal rendering, timing |
| Grommet List Selection | ✅ Validated | N/A | items-and-tags | No listitem roles |
| Double-Submit Prevention | ✅ Validated | T014, T011 | T012 | Requires realistic delays |
| Grommet CheckBox | ✅ Validated | T014 | N/A | Hidden native input |
| Context-Agnostic Page Objects | ✅ Core Pattern | All | All | Navigation differences |
| TouchButton Interaction | ✅ Validated | T010 | T012b | Separate semantic behavior from visual/touch metrics |
| Deterministic Interaction Harness | ✅ Validated | T015, T016 | N/A | DOM-visible callback assertions |
| Grommet CheckBox Touch Target | ✅ Validated | T016 | N/A | Hidden native input and undersized visible labels |

---

## Common Grommet Testing Gotchas

### 1. Don't use `getByLabel()` with FormField

**Why it fails**: Grommet FormField doesn't associate `<label>` with `<input>` via `for`/`id`

**Solution**: Use `input[name="..."]` selectors

### 2. FormField and TextInput names must match

**Why it's required**: Grommet form validation relies on matching names

**Solution**: Always use same `name` on both `<FormField>` and `<TextInput>`

### 3. Don't use `required` attribute on FormField

**Why it fails**: Triggers HTML5 validation that conflicts with Grommet

**Solution**: Put `required` on the input element, not the FormField

### 4. Grommet List doesn't render `<li>` elements

**Why it fails**: Custom rendering doesn't use semantic HTML

**Solution**: Use text locators or class selectors like `.tag-body`

### 5. Grommet CheckBox uses hidden native input

**Why it fails**: Visual checkbox is not the interactive element

**Solution**: Click label text or use `input[name="..."]` selector

---

## Anti-Patterns to Avoid

### ❌ Using `page.evaluate()` to spy on JavaScript

```typescript
// WRONG - Don't use evaluate to inspect state
const submitCount = await page.evaluate(() => {
    return window.submitCount;
});
```

**Why it's wrong**: Creates tight coupling to implementation, can't work in Storybook

**Correct approach**: Create test stories that render state in DOM

```typescript
// RIGHT - Render state in DOM
export const TestStory: Story = {
    render: () => {
        const [submitCount, setSubmitCount] = useState(0);
        return (
            <>
                <MyComponent onSubmit={() => setSubmitCount(c => c + 1)} />
                <div data-testid="submit-count">{submitCount}</div>
            </>
        );
    },
};
```

### ❌ Testing implementation instead of behavior

```typescript
// WRONG - Just checking if button exists
test('should have submit button', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
});
```

**Why it's wrong**: Doesn't verify actual behavior, just presence of element

**Correct approach**: Test what happens when you interact with the element

```typescript
// RIGHT - Test actual behavior
test('should submit form when button clicked', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="submit-count"]')).toHaveText('1');
});
```

### ❌ Fixed timeouts instead of Playwright auto-waiting

```typescript
// WRONG - Arbitrary timeout
await page.waitForTimeout(2000);
await page.fill('input[name="name"]', 'Test');
```

**Why it's wrong**: Flaky tests, wastes time in fast environments

**Correct approach**: Use Playwright's built-in waiting

```typescript
// RIGHT - Auto-waiting
await page.fill('input[name="name"]', 'Test'); // Waits for input to be ready
await page.click('button[type="submit"]'); // Waits for button to be clickable
```

---

## Contributing New Patterns

When you discover a new testing pattern:

1. **Validate in Storybook first**: Create component test proving the pattern works
2. **Port to integration test**: Verify same pattern works in full app
3. **Document here**: Add new section with:
   - Pattern name and status
   - Problem solved
   - Selectors used
   - Example implementation
   - Known limitations
   - References to test files
4. **Update pattern summary table**: Add row with validation status
5. **Update quickstart.md**: Add workflow example if pattern introduces new testing approach
