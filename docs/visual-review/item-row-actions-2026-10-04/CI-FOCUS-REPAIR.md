# CI focus handoff repair

PR #165's first Storybook run failed three initial-Cancel focus assertions and
retried three more. The menu's Grommet Drop teardown implicitly restored focus
to its original trigger while the confirmation was trying to acquire focus.

The action control now opts out of Drop's implicit restoration. It explicitly
focuses the first available menu action and restores the trigger only on
dismissal, after the menu content and focus trap actually unmount. Selecting an
action leaves focus ownership with its destination. Existing focus assertions
and the 44px layout remain unchanged.

Manual full manager at 1280×720: first menu action focused, Escape restored the
trigger, Delete opened the named confirmation with its 44px Cancel focused,
and Cancel restored the trigger. No browser errors were captured. Screenshot:
`focus-repaired-desktop.png`. The existing 17-case viewport suite is repeated
three times; exact-head CI and independent review are required after publication.
