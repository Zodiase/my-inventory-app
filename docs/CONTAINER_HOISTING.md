# Container hoisting

**Container Hoisting** is an opt-in presentation feature for logical containers.
It lets a parent view show a container's immediate children directly, while
preserving that container as a real, independently navigable part of the
inventory hierarchy.

The rendered pattern is called a **Hoisted Container Group**. The configured
record is a **hoisted container**.

“Transparent container” is useful intuition, but it is not the canonical name:
the container is still visible as the group's labeled border and remains
clickable. Only the extra navigation step becomes optional.

## When to use it

Use container hoisting when a container is important for organization but its
children are usually the more useful destinations. Typical examples include:

- a floor containing rooms;
- a department containing working areas;
- a logical category whose immediate subcategories are frequently opened.

Do not use it to flatten physical storage whose boundary matters during lookup,
or to imply that children belong directly to the parent. Ordinary containment
remains the source of truth.

## Data model

Set this property on the logical container:

```json
{
    "properties": {
        "childrenPresentation": "hoist-in-parent"
    }
}
```

For example, this hierarchy:

```text
Home
└── Third floor  [childrenPresentation: hoist-in-parent]
    ├── Laundry room
    ├── Main bedroom
    └── Secondary bedroom
```

is presented in the Home view as one compact, bordered group labeled
“Third floor,” with direct links to all three rooms.

The data hierarchy does not change:

- every child keeps `containerId` set to the hoisted container;
- the group label links to the hoisted container's normal view;
- each child links to its own container or item view;
- breadcrumbs and direct URLs retain the full hierarchy;
- removing the presentation property restores the ordinary container row.

Hoisting currently projects one level of immediate children. It is a display
choice, not recursive hierarchy flattening.

## Enabling it

Create or update the container through a trusted application path that accepts
and preserves `InventoryItem.properties`, setting
`childrenPresentation` to `hoist-in-parent`.

There is currently no end-user toggle in the item form, and agent interface v1
does not permit property edits. Operational changes therefore need a reviewed
import, application-level mutation, migration, or narrowly scoped database
update. Always preserve unrelated properties and verify the parent view after
the change.

## Implementation map

- Property type: `meteor-app/imports/model/PropertyValues.ts`
- Data loading and opt-in selection:
  `meteor-app/imports/ui/AllItemsView/AllItemsViewContainer.tsx`
- Parent-list projection:
  `meteor-app/imports/ui/AllItemsView/AllItemsViewPresentation.tsx`
- Visual component: `meteor-app/imports/ui/HoistedContainerGroup.tsx`
- Storybook coverage: `meteor-app/imports/ui/HoistedContainerGroup.stories.tsx`
- Meteor integration coverage: `tests/e2e/app/hoisted-container.spec.ts`
- Storybook browser coverage:
  `tests/e2e/storybook/HoistedContainerGroup.spec.ts` and
  `tests/e2e/storybook/HoistedContainerGroup.webkit.spec.ts`

The parent view subscribes to the immediate children of opted-in containers and
passes those children to `HoistedContainerGroup`. The component renders a
clickable legend for the real container and a responsive grid of child links.

## Verification checklist

After enabling hoisting, verify that:

1. the parent view shows the labeled bordered group instead of a normal row;
2. every expected immediate child appears exactly once;
3. a child link opens that child directly;
4. the group label still opens the logical container;
5. the logical container's own view and breadcrumbs remain intact;
6. narrow and wide layouts remain usable in the supported browsers.
