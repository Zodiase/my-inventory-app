# Development Notes

Durable operational context for the Meteor application. Live pass/fail state and test totals belong in local command output and GitHub Actions.

## Runtime baseline

- The application release is `METEOR@3.4.1` in `meteor-app/.meteor/release`.
- CI and the Docker build use the same Meteor release.
- Supported Node runtimes are Node 22 and Node 24, as declared in both package manifests and exercised by CI.
- The production Docker runtime uses Node 22 Alpine to match Meteor's supported baseline.

When changing Meteor, update the app release, CI environment values, Docker builder image, and documentation together.

## Generated Meteor state

`meteor lint` generates types needed by TypeScript and ESLint in a clean checkout. The CI-equivalent command therefore runs Meteor lint before type and style checks.

Meteor test commands may rewrite `meteor-app/.meteor/versions` with test-driver resolution changes. Commit the app-mode lockfile and review any lockfile drift after tests. See `docs/KNOWN_ISSUES.md` for the upstream issue.

Use `npm run clean:generated` when local generated state differs from CI. The cleanup script preserves `meteor-app/.meteor/local/db`.

## Test isolation

- Playwright starts Meteor with `E2E_RESET_DATABASE=1` and removes personal Mongo environment variables.
- The reset endpoint rejects non-test Mongo URLs.
- App E2E tests use one worker because they share a resettable database.
- CI uses an isolated Meteor local directory for browser tests.

Keep personal inventory data behind `npm run start:personal`; use `npm run start:throwaway` for development and test work.

## Dependency maintenance

Run `npm audit --omit=dev` from `meteor-app/` for production exposure. `docs/KNOWN_ISSUES.md` records the one current upstream exception caused by a dependency bundled inside `meteor-node-stubs`.

Dependabot covers the Meteor npm manifest and GitHub Actions weekly. Group security fixes by compatibility, and validate runtime dependency changes with unit and app E2E tests.

## Docker and CI policy

- Pull requests build the Docker image but do not log in to or publish to Docker Hub.
- Trusted pushes to `master` build and publish the SHA-tagged image.
- CI runs script tests, type checks, style checks, unit tests, Chromium and mobile WebKit app E2E, and Chromium Storybook E2E.
- Visual-evidence automation remains a separate PR workflow because it compares base and head screenshots and publishes artifacts.

## Known upstream warnings

Meteor development startup may emit the upstream `util._extend` deprecation warning. Meteor tests may emit a `timers/promises` browser-resolution warning from fake timers. Both are documented in `docs/KNOWN_ISSUES.md`; do not globally suppress Node warnings.

_Last updated: 2026-07-11_
