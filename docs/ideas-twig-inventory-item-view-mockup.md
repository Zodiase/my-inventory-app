# Ideas from branch: twig/inventory-item-view-mockup

This document preserves the architectural and UI ideas from the old branch `twig/inventory-item-view-mockup` before it is deleted.

## UI/UX Framework
* The branch experimented heavily with **Grommet** as the UI framework (`grommet`, `grommet-icons`, `styled-components`).
* Used Grommet components like `Box`, `Grid`, `Layer`, `Button`, `Card`, `DataTable`, `NameValueList`, and `TextInput`.

## Layout Architecture
* `AllItemsView` used a `Grid` layout with areas: `header`, `list` (sidebar), and `view` (main content area).
* **Create Mode**: Displayed `CreateNewItemView` inside a `Layer` (modal) over the main layout.

## State Management
* Introduced an `ItemsViewController` using React Context (`ItemsControllerProvider`).
* Managed state such as `items`, `selectedItem`, `inEditMode`, and `inCreateMode` centrally.
* Extracted business logic (CRUD operations) out of the views into the controller hook (`useNewItemsController`).

## Dynamic Property Rendering
* Implemented a data-driven property rendering system (`renderersByPropertyType`) in `ItemView.tsx`.
* Handled both `view` and `edit` states generically based on property types (`text`, `date`).
* Kept track of which properties are editable via `editableDefaultProps` mapping.

## Developer Experience (DX)
* **1Password Integration**: Added a `Makefile` target (`make env`) that uses `op inject` with an `env.tpl` template to securely generate a `.env` file for local development.
* **Error Handling**: Added a standard `NotImplementedError` class for stubbing out methods.
* **Seeding**: Increased the number of sample items seeded on startup from 4 to 100 for better testing of list scrolling/pagination.
