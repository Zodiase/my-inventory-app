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

## 8. Troubleshooting Tips
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `util._extend` warning | Meteor tool dependency | Ignore / track upstream issue |
| Fibers build error | Leftover install step | Remove `fibers` (done) |
| Lint misused-promises error | Async callback to sync iterator | Prefetch then loop (implemented) |
| Docker build slow | No layer caching of Meteor deps | Consider caching `.meteor` & npm cache |

## 9. Conventions Adopted
- Conventional commits: `chore(deps)`, `ci:`, `chore(lint)`, `feat:` as applicable.
- Documentation for external upstream issues lives in `docs/KNOWN_ISSUES.md`; internal process notes live here.

_Last updated: 2025-09-18_
