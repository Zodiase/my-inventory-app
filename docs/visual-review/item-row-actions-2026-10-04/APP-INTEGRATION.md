# Real inventory row integration

The user visually accepted the prototype on 2026-10-04. The same 44px
`ItemRowActions` now sits beside primary links in ordinary inventory rows,
hoisted container headings and children, structured physical slots and their
fallback lists, search results, and tag results. `InventoryActionRow` owns the
sibling composition and shares commands with the long-press accelerator.

Real callers currently provide View Details only. Existing detail-page Edit,
Move, Delete and confirmation remain unchanged; no mock commands or new mutation
backend are exposed. Search actions use the existing search detail callback so
the return URL and search run context survive. Container primary links continue
opening contents while their action opens the container's detail page.

Physical slots at 600px and below put the action below the primary link and hide
redundant folder/chevron icons, preserving name width in the two-column layout.
Empty physical slots have no actions. This is the only responsive deviation from
the approved side-by-side prototype, discovered during actual phone review.

Review contract: `Integration/InventoryRowActions` has Ordinary, Hoisted,
Physical, Search and TagResults compositions. Review each at 1280×720,
768×1024 and 390×844 in the full manager. Check hierarchy, readable names,
separate links/buttons, 44px targets, menu focus and Escape restoration.
Physical phone slots must retain readable name width and show the action below;
ordinary rows retain trailing actions. Backend routing and search return context
are proven in app tests, not inferred from stories.

Development validation: TypeScript and changed-module ESLint pass; new app
matrix passes 12/12 (Chromium/iPad/iPhone), with existing hoisted/physical
regressions also passing 4/4 before the narrow-slot correction. Actual manual
review and independent review are recorded separately after the candidate is
committed. Preview uses port 48379 and its own temporary Meteor MongoDB under
`/private/tmp/inventory-row-integration-meteor`; production is not connected.

The earlier prototype rapid touch-to-hardware-Tab caveat during confirmation
entrance remains recorded. Real row actions do not open a confirmation dialog;
Delete remains on the existing detail page. No merge or deployment is authorized
by this integration assignment.
