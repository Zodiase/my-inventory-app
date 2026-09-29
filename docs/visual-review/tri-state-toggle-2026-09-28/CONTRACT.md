# Isolated tri-state toggle visual contract

This mock-only Storybook story isolates the three-position tag control after a review found that the Search proof still looked like three segmented buttons. The one handle must be unmistakable in every settled state and visibly travel inside a recessed rail when moving directly between Include and Exclude or through Undecided. Each of the three rail positions must be directly tappable; radio arrow keys must change the same handle. The motion should take place at normal interaction speed, and reduced-motion preference should remove the transition. The story provides dedicated repeatable buttons so reviewers can inspect motion without opening the full Search panel.

Review each of Undecided, Include, and Exclude at desktop 1280 × 800 and iPad-width 820 × 900. The control must remain legible, not clip or overflow, and retain one selected radio state. The same shared control must also fit the Search mock at its ordinary size.

The story's explanatory labels and buttons are review scaffolding. Placement of words such as Included/Excluded in the eventual Search UI remains unresolved and requires user/design judgment. No production app, data, filter behavior, or route is part of this proof.
