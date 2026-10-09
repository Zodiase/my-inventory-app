# Bounded descendant loading diagnostics

Source coordinator: 01a0e625-deaa-7792-8930-c8649c432096. Development owns test-gated diagnostics for bd-rjd; no descendants. Base frozen scanner PR182: 6055b0cd4bf6473507b2d138870e39bd7e016fef. Separate codex/bd-rjd-descendant-diagnostics branch; PR182 unchanged. Independent review required before interpreting measurements. This is not a causal repair.

## Measurement

Installed React18.3.1 supports onRecoverableError, not React19 root uncaught/caught callbacks. Source inspection found no application Suspense/error boundary. App imports ordinary non-suspense react-meteor-data hooks through its existing adapter. No hook order, getter evaluation, remount/key, readiness logic, route assertions, test timeout or retry policy changed. Existing merged-baseline hook/callback AST guard still passes.

v3 uses the same document epoch and existing App instance/frame. Stable test-only observer components run immediately before Grommet, AppShell and Switch children and record entry, layout effect, mount and unmount. Entry means observer entry before the child, not successful child render. Layout effects mark that observer's committed frame; cleanup retains its mount frame. An older frame's commit cannot stand in for a newer frame. Root Profiler commits carry their own root instance/native batch and no invented App frame. Root-created and observed target removal distinguish document-root lifetime from inventory subtree unmount. The MutationObserver disconnects on removal or diagnostic drain. Removal is not proof React called unmount; replacement creates a removal event, not an inferred replacement cause.

Recoverable errors retain only allowlisted names, never message/stack/info. Native reportError or React18-equivalent console fallback is preserved; existing public browser errors remain separate. No root error callback is claimed for unsupported React18 APIs. Ring retains maximum200 events,16 aliases,131072 bytes; overflow remains explicitly incomplete. v1/v2 legacy sanitization/limits unchanged. Production and non-opted-in paths return exact original elements and expose no capture API. Module hot reload invalidates measurement as before.

## Validation and evidence limits

- 89/89 script checks, including original hook/getter guard and five new controls: production/non-opt-in inertness, missing entry vs entry without commit vs older-frame commit, privacy/malformed correlation/overflow, legacy rejection, root drain/native-error reporting.
- Complete browser batch10/10 Chromium, workers1/retries0: existing five capture checks, new inventory detour and root-removal checks, unchanged three navigation journeys. Five fresh-document repeats of the existing real gate/child journey also pass without retries; before/after snapshots retained,153–185 events, dropped0. No reproduction of original CI failure; no causal conclusion.
- Full TypeScript passes after normal Meteor-generated types exist. Scoped lint passes with one unchanged findOne deprecation warning. Formatting checked and git diff check clean.
- Personally inspected both1280x720 shell parity screenshots; appearance matches and automated main/header geometry plus active subscription sets match. This is a bounded parity inspection, not general responsive design acceptance.
- Initial batch9/10: new test used wrong existing button label Leave demo; actual render says Leave simulation. Corrected selector; no product change.
- Second batch9/10: strict before.complete assertion failed. Its detailed ring reason was not persisted; the original log is retained but reason remains unknown. Subsequent single1/1, full10/10 and five retained repeats passed. This is not evidence the transient was repaired. Future before/after raw files persist even on assertion failure. Do not hide this limitation or infer no observer effect under CI/full-suite scheduling.

All browser writes use the task-owned disposable Meteor database on48446 and disposable search index bd_rjd_descendant_preview at the pre-existing task-owned search service48442. Production/household services untouched. Playwright-managed app stopped normally; frozen scanner review previews remain. No dependency/manifest change, CI rerun, security waiver, merge or deployment. Original PR182 failure evidence remains under Home Automation docs/verification/pr182-ci-navigation-2026-10-05.

## Review handoff

Review observers and v3 sanitizer independently, including same-frame semantics, production gate, privacy, overflow and probe-induced lifetime changes. Only after acceptance authorize equivalent CI/full-suite measurement. Distinguish no descendant entry from entry without commit first; a root Profiler commit does not explain discarded work. Reconcile inherited security/design gates separately. bd-rjd remains in progress.
