/** Actual inventory compositions with sibling detail actions, independent of Meteor data. */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { AllItemsViewPresentation } from '/imports/ui/AllItemsView/AllItemsViewPresentation';
import { ItemsByTagViewPresentation } from '/imports/ui/ItemsByTagView/ItemsByTagViewPresentation';
import { SearchResultsView } from '/imports/ui/SearchResultsView';

const date = new Date('2026-10-04T12:00:00Z');
const item = (id: string, name: string, isContainer = true): InventoryItem => ({
    _id: id,
    name,
    isContainer,
    description: 'A representative inventory entry',
    tagIds: [],
    createdAt: date,
    modifiedAt: date,
});
const room = item('room', 'Garage');
const hammer = item('hammer', 'Claw hammer', false);
const mixedItems = [
    room,
    {
        ...hammer,
        description: 'A long description that wraps across several lines on small screens. '.repeat(5),
        tagIds: ['tools'],
    },
    ...Array.from({ length: 5 }, (_, index) => ({
        ...item(`extra-${index}`, `Extra entry ${index}`, false),
        description: '',
    })),
];
const view = (items: InventoryItem[], extra = {}): React.ReactElement => (
    <AllItemsViewPresentation
        items={items}
        containerPath={[]}
        onNavigateToContainer={() => undefined}
        onBreadcrumbNavigate={() => undefined}
        onViewItemDetails={() => undefined}
        {...extra}
    />
);
const meta = {
    title: 'Integration/InventoryRowActions',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Actual consumers: ordinary rows, hoisted header/children, physical slots and fallback, search and tag results. Review 1280×720, 768×1024, 390×844. Each occupied entry has a separate 44px ellipsis beside its primary link (below it in narrow physical slots); hierarchy and text stay readable without horizontal overflow. Open/Escape returns focus; View Details is the only real command. Physical empty slots have no actions. Search return context and backend routing are app-test concerns. No mock Edit/Delete or mutation backend.',
            },
        },
    },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ordinary: Story = { render: () => view([room, hammer]) };
export const Hoisted: Story = {
    render: () =>
        view([room], { hoistedItemsByContainerId: { room: [hammer, item('closet', 'Long name storage closet')] } }),
};
export const Physical: Story = {
    render: () => {
        const modelId = 'stack-tower-2col-5tier-v1';
        const stack = {
            ...room,
            properties: { storageLayout: { modelId, tierCount: 5, positions: ['left', 'right'] } },
        };
        const bin = {
            ...item('bin', 'Top left storage bin with a long name'),
            properties: { storagePlacement: { modelId, tier: 1, position: 'left' } },
        };
        return view([bin, hammer], { containerPath: [stack] });
    },
};
export const Search: Story = {
    render: () => <SearchResultsView items={mixedItems} hasSearched onItemClick={() => undefined} />,
};
export const TagResults: Story = {
    render: () => (
        <ItemsByTagViewPresentation
            selectedTag={{
                _id: 'tools',
                name: 'Tools',
                parentTagId: '',
                path: [],
                createdAt: date,
                modifiedAt: date,
            }}
            items={mixedItems}
        />
    ),
};
