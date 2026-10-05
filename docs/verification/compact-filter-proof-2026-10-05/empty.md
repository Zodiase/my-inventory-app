# empty — implementation visual review

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
| composition | 390×480 | 390×480 | 1 | 289 | 69 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-11298-osition-empty-390x480-text1-storybook-chromium/geometry.json) |
| composition | 390×480 | 390×480 | 1.25 | 289 | 80 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-dec6f-tion-empty-390x480-text1-25-storybook-chromium/geometry.json) |
| composition | 390×844 | 390×844 | 1 | 289 | 69 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-e2e2a-osition-empty-390x844-text1-storybook-chromium/geometry.json) |
| composition | 390×844 | 390×844 | 1.25 | 289 | 80 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-e6aa2-tion-empty-390x844-text1-25-storybook-chromium/geometry.json) |
| composition | 820×900 | 820×900 | 1 | 289 | 69 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-1c6f4-osition-empty-820x900-text1-storybook-chromium/geometry.json) |
| composition | 820×900 | 820×900 | 1.25 | 289 | 80 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-68013-tion-empty-820x900-text1-25-storybook-chromium/geometry.json) |
| composition | 1280×720 | 1280×720 | 1 | 289 | 69 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-894c7-sition-empty-1280x720-text1-storybook-chromium/geometry.json) |
| composition | 1280×720 | 1280×720 | 1.25 | 289 | 80 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-58504-ion-empty-1280x720-text1-25-storybook-chromium/geometry.json) |
| manager | 390×480 | 390×399 | 1 | 289 | 69 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-proof-manager-empty-390x480-text1-storybook-chromium/geometry.json) |
| manager | 390×480 | 390×399 | 1.25 | 289 | 80 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-2af2c-ager-empty-390x480-text1-25-storybook-chromium/geometry.json) |
| manager | 390×844 | 390×763 | 1 | 289 | 69 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-proof-manager-empty-390x844-text1-storybook-chromium/geometry.json) |
| manager | 390×844 | 390×763 | 1.25 | 289 | 80 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-428a2-ager-empty-390x844-text1-25-storybook-chromium/geometry.json) |
| manager | 820×900 | 820×860 | 1 | 289 | 69 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-proof-manager-empty-820x900-text1-storybook-chromium/geometry.json) |
| manager | 820×900 | 820×860 | 1.25 | 289 | 80 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-dc505-ager-empty-820x900-text1-25-storybook-chromium/geometry.json) |
| manager | 1280×720 | 1280×680 | 1 | 289 | 69 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-521fe-anager-empty-1280x720-text1-storybook-chromium/geometry.json) |
| manager | 1280×720 | 1280×680 | 1.25 | 289 | 80 | 0 | 0 | PASS | [geometry](evidence/CompactFilterProof-compact-66974-ger-empty-1280x720-text1-25-storybook-chromium/geometry.json) |

Manager390×480 gives an actual390×399 canvas because of81px Storybook chrome.
Its171px populated list is a constrained usability case, not a pass of the200px
composition requirement. Genuine390×480 canvas provides252px and four normal
or three125% complete rows. Cropping a partially visible final row is normal
list scrolling; fixed headers and controls are not clipped.

Interaction tests cover native keyboard radios, multi-selection, Find,
selected-only/no-results recovery, Scope/Type changes without lost state,
Escape and opener focus. Empty fixture has no tag radio interaction.
