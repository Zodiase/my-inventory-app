# Current container details candidate review

Tracking: bd-w1k. Implementation owner review; independent verification pending.
Base: 6e60f047f14a89ed8992b9b9a9a90d7c05574766.

The current-container header opens that exact record, while child actions still
open their respective child. Full supported properties and descriptions render
read-only. Returning preserves filters, builder state, list scroll and focus.
No schema changes, production deployment or household inventory writes.

## Story-specific rendered review

Expectation notes live outside the render tree in ContainerDetails.stories.tsx.
Every row below was reviewed against its four viewport screenshots, archived as
contents-<state>.png and, where applicable, details-<state>.png contact sheets.
The original captures remain in /private/tmp/bd-w1k-storybook-reviewed.

| Story          | Required viewports                    | Owner result | Reviewed surface           |
| -------------- | ------------------------------------- | ------------ | -------------------------- |
| Populated      | 1280×720; 820×1180; 1180×820; 390×480 | Reviewed     | Contents and details       |
| Empty          | 1280×720; 820×1180; 1180×820; 390×480 | Reviewed     | Contents and details       |
| Filtered-empty | 1280×720; 820×1180; 1180×820; 390×480 | Reviewed     | Contents and details       |
| Structured     | 1280×720; 820×1180; 1180×820; 390×480 | Reviewed     | Contents and details       |
| Minimal        | 1280×720; 820×1180; 1180×820; 390×480 | Reviewed     | Contents and details       |
| Long-title     | 1280×720; 820×1180; 1180×820; 390×480 | Reviewed     | Contents and details       |
| Global         | 1280×720; 820×1180; 1180×820; 390×480 | Reviewed     | Contents; no details entry |
| Loading        | 1280×720; 820×1180; 1180×820; 390×480 | Reviewed     | Contents; no details entry |
| Missing        | 1280×720; 820×1180; 1180×820; 390×480 | Reviewed     | Contents; no details entry |

Populated: adjacent title action; exact own description and structured fields.
Empty: usable entry despite no children. Filtered-empty: active filter survives
return. Structured: five empty tiers plus unplaced-content fallback remain
usable. Minimal: no empty description/property sections. Long-title: deliberate
wrapping, full multiline description and URL. Global: no invented own entry.
Loading and missing: no stale entry. No horizontal clipping observed. When on
one row, heading and details target centers align; wrapping retains proximity.
Interactive target is at least 44×44. Action rows wrap and descriptions scroll.

The implementation owner also manually exercised the full Storybook manager
and disposable full application at all four sizes: own entry, return, active
filter, Create dialog close, keyboard Enter, property scrolling and child
View Details. Browser error log was empty after setting the disposable server's
ROOT_URL to mini-m4.local. The full-app review caught and repaired the stretched
Back link using the shared compact Button. Story screenshots alone were not
used as acceptance of the full app.

Independent review must additionally cover affected existing ItemDetailView
stories and missing/deleted real-route behavior; these are not claimed accepted
by the new matrix.

## Executed checks

- New composed Storybook matrix: 36/36 passed.
- Final own-details application journeys: 9/9 passed across Chromium/iPad/iPhone.
- Own-details plus existing structured placement before final Back styling:
  12/12 passed.
- Row-action regression: all 15 passed. Broader routing run: 44/48 passed.
  One iPad failure was a wildcard ROOT_URL HMR error; corrected server URL and
  exact rerun passed. Three iPhone search failures remain unclassified pending
  comparison against the base: desktop-style scope/filter expectations and
  scoped deletion discovery. Do not describe the entire broad suite as passing.
- TypeScript passed; final formatting/lint result is recorded with the candidate
  handoff after completion.

## WebKit test isolation

A native WebKit Page crashed occurred after repeated pushState/back followed by
full navigation. The same failure reproduced against plain HTML, with no app
JavaScript: push /b, /a, /b; goBack; goto /c. Crash report top frame was
WebCore::Navigation::initializeForNewWindow. The tests use separate contexts
for structured-storage and empty/filter journeys; browser Back remains covered.
No browser skip or app delay workaround was added.

## Reproduction and ownership

Disposable app: http://mini-m4.local:48379
Storybook manager: http://mini-m4.local:48378/?path=/story/integration-containerdetails--populated
Meteor data directory: /private/tmp/inventory-container-details-meteor.
Search test index: inventory_container_details_20261004.

Run serially; reset is enabled only on this disposable app:

```sh
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_APP_BASE_URL=http://127.0.0.1:48379 npx playwright test tests/e2e/app/container-own-details.spec.ts --reporter=line
PLAYWRIGHT_SKIP_WEBSERVER=1 STORYBOOK_BASE_URL=http://127.0.0.1:48378 npx playwright test tests/e2e/storybook/ContainerDetails.spec.ts --project=storybook-chromium --reporter=line
```

Production and older preview services on 48371–48373 were left untouched.
