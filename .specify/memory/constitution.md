<!--
Sync Impact Report - v1.0.0 Initial Constitution
=================================================
Version Change: [TEMPLATE] → 1.0.0
Date: 2025-10-20
Rationale: MINOR bump - Initial constitution establishment with 5 core principles

Modified Principles:
- Added: I. Type Safety & Strict Typing (NON-NEGOTIABLE)
- Added: II. Test-Driven Development
- Added: III. User Experience Consistency
- Added: IV. Performance Requirements
- Added: V. Code Documentation & Maintainability

Added Sections:
- Technology Stack Standards
- Quality Gates & Review Process
- Governance

Templates Status:
- ✅ plan-template.md: Technical Context fields aligned with principles
- ✅ spec-template.md: Requirements sections support all principles
- ✅ tasks-template.md: Task categorization supports principle-driven tasks

Follow-up TODOs: None
-->

# My Inventory App Constitution

## Core Principles

### I. Type Safety & Strict Typing (NON-NEGOTIABLE)

**Rule**: All TypeScript code MUST compile without errors. No `any` types except when:
1. Wrapping untyped third-party libraries with explicit `@ts-expect-error` comments
2. Documented in JSDoc explaining why type safety cannot be achieved
3. Tagged with a TODO to remove when types become available

**Rationale**: Type safety prevents entire classes of runtime errors, improves refactoring confidence, and serves as living documentation. The strictness of `eslint-config-love` is intentional.

**Enforcement**:
- `npm run check:type` MUST pass before any commit
- ESLint errors (not warnings) MUST be resolved
- Type-only imports MUST be used for type annotations (`import type`)

### II. Test-Driven Development

**Rule**: All business logic and data transformations MUST have test coverage:
- **Unit tests**: Pure functions, utility methods, data transformations
- **Integration tests**: Meteor Methods, Collection operations, reactive data flows
- **Test framework**: Mocha + Chai + Sinon following Meteor best practices

**Rationale**: Tests provide confidence during refactoring, document expected behavior, and catch regressions early. The hierarchical tag system and optimistic locking patterns require robust testing.

**Enforcement**:
- New features MUST include tests before implementation approval
- Bug fixes MUST include regression tests
- Tests MUST be runnable via `npm test` and pass consistently
- Magic numbers are allowed in tests (per ESLint config)

### III. User Experience Consistency

**Rule**: UI components MUST maintain consistency across the application:
- **Styling**: Use styled-components with Grommet design system
- **Reactivity**: Use `useTracker` for Meteor reactive data (from `/imports/utility/reactMeteorData`)
- **Functional components**: Always use React hooks, never class components
- **User feedback**: Loading states, error messages, and confirmation dialogs for destructive actions

**Rationale**: Consistent UX reduces cognitive load, makes the app learnable, and provides professional polish. Users should never guess how interactions work.

**Enforcement**:
- All components MUST be functional with hooks
- Styled-components MUST be used for all styling
- User actions MUST provide clear feedback (console logs minimum, UI feedback preferred)
- Forms MUST validate input and show clear error messages

### IV. Performance Requirements

**Rule**: Database operations and UI rendering MUST meet performance standards:
- **MongoDB queries**: Use indexes, projections, and limits appropriately
- **Optimistic locking**: Use `strictSelector` for all update operations to prevent race conditions
- **Reactivity**: Minimize reactive dependencies in `useTracker` hooks
- **Data modeling**: Denormalize when necessary for query performance (e.g., tag paths)

**Rationale**: Performance directly impacts user satisfaction. The hierarchical tag system could create N+1 queries; proper modeling prevents this.

**Enforcement**:
- Collection updates MUST use `strictSelector` with identifying fields
- Queries MUST specify `sort`, `limit`, or projection when fetching multiple documents
- React components MUST use proper dependency arrays in hooks
- Performance regressions MUST be justified in code review

### V. Code Documentation & Maintainability

**Rule**: Code MUST be self-documenting with strategic comments:
- **Complex utilities**: Comprehensive JSDoc with examples (see `strictSelector`)
- **Business logic**: Comments explaining "why", not "what"
- **Type definitions**: Clear names and JSDoc for non-obvious types
- **Absolute imports**: MUST use Meteor absolute imports starting with `/` (e.g., `/imports/api/items`)

**Rationale**: Future developers (including you) need to understand intent. The optimistic locking pattern in `strictSelector` would be opaque without documentation.

**Enforcement**:
- Utility functions MUST have JSDoc with @param, @returns, @example, @remarks
- Complex algorithms MUST have explanatory comments
- Relative imports are FORBIDDEN (ESLint enforces this)
- Magic numbers MUST be explained or extracted to named constants (except 0, 1, -1)

## Technology Stack Standards

**Mandatory Technologies**:
- **Runtime**: Meteor 3 (Node.js + MongoDB + Reactivity)
- **Language**: TypeScript (strict mode)
- **UI**: React 18+ with functional components and hooks
- **Styling**: styled-components + Grommet
- **Testing**: Mocha + Chai + Sinon
- **Linting**: ESLint (flat config) with eslint-config-love
- **Formatting**: Prettier

**Data Patterns**:
- All collections extend `CollectionItem` (provides `_id`, `createdAt`, `modifiedAt`)
- Use `NamedCollection` for type-safe collections
- Export Meteor Methods via `asMeteorMethods`
- Use `strictSelector` for optimistic locking on updates

**Import Conventions**:
- MUST use Meteor absolute imports (`/imports/...`)
- NEVER use relative imports (`../`, `./`)
- Group imports: external packages, then internal, separated by blank lines

## Quality Gates & Review Process

**Pre-Commit Requirements**:
1. `npm run check:type` passes (TypeScript compilation)
2. `npm run check:code-style` passes (Prettier + ESLint)
3. `npm test` passes (all unit tests)

**Code Review Checklist**:
- [ ] Type safety: No `any` without justification
- [ ] Testing: New functionality has test coverage
- [ ] Performance: Updates use `strictSelector`, queries are efficient
- [ ] UX: User actions have feedback, errors are handled gracefully
- [ ] Documentation: Complex logic has comments/JSDoc
- [ ] Imports: Absolute paths used, properly grouped

**Complexity Justification**:
Any introduction of new patterns or deviation from conventions MUST be:
1. Documented in code comments
2. Explained in commit message
3. Discussed in code review if non-obvious

## Governance

**Constitutional Authority**: This constitution supersedes all other practices and guides all technical decisions. When in doubt, refer to these principles.

**Amendment Process**:
1. Proposed changes MUST be discussed and justified
2. Amendments require updating version (semantic versioning)
3. Breaking changes require migration plan and team approval
4. All dependent templates MUST be updated for consistency

**Compliance Review**:
- All pull requests MUST demonstrate adherence to principles
- Constitutional violations MUST be justified or rejected
- Repeated violations indicate principle needs refinement

**Version Control**:
- MAJOR: Backward-incompatible principle changes or removals
- MINOR: New principles added or sections materially expanded
- PATCH: Clarifications, wording fixes, non-semantic improvements

**Runtime Guidance**: See `.github/copilot-instructions.md` for AI-assisted development guidance aligned with these principles.

**Version**: 1.0.0 | **Ratified**: 2025-10-20 | **Last Amended**: 2025-10-20
