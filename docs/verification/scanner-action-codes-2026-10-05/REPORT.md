# Scanner action-code composition — development review

2026-10-05, America/Los_Angeles. Story: Scanner/Foundation/Action Codes.
Isolated from frozen foundation 53945f775208139271d0b23c4903753752505938.
Development self-review, not independent or designer acceptance.

## Outcome and scope

Real QR cards for Inspect and Show actions invoke the existing shared dispatcher;
matching taps invoke the same action. Separate synthetic item/container/product
cards feed read-only demo resolution. Plain capture state, mode, next step and
last result are above the initially closed developer diagnostics. No App import,
backend integration, inventory writes or scanner configuration codes.

No existing QR encoder was installed. Pinned qrcode-generator 2.0.4 in the
Storybook application and jsqr 1.4.0 in root test dependencies. QR images encode
exact ASCII payloads locally with four white modules on every side; CSS shows
224px square images. Independent jsQR decodes both encoded assets and actual
browser screenshot pixels. Product leading zeroes are retained.
References: https://github.com/kazuhikoarase/qrcode-generator/tree/master/js and
https://github.com/cozmo/jsQR .

## Expectation and actual visual review

Outside-render expectations are in ScannerFoundation.stories.tsx review parameters.
Personally inspected all 40 standalone artifacts (ready/actions/fixtures/result/
paused at each size and scale) plus all eight full-manager ready captures.
geometry.json retains computed font sizes, QR dimensions, targets and overflow.

| Viewport | Normal text | 125% text |
| --- | --- | --- |
| 1280x720 | Status left, two action cards right; titles, square codes, descriptions and matching buttons visible together. Synthetic group separately below. | Same grouping; card text wraps without clipping, buttons align and enlarged status copy remains readable. |
| 820x900 | Standalone keeps status beside a vertical action group; synthetic cards form two columns plus third row. Manager's sidebar reduces canvas to a stacked composition. Both remain scrollable. | Same hierarchy, descriptions wrap naturally; no truncated labels, overlapping codes or horizontal overflow. |
| 390x844 | Single column, status first, action and synthetic groups below; all code labels/quiet zones remain visible when scrolled. Controls wrap, Exit occupies another row. | Explicit demo notice wraps, status grows, action descriptions remain intact and 224px codes do not shrink. |
| 390x480 | Vertical scroll is necessary; complete cards and state panel are reachable, no horizontal clipping. | Focus scrolls the scanner input into view, so the ready viewport is not at page top. Heading remains reachable by scrolling; full section captures show intact text, codes and controls. |

Ready/result and Paused artifacts at every size plainly distinguish active capture
from the explicit Resume requirement. Product result says synthetic/not owned;
focus ring is visible only on active input. Whitespace separates groups, black
codes sit on white cards, headings have clear hierarchy and bodies wrap. All
visible button targets measure at least44px; controls compute16px/20px. Diagnostics
remain closed initially and expand without horizontal overflow. No composition
finding remains from this bounded self-review. Physical screen scan has NOT run.

## Verification and failed evidence

Final Chromium manager suite:32/32, no retries,48.6s (10 composition +22 foundation).
Includes exact rendered code decoding at all eight size/text combinations,
four-side white interior quiet zones, button targets, Off/Ready/Paused/Recovering,
mode-command then fixture without Resume, interrupted drain and dialog pause.
Asset test independently asserts exact five payloads, whole32px encoder borders
and all-white-image decoder negative control. Existing foundation negative
controls remain present. Full scripts:69 tests; scoped TypeScript and ESLint pass.
Full application and physical scanner qualification are outside this change.

Initial manager run29/32 failed on notification overlay and outer screenshot edge
rounding; subsequent slow run2/10 passed and8 timed out after excessive per-pixel
expect calls. Final test counts strict nonwhite pixels once instead of thousands
of assertion calls. It excludes only the outer two raster rounding pixels while
retaining strict interior white checks; asset test still checks entire four-module
border. Dismisses actual Storybook notification via its button, no fake CSS hide.
Logs retained, no retry-to-green. Early long iframe-region captures were clipped;
recaptured standalone regions replace them, with manager ready images retained.

## Review and delivery limits

Preview http://mini-m4.local:48434/iframe.html?id=scanner-foundation--action-codes&viewMode=story
verified HTTP200 and TCP wildcard listener. Manager story is also available at
/?path=/story/scanner-foundation--action-codes . This is a read-only Storybook demo.
Independent and designer review required; no merge, deployment or hardware claim.
Foundation PR178 remains53945f7. Separate queued work: investigate its baseline
toggle CI timing envelope and retain failure artifacts, isolated from this QR delta.

Source commit:28fdb20bb238feaff0ee6dd8a68d51072419761f. Commit helper verified
agent identity and required signing fingerprint. Evidence commit follows; source
is unchanged by evidence packaging.
