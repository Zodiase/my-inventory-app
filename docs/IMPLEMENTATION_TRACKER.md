# Implementation Tracker

Last updated: 2026-05-03

## Purpose

Track current branch progress, verified test status, and the next repair order so work can resume cleanly across sessions.

## Branch Goal

Primary goal: finish the inventory app while keeping progress measurable through isolated Storybook coverage plus Playwright E2E verification.

## Current Status Snapshot

- Storybook build issue fixed by extracting shared validation constants into `meteor-app/imports/model/ItemConstants.ts`.
- Storybook E2E status: **21 passed, 3 skipped**.
- Full app E2E status: **27 passed, 17 failed** after method-registration and serial-worker fixes.
- Search / filter app suite status: **12 passed, 0 failed**.
- TypeScript check now passes.
- Unit test status: **115 passing** via `npm test`.

## Recently Completed

- Extracted `MAX_ITEM_NAME_LENGTH` and `MAX_ITEM_DESCRIPTION_LENGTH` from `meteor-app/imports/api/items.ts` into a pure model module.
- Updated `meteor-app/imports/ui/ItemForm.tsx` to import constants from the pure module.
- Verified Storybook dev server now serves `iframe.html` correctly for `ui-itemform--test-cancel-behavior`.
- Re-ran Storybook Playwright suite successfully.
- Added shared UI/mobile constants in `meteor-app/imports/utility/constants.ts`.
- Fixed `ItemsByTagViewPresentation` description preview typing.
- Fixed the `items.search` selector type mismatch at the Meteor collection boundary.
- Updated `asMeteorMethods()` to register namespaced Meteor methods while keeping legacy unprefixed names for compatibility.
- Re-exported `callMeteorMethod` from `tests/e2e/helpers/factories.ts` for tests that import it there.
- Updated Playwright config to run with `workers: 1` by default because app tests share a single resettable database.
- Re-ran `npm run check:type` successfully.
- Re-ran `npm test` successfully.
- Re-ran `tests/e2e/app/search-and-filter.spec.ts` successfully: **12 passed**.
- Re-ran the full Chromium app E2E suite: **27 passed, 17 failed**.

## Verified Commands

- Storybook dev server: `cd meteor-app && npm run storybook`
- Storybook E2E: `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/storybook/ --project=storybook-chromium`
- Meteor app server: `cd meteor-app && npm start`
- App E2E: `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/app/ --project=chromium`
- Type check: `cd meteor-app && npm run check:type`

## TypeScript Status

- `npm run check:type` passes as of 2026-05-03.
- The previous missing constants and selector typing issues are resolved.

## App E2E Failure Buckets

### 1. Search / filtering backend behavior

Files:

- `tests/e2e/app/search-and-filter.spec.ts`

Observed pattern:

- Resolved: namespaced method registration plus serial workers fixed this bucket.
- Current focused result: `tests/e2e/app/search-and-filter.spec.ts` passes completely.

### 2. Tag management UI / flow mismatches

Files:

- `tests/e2e/app/items-and-tags.spec.ts`
- `tests/e2e/app/tag-management.spec.ts`

Observed pattern:

- Expected tags or items do not appear after creation.
- Some clicks are blocked by an overlay.
- Some tests still call methods that do not exist under the expected names (for example `tags.findOne`, `tags.delete`).
- One helper import issue was fixed by re-exporting `callMeteorMethod`.

### 3. Item creation / navigation stability

Files:

- `tests/e2e/app/item-creation.spec.ts`
- `tests/e2e/app/item-creation-refactored.spec.ts`
- `tests/e2e/app/items-and-tags.spec.ts`

Observed pattern:

- Created items/containers are not consistently visible after creation.
- Some flows time out waiting for `Create Item` or list entries.

### 4. Touch/mobile Playwright configuration gaps

Files:

- `tests/e2e/app/touch-optimization.spec.ts`

Observed pattern:

- `page.touchscreen` is used without `hasTouch` enabled in the browser context.
- Some touch tests likely need project/config changes before product fixes can be trusted.

## Latest Validation Results

- `npm run check:type` → pass
- `npm test` → pass (**115 passing**)
- `npx playwright test tests/e2e/app/search-and-filter.spec.ts --project=chromium` → pass (**12 passed**)
- `npx playwright test tests/e2e/app/ --project=chromium` → **27 passed, 17 failed**

## Recommended Repair Order

1. Fix tag creation / visibility flows and any overlay interaction issues.
2. Stabilize item creation/navigation tests.
3. Repair Playwright touch configuration, then re-evaluate true touch-product failures.

## Definition of Done for This Phase

- `npm run check:type` passes
- Storybook suite remains green
- App E2E failures are reduced by fixing product issues or clearly documenting test issues
- This tracker is updated after each major fix batch

## Notes for the Next Session

- Storybook is now the healthiest measurement layer and should stay green while app-level work continues.
- When picking the next implementation target, prefer fixing a whole failure bucket rather than isolated individual tests.
- Update this file whenever a command result materially changes status.
