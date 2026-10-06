# Scanner app move simulation contract

This candidate extends frozen 3fe545a without changing PR179/181. Route
`/scanner/demo` and its Storybook proof share the same component, capture adapter
and dispatcher. All records are synthetic, held in React memory. No Meteor,
inventory API, storage, fetch or subscription belongs in the simulation modules.
App entry unmounts the inventory route tree; leaving unmounts capture listeners
and timers. Reload resets fixtures and starts Off. Explicit Start required.

Move mode expects a known container before existing item identities. Recognized
container scans deliberately choose/change destination; destination persists for
successive successful item moves, unknown/wrong-kind/rejected reads, and Pause.
Changing destination cancels outstanding item intents even if the same destination
is selected again. Item resolution records destination and generation at capture,
not at asynchronous completion. Repeat item already at destination is an explicit
no-op, no quantity or record creation. Successful moves record source/destination;
all other item fields and unrelated records remain unchanged.

Pause/interruption cancels pending intents but preserves displayed destination.
Exit, new session and mode changes cancel intents and clear destination. Moving
from action cards back to Move therefore needs a new destination scan. Resume
never replays cancelled reads. Partial frames use the existing discarded-boundary
recovery. Late results require exact read/epoch/attempt/generation, current Move
mode and active capture. Failure evidence remains in the ordered log; retry is
not offered for moves (rescan explicitly). Product barcodes never identify items.

Preview controls can delay/fail the next item lookup for synthetic verification.
No effect may alter a household record. Physical keyboard/screen scanning remains
UNVERIFIED. Existing security and independent/design acceptance gates remain.

Visual contract: desktop1280x720, tablet820x900, phone390x844 and390x480,
normal/125% text. Viewport capture row reserved; workspace scrolls above it.
Destination, next scan and per-scan outcome readable; every224px QR including
quiet zone reachable. Controls44px; no horizontal scroll; no automatic refocus.
