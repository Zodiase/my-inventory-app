# Branch Maintenance

Keep active code branches short-lived and preserve historical work deliberately.

## Active branches

- `master` is the default integration and deployment branch.
- Feature and maintenance branches should be deleted after merge once their commits are reachable from `master`.
- Dependabot branches belong to their generated pull requests. Close superseded pull requests and delete their branches after the replacement change reaches `master`.

## Visual artifacts

`visual-artifacts` is an intentional orphan publication branch used by `.github/workflows/pr-visual-evidence.yml`. It is not a code branch and must never be merged into `master`.

The workflow keeps one current visual-evidence run per pull request by replacing that pull request's directory. Retain this branch while PR comments link to its images. Generated history may be compacted only after confirming published PR links remain valid.

## Historical work

Before deleting an unmerged human-authored branch:

1. Compare its commits and tree with `master`.
2. Record whether the work was merged, superseded, abandoned, or remains potentially useful.
3. Create and push an annotated `archive/` tag when the branch contains unique work worth preserving.
4. Verify the tag resolves remotely before deleting the branch.

Current archive decisions:

- `001-touch-friendly-inventory` contains 89 patch-distinct historical commits. Much of its product direction now exists on `master`, but its commit series remains unique; preserve its tip with `archive/001-touch-friendly-inventory-2025-11-25` before branch deletion.
- `twig/dedicated-locations-collection` contains one unique WIP `LocationRecord` commit. Preserve its tip with `archive/dedicated-locations-collection-2023-07-15` before branch deletion.

_Last reviewed: 2026-07-11_
