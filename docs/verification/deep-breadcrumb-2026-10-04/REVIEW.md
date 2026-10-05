# Deep item detail composition — 2026-10-04

Candidate base: merged master `3d03e95`. Issue: bd-8wk. Self-review; independent
acceptance remains pending. Story: `ui-itemdetailview--deep-container-path`.
Contract: `meteor-app/imports/ui/ItemDetailView.stories.tsx`, DeepContainerPath
parameters.docs.description.story (outside the render tree).

## Classification and change

The unchanged actual app at 390x480 passes Chromium and iPhone: exact Camping Tent
route, four nested containers, nearest Camping Equipment Box and no horizontal
page growth. Both screenshots were opened. Synthetic isolated Meteor/Mongo/search
only; no household records accessed or changed.

The unchanged centered Storybook composition fails the new phone manager check
with 207px document width growth. The retained before screenshot shows breadcrumb,
description and action clipping. Prior exact-base/current comparison is recorded
in Home Automation PR166_CONTAINER_DETAILS_2026-10-04.md. New broader diagnostics
also observed tablet overflow. Initial diagnostic failures at desktop were a test
selector error: accessible name is "Trash Delete", not "Delete"; those failures
are not claimed as production defects. Initial actual-app diagnostic similarly
used a nonexistent nav accessible label, corrected before final app evidence.

Only this story gets a fullscreen, full-width/max980px, viewport-height frame.
Production breadcrumb and detail source are unchanged; other stories retain their
layout. New blocking full-manager Storybook checks cover geometry, nearest location,
keyboard focus revealing Home, vertical action reachability and mock Delete click.
Existing blocking Storybook CI discovers the new file. App coverage verifies the
real route independently; no duplicate full story matrix in Meteor tests.

## Story-specific viewport review

Artifact prefix in this directory:
`story-storybook-DeepItemDetail-deep-detail-manager-{SIZE}-storybook-chromium-`.
Each size has `manager.png` (initial) and `manager-scrolled.png` (Home focused,
Delete reached). All five initial and all five interaction renders were opened.
The optional Storybook release notification is dismissed using its own control
before the final captures/clicks; it is manager chrome, not app content.

| Outer manager size | Judgment | Expectations and inspected pixels |
| --- | --- | --- |
| 390x480 | pass | Title readable; nearest location initially visible; breadcrumb horizontally clips only ancestors; description wraps in normal words; tags retain shape. Actions wrap and lie below initial viewport, then become fully reachable by vertical scroll and clickable. Home focus reveals earliest ancestor without widening document. |
| 390x844 | pass | Same phone hierarchy; description, tags and all wrapped actions fit initial height. Breadcrumb remains bounded; Home focus reveals earlier path. No lateral page growth or overlap. |
| 768x1024 | pass | Sidebar reduces preview width; title, trail, description and tags remain inside that narrower frame. Actions form one row; earliest ancestor focus works. Manager controls stay separate beneath preview. |
| 1280x720 | pass | Preview has 980px available width; full path fits one line. Title/metadata stay left aligned with bounded reading frame. Controls panel shortens preview; vertical scroll reaches action row without lateral scroll. |
| 1600x1000 | pass | Reading frame stays max980px centered inside wide preview; full path and action row fit. Text and targets keep their sizes rather than stretching; surrounding whitespace is intentional maximum reading width. |

At every size: checked page frame, containment, scale, internal composition, text,
action cues, hierarchy/spacing and continuity across sizes. Earlier path clipping
is intentional; nearest location is preserved before interaction. Short-screen
vertical scrolling is intentional and exercised, not inferred from screenshot.
No error overlay in inspected renders. Callback interactions are mocked and do
not establish persisted deletion or routing.

## Validation

- Corrected unchanged-baseline phone regression: fails width assertion, 207px.
- Corrected candidate manager matrix: 5/5 pass, no retries.
- Actual app Chromium/iPhone short-phone checks: 2/2 pass, no retries.
- TypeScript and full app code-style check pass; root test formatting passes.
- Runtime source unchanged, so preview/production app recreation is unnecessary.
- Independent exact-head review and actual PR checks still required before merge.
