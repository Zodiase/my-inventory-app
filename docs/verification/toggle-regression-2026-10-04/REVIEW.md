# Objective toggle regression candidate — 2026-10-04

Issue bd-tdb. Scope is durable objective regression coverage, not approval of
current compact dimensions, visual balance or animation aesthetics. Production
components, routes, CSS and household data are unchanged. Dense Search story
reuses actual shell/banner/catalog/chips/results and the production theme; an
unrelated plain action is a fixture to detect style leakage. Contract is outside
the render tree in ToggleRegression.parameters.review.

## Validation

27/27 combined Storybook checks: existing SearchPageLayout15 plus new Chromium10
and WebKit touch2. Actual app3/3 across Chromium/iPad/iPhone. TypeScript and full
app style checks pass (one existing findOne deprecation warning). New test files
are discovered by existing full Chromium/Storybook checks; app touch lists now
explicitly include tag-toggle-regression.spec.ts. New blocking Storybook WebKit
step explicitly runs ToggleRegression.webkit.spec.ts.

Matrix coverage:
- Sample all6 state transitions plus rapid reversal, one contained unlabeled
  thumb, stationary labels, no cross-axis travel, repeated target and final
  selected-center alignment. Samples are evidence, no approved timing curve.
- LTR/RTL native radio keyboard order and reduced-motion zero-duration/final
  alignment. Pointer direct selection and phone/tablet WebKit touch.
- Actual styled Search composition: intended banner1px border, exit/group/plain
  action0; moving actual toggle stylesheet before/after other styles preserves
  measured neighbors. Isolated catalog switch/group comparison too.
- Four full-manager sizes below: long group/tag names, all3 choices, dense inner
  scrolling, selected-only, Find reachability, focus, query/other tag preservation
  and Escape focus return. Distinct rail/thumb/hit geometry recorded without
  fixing current pixel dimensions as approval. Hit areas>=44 and disjoint.
- Fresh Search compared with same-frame manager visits through enlarged and
  compact prototype proofs then Search again. Neighbor styles unchanged.
- Real-app scoped query and unrelated URL tag survive every state, reload and
  touch/pointer interactions. Exact synthetic search fixture readiness is awaited
  before navigation; first exploratory run raced index writes (2 failures).

Existing Chromium search-trace-exit.spec.ts separately covers disabled Include
with explanation and older all-required URL filters; this candidate does not
claim new independent execution of that entire suite. Inline Docs visit-order
and subjective golden pixels remain excluded. Golden comparison must follow
separate design approval; mechanical passes do not approve the design.

## Personally opened story-specific renders (self-review)

All four final artifacts opened at readable scale. No error overlays. Banner stays
one row, long tag identity ellipsizes with Equipment context underneath, choices
remain visible and separate. Results/chips/plain action remain aligned behind the
anchored menu. Current 11px-style label proportions are characterized, not accepted.

| Outer manager viewport | Artifact | Observed composition |
| --- | --- | --- |
|1280x720|composed-1280x720.png|Sidebar/addon panel visible; bounded right tag menu, title and parent context readable, Find visible.|
|820x900|composed-820x900.png|Sidebar/addon panel reduce canvas to medium; combined Filters menu shows tag/type sections, long tag truncates before choices.|
|390x844|composed-390x844.png|Manager responsive toolbar/footer; single combined scope menu, Find and tag row visible with all3 choices; lower type actions reachable.|
|390x480|composed-390x480.png|Constrained manager canvas; menu scroll position preserves Find/tag row, scope heading above fold and type below fold; tests exercise internal scroll and Escape.|

No golden files were introduced. Independent review and exact-head CI pending.

## Separate existing finding

Existing HoistedContainerGroup.webkit.spec.ts fails expected height<=100 at111px
on both candidate48396 and unchanged preserved baseline48388. Toggle touch2/2
passes. This old test was not part of the existing CI WebKit gate; the new step
is explicitly limited to the requested toggle scope, not a silent skip of a
previous gate. Followup bd-0ju retains classification. No old assertion relaxed.
