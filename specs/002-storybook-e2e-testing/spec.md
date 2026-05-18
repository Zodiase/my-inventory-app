# Feature Specification: Storybook-First E2E Testing Strategy

**Feature Branch**: `002-storybook-e2e-testing`  
**Created**: November 27, 2025  
**Status**: Draft  
**Input**: User description: "Create a two-phase testing strategy for E2E tests: Phase 1 tests isolated components in Storybook using Playwright to validate testing strategies and selectors work in isolation. Phase 2 ports proven testing code to test the full Meteor app. This addresses current E2E test failures where we can't determine if issues are component bugs, Playwright selector problems, or app integration issues. The goal is to establish reliable component-level tests in Storybook first, then confidently apply those patterns to full end-to-end testing."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Validate Component Testing Approach (Priority: P1)

As a test engineer, I need to verify that individual UI components work correctly in isolation before testing them in the full application, so that I can identify whether test failures are due to component bugs, test code issues, or integration problems.

**Why this priority**: This is foundational - without reliable component-level tests, we cannot distinguish between component failures and integration failures, leading to wasted debugging time and low confidence in test results.

**Independent Test**: Can be fully tested by running Playwright tests against a single Storybook story (e.g., ItemForm) and verifying that form submission, input filling, and button clicks work reliably. Delivers immediate value by proving the testing approach works in isolation.

**Acceptance Scenarios**:

1. **Given** a Storybook story for ItemForm is running, **When** a Playwright test fills the form fields and clicks submit, **Then** the form submission handler is triggered successfully
2. **Given** a component test passes in Storybook, **When** the same selectors are used in the full app, **Then** the selectors continue to work correctly
3. **Given** a component test fails in Storybook, **When** investigating the failure, **Then** the error can be isolated to the component code without app integration complexity

---

### User Story 2 - Port Proven Test Patterns to Full App (Priority: P2)

As a test engineer, I need to apply validated testing strategies from Storybook tests to full end-to-end tests in the Meteor app, so that I can confidently test complete user workflows with proven selectors and interaction patterns.

**Why this priority**: Once component-level testing is proven, porting to full E2E provides comprehensive coverage of real user scenarios including navigation, data persistence, and cross-component integration.

**Independent Test**: Can be tested by taking a working Storybook test (e.g., form submission test) and adapting it to test the same interaction in the running Meteor app, verifying that the approach scales from isolated components to integrated workflows.

**Acceptance Scenarios**:

1. **Given** a component test using specific selectors passes in Storybook, **When** those same selectors are used in a full E2E test, **Then** the E2E test interacts with the component successfully
2. **Given** a working interaction pattern in Storybook (e.g., button click with force), **When** the same pattern is applied in the full app test, **Then** the interaction succeeds in the integrated context
3. **Given** multiple component tests pass in Storybook, **When** they are combined into a full workflow test, **Then** the complete user journey executes successfully

---

### User Story 3 - Establish Component Test Coverage (Priority: P3)

As a test engineer, I need comprehensive Storybook tests for all critical UI components, so that component regressions are caught early before they impact end-to-end tests.

**Why this priority**: While valuable for long-term quality, comprehensive coverage can be built incrementally after the testing approach is proven and initial critical paths are working.

**Independent Test**: Can be tested by creating Storybook tests for a new component (e.g., TouchButton, LongPressContextMenu) and verifying all interaction modes work in isolation.

**Acceptance Scenarios**:

1. **Given** a new UI component is created, **When** Storybook tests are written for it, **Then** all interactive behaviors are verified in isolation
2. **Given** a component has multiple interaction modes, **When** Storybook tests cover each mode, **Then** regressions in any mode are detected immediately
3. **Given** a component test suite exists, **When** the component code changes, **Then** test failures clearly indicate which specific behavior broke

---

### Edge Cases

- What happens when Playwright selectors that work in Storybook fail in the full app due to z-index or modal layering?
- How does the system handle components that behave differently in Storybook vs the full app due to missing Meteor context (e.g., Meteor.userId())?
- What happens when a Storybook story uses mock data that doesn't match real app data structures?
- How do tests handle timing differences between Storybook's fast component mounting and the full app's slower initialization?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Test framework MUST be able to run Playwright tests against both Storybook and Meteor app using the same test code structure
- **FR-002**: Storybook stories MUST provide isolated test environments where components can be tested without full app dependencies
- **FR-003**: Tests MUST clearly distinguish between component failures and integration failures through error messages and test organization
- **FR-004**: Test selectors MUST be consistent between Storybook and full app environments
- **FR-005**: Component tests MUST verify all critical interactions: form submission, button clicks, input filling, checkbox toggling
- **FR-006**: Test suite MUST include both component-level tests (Storybook) and integration tests (full app) for critical user paths
- **FR-007**: Test failures MUST provide clear context about which layer failed (component vs integration vs test infrastructure)
- **FR-008**: Testing approach MUST support rapid iteration on failing tests by allowing isolated component testing
- **FR-009**: Tests MUST use page object patterns that work across both Storybook and full app contexts
- **FR-010**: Test suite MUST validate that proven component test patterns successfully port to full E2E tests

### Key Entities

- **ComponentTest**: A Playwright test targeting a single component in Storybook isolation
- **IntegrationTest**: A Playwright test targeting the full Meteor app with multiple components interacting
- **TestPattern**: A reusable testing approach (selectors, interaction sequence, assertions) validated in Storybook
- **PageObject**: A test abstraction layer containing selectors and interaction methods, usable in both Storybook and full app tests

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Component-level tests in Storybook have 100% pass rate for all tested interaction patterns before porting to full E2E tests
- **SC-002**: Test development time reduces by 50% when using proven Storybook patterns vs debugging failing E2E tests directly
- **SC-003**: 90% of selectors and interaction patterns that work in Storybook successfully work in full app tests without modification
- **SC-004**: Test failure root cause identification time reduces from hours to minutes by isolating failures to component vs integration layer
- **SC-005**: Zero ambiguity about whether test failures indicate component bugs, selector issues, or integration problems
- **SC-006**: All critical user paths have both component-level and integration-level test coverage
- **SC-007**: New components include Storybook tests before integration into full app, preventing untested code from reaching E2E tests

## Scope *(mandatory)*

### In Scope

- Setting up Playwright to test Storybook pages
- Creating component-level tests for existing critical components (ItemForm, TouchButton, LongPressContextMenu)
- Documenting test patterns that work reliably in both Storybook and full app
- Converting proven Storybook test code to full E2E tests for critical user paths
- Establishing test organization structure that clearly separates component and integration tests
- Creating reusable page objects that work in both testing contexts

### Out of Scope

- Complete test coverage for all components (will be built incrementally)
- Performance testing or load testing
- Visual regression testing
- Testing non-UI code (Meteor methods, collections, server logic)
- Automated test generation
- Testing third-party libraries or Grommet components directly

## Assumptions *(include when making key decisions)*

1. Storybook is already configured and running for the project
2. Critical components already have Storybook stories (ItemForm, TouchButton, etc.)
3. Playwright is the chosen E2E testing framework and will continue to be used
4. Test engineers have access to both running Storybook and running Meteor app for testing
5. Component behavior in Storybook stories accurately represents behavior in the full app
6. Test failures in current E2E tests are due to a mix of component issues, selector problems, and integration issues
7. Proving testing patterns in isolation will significantly reduce debugging time
8. The same Playwright test code structure can target both Storybook URLs and Meteor app URLs with minimal modification

## Dependencies *(include when integration is required)*

### Technical Dependencies

- Storybook must be running and accessible at a known URL
- Playwright test framework must be configured
- Existing Storybook stories must be well-maintained and represent real component usage
- Page object pattern must be established in test codebase

### Process Dependencies

- Test engineers must be trained on the two-phase testing approach
- CI/CD pipeline must support running both Storybook tests and full E2E tests
- Test failure triage process must distinguish between component and integration failures
