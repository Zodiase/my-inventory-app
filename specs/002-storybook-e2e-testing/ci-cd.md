# CI/CD Guidance for Two-Phase E2E Testing

**Purpose**: Recommended workflows for running Storybook and full app E2E tests in CI/CD pipelines

**Target Audience**: DevOps engineers, CI/CD pipeline maintainers

---

## Overview

This project uses a two-phase E2E testing strategy:

1. **Component Tests (Storybook)**: Fast, isolated testing of UI components
2. **Integration Tests (Full App)**: Complete end-to-end testing with backend

The two-phase approach enables:
- Faster feedback loops (component tests run in ~30s)
- Clearer failure attribution (component vs integration issues)
- Parallel execution opportunities
- Cost optimization (run component tests on every commit, full E2E on merge)

---

## Recommended CI/CD Workflow

### Strategy 1: Two-Stage Pipeline (Recommended)

**Best for**: Teams prioritizing fast feedback and cost efficiency

```yaml
# .github/workflows/test.yml example
name: E2E Tests

on:
  pull_request:
    branches: [master, main]
  push:
    branches: [master, main]

jobs:
  component-tests:
    name: Component Tests (Storybook)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build Storybook
        run: npm run build-storybook

      - name: Serve Storybook
        run: npx serve storybook-static -p 6006 &

      - name: Wait for Storybook
        run: npx wait-on http://localhost:6006

      - name: Run Storybook tests
        run: npm run test:e2e:storybook

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: storybook-test-results
          path: playwright-report/

  integration-tests:
    name: Integration Tests (Full App)
    runs-on: ubuntu-latest
    needs: component-tests  # Only run if component tests pass
    if: github.event_name == 'push'  # Only on merge, not every PR commit
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Meteor
        run: |
          curl https://install.meteor.com/ | sh
          meteor --version

      - name: Install dependencies
        run: |
          npm ci
          cd meteor-app && meteor npm install

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start Meteor app
        run: cd meteor-app && meteor run --port 3000 &

      - name: Wait for Meteor
        run: npx wait-on http://localhost:3000

      - name: Run integration tests
        run: npm run test:e2e:app

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results
          path: playwright-report/
```

**Advantages**:
- ✅ Fast feedback on PRs (component tests only)
- ✅ Full coverage on merge (integration tests)
- ✅ Cost-effective (fewer full E2E runs)
- ✅ Clear failure attribution

**Tradeoffs**:
- ⚠️ Integration issues discovered later (after PR approval)

---

### Strategy 2: Parallel Execution

**Best for**: Teams prioritizing speed over cost

```yaml
jobs:
  test-matrix:
    name: E2E Tests (Parallel)
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-suite: [storybook, app]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      # Storybook setup (matrix.test-suite == 'storybook')
      - name: Build and serve Storybook
        if: matrix.test-suite == 'storybook'
        run: |
          npm run build-storybook
          npx serve storybook-static -p 6006 &
          npx wait-on http://localhost:6006

      # Meteor setup (matrix.test-suite == 'app')
      - name: Install and start Meteor
        if: matrix.test-suite == 'app'
        run: |
          curl https://install.meteor.com/ | sh
          cd meteor-app && meteor npm install
          meteor run --port 3000 &
          npx wait-on http://localhost:3000

      - name: Run tests
        run: npm run test:e2e:${{ matrix.test-suite }}

      - name: Upload results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.test-suite }}-test-results
          path: playwright-report/
```

**Advantages**:
- ✅ Fastest overall execution (parallel)
- ✅ Full coverage on every commit
- ✅ Matrix strategy scales to more test suites

**Tradeoffs**:
- ⚠️ Higher CI cost (runs both suites every time)
- ⚠️ More complex setup

---

### Strategy 3: Conditional Execution Based on Changes

**Best for**: Large teams with high commit frequency

```yaml
jobs:
  detect-changes:
    name: Detect Changed Files
    runs-on: ubuntu-latest
    outputs:
      ui-changed: ${{ steps.filter.outputs.ui }}
      backend-changed: ${{ steps.filter.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            ui:
              - 'meteor-app/imports/ui/**'
              - 'meteor-app/client/**'
              - 'tests/e2e/storybook/**'
            backend:
              - 'meteor-app/imports/api/**'
              - 'meteor-app/server/**'
              - 'tests/e2e/app/**'

  component-tests:
    name: Component Tests (Storybook)
    needs: detect-changes
    if: needs.detect-changes.outputs.ui-changed == 'true'
    # ... (same as Strategy 1)

  integration-tests:
    name: Integration Tests (Full App)
    needs: detect-changes
    if: needs.detect-changes.outputs.backend-changed == 'true' || github.event_name == 'push'
    # ... (same as Strategy 1)
```

**Advantages**:
- ✅ Optimal CI cost (runs only when needed)
- ✅ Fastest for unrelated changes

**Tradeoffs**:
- ⚠️ Complex path detection logic
- ⚠️ Risk of missing cross-cutting changes

---

## Running Storybook in CI

### Option 1: Build and Serve Static Storybook (Recommended)

```bash
# Build Storybook to static HTML
npm run build-storybook

# Serve static build (fast, stable)
npx serve storybook-static -p 6006 &

# Wait for server to be ready
npx wait-on http://localhost:6006

# Run tests
npm run test:e2e:storybook
```

**Advantages**:
- ✅ Fast server startup
- ✅ No hot-reload overhead
- ✅ Reproducible builds

### Option 2: Run Storybook Dev Server

```bash
# Start dev server
npm run storybook &

# Wait for server (may take longer)
npx wait-on http://localhost:6006

# Run tests
npm run test:e2e:storybook
```

**Advantages**:
- ✅ Matches local dev environment exactly

**Disadvantages**:
- ⚠️ Slower startup
- ⚠️ More resource-intensive

---

## Running Meteor App in CI

### Setup Steps

```bash
# Install Meteor
curl https://install.meteor.com/ | sh

# Install dependencies
cd meteor-app && meteor npm install

# Start Meteor
meteor run --port 3000 &

# Wait for app to be ready (Meteor takes longer to start than Storybook)
npx wait-on http://localhost:3000 --timeout 120000

# Run tests
cd .. && npm run test:e2e:app
```

### Performance Tips

1. **Use Meteor build cache**: Cache `~/.meteor` directory
   ```yaml
   - name: Cache Meteor
     uses: actions/cache@v3
     with:
       path: ~/.meteor
       key: meteor-${{ runner.os }}-${{ hashFiles('meteor-app/.meteor/release') }}
   ```

2. **Increase wait timeout**: Meteor cold start can take 60-120 seconds
   ```bash
   npx wait-on http://localhost:3000 --timeout 120000
   ```

3. **Use production mode** (optional for faster startup):
   ```bash
   cd meteor-app && meteor run --production --port 3000 &
   ```

---

## Playwright Configuration for CI

### playwright.config.js adjustments

```javascript
export default defineConfig({
  // CI-specific settings
  workers: process.env.CI ? 1 : undefined,  // Avoid race conditions in CI
  retries: process.env.CI ? 2 : 0,          // Retry flaky tests in CI
  reporter: process.env.CI ? 'github' : 'html',  // GitHub annotations in CI

  use: {
    // Slower timeout in CI (servers may be slower)
    actionTimeout: process.env.CI ? 15000 : 10000,

    // Always capture screenshots/videos on failure in CI
    screenshot: process.env.CI ? 'only-on-failure' : 'off',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },

  // Separate projects for Storybook and App
  projects: [
    {
      name: 'storybook-chromium',
      testMatch: /tests\/e2e\/storybook\/.*\.spec\.ts/,
      use: {
        baseURL: 'http://localhost:6006',
      },
    },
    {
      name: 'chromium',
      testMatch: /tests\/e2e\/app\/.*\.spec\.ts/,
      use: {
        baseURL: 'http://localhost:3000',
      },
    },
  ],
});
```

---

## Test Execution Strategies

### Sequential Execution (Safer)

```bash
# Run component tests first
npm run test:e2e:storybook

# If component tests pass, run integration tests
if [ $? -eq 0 ]; then
  npm run test:e2e:app
else
  echo "Component tests failed, skipping integration tests"
  exit 1
fi
```

### Parallel Execution (Faster)

```bash
# Run both test suites in parallel
npm run test:e2e:storybook &
STORYBOOK_PID=$!

npm run test:e2e:app &
APP_PID=$!

# Wait for both to complete
wait $STORYBOOK_PID
STORYBOOK_EXIT=$?

wait $APP_PID
APP_EXIT=$?

# Fail if either failed
if [ $STORYBOOK_EXIT -ne 0 ] || [ $APP_EXIT -ne 0 ]; then
  exit 1
fi
```

---

## Handling Flaky Tests

### Retry Configuration

```javascript
// playwright.config.js
export default defineConfig({
  // Retry failed tests in CI only
  retries: process.env.CI ? 2 : 0,

  // Quarantine known flaky tests
  projects: [
    {
      name: 'chromium-stable',
      testIgnore: /.*\.flaky\.spec\.ts/,  // Skip flaky tests in main run
    },
    {
      name: 'chromium-flaky',
      testMatch: /.*\.flaky\.spec\.ts/,   // Run flaky tests separately
      retries: 3,                          // More retries for flaky suite
    },
  ],
});
```

### Identifying Flaky Tests

```bash
# Run tests multiple times to detect flakiness
for i in {1..10}; do
  npm run test:e2e:storybook || echo "Run $i failed"
done
```

---

## Cost Optimization Recommendations

### Tier 1: Every Commit
- ✅ Storybook component tests (fast, cheap)
- ✅ TypeScript compilation
- ✅ Linting and formatting

### Tier 2: Every PR (Before Merge)
- ✅ Full app integration tests
- ✅ Visual regression tests (if applicable)

### Tier 3: Nightly or Weekly
- ✅ Cross-browser tests (webkit, firefox)
- ✅ Performance benchmarks
- ✅ Accessibility audits

---

## Debugging CI Failures

### Access Test Artifacts

```yaml
- name: Upload Playwright Report
  if: always()  # Upload even if tests fail
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```

### Enable Debug Logging

```yaml
- name: Run tests with debug
  env:
    DEBUG: pw:api  # Playwright debug logs
  run: npm run test:e2e:storybook
```

### Capture Screenshots and Videos

```javascript
// playwright.config.js
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',  // Detailed trace for retried tests
  },
});
```

---

## Performance Targets

Based on actual measurements (see plan.md):

| Test Suite | Target | Acceptable | Needs Optimization |
|------------|--------|------------|-------------------|
| Storybook Component Tests | <30s | <60s | >60s |
| Full App Integration Tests | <5min | <10min | >10min |
| Full E2E Suite (All Tests) | <10min | <20min | >20min |

### Measuring Performance

```bash
# Time the test execution
time npm run test:e2e:storybook

# Use Playwright reporter to see per-test times
npm run test:e2e:storybook -- --reporter=line

# Generate HTML report with timing details
npm run test:e2e:all -- --reporter=html
```

---

## Example: GitHub Actions Complete Workflow

```yaml
name: E2E Test Suite

on:
  pull_request:
  push:
    branches: [master, main]

jobs:
  component-tests:
    name: Component Tests (Storybook)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Cache Playwright browsers
        uses: actions/cache@v3
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - run: npx playwright install --with-deps chromium

      - name: Build Storybook
        run: npm run build-storybook

      - name: Serve Storybook
        run: npx serve storybook-static -p 6006 &

      - name: Wait for Storybook
        run: npx wait-on http://localhost:6006 --timeout 60000

      - name: Run component tests
        run: npm run test:e2e:storybook

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: storybook-test-results
          path: |
            playwright-report/
            test-results/
          retention-days: 7

  integration-tests:
    name: Integration Tests (Full App)
    runs-on: ubuntu-latest
    needs: component-tests
    if: github.event_name == 'push'
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Cache Meteor
        uses: actions/cache@v3
        with:
          path: ~/.meteor
          key: meteor-${{ runner.os }}-${{ hashFiles('meteor-app/.meteor/release') }}

      - name: Install Meteor
        run: |
          curl https://install.meteor.com/ | sh
          meteor --version

      - run: npm ci
      - run: cd meteor-app && meteor npm install

      - name: Cache Playwright browsers
        uses: actions/cache@v3
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - run: npx playwright install --with-deps chromium

      - name: Start Meteor
        run: cd meteor-app && meteor run --port 3000 &

      - name: Wait for Meteor
        run: npx wait-on http://localhost:3000 --timeout 120000

      - name: Run integration tests
        run: npm run test:e2e:app

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: integration-test-results
          path: |
            playwright-report/
            test-results/
          retention-days: 7
```

---

## Additional Resources

- **Playwright CI Documentation**: https://playwright.dev/docs/ci
- **Storybook CI Guide**: https://storybook.js.org/docs/react/workflows/testing-with-storybook#run-test-runner-in-ci
- **GitHub Actions Caching**: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows
- **wait-on Documentation**: https://github.com/jeffbski/wait-on

---

## Summary

**Recommended workflow for most teams**:
1. Run Storybook component tests on every PR commit
2. Run full app integration tests only on merge to main
3. Use static Storybook build for faster CI execution
4. Cache Meteor and Playwright browsers
5. Set appropriate timeouts (Storybook: 60s, Meteor: 120s)
6. Upload test artifacts on failure for debugging
7. Configure retries (2x) in CI only

This balances speed, cost, and coverage while leveraging the benefits of the two-phase testing strategy.
