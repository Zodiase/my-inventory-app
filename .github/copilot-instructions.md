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

### Critical Rules (ALWAYS FOLLOW)

1. **NEVER commit before testing** - Test first, commit after
2. **Use `createIndexAsync`** not deprecated `_ensureIndex`
3. **Background processes**: Use `nohup command > /tmp/log 2>&1 &`, NOT `isBackground: true`
4. **Test actual behavior** - Run the code, don't assume it works from code inspection alone
5. **Use npm scripts for Playwright** - Don't use raw `npx playwright` commands
6. **Use `test:e2e:skip-server:headless`** for automated test runs (includes correct reporter)
7. **Use `test:e2e:skip-server:ui`** for interactive debugging
