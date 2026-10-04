# Current container details discovery

Tracking: `bd-w1k` in the shared Home Automation Beads workspace. Status: design
proposal, not implementation or release approval.

## Observed journey and evidence

The user opens Network rack to browse its contents, then wants the rack's model,
dimensions, product reference and purchase history without leaving that context
to hunt for the rack in its parent's list. The displayed child Bypass PDU is a
different record; its description does not answer questions about the rack.

The supplied screenshot is retained as
[reported-container-page.png](reported-container-page.png). Original attachment:
`/Users/xh/.codex/attachments/00c37f8c-6f6e-4a1b-861a-ceb090ade9a8/codex-clipboard-de9c8274-df0a-4c49-b71c-7ca05461c8f2.png`.
Reported URL:
`http://mini-m4.local:48372/container/agent-aab94abe9f9d2ea48824140de21e81029bf98d7eeedff2ee8431e9dbf74e84e7`.

Manual read-only inspection of that exact URL at 1280×720 confirmed a plain
Network rack heading (204.92×40 CSS px at x16/y76), child PDU summary, Add Filters
and Create Item controls, and no visible current-container details entry.
The rack's stored description content is reported by the intake owner, not
independently read from the backend during this review.

## Does PR #165 solve it?

No. At reviewed head `5f306e59ee6f7e6209fddac9e8b1943ff9bdef01`,
`InventoryActionRow` provides View Details for listed objects. The current
container is used to determine layout in AllItemsViewPresentation but is not a
listed row. App.tsx renders its title separately. A rack row in the parent's
list becomes easier to inspect, but a user already inside the rack must still
go up and find it. This is a distinct missing entry point, not a failure of the
approved row-action interaction and not proof of deployment of #165 on 48372.

Source inspection also found that ItemDetailViewPresentation renders identity,
description, tags and action buttons, but no structured-properties section at
that head. Reusing its route alone is therefore insufficient for the requested
applicable-property visibility; add a read-only supported-property presentation
to the same detail view. This source finding is not a manual detail-view check.

## Proposed design

Put a quiet, labelled **Container details** action immediately beside the current
container title. Its scope is explicit; do not hide it solely behind an ellipsis,
make the title ambiguously clickable, or place it among child-list filters.
Align the title and control vertically at the center of their row. Preserve the
44px interactive target with compact visual artwork and existing shared button
styling; no new global button borders or oversized hero card.

Open the existing item-detail destination for the current container identity,
with an explicit return to this contents view. Reuse the detail presentation
rather than creating a competing description/property editor. Show the full,
wrapping description and all applicable supported structured properties there;
if the existing detail view omits supported properties, that omission must be
included in implementation scope, not silently accepted. Do not invent product
fields, infer missing facts, or rewrite household records.

The contents list remains the primary page content. Full specifications are not
expanded by default above it. Short names remain Network rack and Bypass PDU;
product/brand/model/location details stay in the description or supported
structured properties, following Home Automation's intake naming convention.

At constrained widths, wrap the title/action group deliberately with the action
still attached to the heading and visible, not moved into a distant menu.
Desktop and iPad have equal priority; phone must remain usable.

## Proof and acceptance contract

- Journey: enter rack → Container details → read rack's own full details →
  return to rack contents, preserving filters, navigation context and scroll.
  The PDU's action must target the PDU, not the rack.
- Entry persists for empty containers, filtered-to-empty contents and structured
  storage; global All Items has no fictitious container-details action.
- Cover no description/properties, long multiline description and URL, populated
  supported properties, long title, loading and missing/deleted container.
- Storybook first: actual composed header/contents/detail-return callback;
  1280×720, iPad portrait/landscape and constrained 390px width/short height.
  Include keyboard focus and empty/populated states. No live inventory edits.
- Measure header/control/hit bounds, center alignment, spacing, wrapping,
  contrast and focus; inspect neighboring filters/create controls for regression.
- App tests prove exact target identity and the return journey. Manually inspect
  the full running app after implementation; screenshots and tests alone do not
  establish discoverability or sign-off.

Only the existing desktop defect has been manually verified in this triage.
Proposed responsive layouts and interactions are not yet rendered or approved.
