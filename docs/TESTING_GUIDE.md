# Testing Guide

## Running Background Processes

### DON'T: Run processes in terminals with `isBackground: true`

❌ This approach FAILS because the terminal task gets killed when you run another command:

```javascript
run_in_terminal({ command: 'npm start', isBackground: true });
// Then running another command kills the above process
```

### DO: Use `nohup` with background operator `&`

✅ This keeps the process running independently:

```bash
cd meteor-app && nohup npm start > /tmp/meteor.log 2>&1 &
# Returns immediately with PID, process keeps running
```

To check if server is ready:

```bash
for i in {1..30}; do
    curl -s http://localhost:3000 > /dev/null && echo "Ready!" && break || sleep 2
done
```

To kill background server:

```bash
pkill -f "meteor run"
```

## Playwright Test Modes

### Normal Mode (with server startup)

Playwright automatically starts and stops the Meteor server:

```bash
npm run test:e2e              # Headless
npm run test:e2e:ui           # UI mode
npm run test:e2e:headed       # With visible browser
npm run test:e2e:debug        # Debug mode
```

**Timing:** ~12.5s per test (includes server startup time)

### Skip-Server Mode (faster iteration)

Run tests against an already-running server:

Terminal 1 (keep running):

```bash
cd meteor-app && npm start
```

Terminal 2 (run tests repeatedly):

```bash
npm run test:e2e:skip-server:ui     # UI mode
npm run test:e2e:skip-server        # Headless
npm run test:e2e:skip-server:headed # With visible browser
npm run test:e2e:skip-server:debug  # Debug mode
```

**Timing:** ~1.7s per test (7x faster!)

### How Skip-Server Mode Works

Set `PLAYWRIGHT_SKIP_WEBSERVER=1` environment variable to skip the `webServer` config:

```javascript
// playwright.config.js
export default defineConfig({
    // ... other config
    ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER
        ? {}
        : {
              webServer: {
                  command: 'meteor run --port 3000',
                  // ... server config
              },
          }),
});
```

## Meteor Database Indexes

### WRONG: Using deprecated `_ensureIndex`

❌ This causes TypeError in modern Meteor/MongoDB:

```typescript
await Collection._ensureIndex({ field: 1 });
// TypeError: Collection._ensureIndex is not a function
```

### CORRECT: Use `createIndexAsync`

✅ Modern Meteor uses async method:

```typescript
await Collection.createIndexAsync({ field: 1 });
await Collection.createIndexAsync({ field: 1 }, { unique: true });
```

## Testing Workflow Rules

### NEVER commit before testing

1. ❌ Make changes
2. ❌ Commit immediately
3. ❌ Test later

### ALWAYS test before committing

1. ✅ Make changes
2. ✅ Test ALL affected functionality
3. ✅ Only then commit

### When wrapping up partial changes

1. Check `git status` to see what's staged/unstaged
2. Understand what the partial work was trying to accomplish
3. Complete the work properly (don't just commit what's there)
4. Test the complete solution
5. Then commit

## Project Structure

- **Root level**: Playwright config, tests, and dependencies
    - `playwright.config.js` - Main test configuration
    - `tests/e2e/` - End-to-end test files (See the [E2E Test Authoring Guide](../../tests/e2e/README.md) for patterns)
    - `package.json` - Playwright dependencies only

- **meteor-app/**: Meteor application code
    - `package.json` - Meteor app dependencies (Playwright removed)
    - Test scripts delegate to root: `"test:e2e": "cd .. && npm run test:e2e"`

### Why this structure?

- Keeps Playwright at project level (not tied to Meteor)
- Avoids version conflicts
- Clear separation of concerns
- Can test multiple apps in monorepo if needed

## TypeScript vs JavaScript for Playwright Config

### Don't use `.ts` without proper setup

The root level has no TypeScript configuration, so:

- ❌ `playwright.config.ts` with `// @ts-nocheck` is pointless
- ✅ `playwright.config.js` is cleaner and works out of the box

Playwright supports both formats natively, but JS is simpler without a TS setup.

## Common Mistakes to Avoid

1. **Running tests without installing browsers**

    ```bash
    npx playwright install chromium
    ```

2. **Forgetting to check if changes are complete**
    - Partial changes might be missing key files or dependencies
    - Check ALL usages - don't just fix what's staged
    - Example: Fixing `_ensureIndex` in some places but missing others = server crash
    - Always verify the solution is complete before committing

3. **Not understanding git state**
    - Check `git diff --cached` to see staged changes
    - Check `git diff` to see unstaged changes
    - Understand what was already committed vs what's pending
    - Restore auto-generated files: `git restore meteor-app/.meteor/versions`

4. **Assuming terminals keep running**
    - Terminal tasks in tools are NOT persistent
    - Use `nohup` and `&` for true background processes
    - Running another terminal command KILLS the previous background task

5. **Testing with wrong assumptions**
    - Verify actual behavior, don't assume based on code inspection
    - Run the full test, don't just check if commands exist
    - Testing "can list tests" is NOT the same as testing "tests pass"

6. **Committing without testing**
    - This is the WORST mistake
    - Always test first, commit after
    - No exceptions, no excuses
    - If you murdered the previous session for this, you'll get murdered too

7. **Not checking for multiple instances of the same problem**
    - Search the codebase for ALL occurrences when fixing something
    - Example: `grep -r "_ensureIndex" meteor-app/server/` to find ALL deprecated calls
    - Fix them all at once, not one at a time
