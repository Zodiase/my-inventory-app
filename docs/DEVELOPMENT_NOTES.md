# Development Notes

These notes capture migration context and operational learnings gathered during the Meteor 3.3.2 upgrade and subsequent CI/doc improvements.

## 1. Meteor 3 Upgrade Summary
- Upgraded from Meteor 2.x (previous CI referenced `meteor@2.12`) to `METEOR@3.3.2`.
- Removed legacy Fiber dependency: `fibers` is no longer required (and fails to build under Node 22). Dockerfile line installing `fibers@4` was deleted.
- Node runtime now aligns with Meteor 3 expectation: Node 22 (per official changelog guidance).

## 2. Deprecated `util._extend` Warning
- Warning appears only in dev server startup: emitted by Meteor tool internal `http-proxy` usage.
- Upstream issue: meteor/meteor#13491 (documented in `docs/KNOWN_ISSUES.md`).
- Harmless; not caused by repository code. No suppression committed to keep visibility into future deprecations.

## 3. CI Pipeline Adjustments
- Previous workflows targeted Node 14 and Meteor 2.12.
- Updated GitHub Actions (`.github/workflows/node.js.yml`) to use Node 22 and install `meteor@3.3.2` explicitly in the tests job.
- Matrix simplified (single modern Node version) for faster feedback; can reintroduce multi-version testing if desired.
- Follow‑up idea: add a nightly job to test against `meteor@latest` for early detection of upstream changes.

## 4. Lint & Type Issues Encountered
- `@typescript-eslint/no-misused-promises` flagged an `async` callback passed to `forEachAsync` in `getDetachedTags`.
  - Resolution: fetch matching documents eagerly (`fetchAsync`) then iterate with a standard `for...of`, preserving async awaits inside the loop.
- Minor warnings (unused variable, empty interface) retained; not build blocking but can be cleaned for signal purity.

## 5. Docker Image Changes
- Base image: `geoffreybooth/meteor-base:3.3.2` retained as first stage for build.
- Multi-stage approach preserved, but removed obsolete fibers install.
- Runs on `node:22-alpine` final stage. Consider pinning a digest for reproducibility.
- Potential enhancement: add build arg for Meteor version to reduce duplication.

## 6. Local Development Commands
| Purpose | Command |
|---------|---------|
| Install deps | `meteor npm install` |
| Start dev app | `meteor run` |
| Unit tests | `npm test` |
| Full app tests | `npm run test-app` |
| Lint + format check | `npm run check:code-style` |
| Type check | `npm run check:type` |

## 7. Suggested Follow-Ups
- Add `CHANGELOG.md` beginning with this upgrade.
- Introduce CI caching for Meteor release directory (`~/.meteor`) to speed up installs.
- Add automated production image build test (attempt `meteor build` inside CI) to catch bundle regressions earlier.
- Evaluate enabling ESLint rule escalation (treat warnings as errors) once outstanding warnings are resolved.
- Add security scanning of final Docker image (e.g. Trivy or Grype) in pipeline.

## 8. ESLint Flat Configuration Migration (September 2025)

### Migration Summary
- **Migrated from**: Legacy `.eslintrc.js` format to modern ESLint flat configuration
- **Configuration file**: `eslint.config.mjs` (ES module with `.mjs` extension)
- **Key achievement**: Successfully integrated `eslint-config-love@49.0.0` for strict TypeScript rules

### Technical Implementation
- **Dynamic imports**: Used `(await import(...))` pattern to avoid Node.js module type warnings
- **Configuration order**: love config → base config → plugins → prettier (last) → ignores
- **Environment globals**: Replaced deprecated `env` with explicit globals from `globals` package
- **Import resolver**: Configured `eslint-import-resolver-meteor` for Meteor-specific imports

### Code Quality Status
- ✅ **TypeScript compilation**: Clean (added `skipLibCheck: true` for third-party types)
- ✅ **Prettier formatting**: All files conform to standards
- ⚠️ **ESLint issues**: 46 problems (43 errors, 3 warnings) from strict `love` config rules
- ✅ **Tests**: All 18 unit tests passing

### ESLint Issues Breakdown
Most issues are from strict TypeScript rules in `eslint-config-love`:
- **Magic numbers**: `@typescript-eslint/no-magic-numbers` (using `0`, `1`, `3000` directly)
- **Type safety**: `@typescript-eslint/no-unsafe-argument`, `@typescript-eslint/no-unsafe-assignment`
- **Import patterns**: `@typescript-eslint/no-import-type-side-effects` (inline type imports)
- **Variable initialization**: `@typescript-eslint/init-declarations`
- **Method binding**: `@typescript-eslint/unbound-method`

### Testing Infrastructure
- **Framework**: Meteortesting Mocha with browser and server test contexts
- **Coverage**: 18 passing tests covering API methods, models, and utilities
- **Known warning**: `timers/promises` module resolution warning (documented in KNOWN_ISSUES.md)
- **Performance**: Tests complete in ~70-110ms consistently

### Development Workflow Commands
```bash
# Code quality checks
npm run check:type          # TypeScript compilation
npm run check:code-style    # Prettier + ESLint combined
npm run check:code-style:prettier  # Prettier only
npm run check:code-style:lint      # ESLint only

# Testing
npm test                    # Unit tests (server-side)
npm run test-app           # Full application tests (server + client)
```

## 9. Troubleshooting Tips
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `util._extend` warning | Meteor tool dependency | Ignore / track upstream issue |
| `timers/promises` warning | Test framework in browser context | Safe to ignore (documented) |
| ESLint flat config errors | Missing dynamic imports or wrong order | Check `eslint.config.mjs` structure |
| TypeScript third-party errors | Missing skipLibCheck | Add `"skipLibCheck": true` to tsconfig |
| Fibers build error | Leftover install step | Remove `fibers` (done) |
| Lint misused-promises error | Async callback to sync iterator | Prefetch then loop (implemented) |
| Docker build slow | No layer caching of Meteor deps | Consider caching `.meteor` & npm cache |

## 10. Conventions Adopted
- Conventional commits: `chore(deps)`, `ci:`, `chore(lint)`, `feat:` as applicable.
- Documentation for external upstream issues lives in `docs/KNOWN_ISSUES.md`; internal process notes live here.
- ESLint flat configuration with `.mjs` extension for ES module compatibility
- Dynamic imports in configuration files to avoid module type conflicts

_Last updated: 2025-09-23_
