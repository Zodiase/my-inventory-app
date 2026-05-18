---
type: 'agent_requested'
description: 'Development setup for this repo: root vs meteor-app split, commands, ports, test workflows, and common gotchas.'
---

# Dev setup — agent memory card

For detailed docs, see:

- `README.md` — overview, testing strategy, quick commands
- `docs/DEVELOPMENT_NOTES.md` — Meteor 3 upgrade context, CI, lint config, troubleshooting
- `docs/TESTING_GUIDE.md` — Playwright modes, nohup background servers, workflow rules
- `docs/KNOWN_ISSUES.md` — upstream deprecation warnings (safe to ignore)

## Critical structural split

- **Repo root** = Playwright E2E infra (`tests/e2e/`, `playwright.config.js`, root `package.json`)
- **`meteor-app/`** = Meteor 3 app, unit tests, lint, types, Storybook
- Run **root scripts** for Playwright; run **`meteor-app` scripts** for Meteor/unit/type/lint work

## Commands I must remember

| Where         | What                        | Command                                                               |
| ------------- | --------------------------- | --------------------------------------------------------------------- |
| root          | start Meteor app            | `npm start`                                                           |
| root          | start Storybook             | `npm run storybook`                                                   |
| root          | E2E (auto-starts servers)   | `npm run test:e2e:app` / `test:e2e:storybook` / `test:e2e:all`        |
| root          | E2E against running servers | `PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e:skip-server`            |
| `meteor-app/` | unit tests                  | `npm test`                                                            |
| `meteor-app/` | unit tests (port 3000 busy) | `meteor test --once --port 3101 --driver-package meteortesting:mocha` |
| `meteor-app/` | type check                  | `npm run check:type`                                                  |
| `meteor-app/` | lint + format check         | `npm run check:code-style`                                            |
| `meteor-app/` | Prettier write              | `npm run format`                                                      |

## Hard-won gotchas

- **Port 3000 already in use?** `npm test` inside `meteor-app` will fail. Use port `3101` fallback instead.
- **Playwright auto-starts both Meteor and Storybook** unless `PLAYWRIGHT_SKIP_WEBSERVER=1` is set.
- **App E2E is not parallel-safe** (shared DB reset helpers) — workers default to `1`.
- **ESLint is strict** (`eslint-config-love`). Prefer `import type` for type-only imports; use absolute Meteor imports (`/imports/...`); never relative (`../`).
- **Non-blocking lint warnings** remain and are tracked in GitHub issue `#63`.
- **Meteor test browser warnings** (`timers/promises` unresolved) are safe to ignore; they come from test framework stubs in browser builds.

## Workflow habit

1. Add or update a focused test first (TDD)
2. Run the smallest relevant validation (e.g. one test file, one spec)
3. Widen to broader checks only after the focused check passes
4. For UI work, prefer Storybook component tests before full-app E2E

## Current baseline (may drift)

- Meteor unit tests: `118 passing`
- TypeScript: clean
- Code style: `0 errors`, warnings tracked in `#63`
- Full-app E2E: previously green locally
