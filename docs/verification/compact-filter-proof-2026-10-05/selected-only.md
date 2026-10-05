# selected-only — implementation visual review

Reviewer: development owner. Design and independent acceptance remain pending.
All eight final manager screenshots for this story were personally inspected;
all four browser sizes, both normal and125% text. Screenshots are evidence,
not pixel goldens. Composition screenshots independently measure actual canvas.

Scope/Type disclosure cues are readable and quiet, labels fit,44px controls
remain reachable, Find does not overlap, and rails center across wrapped rows.
No sheet horizontal overflow or competing nested scroll was observed. Empty
and selected-only panels shrink with content; populated panels cap at600px.
The final screenshot for each geometry file is adjacent as manager.png, including
isolated composition captures (filename does not imply manager surface).

| Surface | Browser | Actual canvas | Text factor | Sheet height | List height | Complete leaves | Scroll owners | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| composition | 390×480 | 390×480 | 1 | 305 | 145 | 2 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-fc5a7-selected-only-390x480-text1-storybook-chromium/geometry.json) |
| composition | 390×844 | 390×844 | 1 | 305 | 145 | 2 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-3eea4-selected-only-390x844-text1-storybook-chromium/geometry.json) |
| composition | 820×900 | 820×900 | 1 | 305 | 145 | 2 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-01b77-selected-only-820x900-text1-storybook-chromium/geometry.json) |
| manager | 390×480 | 390×399 | 1 | 305 | 145 | 2 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-cca54-selected-only-390x480-text1-storybook-chromium/geometry.json) |
| manager | 390×844 | 390×763 | 1 | 305 | 145 | 2 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-4e2ed-selected-only-390x844-text1-storybook-chromium/geometry.json) |
| manager | 820×900 | 820×860 | 1 | 305 | 145 | 2 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-ca4d5-selected-only-820x900-text1-storybook-chromium/geometry.json) |

Manager390×480 gives an actual390×399 canvas because of81px Storybook chrome.
Its171px populated list is a constrained usability case, not a pass of the200px
composition requirement. Genuine390×480 canvas provides252px and four normal
or three125% complete rows. Cropping a partially visible final row is normal
list scrolling; fixed headers and controls are not clipped.

Interaction tests cover native keyboard radios, multi-selection, Find,
selected-only/no-results recovery, Scope/Type changes without lost state,
Escape and opener focus. Empty fixture has no tag radio interaction.
