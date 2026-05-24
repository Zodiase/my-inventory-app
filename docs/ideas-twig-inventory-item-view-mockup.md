# Ideas from branch: twig/inventory-item-view-mockup

This document preserves the architectural and UI ideas from the old branch `twig/inventory-item-view-mockup` before it is deleted.

> **Migration Status (final):** The ideas below were evaluated against `master` and either ported, adapted, superseded, or abandoned. See [Migration Outcome](#migration-outcome) at the bottom for the per-section summary.

## UI/UX Framework
> **Status: Superseded by `master`.** The current `master` branch already uses Grommet, so no port was needed from this branch.

* The branch experimented heavily with **Grommet** as the UI framework (`grommet`, `grommet-icons`, `styled-components`).
* Used Grommet components like `Box`, `Grid`, `Layer`, `Button`, `Card`, `DataTable`, `NameValueList`, and `TextInput`.

## Layout Architecture
> **Status: Superseded by `master`.** `master` already provides a layout based on a Container/Presentation split with `wouter` routing, which was preferred over the `Grid` + `Layer` modal approach from this branch.

* `AllItemsView` used a `Grid` layout with areas: `header`, `list` (sidebar), and `view` (main content area).
* **Create Mode**: Displayed `CreateNewItemView` inside a `Layer` (modal) over the main layout.

## State Management
> **Status: Superseded by `master`.** `master` uses a Container/Presentation pattern with `useTracker` for reactive Meteor data and `wouter` for routing, which subsumes the responsibilities of the `ItemsViewController` context from this branch.

* Introduced an `ItemsViewController` using React Context (`ItemsControllerProvider`).
* Managed state such as `items`, `selectedItem`, `inEditMode`, and `inCreateMode` centrally.
* Extracted business logic (CRUD operations) out of the views into the controller hook (`useNewItemsController`).

## Dynamic Property Rendering
> **Status: Not migrated.** Not adopted as part of this migration; kept here for future reference.

* Implemented a data-driven property rendering system (`renderersByPropertyType`) in `ItemView.tsx`.
* Handled both `view` and `edit` states generically based on property types (`text`, `date`).
* Kept track of which properties are editable via `editableDefaultProps` mapping.

## Developer Experience (DX)
* **1Password Integration** — *Adapted and migrated*: The `Makefile` target (`make env`) and `env.tpl` template approach (using `op inject` to securely generate a `.env` file for local development) was ported, but the template was **adapted to use `NAS_MONGO_URL` instead of `MONGO_URL`** to align with the local development scripts on `master`.
* **Error Handling** — *Abandoned*: The standard `NotImplementedError` class for stubbing out methods was **not ported**.
* **Seeding** — *Migrated*: The change to seed **100 sample items** on startup (up from 4) was migrated to support better testing of list scrolling/pagination.

## Migration Outcome

| Idea | Outcome | Notes |
| --- | --- | --- |
| UI/UX Framework (Grommet) | Superseded | `master` already uses Grommet. |
| Layout Architecture (`Grid` + `Layer`) | Superseded | `master` uses Container/Presentation + `wouter` routing. |
| State Management (`ItemsViewController` context) | Superseded | `master` uses Container/Presentation + `useTracker`. |
| Dynamic Property Rendering | Not migrated | Kept as reference only. |
| 1Password `env.tpl` / `make env` | Adapted & migrated | Uses `NAS_MONGO_URL` (not `MONGO_URL`) to match local dev scripts. |
| `NotImplementedError` | Abandoned | Not ported. |
| 100-item seeding | Migrated | Ported as-is. |
