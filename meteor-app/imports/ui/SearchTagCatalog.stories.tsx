/** Real-size grouped catalog proof for the same component used by Search mode. */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import type TagRecord from '/imports/model/TagRecord';

import { SearchTagCatalog } from './SearchTagCatalog';
import type { TagFilterState } from './TriStateTagToggle';

type Tag = Pick<TagRecord, '_id' | 'name' | 'parentTagId' | 'path'>;
const group = (id: string, name: string): Tag => ({
    _id: id,
    name,
    parentTagId: '',
    path: [{ _id: id, name }],
});
const child = (parent: Tag, id: string, name: string): Tag => ({
    _id: id,
    name,
    parentTagId: parent._id,
    path: [...parent.path, { _id: id, name }],
});
const workflow = group('workflow', 'Workflow');
const equipment = group('equipment', 'Equipment');
const tags: Tag[] = [
    workflow,
    child(workflow, 'sorting', 'Needs sorting'),
    child(workflow, 'repair', 'Needs repair'),
    equipment,
    child(equipment, 'camera', 'Camera equipment'),
    ...Array.from({ length: 16 }, (_, index) => child(equipment, `part-${index}`, `Hardware part ${index + 1}`)),
];

const Example = ({ selectedOnly = false }: { selectedOnly?: boolean }): React.ReactElement => {
    const [selected, setSelected] = useState<Record<string, TagFilterState>>({ sorting: 'include', repair: 'exclude' });
    return (
        <div
            style={{
                width: 390,
                maxWidth: '100%',
                height: 560,
                border: '1px solid #d9e3ed',
                borderRadius: 12,
                background: '#fff',
                font: '14px system-ui',
            }}
        >
            <SearchTagCatalog
                tags={tags}
                selected={selected}
                initialSelectedOnly={selectedOnly}
                onChange={(id, state) => {
                    setSelected((current) => ({ ...current, [id]: state }));
                }}
            />
        </div>
    );
};

const meta = {
    title: 'UI/SearchTagCatalog',
    component: Example,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Full: Story = { args: {} };
export const SelectedOnly: Story = { args: { selectedOnly: true } };
