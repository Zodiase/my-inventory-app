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

---
_Last updated: 2025-09-18_
