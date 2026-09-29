/**
 * Storybook-only proof of a complete filter popover beside a mock result list.
 * Keeps filter interaction review independent of the Search banner and live app data.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';

import { TriStateTagToggle, type TagFilterState } from './TriStateTagToggle';
import './StandaloneFilterView.stories.css';

type ItemType = 'Any' | 'Items' | 'Containers';
interface Props {
    initialOpen?: boolean;
    initialType?: ItemType;
    initialTags?: Record<string, TagFilterState>;
    initialSelectedOnly?: boolean;
}

const tagGroups = [
    {
        name: 'Workflow',
        tags: [
            { id: 'sorting', name: 'Needs sorting' },
            { id: 'repair', name: 'Needs repair' },
        ],
    },
    {
        name: 'Handling',
        tags: [
            { id: 'fragile', name: 'Fragile' },
            { id: 'heavy', name: 'Heavy' },
        ],
    },
    {
        name: 'Equipment',
        tags: [
            { id: 'camera', name: 'Camera' },
            { id: 'hardware', name: 'Hardware' },
            { id: 'battery', name: 'Battery' },
        ],
    },
    {
        name: 'Household',
        tags: [
            { id: 'seasonal', name: 'Seasonal' },
            { id: 'spare', name: 'Spare' },
        ],
    },
];

const inventory = [
    { name: 'Unsorted parts box', type: 'Containers', tags: ['sorting', 'hardware'] },
    { name: 'Camera case', type: 'Containers', tags: ['camera', 'fragile'] },
    { name: 'Spare batteries', type: 'Items', tags: ['battery', 'spare'] },
    { name: 'Heavy toolbox', type: 'Containers', tags: ['heavy', 'hardware'] },
    { name: 'Lens', type: 'Items', tags: ['camera', 'fragile'] },
    { name: 'Winter blankets', type: 'Items', tags: ['seasonal'] },
    { name: 'Repair kit', type: 'Items', tags: ['repair', 'hardware'] },
    { name: 'Sorting tray', type: 'Items', tags: ['sorting'] },
];

const StandaloneFilterView = ({
    initialOpen = false,
    initialType = 'Any',
    initialTags = {},
    initialSelectedOnly = false,
}: Props): React.ReactElement => {
    const [open, setOpen] = useState(initialOpen);
    const [type, setType] = useState<ItemType>(initialType);
    const [tagStates, setTagStates] = useState<Record<string, TagFilterState>>(initialTags);
    const [find, setFind] = useState('');
    const [selectedOnly, setSelectedOnly] = useState(initialSelectedOnly);
    const anchor = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const selectedSwitch = useRef<HTMLInputElement>(null);
    const findInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent): void => {
            if (anchor.current && !anchor.current.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') return;
            setOpen(false);
            trigger.current?.focus();
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const activeTags = Object.entries(tagStates).filter(([, state]) => state !== 'neutral');
    const included = activeTags.filter(([, state]) => state === 'include').map(([id]) => id);
    const excluded = activeTags.filter(([, state]) => state === 'exclude').map(([id]) => id);
    const activeCount = activeTags.length + (type === 'Any' ? 0 : 1);
    const results = inventory.filter(
        (item) =>
            (type === 'Any' || item.type === type) &&
            (included.length === 0 || included.some((tag) => item.tags.includes(tag))) &&
            excluded.every((tag) => !item.tags.includes(tag))
    );
    const visibleGroups = tagGroups
        .map((group) => ({
            ...group,
            tags: group.tags.filter(
                (tag) =>
                    (!selectedOnly || (tagStates[tag.id] ?? 'neutral') !== 'neutral') &&
                    `${group.name} ${tag.name}`.toLocaleLowerCase().includes(find.trim().toLocaleLowerCase())
            ),
        }))
        .filter((group) => group.tags.length > 0);

    return (
        <main className="standalone-filter-demo">
            <div className="standalone-filter-layout">
                <div className="standalone-filter-actions" ref={anchor}>
                    <button
                        ref={trigger}
                        type="button"
                        className="standalone-filter-trigger"
                        aria-expanded={open}
                        aria-controls={open ? 'standalone-filter-panel' : undefined}
                        onClick={() => {
                            setOpen((value) => !value);
                        }}
                    >
                        Filters{activeCount > 0 ? ` · ${activeCount}` : ''}
                    </button>
                    {open && (
                        <div
                            className="standalone-filter-panel"
                            id="standalone-filter-panel"
                            role="dialog"
                            aria-label="Filter results"
                        >
                            <div className="standalone-filter-panel-head">
                                <h2>Filter results</h2>
                                <button
                                    type="button"
                                    className="standalone-filter-close"
                                    aria-label="Close filters"
                                    onClick={() => {
                                        setOpen(false);
                                        trigger.current?.focus();
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <fieldset className="standalone-filter-type">
                                <legend>Type</legend>
                                {(['Any', 'Items', 'Containers'] as const).map((option) => (
                                    <label key={option}>
                                        <input
                                            type="radio"
                                            name="standalone-filter-type"
                                            value={option}
                                            checked={type === option}
                                            onChange={() => {
                                                setType(option);
                                            }}
                                        />
                                        <span>{option}</span>
                                    </label>
                                ))}
                            </fieldset>
                            <div className="standalone-filter-tag-head">
                                <h3>Tags</h3>
                                <label className="standalone-filter-selected">
                                    <span>Selected tags only ({activeTags.length})</span>
                                    <input
                                        ref={selectedSwitch}
                                        type="checkbox"
                                        role="switch"
                                        checked={selectedOnly}
                                        disabled={activeTags.length === 0}
                                        onChange={(event) => {
                                            setSelectedOnly(event.target.checked);
                                        }}
                                    />
                                    <span className="standalone-filter-switch" aria-hidden="true" />
                                </label>
                            </div>
                            <input
                                ref={findInput}
                                className="standalone-filter-find"
                                aria-label="Find a tag"
                                placeholder="Find a tag"
                                value={find}
                                onChange={(event) => {
                                    setFind(event.target.value);
                                }}
                            />
                            <div className="standalone-filter-catalog" aria-label="Tag catalog">
                                {visibleGroups.length === 0 ? (
                                    <p className="standalone-filter-no-tags">
                                        {selectedOnly && find.trim() === '' ? 'No selected tags.' : 'No matching tags.'}
                                    </p>
                                ) : (
                                    visibleGroups.map((group) => (
                                        <section key={group.name} aria-label={group.name}>
                                            <h4>{group.name}</h4>
                                            {group.tags.map((tag) => (
                                                <div className="standalone-filter-tag-row" key={tag.id}>
                                                    <span>{tag.name}</span>
                                                    <TriStateTagToggle
                                                        name={tag.name}
                                                        state={tagStates[tag.id] ?? 'neutral'}
                                                        variant="compact"
                                                        onChange={(value) => {
                                                            setTagStates((states) => ({ ...states, [tag.id]: value }));
                                                            if (selectedOnly && value === 'neutral') {
                                                                const lastSelectedTag = activeTags.length === 1;
                                                                if (lastSelectedTag) setSelectedOnly(false);
                                                                requestAnimationFrame(() => {
                                                                    if (lastSelectedTag) findInput.current?.focus();
                                                                    else selectedSwitch.current?.focus();
                                                                });
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </section>
                                    ))
                                )}
                            </div>
                            <div className="standalone-filter-footer">
                                <span>{results.length} results</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setType('Any');
                                        setTagStates({});
                                        setSelectedOnly(false);
                                    }}
                                    disabled={activeCount === 0}
                                >
                                    Clear filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <section className="standalone-filter-results" aria-label="Results">
                    <div className="standalone-filter-results-head">
                        <h1>Results</h1>
                        <p role="status">{results.length} results</p>
                    </div>
                    {results.length === 0 ? (
                        <p className="standalone-filter-empty">No results match these filters.</p>
                    ) : (
                        <ul>
                            {results.map((item) => (
                                <li key={item.name}>
                                    <strong>{item.name}</strong>
                                    <span>{item.type.slice(0, -1)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
};

const meta = {
    title: 'Prototypes/Standalone Filter View',
    component: StandaloneFilterView,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'A Filter button and a results list are the whole scene. This isolates the filter-view workflow from the Search banner: Type and per-tag Include / Off / Exclude choices apply immediately to mock results. Included tags match any; excluded tags must be absent. Finding tags and Selected tags only narrow the catalog, not the results. The selected-only switch names its target and count, stays quiet and unavailable at zero, and returns to the full catalog if the last selected tag is cleared. The non-modal panel sits beside results when space allows, so filter effects stay visible; it stacks above results on narrow screens. Compact pills remain at real list density. Prototype only; no app route, saved search, or inventory data is changed.',
            },
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof StandaloneFilterView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = { args: {} };
export const Open: Story = { args: { initialOpen: true } };
export const Active: Story = {
    args: { initialOpen: true, initialType: 'Items', initialTags: { fragile: 'include', sorting: 'exclude' } },
};
export const SelectedOnly: Story = {
    args: { initialOpen: true, initialSelectedOnly: true, initialTags: { fragile: 'include', sorting: 'exclude' } },
};
