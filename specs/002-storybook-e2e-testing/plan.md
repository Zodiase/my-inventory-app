# Implementation Plan: Storybook-First E2E Testing Strategy

**Branch**: `002-storybook-e2e-testing` | **Date**: November 27, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-storybook-e2e-testing/spec.md`

## Summary

This feature establishes a two-phase E2E testing strategy to address the inability to distinguish between component bugs, test infrastructure issues, and integration failures. Phase 1 validates testing approaches against isolated Storybook components using Playwright, proving selectors and interaction patterns work. Phase 2 ports proven patterns to full Meteor app E2E tests. This approach reduces test debugging time by isolating failure sources and provides a reliable foundation for comprehensive E2E coverage.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22.x or 24.x
**Primary Dependencies**: Playwright (E2E testing), Storybook 10.x (component isolation), React 18+, Grommet (UI components)
**Storage**: N/A (testing infrastructure only)
**Testing**: Playwright for Storybook-first browser tests and full app E2E; Meteor Mocha/Chai/Sinon for existing Meteor test coverage
**Target Platform**: Web browsers (chromium, webkit for iPad/iPhone simulation)
**Project Type**: Web application (Meteor + React)
**Performance Goals**: Test execution <30s per component story, <5min for full E2E suite
**Constraints**: Tests must work in both headed (dev) and headless (CI) modes, support touch simulation for mobile testing, and support both Playwright-managed server startup and `PLAYWRIGHT_SKIP_WEBSERVER` local workflows
**Scale/Scope**: ~15 critical UI components for initial Storybook testing, ~25 existing E2E tests to refactor with proven patterns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Test-Driven Development (Principle II)
- ✅ **PASS**: This feature IS about testing - establishes component-level test coverage in Storybook
- ✅ **PASS**: All testing patterns will be validated in Storybook before porting to full E2E
- ✅ **PASS**: Aligns with "tests must be runnable and pass consistently" principle

### Type Safety & Strict Typing (Principle I)
- ✅ **PASS**: Test code will use TypeScript strict mode
- ✅ **PASS**: Page objects will be properly typed
- ✅ **PASS**: No impact on production code type safety

### User Experience Consistency (Principle III)
- ✅ **PASS**: Testing components in Storybook validates consistent interaction patterns
- ✅ **PASS**: Tests will verify Grommet component usage and styled-components rendering
- ⚠️ **MONITOR**: Must ensure Storybook stories accurately represent real app UX

### Performance Requirements (Principle IV)
- ✅ **PASS**: No database operations in component tests (isolated)
- ✅ **PASS**: Tests do not modify production performance characteristics
- N/A: Testing infrastructure performance tracked separately

### Code Documentation & Maintainability (Principle V)
- ✅ **PASS**: Test patterns will be documented in research.md and quickstart.md
- ✅ **PASS**: Page objects will have clear JSDoc comments
- ✅ **PASS**: Testing approach provides self-documenting examples

**Gate Status**: ✅ ALL GATES PASSED - Proceed to Phase 0

---

## Phase 0: Research (COMPLETED)

**Output**: `research.md`

**Key Decisions**:
- Playwright configuration: Add dedicated `storybook-chromium` project targeting `http://localhost:6006`
- Story navigation: Use `iframe.html?id={story-id}&viewMode=story` for isolated component access
- Interaction verification: Storybook actions + DOM assertions (no backend mocking needed)
- Page object sharing: Context-aware methods work in both Storybook iframe and full app
- Timing strategy: Playwright auto-waiting + assertions (avoid fixed timeouts)
- Test organization: Separate `tests/e2e/storybook/` and `tests/e2e/app/` directories

**All NEEDS CLARIFICATION items resolved** ✅

---

## Phase 1: Design & Contracts (COMPLETED)

**Outputs**:
- `data-model.md` - Test entities (ComponentTest, IntegrationTest, TestPattern, PageObject)
- `quickstart.md` - How to write and run tests using two-phase approach
- Updated `.github/copilot-instructions.md` with Playwright/Storybook testing knowledge

**Key Design Decisions**:
- No API contracts needed (testing infrastructure only - no database/API changes)
- Test entities are conceptual models for organizing tests, not persisted data
- Page objects are context-agnostic - same code works in both Storybook and full app
- TestPattern lifecycle: Unvalidated → Validated in Storybook → Ported to Integration

**Constitution Re-Check (Post-Design)**:

### Test-Driven Development (Principle II)
- ✅ **PASS**: Phase 1 design establishes clear test organization (ComponentTest → IntegrationTest)
- ✅ **PASS**: Workflow enforces testing components in isolation before integration
- ✅ **PASS**: Success criteria SC-001 requires 100% ComponentTest pass rate before porting

### Type Safety & Strict Typing (Principle I)
- ✅ **PASS**: Page objects will use TypeScript classes with proper typing
- ✅ **PASS**: Test patterns document known Grommet selector issues (FormField label association)
- ✅ **PASS**: No `any` types introduced in test infrastructure

### User Experience Consistency (Principle III)
- ✅ **PASS**: Testing validates consistent interaction patterns across components
- ✅ **PASS**: Storybook stories represent real usage (assumption validated)
- ✅ **PASS**: Tests verify Grommet components and styled-components work correctly

### Performance Requirements (Principle IV)
- ✅ **PASS**: Component tests in Storybook run faster than full E2E (isolated, no Meteor init)
- ✅ **PASS**: Performance goal: <30s per component story execution
- ✅ **PASS**: Playwright auto-waiting prevents unnecessary delays

### Code Documentation & Maintainability (Principle V)
- ✅ **PASS**: quickstart.md provides comprehensive testing guide
- ✅ **PASS**: Page objects will have JSDoc documenting known issues (e.g., Grommet quirks)
- ✅ **PASS**: Test patterns explicitly documented with reusable examples

**Post-Design Gate Status**: ✅ ALL GATES STILL PASSED

---

## Phase 2: Task Breakdown

**Status**: COMPLETED - `tasks.md` exists and implementation work has progressed substantially outside the original Speckit command flow

**Current execution snapshot (2026-05-18)**:
- Completed: Playwright Storybook project/config, shared Storybook helpers, context-agnostic page objects, touch-optimization app refactor, ItemForm/TouchButton/CreateTagDialog/LongPressContextMenu/SearchBar/TagSelector test coverage, test pattern catalog, performance measurement, CI/CD guidance, and root-level npm scripts/README updates
- Still open in `tasks.md`: none for spec 002 implementation; draft PR review/merge remains outside the task list

**Next Action**: Review draft PR #73 and keep `tasks.md` current if any review follow-ups are requested

### Performance Measurement Results (T021)

Measured on 2026-05-18 using Playwright-managed local servers from the repository root.

| Suite | Command | Result | Reported duration | Wall-clock duration | Goal | Status |
|-------|---------|--------|-------------------|---------------------|------|--------|
| Storybook component tests | `npx playwright test tests/e2e/storybook --project=storybook-chromium --reporter=line` | 30 passed, 3 skipped | 51.5s suite total | 52s | <30s per component story | ✅ Pass |
| Storybook slowest individual test/story | JSON reporter parse of the same Storybook project | `LongPressContextMenu` action-selection test | 1.36s | N/A | <30s per component story | ✅ Pass |
| Full app E2E tests | `npx playwright test tests/e2e/app --project=chromium --reporter=line` | 45 passed | 1.9m suite total | 113s | <5min full E2E suite | ✅ Pass |

**Optimization notes**:
- No blocking optimization is required; both measured goals pass comfortably.
- Optional future improvement: app-only runs currently still pay the shared Playwright `webServer` startup cost for Storybook because both servers are configured globally. If app suite runtime becomes tight, split server startup by project or use `PLAYWRIGHT_SKIP_WEBSERVER=1` with already-running local servers for faster iteration.

## Project Structure

### Documentation (this feature)

```
specs/002-storybook-e2e-testing/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - testing best practices
├── data-model.md        # Phase 1 output - test entities & patterns
├── quickstart.md        # Phase 1 output - how to run/write tests
├── tasks.md             # Phase 2 output - tracked implementation tasks
├── test-patterns.md     # Proven selector and interaction patterns
├── ci-cd.md             # CI/CD guidance for the two-phase approach
└── storybook-stories-inventory.md  # Story IDs and candidate coverage inventory
```

### Source Code (repository root)

```
tests/
├── e2e/
│   ├── storybook/           # Component tests targeting Storybook
│   │   ├── ItemForm.spec.ts
│   │   ├── TouchButton.spec.ts
│   │   ├── CreateTagDialog.spec.ts
│   │   └── storybook-helpers.spec.ts
│   ├── app/                 # Full app E2E tests
│   │   ├── item-creation.spec.ts
│   │   ├── tag-management.spec.ts
│   │   ├── touch-optimization.spec.ts
│   │   └── items-and-tags.spec.ts
│   └── helpers/
│       ├── page-objects.ts       # Reusable for both contexts
│       ├── storybook-helpers.ts  # Storybook-specific utilities
│       ├── database.ts           # App test helpers
│       └── factories.ts

meteor-app/
└── imports/
    └── ui/
        ├── ItemForm.stories.tsx
        ├── CreateTagDialog.stories.tsx
        ├── TouchButton.stories.tsx
        └── LongPressContextMenu.stories.tsx

playwright.config.js              # Storybook + app projects with optional auto-start webServer
```

**Structure Decision**: Separate `tests/e2e/storybook/` from `tests/e2e/app/` to clearly distinguish component-level from integration tests. Page objects in `helpers/` are shared between both contexts. Playwright can auto-start Storybook/Meteor by default, while `PLAYWRIGHT_SKIP_WEBSERVER` supports faster local iteration against already-running servers.

## Complexity Tracking

*No constitutional violations - this section intentionally left empty.*

---

## Planning Summary

**Branch**: `002-storybook-e2e-testing`
**Status**: ✅ Implementation complete for the tracked spec 002 follow-up tasks; artifacts synced with out-of-band work on 2026-05-18
**Next Step**: Review draft PR #73 and keep these artifacts updated if review follow-ups change scope or status

**Artifacts Created**:
- ✅ `plan.md` - This file, comprehensive implementation plan
- ✅ `research.md` - 6 technical decisions with rationale and patterns
- ✅ `data-model.md` - 4 test entities (ComponentTest, IntegrationTest, TestPattern, PageObject)
- ✅ `quickstart.md` - Complete developer guide with workflows and debugging
- ✅ `tasks.md` - Task breakdown with implementation status
- ✅ `test-patterns.md` - Proven selector and interaction pattern catalog
- ✅ `ci-cd.md` - CI/CD options for Storybook-first testing
- ✅ `storybook-stories-inventory.md` - Story inventory for coverage planning
- ✅ Updated `.github/copilot-instructions.md` - Agent context with testing knowledge

**Key Takeaways**:
1. **Two-phase approach validated**: Test in Storybook isolation first, then port to full E2E
2. **No constitutional violations**: All 5 core principles satisfied
3. **Context-agnostic page objects**: Same code works in both Storybook and full app
4. **Documented proven patterns**: ItemForm and CreateTagDialog workflows are captured in reusable test patterns
5. **Practical debugging guide**: quickstart.md and ci-cd.md address local and CI pain points
6. **Flexible execution modes**: auto-start works for convenience; skip-server mode supports rapid local iteration

**Remaining Critical Path**: Complete for the tracked spec 002 implementation tasks. Draft PR review/merge remains the next project workflow step.

**Tracking Source of Truth**: `tasks.md` is the execution tracker for the remaining work; keep it synchronized when implementation lands outside Speckit commands

**References**:
- Feature spec: [spec.md](./spec.md)
- Research decisions: [research.md](./research.md)
- Test entity model: [data-model.md](./data-model.md)
- Developer quickstart: [quickstart.md](./quickstart.md)
