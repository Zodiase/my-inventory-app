# GitHub Copilot Custom Instructions

## Project Context

This is a Meteor.js inventory management application built with TypeScript, React, and MongoDB. The app uses styled-components for styling and follows strict type safety practices.

## Code Style & Conventions

### TypeScript

- **Always use strict typing** - No `any` types unless absolutely necessary and well-documented
- **Prefer type-only imports** - Use `import type` for types that are only used in type annotations
- **Use type aliases over interfaces** for simple object types (especially empty ones)
- **Document complex types and utilities** with JSDoc comments
- **Explicit initialization is acceptable** - The `no-undef-init` rule is disabled, so `let x: Type = undefined` is allowed when it improves clarity

### Imports

- **Use Meteor absolute imports** - Paths starting with `/` (e.g., `/imports/api/items`)
- **Never use relative imports** - Always use absolute paths from the project root
- **Group imports** in this order:
    1. External packages (e.g., `lodash`, `meteor/meteor`)
    2. Internal absolute imports (`/imports/...`)
    3. Separate groups with blank lines

### MongoDB/Meteor Patterns

- **Use `_id` for document IDs** - This is the MongoDB convention
- **Use `strictSelector`** for update operations to prevent race conditions
    - Always include identifying fields beyond just `_id`
    - This provides optimistic locking
- **Collections extend `CollectionItem`** - All documents have `_id`, `createdAt`, `modifiedAt`
- **Use typed Meteor.settings** - Import from `/imports/utility/meteorSettings` instead of using `Meteor.settings` directly

### React Components

- **Use functional components** with hooks
- **Use styled-components** for styling
- **Props types should use `ComponentProps<'div'>` pattern** for forwarding HTML attributes
- **Use `useTracker`** from `/imports/utility/reactMeteorData` for reactive Meteor data
- **Always include `key` prop** in mapped components

### Code Documentation

- **Document utility functions** with comprehensive JSDoc:
    - Description of what the function does and why
    - Template parameters with explanations
    - Parameter descriptions
    - Return value description
    - Usage examples
    - Remarks for important context (e.g., race conditions, performance)
- **Comment complex logic** but prefer self-documenting code names
- **Explain "why" not "what"** - The code shows what, comments explain why

### Testing

- **Use Chai** for assertions (`expect`)
- **Use Sinon** for stubs and spies
- **Test files** use `.test.ts` extension
- **Magic numbers are allowed** in test files

### Error Handling

- **Use custom error classes** - See `RecordNotFoundException`
- **Async operations** should have proper error handling
- **User-facing operations** (UI callbacks) should log to console with clear messages

### Double-Submit Prevention (FR-070)

- **Use `useRef(false)` for synchronous guard** - State updates are async, refs are synchronous
- **Set ref to true BEFORE async operation** - Prevents subsequent calls during I/O
- **Reset ref in finally block** - Ensures cleanup even if operation fails
- **Combine with button disability** - `disabled={isSubmitting || name.trim() === ''}`
- **Why this works**:
    - Async operations (database saves, network requests) have realistic delays
    - During these delays, the ref guard catches rapid clicks
    - Without delays (instant callbacks), there's no time between clicks to protect against
    - Real-world async operations always have I/O delays, making this pattern effective
- **Testing double-submit prevention**:
    - Test story MUST include realistic delay: `await new Promise(resolve => setTimeout(resolve, 5000))`
    - Without delay, callback completes before next click can happen
    - Use `{force: true}` clicks to bypass button disability and test ref guard directly
    - Verify submit count stays at 1 despite multiple rapid clicks

### ESLint Configuration

- The project uses **ESLint flat config** (`eslint.config.mjs`)
- Based on **eslint-config-love** (strict TypeScript rules)
- Key disabled/modified rules:
    - `no-undef-init`: off (explicit undefined initialization allowed)
    - `@typescript-eslint/no-magic-numbers`: allows 0, 1, -1
    - `import/no-absolute-path`: off (Meteor pattern)
    - `no-underscore-dangle`: allows `_id`, `_ensureIndex`

## Common Patterns

### Creating a new collection entity:

1. Create the model interface in `/imports/model/`
2. Export collection from `/imports/api/` with `NamedCollection`
3. Implement CRUD methods as async functions
4. Export methods using `asMeteorMethods`
5. Add appropriate `strictSelector` usage for updates

### Working with tags (hierarchical data):

- Tags have a `path` array showing the full ancestor chain
- Use `getTagPath()` to calculate/fix paths
- Use `getAllDescendants()` or `getAllDescendantsByPath()` for tree operations
- Always check for detached tags when modifying parent relationships

## When I ask for help:

### Committing changes:

- **DO NOT** stage any new changes with `git add`
- **Only commit** already staged changes
- First, check what's staged with `git diff --cached`
- Generate **conventional commit messages** (feat:, fix:, refactor:, etc.)
- Include a **bulleted list** of specific changes in the staged files
- If you have any hunches that something might be wrong or incomplete, **ask** before committing
- Use `git commit -m` with the generated message

### Code review:

- Check for **type safety issues**
- Verify **ESLint compliance**
- Look for **missing error handling**
- Suggest **performance improvements** for MongoDB queries

### Refactoring:

- Maintain **backward compatibility** unless explicitly asked to break it
- Update **all usages** when changing function signatures
- Add/update **JSDoc documentation**
- Run **type checking** after changes

### Debugging:

- Use **semantic search** to find related code
- Check **list_code_usages** to understand impact
- Look at **error messages** from type checker and linter
- Suggest **console.log** or **logger** usage for runtime debugging

## Project-Specific Notes

- The app is in a **monorepo structure** - code is in `/meteor-app/` subdirectory
- ESLint and TypeScript configs are in `meteor-app/`
- VS Code workspace is at the **parent directory** level
- **Prettier** is configured - always format code after editing

## Testing & Development Workflow

### Playwright E2E Tests

- Tests in `tests/e2e/` at project root
- **Use npm scripts** - Don't use raw `npx playwright` commands
- **For CI/automated runs**: Use `npm run test:e2e:skip-server:headless` (already includes `--reporter=line`)
- **For interactive debugging**: Use `npm run test:e2e:skip-server:ui` (fast, with app already running)
- **NEVER use default reporter** - It hangs forever and never finishes

### Playwright Command Examples

```bash
# Run Storybook component tests (Storybook must be running on port 6006)
npm run test:e2e:skip-server:headless -- tests/e2e/storybook/ --project=storybook-chromium

# Run full app integration tests (Meteor app must be running on port 3000)
npm run test:e2e:skip-server:headless -- tests/e2e/app/ --project=chromium

# Run specific test file
npm run test:e2e:skip-server:headless -- tests/e2e/storybook/ItemForm.spec.ts --project=storybook-chromium

# Interactive debugging (fast iteration)
npm run test:e2e:skip-server:ui
```

### Storybook Component Testing Strategy

**Component tests in Storybook are end-to-end tests of components in isolation, NOT just selector smoke tests.**

#### Testing Component Behavior (Not Just Selectors)

1. **Get expectations from specs**, not from code implementation
    - Check `specs/` directory for requirements and acceptance criteria
    - Look for functional requirements (FR-XXX) and success criteria (SC-XXX)
    - Test what the component SHOULD do, not what it currently does

2. **Create test-specific stories** that make behavior observable
    - Create custom parent components that wrap the component under test
    - Handle callbacks (like `onSubmit`) and render the results in the DOM
    - Display callback data in `<pre>` tags with `data-testid` attributes
    - Show validation errors, submit counts, loading states - anything that needs verification
    - **Include realistic delays** in async callbacks to simulate real I/O operations (database, network)
    - Example:

        ```tsx
        export const TestableSubmit: Story = {
            render: () => {
                const [submitData, setSubmitData] = useState(null);
                const [submitCount, setSubmitCount] = useState(0);

                return (
                    <>
                        <ItemForm
                            onSubmit={async (data) => {
                                setSubmitData(data);
                                setSubmitCount((c) => c + 1);
                                // Simulate realistic async operation (5s delay)
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

3. **Test actual component behavior**, not just element visibility
    - Verify validation errors appear in the DOM
    - Check that callbacks are called with correct data (read from test story's DOM output)
    - Validate loading states, disabled states, error messages
    - Test double-submit prevention by checking submit count
    - Don't just check if buttons are visible - check what happens when you click them

4. **Never use `page.evaluate()` to spy on JavaScript**
    - Instead, create stories that expose JavaScript state as DOM elements
    - The test story's parent component can render any internal state
    - Everything should be observable through the DOM

#### What to Test

From specs (not from reading the code):

- Component contract (props → behavior)
- Validation rules
- Error handling
- Loading/disabled states
- User interactions (submit, cancel, etc.)
- Double-submission prevention (FR-070)

### Critical Rules (ALWAYS FOLLOW)

1. **NEVER commit before testing** - Test first, commit after
2. **Use `createIndexAsync`** not deprecated `_ensureIndex`
3. **Background processes**: Use `nohup command > /tmp/log 2>&1 &`, NOT `isBackground: true`
4. **Test actual behavior** - Run the code, don't assume it works from code inspection alone
5. **Use npm scripts for Playwright** - Don't use raw `npx playwright` commands
6. **Use `test:e2e:skip-server:headless`** for automated test runs (includes correct reporter)
7. **Use `test:e2e:skip-server:ui`** for interactive debugging
8. **Read specs before writing tests** - Get expectations from `specs/`, not from code
9. **Create test-specific Storybook stories** - Make component behavior observable in the DOM

### Debugging & Testing Philosophy

When tests fail mysteriously or in ways that don't make sense:

1. **Verify the app works manually FIRST** - Before concluding the test framework is broken, open the browser and test manually
    - Click the actual button in the UI
    - Check browser console for error messages (403, 404, JavaScript errors)
    - Verify network requests succeed
    - If manual testing fails, it's an app bug, not a test issue

2. **Read actual error messages carefully** - Don't ignore console errors
    - "Form won't submit" (vague) vs "Access denied [403]" (specific)
    - Specific errors point to root causes
    - Ask user to check browser console if tests fail without clear errors

3. **Understand the architecture before implementing**
    - Read existing code patterns (e.g., `asMeteorMethods` for Meteor)
    - Check how similar features are implemented
    - Verify assumptions about how systems work (client/server boundaries, method registration)

4. **When debugging fails repeatedly (5+ attempts), stop and reassess**
    - If many different approaches fail, the assumption about what's broken is likely wrong
    - Step back and verify basic functionality manually
    - Question whether the test framework is really the issue

5. **Infrastructure tasks ≠ Working features**
    - Don't claim success just because config files exist
    - Verify actual functionality works (app runs, forms submit, data persists)
    - Green checkmarks on setup tasks don't mean the feature works

6. **Test the simplest thing first**
    - Before complex interactions, verify basic operations work
    - Can the button be clicked? Does the form exist? Is the server running?
    - Build up from simple to complex, don't start with full integration

7. **When something seems impossible, you're missing something fundamental**
    - "Grommet modals can't be tested" → Actually, the app was broken
    - "This framework doesn't support X" → Usually a misunderstanding
    - Impossible-seeming issues point to gaps in understanding the system
