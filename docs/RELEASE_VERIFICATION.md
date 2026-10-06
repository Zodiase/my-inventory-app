# Inventory verification and shipping

This workflow separates automated testing, human preview, merge, and primary
deployment. A green PR is not approval to deploy, and a merge must not be the
first time a user sees a changed UI against real inventory data.

## Instance roles

| Port | Role | Data and allowed checks |
| --- | --- | --- |
| 48371 | Stable primary inventory app | Real data. Keep unchanged while evaluating a candidate. |
| 48372 | Candidate UI preview | Shares the primary MongoDB. Read-only visual and retrieval checks only; browser writes here are real writes. |
| 48373 | Hosted Storybook | Mock UI states and composed component interactions; not a running inventory app or backend E2E environment. |

The preview's current read-only use is an operating rule, **not a technical
write barrier**. Never aim a database reset, import, agent-write, or mutating
browser test at 48371 or 48372. If a candidate requires realistic write-path
testing, use a disposable isolated Meteor/Mongo/search stack, or design and
verify a separately isolated staging database before enabling writes.

## Candidate-to-primary order

1. The development owner implements a scoped change and its focused tests on
   a PR. The verification owner independently checks the stated requirement,
   data-loss and wrong-record paths, and the relevant green PR checks. Routine
   UI states and component integration belong in Storybook; backend rules
   belong in unit/integration tests; a small set of real-app E2E and agent
   acceptance tests prove critical browser/API-to-backend contracts using
   disposable data. CI is the executable source of truth for required checks.
2. For a user-facing change, build the **exact PR head** as a candidate image.
   Record the commit and image digest. Before replacing 48372, identify its
   current image and owner, preserve a recoverable rollback container/image,
   and check whether the candidate would hide preview-only work. Keep 48371
   running. Disable sample seeding and agent access in the preview; verify its
   database target, search-index isolation, port, and root URL. Take a fresh
   verified inventory backup before starting a candidate that connects to
   the shared database.
3. Run read-only checks on the **deployed** 48372 surface at representative
   viewports: endpoint health, rendered full app shell, relevant interaction,
   browser errors, and a screenshot inspected by the verifier. Use Storybook
   on 48373 for mock-state review. Do not run the mutating E2E suite against
   either persistent app port. Provide the preview link and exact candidate
   commit to the user for acceptance.
4. If preview review finds a defect, keep primary unchanged and return the
   finding to development. Update the PR, repeat CI and candidate preview
   checks, and seek acceptance again. **Do not merge before user acceptance
   of the candidate preview** when a preview is part of the release request.
5. After acceptance, merge the reviewed PR. Primary deployment is a separate
   release step: confirm the merged commit contains the accepted candidate,
   review any intervening changes, preserve a fresh backup and rollback path,
   then deploy only with release authorization. Check primary health, key
   read-only workflows, data counts, and availability after the cutover.

Record PR URL, head commit, candidate image digest, preview URL and prior
image, automated check results, read-only preview evidence, user acceptance,
merge commit, and any primary deployment/rollback result. Do not record
credentials or secret-bearing command output. The [testing guide](TESTING_GUIDE.md)
and [E2E organization](../tests/e2e/README.md) describe the test layers;
[Mac mini development](MAC_MINI_DEVELOPMENT.md) owns host and secret setup.
