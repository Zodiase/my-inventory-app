# Research: Storybook-First E2E Testing Strategy

**Date**: November 27, 2025  
**Feature**: Two-phase testing approach (Storybook component tests → Full E2E tests)

## Research Questions

### Q1: How to configure Playwright to test Storybook stories?

**Decision**: Add a dedicated Playwright project in `playwright.config.js` that targets Storybook's dev server (default: `http://localhost:6006`). **Storybook is expected to be running manually** - tests do not start/stop it.

**Rationale**:
- Playwright supports multiple projects in a single config (already using chromium/iPad/iPhone)
- Storybook runs independently from the Meteor app server
- Can run Storybook tests in isolation without starting full app (faster iteration)
- **Simplicity**: Manually run Storybook once, keep it running during development
- **Performance**: Avoid startup overhead on every test run (Storybook takes ~30s to start)
- **Developer workflow**: Matches existing pattern where developers keep Meteor app running

**Implementation Pattern**:
```typescript
// playwright.config.js
export default defineConfig({
  projects: [
    // ... existing chromium, iPad, iPhone projects for full app ...
    {
      name: 'storybook-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/storybook\/.*\.spec\.ts/,
    }
  ],
  // NO webServer config for Storybook - expect it to be running manually
  // Developer must run: cd meteor-app && npm run storybook
});
```

**Important**: Before running Storybook tests, verify Storybook is running:
```bash
# Start Storybook manually (keep this running in a separate terminal)
cd meteor-app && npm run storybook

# Then run tests in another terminal
npx playwright test tests/e2e/storybook/
```

**Alternatives Considered**:
- **Playwright webServer auto-start**: Rejected because Storybook takes ~30s to start, adding overhead to every test run. Better to start manually and keep running.
- Separate `playwright-storybook.config.js`: Rejected because it duplicates configuration and requires separate test commands
- Using same project for both: Rejected because it makes it harder to run Storybook tests in isolation

**References**:
- [Playwright Multiple Projects](https://playwright.dev/docs/test-projects)
- [Storybook Test Runner](https://storybook.js.org/docs/react/writing-tests/test-runner) - Alternative we're NOT using since we want full Playwright control

---

### Q2: How to navigate to specific Storybook stories in Playwright tests?

**Decision**: Use Storybook's URL pattern: `http://localhost:6006/iframe.html?id={story-id}&viewMode=story`

**Rationale**:
- Storybook serves each story as an isolated iframe at a predictable URL
- The `iframe.html` view removes Storybook UI chrome, showing only the component
- Story IDs follow pattern: `{component-name}--{story-name}` (kebab-case)
- This gives full control over component state vs using Storybook's test runner

**Implementation Pattern**:
```typescript
// tests/e2e/storybook/ItemForm.spec.ts
test('should submit form with valid data', async ({ page }) => {
  await page.goto('http://localhost:6006/iframe.html?id=itemform--default&viewMode=story');
  
  // Component is now isolated and ready for testing
  await page.fill('input[name="name"]', 'Test Item');
  await page.click('button[type="submit"]');
  
  // Verify interaction (e.g., check console, story args update)
});
```

**Alternatives Considered**:
- Using Storybook Test Runner: Rejected because it's opinionated about test structure and we need Playwright flexibility
- Testing through main Storybook UI: Rejected because UI chrome adds complexity and is not representative of real app

**References**:
- [Storybook URL Structure](https://storybook.js.org/docs/react/writing-stories/naming-components-and-hierarchy)
- Story IDs are visible in browser URL when viewing stories

---

### Q3: How to verify component interactions in Storybook without backend?

**Decision**: Use Storybook actions/args to verify component callbacks are triggered with correct data

**Rationale**:
- Storybook stories already use `args` to pass props (including callbacks)
- When callbacks fire, they update story args which can be observed
- Can spy on console for Storybook actions addon output
- Component behavior (form validation, UI state) can be tested directly in DOM

**Implementation Pattern**:
```typescript
// In story file (meteor-app/imports/ui/ItemForm.stories.tsx)
export const Default: Story = {
  args: {
    onSubmit: fn(), // Storybook action that can be verified
  },
};

// In test file
test('should call onSubmit with form data', async ({ page }) => {
  await page.goto('http://localhost:6006/iframe.html?id=itemform--default&viewMode=story');
  
  await page.fill('input[name="name"]', 'Test Item');
  await page.click('button[type="submit"]');
  
  // Verify via DOM state change or console actions
  await expect(page.locator('.success-message')).toBeVisible();
});
```

**Alternatives Considered**:
- Mocking full Meteor context: Rejected as too complex and defeats isolation purpose
- Only testing visual appearance: Rejected because doesn't validate interactions

**References**:
- [Storybook Actions](https://storybook.js.org/docs/react/essentials/actions)
- [Testing component callbacks](https://storybook.js.org/docs/react/writing-tests/interaction-testing)

---

### Q4: Best practices for sharing page objects between Storybook and full app tests?

**Decision**: Create context-aware page object methods that work with both Storybook iframe and full app DOM

**Rationale**:
- Both contexts use the same React components with same DOM structure
- Selectors should be identical (using `name`, `type`, `data-testid` attributes)
- Context difference is only the root container (iframe vs full app layout)
- Page objects abstract selector details so tests remain readable

**Implementation Pattern**:
```typescript
// tests/e2e/helpers/page-objects.ts
export class ItemFormPage {
  constructor(private page: Page) {}
  
  // Works in both Storybook iframe and full app
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

// Storybook test usage
const form = new ItemFormPage(page);
await page.goto('http://localhost:6006/iframe.html?id=itemform--default&viewMode=story');
await form.fillName('Test');
await form.submit();

// Full app test usage (same page object!)
const form = new ItemFormPage(page);
await page.goto('http://localhost:3000');
await page.click('text=Create Item');
await form.fillName('Test');
await form.submit();
```

**Alternatives Considered**:
- Separate page objects for each context: Rejected because duplicates code and selectors
- Context-specific helper methods: Rejected because adds complexity without benefit

**References**:
- [Playwright Page Object Model](https://playwright.dev/docs/pom)
- Existing `tests/e2e/helpers/page-objects.ts` pattern to extend

---

### Q5: How to handle timing differences between Storybook and full app?

**Decision**: Use Playwright's auto-waiting and explicit assertions; avoid fixed timeouts unless absolutely necessary

**Rationale**:
- Playwright automatically waits for elements to be actionable before interacting
- Storybook mounts components faster than full app (no Meteor initialization)
- Using `expect()` assertions triggers automatic retry logic
- Fixed timeouts are brittle and fail in different environments (CI vs local)

**Implementation Pattern**:
```typescript
// GOOD: Auto-waiting assertions
await page.fill('input[name="name"]', 'Test Item');
await expect(page.locator('.validation-message')).not.toBeVisible();
await page.click('button[type="submit"]');
await expect(page.locator('.success-message')).toBeVisible();

// AVOID: Fixed timeouts
await page.waitForTimeout(1000); // Brittle!
```

**Alternatives Considered**:
- Different timeout configs per context: Rejected because adds configuration complexity
- Manual `waitForSelector` everywhere: Rejected because Playwright handles this automatically

**References**:
- [Playwright Auto-waiting](https://playwright.dev/docs/actionability)
- [Best practices for waiting](https://playwright.dev/docs/best-practices#use-web-first-assertions)

---

### Q6: How to organize test files to clearly separate component vs integration tests?

**Decision**: Directory structure: `tests/e2e/storybook/` for component tests, `tests/e2e/app/` for integration tests

**Rationale**:
- Clear separation makes intent obvious from file path
- Can run only component tests: `npx playwright test tests/e2e/storybook`
- Can run only integration tests: `npx playwright test tests/e2e/app`
- Test file names match component names for Storybook tests, match user journeys for app tests

**Implementation Pattern**:
```
tests/e2e/
├── storybook/                  # Component isolation tests
│   ├── ItemForm.spec.ts        # Mirrors ItemForm.stories.tsx
│   ├── TouchButton.spec.ts     # Mirrors TouchButton.stories.tsx
│   └── LongPressContextMenu.spec.ts
├── app/                        # Full app integration tests
│   ├── item-creation.spec.ts   # User journey: create items
│   ├── tag-management.spec.ts  # User journey: manage tags
│   └── touch-optimization.spec.ts
└── helpers/                    # Shared utilities
    ├── page-objects.ts
    ├── storybook-helpers.ts    # Storybook-specific URL builders
    └── test-data.ts
```

**Alternatives Considered**:
- Mixing both in same directory with naming convention: Rejected because harder to run subset
- Separate test configs: Rejected because duplicates configuration

---

## Technology Decisions Summary

| Technology | Decision | Purpose |
|------------|----------|---------|
| **Test Framework** | Playwright (existing) | E2E testing for both Storybook and full app |
| **Component Isolation** | Storybook iframe URLs | Test components without app context |
| **Story Navigation** | `iframe.html?id={story-id}` | Direct access to isolated components |
| **Interaction Verification** | Storybook actions + DOM assertions | Validate callbacks and state changes |
| **Page Objects** | Shared context-aware classes | Reusable selectors across both test types |
| **Timing Strategy** | Playwright auto-waiting + assertions | Handle speed differences automatically |
| **Test Organization** | Separate directories (`storybook/`, `app/`) | Clear intent, easy to run subsets |

---

## Open Questions (Post-Implementation)

1. **Performance**: If Storybook tests become slow with many stories, consider parallel execution strategies
2. **Story Coverage**: Should we create additional stories specifically for edge cases, or test edge cases in full app?
3. **CI/CD**: Should Storybook tests run on every commit, or only when component files change?
4. **Maintenance**: As components evolve, how do we ensure stories stay representative of real usage?

These questions will be addressed after initial implementation proves the approach viable.
