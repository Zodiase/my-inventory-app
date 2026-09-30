# Isolated tri-state toggle visual contract

This mock-only Storybook story isolates the three-position tag control after a review found that the Search proof looked like three segmented buttons. One translucent, **unlabeled** capsule must visibly travel inside a single uninterrupted recessed rail. `Include`, `Off`, and `Exclude` remain fixed and legible inside the rail in every state, including through the handle. The neutral state should be quiet enough to repeat down a list without drawing attention. There are no external Included/Excluded words on tag rows.

Each rail position is directly tappable, radio arrow keys change the same handle, and logical positions mirror in RTL. Direct Include-to-Exclude motion should look continuous at normal interaction speed; reduced-motion preference removes the transition. The story provides dedicated repeatable buttons to inspect motion without opening the full Search panel. The buttons are demonstration scaffolding, not part of the control.

Review each settled state at desktop 1280 × 800 and iPad-width 820 × 900. The control must remain legible, not clip or overflow, and retain one selected radio state. The shared control must also fit the Search mock at ordinary size. No production app, data, filter behavior, or route is part of this proof.
