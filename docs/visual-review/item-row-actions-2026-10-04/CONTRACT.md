# Item row actions proposal

Scope: isolated mock composition and reusable Grommet DropButton wrapper; no app wiring.

Stories: Prototypes/Item Row Actions Full, Available Only, Grouped Fallback, Constrained Height.

Required viewports: desktop1280×720, iPad820×900, phone390×844, short desktop1280×480. Each story keeps one primary anchor and a separate always-visible44×44 overflow trigger. Text truncates within the flexible link; trigger stays at the trailing boundary and centers vertically in its row. Menus anchor to their trigger and stay within the preview viewport; menu buttons are44px high. Escape/outside click dismiss, keyboard reaches actions and restores trigger focus. Delete opens a named mock confirmation; Cancel changes no mock record. Available Only omits unavailable Edit/Delete. Grouped Fallback shows the intended placement in a group/list context; actual hoisted and structured components are not yet wired and are excluded from acceptance of this isolated proposal. Constrained Height scrolls rows without clipping menu controls.

Exclusions: actual Meteor routing/mutations, real delete dialog, live inventory, retained long-press accelerator, density redesign. The existing long-press centered Layer lacks a discoverable trigger and anchor; use the existing Grommet DropButton for this visible anchored proposal instead. App integration must consolidate action definitions and exercise actual hoisted/structured list fallback before ticket closure.
