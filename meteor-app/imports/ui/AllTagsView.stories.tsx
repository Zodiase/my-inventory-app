/**
 * Storybook stories for AllTagsView component.
 *
 * AllTagsView displays a hierarchical tree of tags with management actions (create, rename, delete)
 * and utility views for detached tags and tags missing path information. Each tag shows usage count
 * (how many items have that tag).
 *
 * These stories demonstrate empty, routine, interactive, and hierarchy-stress states, including
 * long names and depths that exercise the responsive row constraints.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from 'grommet';
import React, { useState } from 'react';

import type { TagRecord } from '/imports/model/TagRecord';
import { AllTagsViewPresentation } from '/imports/ui/AllTagsView/AllTagsViewPresentation';

const meta: Meta<typeof AllTagsViewPresentation> = {
    title: 'UI/AllTagsView',
    component: AllTagsViewPresentation,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <Box pad="medium" background="background-back" style={{ minHeight: '400px' }}>
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AllTagsViewPresentation>;

// Sample tags data
const camping: TagRecord = {
    _id: 'camping',
    name: 'Camping',
    parentTagId: '',
    path: [{ _id: 'camping', name: 'Camping' }],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

const outdoor: TagRecord = {
    _id: 'outdoor',
    name: 'Outdoor',
    parentTagId: '',
    path: [{ _id: 'outdoor', name: 'Outdoor' }],
    createdAt: new Date('2024-01-02'),
    modifiedAt: new Date('2024-01-02'),
};

const kitchen: TagRecord = {
    _id: 'kitchen',
    name: 'Kitchen',
    parentTagId: '',
    path: [{ _id: 'kitchen', name: 'Kitchen' }],
    createdAt: new Date('2024-01-03'),
    modifiedAt: new Date('2024-01-03'),
};

const tent: TagRecord = {
    _id: 'tent',
    name: 'Tent',
    parentTagId: 'camping',
    path: [
        { _id: 'camping', name: 'Camping' },
        { _id: 'tent', name: 'Tent' },
    ],
    createdAt: new Date('2024-01-04'),
    modifiedAt: new Date('2024-01-04'),
};

const sleepingBag: TagRecord = {
    _id: 'sleeping-bag',
    name: 'Sleeping Bag',
    parentTagId: 'camping',
    path: [
        { _id: 'camping', name: 'Camping' },
        { _id: 'sleeping-bag', name: 'Sleeping Bag' },
    ],
    createdAt: new Date('2024-01-05'),
    modifiedAt: new Date('2024-01-05'),
};

const cookware: TagRecord = {
    _id: 'cookware',
    name: 'Cookware',
    parentTagId: 'kitchen',
    path: [
        { _id: 'kitchen', name: 'Kitchen' },
        { _id: 'cookware', name: 'Cookware' },
    ],
    createdAt: new Date('2024-01-06'),
    modifiedAt: new Date('2024-01-06'),
};

const manyTags: TagRecord[] = Array.from({ length: 15 }, (_, i) => ({
    _id: `tag${i}`,
    name: `Tag ${i + 1}`,
    parentTagId: '',
    path: [{ _id: `tag${i}`, name: `Tag ${i + 1}` }],
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
}));

const hierarchyStressNames = [
    'Household equipment',
    'Seasonal storage',
    'Outdoor recreation',
    'Cold weather camping',
    'Safety systems',
    'Emergency communication and navigation equipment with rechargeable backup power',
];

const hierarchyStressTags: TagRecord[] = hierarchyStressNames.map((name, index) => {
    const id = `hierarchy-stress-${index + 1}`;

    return {
        _id: id,
        name,
        parentTagId: index === 0 ? '' : `hierarchy-stress-${index}`,
        path: hierarchyStressNames.slice(0, index + 1).map((pathName, pathIndex) => ({
            _id: `hierarchy-stress-${pathIndex + 1}`,
            name: pathName,
        })),
        createdAt: new Date('2024-01-01'),
        modifiedAt: new Date('2024-01-01'),
    };
});

// Story: Empty state - no tags exist
export const Empty: Story = {
    args: {
        tags: [],
        usageCounts: {},
        onAddChild: (parentTagId: string, tagName: string) => {
            console.log('Add child', parentTagId, tagName);
        },
        onRename: (tag: TagRecord, newName: string) => {
            console.log('Rename', tag.name, 'to', newName);
        },
        onDelete: (tag: TagRecord) => {
            console.log('Delete', tag.name);
        },
    },
};

// Story: Few tags at root level
export const FewTags: Story = {
    args: {
        tags: [camping, outdoor, kitchen],
        usageCounts: {
            camping: 5,
            outdoor: 3,
            kitchen: 8,
        },
        onAddChild: (parentTagId: string, tagName: string) => {
            console.log('Add child', parentTagId, tagName);
        },
        onRename: (tag: TagRecord, newName: string) => {
            console.log('Rename', tag.name, 'to', newName);
        },
        onDelete: (tag: TagRecord) => {
            console.log('Delete', tag.name);
        },
    },
};

// Story: Nested hierarchy
export const NestedHierarchy: Story = {
    args: {
        tags: [camping, outdoor, kitchen, tent, sleepingBag, cookware],
        usageCounts: {
            camping: 12,
            tent: 5,
            'sleeping-bag': 7,
            outdoor: 8,
            kitchen: 15,
            cookware: 10,
        },
        onAddChild: (parentTagId: string, tagName: string) => {
            console.log('Add child', parentTagId, tagName);
        },
        onRename: (tag: TagRecord, newName: string) => {
            console.log('Rename', tag.name, 'to', newName);
        },
        onDelete: (tag: TagRecord) => {
            console.log('Delete', tag.name);
        },
    },
};

export const HierarchyStress: Story = {
    args: {
        tags: hierarchyStressTags,
        usageCounts: {
            'hierarchy-stress-1': 42,
            'hierarchy-stress-2': 31,
            'hierarchy-stress-3': 24,
            'hierarchy-stress-4': 16,
            'hierarchy-stress-5': 8,
            'hierarchy-stress-6': 37,
        },
        onAddChild: (parentTagId: string, tagName: string) => {
            console.log('Add child', parentTagId, tagName);
        },
        onRename: (tag: TagRecord, newName: string) => {
            console.log('Rename', tag.name, 'to', newName);
        },
        onDelete: (tag: TagRecord) => {
            console.log('Delete', tag.name);
        },
        onTagClick: (tagId: string) => {
            console.log('Open tagged items', tagId);
        },
    },
};

// Story: Many tags
export const ManyTags: Story = {
    args: {
        tags: manyTags,
        usageCounts: Object.fromEntries(manyTags.map((tag) => [tag._id, Math.floor(Math.random() * 20)])),
        onAddChild: (parentTagId: string, tagName: string) => {
            console.log('Add child', parentTagId, tagName);
        },
        onRename: (tag: TagRecord, newName: string) => {
            console.log('Rename', tag.name, 'to', newName);
        },
        onDelete: (tag: TagRecord) => {
            console.log('Delete', tag.name);
        },
    },
};

// Story: Tags with no usage
export const TagsWithNoUsage: Story = {
    args: {
        tags: [camping, outdoor, kitchen],
        usageCounts: {
            camping: 0,
            outdoor: 0,
            kitchen: 0,
        },
        onAddChild: (parentTagId: string, tagName: string) => {
            console.log('Add child', parentTagId, tagName);
        },
        onRename: (tag: TagRecord, newName: string) => {
            console.log('Rename', tag.name, 'to', newName);
        },
        onDelete: (tag: TagRecord) => {
            console.log('Delete', tag.name);
        },
    },
};

// Story: With detached tags utility
export const WithDetachedTagsUtility: Story = {
    args: {
        tags: [camping, outdoor, kitchen],
        usageCounts: {
            camping: 5,
            outdoor: 3,
            kitchen: 8,
        },
        onAddChild: (parentTagId: string, tagName: string) => {
            console.log('Add child', parentTagId, tagName);
        },
        onRename: (tag: TagRecord, newName: string) => {
            console.log('Rename', tag.name, 'to', newName);
        },
        onDelete: (tag: TagRecord) => {
            console.log('Delete', tag.name);
        },
        detachedTags: {
            detachedTagIds: ['orphan1', 'orphan2'],
            isUpdating: false,
            isRemoving: false,
            removedCount: 0,
            lastUpdated: new Date('2024-10-29T12:00:00'),
            onCheck: () => {
                console.log('Check detached tags');
            },
            onRemoveAll: () => {
                console.log('Remove all detached tags');
            },
        },
    },
};

// Story: With tags without path
const tagWithoutPath: TagRecord = {
    _id: 'broken-tag',
    name: 'Broken Tag',
    parentTagId: '',
    path: [], // Missing proper path
    createdAt: new Date('2024-01-01'),
    modifiedAt: new Date('2024-01-01'),
};

export const WithTagsWithoutPath: Story = {
    args: {
        tags: [camping, outdoor, tagWithoutPath],
        usageCounts: {
            camping: 5,
            outdoor: 3,
            'broken-tag': 2,
        },
        onAddChild: (parentTagId: string, tagName: string) => {
            console.log('Add child', parentTagId, tagName);
        },
        onRename: (tag: TagRecord, newName: string) => {
            console.log('Rename', tag.name, 'to', newName);
        },
        onDelete: (tag: TagRecord) => {
            console.log('Delete', tag.name);
        },
        tagsWithoutPath: [tagWithoutPath],
    },
};

// Story: Fully interactive demo
export const FullyInteractive: Story = {
    render: () => {
        const [tags, setTags] = useState<TagRecord[]>([camping, outdoor, kitchen, tent, sleepingBag, cookware]);
        const [usageCounts, setUsageCounts] = useState<Record<string, number>>({
            camping: 12,
            tent: 5,
            'sleeping-bag': 7,
            outdoor: 8,
            kitchen: 15,
            cookware: 10,
        });

        const handleAddChild = (parentTagId: string, tagName: string): void => {
            const newTagId = `new-${Date.now()}`;
            const parentTag = tags.find((t) => t._id === parentTagId);
            const newTag: TagRecord = {
                _id: newTagId,
                name: tagName,
                parentTagId,
                path: parentTag
                    ? [...parentTag.path, { _id: newTagId, name: tagName }]
                    : [{ _id: newTagId, name: tagName }],
                createdAt: new Date(),
                modifiedAt: new Date(),
            };
            setTags([...tags, newTag]);
            setUsageCounts({ ...usageCounts, [newTagId]: 0 });
            console.log('Created tag:', tagName);
        };

        const handleRename = (tag: TagRecord, newName: string): void => {
            setTags(
                tags.map((t) =>
                    t._id === tag._id
                        ? {
                              ...t,
                              name: newName,
                              path: t.path.map((p) => (p._id === tag._id ? { ...p, name: newName } : p)),
                          }
                        : t
                )
            );
            console.log('Renamed tag:', tag.name, 'to', newName);
        };

        const handleDelete = (tag: TagRecord): void => {
            setTags(tags.filter((t) => t._id !== tag._id));
            const newCounts = { ...usageCounts };
            delete newCounts[tag._id];
            setUsageCounts(newCounts);
            console.log('Deleted tag:', tag.name);
        };

        return (
            <AllTagsViewPresentation
                tags={tags}
                usageCounts={usageCounts}
                onAddChild={handleAddChild}
                onRename={handleRename}
                onDelete={handleDelete}
            />
        );
    },
};
