# Implementation Plan: Storybook-First E2E Testing Strategy

**Branch**: `002-storybook-e2e-testing` | **Date**: November 27, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-storybook-e2e-testing/spec.md`

## Summary

This feature establishes a two-phase E2E testing strategy to address the inability to distinguish between component bugs, test infrastructure issues, and integration failures. Phase 1 validates testing approaches against isolated Storybook components using Playwright, proving selectors and interaction patterns work. Phase 2 ports proven patterns to full Meteor app E2E tests. This approach reduces test debugging time by isolating failure sources and provides a reliable foundation for comprehensive E2E coverage.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20+  
**Primary Dependencies**: Playwright (E2E testing), Storybook 7+ (component isolation), React 18+, Grommet (UI components)  
**Storage**: N/A (testing infrastructure only)  
**Testing**: Playwright for both Storybook and full app E2E tests, existing Mocha/Chai for unit tests  
**Target Platform**: Web browsers (chromium, webkit for iPad/iPhone simulation)
**Project Type**: Web application (Meteor + React)  
**Performance Goals**: Test execution <30s per component story, <5min for full E2E suite  
**Constraints**: Tests must work in both headed (dev) and headless (CI) modes, must support touch simulation for mobile testing  
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

**Status**: NOT COMPLETED - Run `/speckit.tasks` to generate tasks.md

This phase will break down the implementation into concrete tasks:
- Configure Playwright for Storybook testing
- Write ComponentTests for critical components (ItemForm, TouchButton, LongPressContextMenu)
- Refactor existing page objects to be context-agnostic
- Port proven patterns to IntegrationTests
- Update CI/CD to run both test suites

**Next Command**: `/speckit.tasks` (not invoked by /speckit.plan)

## Project Structure

### Documentation (this feature)

```
specs/002-storybook-e2e-testing/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - testing best practices
├── data-model.md        # Phase 1 output - test entities & patterns
├── quickstart.md        # Phase 1 output - how to run/write tests
├── contracts/           # Phase 1 output - test API contracts (if needed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```
tests/
├── e2e/
│   ├── storybook/           # NEW: Component tests targeting Storybook
│   │   ├── ItemForm.spec.ts
│   │   ├── TouchButton.spec.ts
│   │   └── LongPressContextMenu.spec.ts
│   ├── app/                 # REFACTORED: Full app E2E tests (existing)
│   │   ├── item-creation.spec.ts
│   │   ├── tag-management.spec.ts
│   │   └── touch-optimization.spec.ts
│   └── helpers/
│       ├── page-objects.ts       # REFACTORED: Reusable for both contexts
│       ├── storybook-helpers.ts  # NEW: Storybook-specific utilities
│       └── test-data.ts

meteor-app/
└── imports/
    └── ui/
        ├── ItemForm.stories.tsx      # EXISTING: Already have stories
        ├── TouchButton.stories.tsx
        └── LongPressContextMenu.stories.tsx

playwright.config.js              # MODIFIED: Add Storybook project config
```

**Structure Decision**: Separate `tests/e2e/storybook/` from `tests/e2e/app/` to clearly distinguish component-level from integration tests. Page objects in `helpers/` are shared between both contexts. Storybook stories already exist in `meteor-app/imports/ui/` - no new stories needed for MVP.

## Complexity Tracking

*No constitutional violations - this section intentionally left empty.*

---

## Planning Summary

**Branch**: `002-storybook-e2e-testing`  
**Status**: ✅ Planning Phase Complete (Phases 0-1)  
**Next Step**: Run `/speckit.tasks` to generate task breakdown

**Artifacts Created**:
- ✅ `plan.md` - This file, comprehensive implementation plan
- ✅ `research.md` - 6 technical decisions with rationale and patterns
- ✅ `data-model.md` - 4 test entities (ComponentTest, IntegrationTest, TestPattern, PageObject)
- ✅ `quickstart.md` - Complete developer guide with workflows and debugging
- ✅ Updated `.github/copilot-instructions.md` - Agent context with testing knowledge

**Key Takeaways**:
1. **Two-phase approach validated**: Test in Storybook isolation first, then port to full E2E
2. **No constitutional violations**: All 5 core principles satisfied
3. **Context-agnostic page objects**: Same code works in both Storybook and full app
4. **Clear success criteria**: 100% ComponentTest pass rate before porting (SC-001)
5. **Practical debugging guide**: quickstart.md addresses known pain points
6. **Manual Storybook management**: Keep Storybook running in dedicated terminal (no auto-start/stop)

**Critical Path for Implementation**:
1. Configure Playwright with Storybook project (research.md Q1)
2. Write ItemForm ComponentTest (proves approach works)
3. Validate page object portability (same selectors in both contexts)
4. Port to IntegrationTest (proves pattern scales)
5. Expand coverage to remaining critical components

**Blocked Until**: `/speckit.tasks` generates concrete task breakdown with dependencies and estimates

**References**:
- Feature spec: [spec.md](./spec.md)
- Research decisions: [research.md](./research.md)
- Test entity model: [data-model.md](./data-model.md)
- Developer quickstart: [quickstart.md](./quickstart.md)

