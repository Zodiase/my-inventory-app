# Failure-time loading diagnostics

Scope: bd-rjd, test-only evidence for intermittent nested-container loading.
Relevant production code is unchanged; the underlying failure remains unresolved.

The affected top-navigation tests gain an automatic observer fixture only. Their
setup, navigation, assertions, retries and timeouts are unchanged. No observer
subscription, method call or database write occurs. New helper tests exercise a
controlled local HTTP/WebSocket fixture rather than household data.

## Retained evidence and limits

A failed/timed-out journey writes meteor-loading-diagnostics.json to its own
Playwright outputPath and attaches that file. Existing App Tests Chromium CI
includes these specs and uploads test-results/ on every outcome, retained7days.
No workflow relaxation or reporter change is needed. Passing journeys emit no
failure artifact; observer listeners are removed at finish.

At200ms intervals retain the latest40 samples (roughly8seconds), max12 subscriptions
per sample, max100 sub/unsub/ready/nosub events, max64 anonymous subscription
aliases and12 socket observers. Frame decoding is capped at8KiB. A final read has
a500ms deadline and reports finalSampleCompleted=false if the page is stalled.
Recorded names are allowlisted publications; all others become other. Records,
parameters, item names, URLs, raw IDs, credentials and error text are excluded.
Counters expose dropped samples/events/ignored frames/sockets. Caps can omit older
history or overflow subscription correlation; this is diagnostic evidence, not
proof of the underlying cause. Current \_subscriptions is an internal Meteor
surface; unavailable reads remain explicit rather than fabricating readiness.

## Validation

- Four Node tests: wire/sample correlation and redaction; limits/latest failure
  preservation; stalled-browser deadline and incomplete marker; socket caps,
  listener cleanup and idempotent finish.
- Real Chromium HTTP/WebSocket fixture deliberately fails an unrendered heading
  assertion, retains the original error, writes/reads the failure artifact and
  asserts sub/ready/nosub correlation plus private fixture-value exclusion.
- Passing fixture checks no attachment and removal of page listeners.
- All3 unchanged top-navigation journeys pass on disposable app48400/Mongo48401,
  synthetic search index loading_diagnostics on task-only search48390. Combined
  affected browser suite5/5passed6.7seconds, retries0. Logs and controlled JSON
  retained here; no household writes, runtime rollout or app UI change.
- Full script regression and changed-file Prettier checks pass (counts in scripts.log).

Initial mocked WebSocket fixture bypassed native observation and its first HTML
response lacked explicit UTF-8; both were fixture defects repaired before these
accepted runs. Real local WebSocket transport and UTF-8 are now explicit.
Independent exact-head verification and PR checks remain required before merge.
