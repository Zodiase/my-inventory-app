# Scanner/Foundation/Interactive — recovery guidance correction

2026-10-05. Implementation self-review, pending affected-copy designer recheck.
Parent contract: ../REVIEW.md and Home Automation scanner PLAN/matrix.
Scope: align recovery wording with existing actions, without changing their guards.

## Expected behavior outside the render tree

Failed reads show factual failure evidence and live recovery guidance: Retry only
when its existing guard permits it, Mark correction only when available. Attempt
limit names the block and offers correction; already marked corrections are named
as complete. Pending reads offer waiting or Cancel. Cancel remains pending-only.
Evidence retains original IDs/attempts/outcomes. Guidance follows current state
rather than storing an action promise in resolver evidence. All new copy wraps;
record controls remain reachable by normal story document scrolling, with44px
minimum targets and measured16px/20px labels at100%/125% text. Zoom stays100%.
Hardware, app integration and broader design polish remain excluded.

## Browser assertions and checks

18/18 scoped Chromium cases pass, no retries. Expanded recovery journey asserts
failed Cancel disabled with no cancel promise, enabled Retry guidance, attempt3
Retry disabled with explicit limit, correction enabled then disabled/already marked,
and pending Cancel enabled with matching guidance. Same ID/retained prior outcomes
and pending/history guards stay covered. Scoped strict types, type-aware lint and
source formatting pass. Model/adapter unchanged; prior65-script result is retained,
not described as a rerun. Independent PASS and26 green CI checks on53987ab remain
historical; this revised head requires affected-copy review and its own CI gates.

## Personally inspected artifacts

All16 full-manager captures and8 phone record crops opened at readable scale.
Paths: manager-{viewport}-{1,1.25}-{failed,attempt-limit}.png and phone record-*.
geometry.json records exact copy, fonts, targets, disabled states and overflow.

| Manager viewport | Both text scales / states | Judgment and concrete findings |
| --- | --- | --- |
|1280×720|failed,attempt-limit|PASS. Guidance groups with last result/record; fixed action row remains clear; limit state has disabled Retry/Cancel and enabled correction; ordinary scroll reaches record controls.|
|820×900|failed,attempt-limit|PASS. Sidebar leaves narrower canvas; guidance wraps in phrases without overlap, counters wrap; later record actions reached by scrolling.|
|390×844|failed,attempt-limit|PASS. Guidance wraps normally; correction wraps to second row;20px labels retain47px targets. Phone record crops show complete record and controls.|
|390×480|failed,attempt-limit|PASS. Last-result and record cannot both fit on short screen; actual scroll reaches correction. Crops show full record without letter fragments/overlap. Viewport cropping is documented rather than treated as missing content.|

Checklist covered frame/reachability, containment/overflow, scale/proportions,
internal composition, text, interaction cues, hierarchy/spacing, and continuity.
No horizontal document overflow in16 journeys. Controls measured at least44px;
text enlargement includes dynamic buttons. Overall scoped self-review PASS;
this is not independent designer acceptance or production/hardware approval.
