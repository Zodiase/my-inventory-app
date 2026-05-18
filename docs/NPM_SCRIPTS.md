# NPM Scripts Reference

This project has a repository root plus the Meteor app in `meteor-app/`. Prefer running commands from the repository root unless the command explicitly says it is Meteor-app-only.

## CI and cleanup

| Command                   | Run from              | Purpose                                                                                                                 |
| ------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run clean:generated` | root or `meteor-app/` | Removes generated Meteor local state while preserving `.meteor/local/db`. Use when local checks do not match CI.        |
| `npm run check:ci`        | root or `meteor-app/` | Runs the local equivalent of the CI quality path: install deps, regenerate Meteor types, type-check, lint/format-check. |
| `npm run check:ci:fresh`  | root or `meteor-app/` | Runs `clean:generated` first, then `check:ci`. Best command for reproducing CI-only type/lint issues.                   |

### Cleanup safety

`clean:generated` deletes generated entries under `meteor-app/.meteor/local`, but it intentionally preserves `meteor-app/.meteor/local/db`.

Use this instead of manually deleting `.meteor/local` when you want to keep your development database.

## Code quality

| Command                    | Run from              | Purpose                                                      |
| -------------------------- | --------------------- | ------------------------------------------------------------ |
| `npm run check:type`       | `meteor-app/`         | TypeScript compile check. Requires Meteor generated types.   |
| `npm run check:code-style` | `meteor-app/`         | Prettier check plus ESLint. Requires Meteor generated types. |
| `npm run format:check`     | root or `meteor-app/` | Prettier check only.                                         |
| `npm run format`           | root or `meteor-app/` | Prettier write/fix.                                          |

## App and tests

| Command                      | Run from              | Purpose                             |
| ---------------------------- | --------------------- | ----------------------------------- |
| `npm start`                  | root or `meteor-app/` | Starts the Meteor dev server.       |
| `npm run storybook`          | root or `meteor-app/` | Starts Storybook on port 6006.      |
| `npm test`                   | `meteor-app/`         | Runs Meteor unit tests once.        |
| `npm run test-app`           | `meteor-app/`         | Runs full app tests in watch mode.  |
| `npm run test:e2e:all`       | root                  | Runs all Playwright E2E tests.      |
| `npm run test:e2e:storybook` | root                  | Runs Storybook/component E2E tests. |
| `npm run test:e2e:app`       | root                  | Runs full-app E2E tests.            |

## Script maintenance

| Command                | Run from | Purpose                                    |
| ---------------------- | -------- | ------------------------------------------ |
| `npm run test:scripts` | root     | Runs tests for repository utility scripts. |

## Troubleshooting CI-only type/lint failures

If a PR check fails but your local machine passes, run:

```bash
npm run check:ci:fresh
```

This removes generated Meteor cache/type state without deleting the dev database, then regenerates the Meteor package types via `meteor lint` before running the same checks as CI.
