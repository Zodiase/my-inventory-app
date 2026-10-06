# Option A — controlled actual-App preparation, not executed

2026-10-05 America/Los_Angeles. Base frozen185d3b707006692c35dee8a3ec401a3f31e22736303.
Coordinator selected Option A and authorized preparation only. Four proposed App
runs are NOT executed. No app/browser server started, no household data writes.

## Concrete source and ordering contract

Three fixed root calls still use useRootReadiness. Without immutable initial
controlled capability the185 original/retained selection remains unchanged;
production has no controlled API or gate allocation. Enabled original adapter is
the installed useSubscribeClient body, with only its subscription.ready() return
replaced by observeReady(name, ready, handle). Whole-function AST normalization
independently rejects every other body change. Original varargs/skipUpdate closure
and returned getter/updateOnReady semantics preserved; specific lint exceptions
are limited to this exact generated body. Installed bodies and provenance remain
frozen. Enabled retained callback keeps useTracker[name] and one subscribe/read.

Only identities observed readiness is gated by a Tracker.Dependency. The actual
Meteor handle is real; read()/command guards query its public ready() afresh,
separate from observed readiness. Tags/items are not gated. The connection and
publications are unmodified. A WeakMap aliases each public currentComputation;
firstRun/readiness and onInvalidate/onStop record bounded scalar sequence/flags.
Callbacks are additional observation work and may perturb timing; no harmlessness
claim. Callback registration and gate dependency are intentional experiment
changes, not production instrumentation or natural DDP reproduction.

App's only delta from185 is one import and a render-time binding of the existing
showFilterBuilder setter/value plus route guard. Whole-App AST equality after
reversing those two edits passes. No hook/component/effect/dependency added. No
App effect depends on showFilterBuilder. Route-sync/validity effects retain their
original dependencies and must remain settled; extra natural work will invalidate
interpretation if it prevents the specified lifecycle chain.

Why filter toggle: it creates a genuine update without route/navigation/search
submission changes. Under committed root Loading its filter UI is not rendered.
Prime false→true with flushSync; require the App bridge read true and actual DOM
still Loading. Then gate.changed() and same true setter run in one synchronous
command before explicit Tracker.flush. Changed control sets false, flush-first
control drains before true setter, retained control preserves the computation.
No global scheduler pause, package patch, dummy hook, private React queue/fiber
read, remount or timeout change. flushSync is test-only ordering, not a repair.
The source and mocked command-order checks demonstrate this protocol's ordering;
actual React traversal/commit and recovery remain unverified until reviewed runs.
A closure snapshot is not an observation of private queued React state equality.

## Planned four cases and rejection gates

Dedicated exact-head/output guard, Chromium/worker1/retries0 and four fresh docs
only: equal-pending, changed-state, flush-first, retained-pending. Original isolated
reset/seed journey creates First floor/Living room, then enters the real container
route. Require real ready handles, drain, visible committed Loading/absent heading,
matching scalar/controller epoch and retained mode, retired descendant API absent.
Prime and preserve before-trigger JSON/screenshot. Reject failure of these guards.

After command/drain, require complete/drop0 lifecycle evidence: identity last read
underlying ready/observed false, gate release, same computation invalidation with
stopped false/invalidated true. Original equal/changed require that computation
stopped and fresh firstRun observed-ready read BEFORE drain; flush-first reverses
stop/drain order; retained requires same computation ready rerun during drain and
no stop. Command intended values distinguish equal vs changed. Missing chain is
invalid trigger, not a nonreproduction that supports or refutes mechanism.

Equal baseline must fail the unchanged5000ms visible-heading assertion and still
show Loading at deadline after drain; the test records expected timeout and elapsed
interval. Recovery falsifies sufficiency of the verified mechanism in this App.
Other three must visibly recover at that same deadline. Their failure fails the
controlled experiment. An expected baseline timeout is reported explicitly even
if its discriminator test passes; do not call it natural failure reproduction.

Before/after-drain/final screenshots and JSON, scalar/topology/lifecycle/publicDDP/
errors and native traces retained on passes/failures. AfterEach bounded read races
avoid one hang bypassing public observer finish, but filesystem/teardown failure
can still lose artifacts; no universal retention guarantee. All modes/captures and
public errors must be reconciled before inference. No blind reruns beyond four.
No candidate App run before independent review and separate execution authority.

## Executed preparation checks / cost

108 Node script checks pass: exact installed body parity, wholeApp delta and
unchanged effect dependency guard, command ordering for all four (mock only),
production/no-opt-in allocations absent, immutable/HMR incomplete evidence,
redaction/copies/overflow and matrix/deadline guards. TypeScript5.9.3 passes;
scoped ESLint passes with existing findOne warning; scoped format passes.
NO browser controls, actual App E2E, app build or production bundle tested here.

Preparation began06:45:41 UTC (23:45:41 PDT Oct5); source/Node work took roughly
15minutes, well under two-hour cap. Initial command had wrong cwd and made no app
edits; its nested types link removed. Initial TS narrowing and lint/style errors
repaired, original outputs retained in Home archive. No product workaround or
hidden app run. Dependencies/manifests unchanged, frozen182–185 untouched.

## Independent review and unresolved acceptance

Review exact adapter extraction/parity, current public handle checks, gated
identity dependency/public lifecycle callback cost, disabled topology, chosen
setter/source ordering and four-case guards before authorizing execution. If parity
or ordering cannot be demonstrated, STOP rather than switch to B/C automatically.
Even a controlled success proves only artificially ordered App behavior. Native
plausible update path and original failure linkage remain separate from production
repair, DDP error/reconnect/lifecycle acceptance, CI/design/security disposition.
This is the last current bounded discriminator; if inconclusive reassess scanner
delivery, do not add another diagnostic stack or passing matrix automatically.

## 2026-10-06 focused oracle correction after independent HOLD

The original bbaae77 preparation and evidence remain archived. The revised shared
oracle is used by both the proposed App cases and source-only negative controls.
Equal/changed require release < invalidation < setter < old stop < fresh ready
firstRun < setter return < drain start < drain end < trigger end. Flush-first
requires stop/fresh firstRun inside the first drain, before its end and setter;
retained requires a same-computation non-firstRun ready read inside the drain and
no old-computation stop. Reordered reads beyond each bound, wrong firstRun and
stop-before-setter controls reject.

Baseline classification now requires the installed Playwright toBeVisible
positive assertion result (5000ms timeout, visible expected, hidden/missing
received), the exact Living room heading locator and matching assertion message.
ANSI formatting is removed only for message matching. The assertion duration is
sampled before final evidence collection. Page closure/transport/unrelated late
errors reject; final Loading must remain visible, heading absent, page open, and
public error capture complete, stopped, lossless and empty. The existing observer
is finalized before classification and remains idempotent in fixture teardown.
No application controller, hook, dependency, command ordering, deadline, planned
four-case matrix or retry configuration changed.

Fresh checks: 16 focused source tests and 115 total script tests pass; TypeScript
5.9.3, targeted proposal type-check and scoped formatting pass. A pre-existing
bootstrap tuple inference error found by the targeted check was corrected with a
type-only tuple annotation; runtime bootstrap values are unchanged. The installed Playwright message formatter is
exercised with a synthetic matcher result without a browser. No App/browser/build
execution occurred. These are guard checks, not observed actual React lifecycle
or proof of the natural DDP failure. Focused independent rereview is next.

## 2026-10-06 numeric producer contract correction

Focused independent review of1bcd2ba found a real producer/consumer mismatch:
the controller emits numeric computation aliases, while the guard and handcrafted
controls expected strings. The oracle now requires positive safe-integer aliases
on every subscription-read/invalidation/stop event. All handcrafted lifecycle
controls now use numeric IDs; strings, zero, negatives, fractions, nonfinite,
unsafe integers, null and missing aliases reject across all three event types.

Four additional producer-to-oracle tests execute the actual compiled unchanged
e2eControlledApp controller's observe/prime/trigger/read and public lifecycle
callbacks. A synthetic scheduler supplies computation lifecycle and render
responses; records are emitted by the producer and passed directly to the oracle,
without rewriting aliases or constructing snapshots. These controls close the
shape-contract gap, not actual React/Tracker scheduling or natural DDP proof.

Fresh21 focused/120 total script tests pass, app and targeted proposal types pass,
scoped formatting passes. Controller/App/order/deadline/four-case/config unchanged.
No App/browser/build runs. Original held evidence retained; exact-head focused
independent rereview is next.
