# Task-based Search filter Storybook proof — visual contract and self-review

This is a mock-only design proof. The six stories use local example tags and items; they do not read or change inventory data. The required review widths for this proof are desktop **1280 × 800** and iPad landscape-width **820 × 1100**. Phone and wide-desktop refinement, URL persistence, backend filtering, and integration with the running app are outside this proof.

## Contract shared by every story

- The blue Search banner stays in one row at both required widths. The query field absorbs the width change; Tags and Type remain visible and usable.
- An open menu is attached below its trigger, stays inside the viewport, and overlays results rather than pushing the page. Tags has a bounded height and only its catalog scrolls; Type remains compact.
- Tags are shown once in a hierarchy. Group headers expand or collapse; selecting a group never selects its children. A path search shows leaf tags with their parent path.
- Included tags use either **Has any** or **Has all**. Excluded tags use **Does not have** within the same catalog. Selected rules have names and individual removal controls, including a compact applied summary below the banner.
- Controls, labels, and results remain readable. Escape dismisses a menu and returns focus to its trigger. Mock result counts respond to selections.

The intended responsive change is horizontal: the query field shrinks and the Tags panel shifts left to remain in the viewport. Menu content, hierarchy, and the single-row banner do not change mode between these two widths. Interaction checks cover selection, matching semantics, search, scrolling, summary expansion/removal, and Escape; see `tests/e2e/storybook/SearchFilterPrototype.spec.ts`.

## Story-specific contracts and review

Each artifact below is a full-viewport capture of the Storybook iframe. I opened each at readable scale and inspected page frame, containment, proportions, internal composition, text, controls, hierarchy, and continuity across the two sizes. This is a **self-review**, not independent acceptance.

| Story / purpose and expected composition | Desktop 1280 × 800 | iPad 820 × 1100 | Cross-width judgment |
| --- | --- | --- | --- |
| `open-tags-desktop`: initial Tags menu; no selected filters; hierarchy and controls visible above a scrollable catalog. | **Pass** — [capture](open-tags-desktop-desktop.png). Menu sits below Tags at the right, 420px wide; groups and first leaves are readable. | **Pass** — [capture](open-tags-desktop-ipad.png). Menu shifts left within the viewport; banner stays one row; catalog remains bounded. | Pass: only horizontal placement and query width change. |
| `open-tags-i-pad`: two selected workflow tags; named current-rule chips and applied summary; selected checkboxes visible. | **Pass** — [capture](open-tags-i-pad-desktop.png). Both selections and result count are legible; catalog has room for leaves. | **Pass** — [capture](open-tags-i-pad-ipad.png). Chips wrap inside panel without overflow; second applied chip is behind the open panel but remains accessible after closing it. | Pass: panel remains anchored and selections stay visible. |
| `open-type-i-pad`: Type = Items; compact menu, selected option, named summary, filtered results. | **Pass** — [capture](open-type-i-pad-desktop.png). Menu aligns to Type; selected Items and four results are legible. | **Pass** — [capture](open-type-i-pad-ipad.png). Same relationship and contents; no edge clipping. | Pass: Type remains a separate compact menu. |
| `excluding-fragile`: two included workflow tags plus excluded Fragile; Exclude mode and checked leaf visible. | **Pass** — [capture](excluding-fragile-desktop.png). One catalog, checked Fragile, explicit “Does not have” chip, three results. | **Pass** — [capture](excluding-fragile-ipad.png). Rule chips wrap; searched Fragile leaf and exclusion stay visible. | Pass: no duplicated include/exclude lists. |
| `match-all`: both workflow tags required; Has all selection and one matching mock result. | **Pass** — [capture](match-all-desktop.png). Match control, named chips, checked leaves and one result agree. | **Pass** — [capture](match-all-ipad.png). Chips wrap but remain readable; no page overflow. | Pass: narrower width does not hide matching semantics. |
| `search-by-path`: “hardware” finds fastener leaves through their parent path; long results scroll within Tags. | **Pass** — [capture](search-by-path-desktop.png). Path labels are readable, clear control visible, catalog clipped at panel bottom. | **Pass** — [capture](search-by-path-ipad.png). Same structure and scroll ownership. | Pass: interaction test scrolled the catalog to its end while search remained visible. |

The Storybook manager also loaded without an error overlay at the LAN URL. All nine Storybook browser tests passed at that URL, as did the TypeScript and lint checks. Remaining design question for integration: many selected tags could consume too much of the fixed panel header; the app implementation should cap or summarize that area without making the catalog unusable. This proof does not claim that the existing app route or PR has been changed.
