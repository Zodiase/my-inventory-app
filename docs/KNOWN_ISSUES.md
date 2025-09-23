# Known Issues

## Deprecation Warning: `util._extend`

When starting the development server you may see the following warning in the console:

```
(node:####) Warning: The `util._extend` API is deprecated. Please use Object.assign() instead.
```

### Cause
This originates from the Meteor tool's internal dependency (`http-proxy`) that still references Node's deprecated `util._extend` helper. It is not triggered by application source code in this repository.

### Upstream Tracking
- Meteor issue: https://github.com/meteor/meteor/issues/13491
- Appears with Meteor `3.3.x` when running on recent Node.js (e.g. Node 22+).

### Impact
- Harmless during development. The warning does not affect functionality or stability of the app.
- Does **not** appear in production bundles produced with `meteor build` (the proxy layer is not the same in production).

### Workarounds (Optional)
If the noise is distracting in local development you can suppress Node deprecation warnings:

```bash
NODE_OPTIONS="--no-deprecation" meteor run
```

(Do not commit this as a default; it's better to let new deprecations surface.)

### Resolution
No action required here. The warning will disappear automatically once Meteor updates the bundled dependency to remove usage of `util._extend`.

## Module Resolution Warning: `timers/promises`

When running tests you may see the following warnings:

```
Unable to resolve some modules:

  "timers/promises" in /home/wsl/workspace/my-inventory-app/meteor-app/node_modules/@sinonjs/fake-timers/src/fake-timers-src.js (web.browser)

If you notice problems related to these missing modules, consider running:

  meteor npm install --save meteor-node-stubs
```

### Cause
This occurs because the `@sinonjs/fake-timers` package (used by the Mocha testing framework) attempts to import Node.js's `timers/promises` module in browser environments where it doesn't exist.

- **Node.js Module**: `timers/promises` was introduced in Node.js 15.0.0+ providing Promise-based timer functions
- **Browser Context**: The warning appears during test execution when Meteor bundles server-side testing code for browser environments
- **Test Framework**: `@sinonjs/fake-timers` conditionally imports this module but gracefully handles when it's missing

### Current Environment
- **Meteor**: 3.3.2
- **meteor-node-stubs**: 1.2.24 (latest available)
- **Node.js**: 22.x
- **ESLint Config**: Flat configuration with eslint-config-love

### Impact
- **Non-blocking**: All tests pass successfully (18 passing tests)
- **Functionality intact**: Application runs normally in development and production
- **Cosmetic only**: This is a bundling warning, not a runtime error
- **Test execution**: Fake timers work correctly despite the warning

### Investigation Summary
1. ✅ Confirmed `meteor-node-stubs@1.2.24` is the latest version
2. ✅ Package includes timer stubs but not the newer `timers/promises` API
3. ✅ All test functionality works correctly
4. ✅ No impact on application performance or stability
5. ❌ Custom polyfill attempts unsuccessful (module resolution occurs at bundle time)

### Resolution
**No action required**. This is a known compatibility issue between:
- Modern Node.js APIs (timers/promises)
- Meteor's browser bundling system
- Testing libraries that reference Node.js APIs

### Expected Timeline
The warning will resolve automatically when:
- `meteor-node-stubs` adds support for `timers/promises` stubs, OR
- `@sinonjs/fake-timers` updates their conditional import logic, OR
- Meteor improves Node.js module resolution for browser contexts

### Workarounds (Not Recommended)
While this warning can be safely ignored, if the console noise is problematic, you could:

1. **Suppress during tests** (affects all Node warnings):
   ```bash
   NODE_OPTIONS="--no-warnings" npm test
   ```

2. **Filter test output** (hides the specific warning):
   ```bash
   npm test 2>&1 | grep -v "Unable to resolve some modules"
   ```

These workarounds are not recommended as they may hide other important warnings.

---
_Last updated: 2025-09-23_
