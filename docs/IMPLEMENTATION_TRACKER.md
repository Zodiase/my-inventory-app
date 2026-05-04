# Implementation Tracker

Last updated: 2026-05-04

## Purpose

Track current branch progress, verified test status, and the next repair order so work can resume cleanly across sessions.

## Branch Goal

Primary goal: finish the inventory app while keeping progress measurable through isolated Storybook coverage plus Playwright E2E verification.

## Current Status Snapshot

- Storybook build issue fixed by extracting shared validation constants into `meteor-app/imports/model/ItemConstants.ts`.
- Storybook E2E status: **21 passed, 3 skipped** (auto-started via updated Playwright webServer array).
- Full app E2E status: **44 passed, 0 failed** on Chromium.
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
- Fixed tag-management UI flows by adding missing `tags.findOne`, `tags.rename`, and `tags.delete` method coverage, using the `CreateTagDialog` flow, making tag rows/actions click-safe, and making tag usage counts reactive.
- Fixed item creation/navigation stability by keeping newly created items visible in the list instead of immediately navigating to detail view.
- Fixed touch/mobile flows by switching swipe-back to pointer events, hardening pull-to-refresh trigger state, adding stable touch test IDs, and correcting breadcrumb display for root-level containers.
- Re-ran focused tag/item suites successfully: **13/13 tag-management**, **4/4 items-and-tags**, and **21/21 item-creation** across the focused command.
- Re-ran `tests/e2e/app/touch-optimization.spec.ts` successfully: **8 passed**.
- Updated Playwright config to use a `webServer` array so both the Meteor app and the Storybook dev server auto-start for E2E.
- Re-ran the full Chromium app E2E suite successfully: **44 passed, 0 failed**.
- Re-ran Storybook E2E suite successfully: **21 passed, 3 skipped**.

## Verified Commands

- Storybook dev server: `cd meteor-app && npm run storybook`
- Storybook E2E: `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/storybook/ --project=storybook-chromium`
- Meteor app server: `cd meteor-app && npm start`
- App E2E: `npx playwright test tests/e2e/app/ --project=chromium --workers=1 --reporter=line`
- Type check: `cd meteor-app && npm run check:type`
- Unit tests: `cd meteor-app && npm test`

## TypeScript Status

- `npm run check:type` passes as of 2026-05-04.
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

- Resolved: tag creation uses `CreateTagDialog`, tag row/action clicks no longer conflict, usage counts update reactively, and expected tag methods are available.
- Current focused result: `tests/e2e/app/tag-management.spec.ts` passes completely.

### 3. Item creation / navigation stability

Files:

- `tests/e2e/app/item-creation.spec.ts`
- `tests/e2e/app/item-creation-refactored.spec.ts`
- `tests/e2e/app/items-and-tags.spec.ts`

Observed pattern:

- Resolved: newly created items stay in the list view so reactive list assertions and repeated create flows remain stable.
- Current focused result: item-creation and items-and-tags suites pass completely.

### 4. Touch/mobile Playwright configuration gaps

Files:

- `tests/e2e/app/touch-optimization.spec.ts`

Observed pattern:

- Resolved: touch tests use deterministic pointer gestures, swipe-back supports pointer events, pull-to-refresh uses current trigger state on release, and breadcrumb labels render correctly for root-level containers.
- Current focused result: `tests/e2e/app/touch-optimization.spec.ts` passes completely.

## Latest Validation Results

- `npm run check:type` → pass
- `npm test` → pass (**115 passing**)
- `npx playwright test tests/e2e/app/search-and-filter.spec.ts --project=chromium` → pass (**12 passed**)
- `npx playwright test tests/e2e/app/touch-optimization.spec.ts --project=chromium --workers=1 --reporter=line` → pass (**8 passed**)
- `npx playwright test tests/e2e/storybook/ --project=storybook-chromium --workers=1 --reporter=line` → pass (**21 passed, 3 skipped**)
- `npx playwright test tests/e2e/app/ --project=chromium --workers=1 --reporter=line` → pass (**44 passed**)

## Recommended Repair Order

1. Run CI for the branch to verify the single-worker Playwright configuration and the auto-starting webServer array behave correctly in the CI environment.
2. Merge if CI passes.

## Definition of Done for This Phase

- `npm run check:type` passes
- Storybook suite remains green
- App E2E suite passes on Chromium
- This tracker is updated after each major fix batch

## Notes for the Next Session

- App-level E2E is now green locally; preserve single-worker execution because tests share a resettable database.
- Storybook remains the isolated component baseline; re-run it before merge if CI does not cover it.
- Update this file whenever a command result materially changes status.
