/**
 * Mock-only Storybook proof of the direct-selection Search tag picker.
 * No Meteor client, inventory API, URL state, or live data is used here.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';

import { TriStateTagToggle, type TagFilterState } from './TriStateTagToggle';
import './DirectSelectionTagPicker.css';

interface Tag {
    id: string;
    name: string;
    parentId?: string;
    path: string[];
    group?: boolean;
}
type OpenMenu = 'tags' | 'type' | null;
type ItemType = 'Any' | 'Items' | 'Containers';
type TagState = TagFilterState;
interface Props {
    initialOpen?: OpenMenu;
    initialIncluded?: string[];
    initialExcluded?: string[];
    initialSearch?: string;
    initialSelectedOnly?: boolean;
    initialType?: ItemType;
}

const tags: Tag[] = [
    { id: 'workflow', name: 'Workflow', path: ['Workflow'], group: true },
    { id: 'sorting', name: 'Needs sorting', parentId: 'workflow', path: ['Workflow', 'Needs sorting'] },
    {
        id: 'location',
        name: 'Needs location detail',
        parentId: 'workflow',
        path: ['Workflow', 'Needs location detail'],
    },
    { id: 'repair', name: 'Needs repair', parentId: 'workflow', path: ['Workflow', 'Needs repair'] },
    { id: 'handling', name: 'Handling', path: ['Handling'], group: true },
    { id: 'fragile', name: 'Fragile', parentId: 'handling', path: ['Handling', 'Fragile'] },
    { id: 'heavy', name: 'Heavy', parentId: 'handling', path: ['Handling', 'Heavy'] },
    { id: 'equipment', name: 'Equipment', path: ['Equipment'], group: true },
    { id: 'camera', name: 'Camera', parentId: 'equipment', path: ['Equipment', 'Camera'], group: true },
    { id: 'lens', name: 'Lens', parentId: 'camera', path: ['Equipment', 'Camera', 'Lens'] },
    { id: 'battery', name: 'Battery', parentId: 'camera', path: ['Equipment', 'Camera', 'Battery'] },
    { id: 'hardware', name: 'Hardware', parentId: 'equipment', path: ['Equipment', 'Hardware'], group: true },
    ...Array.from(
        { length: 28 },
        (_, index): Tag => ({
            id: 'fastener-' + (index + 1),
            name: 'Fastener ' + String(index + 1).padStart(2, '0'),
            parentId: 'hardware',
            path: ['Equipment', 'Hardware', 'Fastener ' + String(index + 1).padStart(2, '0')],
        })
    ),
];
const items = [
    { name: 'Unsorted box', tags: ['sorting'], type: 'Containers' },
    { name: 'Unknown shelf', tags: ['location'], type: 'Containers' },
    { name: 'Both tasks', tags: ['sorting', 'location'], type: 'Items' },
    { name: 'Fragile camera', tags: ['sorting', 'fragile'], type: 'Items' },
    { name: 'Spare lens', tags: ['lens'], type: 'Items' },
    { name: 'Hardware pack', tags: ['fastener-1'], type: 'Items' },
];
const nameFor = (id: string): string => tags.find((tag) => tag.id === id)?.name ?? id;

const DirectSelectionTagPicker = ({
    initialOpen = 'tags',
    initialIncluded = [],
    initialExcluded = [],
    initialSearch = '',
    initialSelectedOnly = false,
    initialType = 'Any',
}: Props): React.ReactElement => {
    const [open, setOpen] = useState<OpenMenu>(initialOpen);
    const [included, setIncluded] = useState(initialIncluded);
    const [excluded, setExcluded] = useState(initialExcluded);
    const [search, setSearch] = useState(initialSearch);
    const [selectedOnly, setSelectedOnly] = useState(initialSelectedOnly);
    const [expanded, setExpanded] = useState(['workflow', 'handling', 'equipment', 'camera']);
    const [filterExpanded, setFilterExpanded] = useState(tags.filter((tag) => tag.group).map((tag) => tag.id));
    const [itemType, setItemType] = useState<ItemType>(initialType);
    const tagsTrigger = useRef<HTMLButtonElement>(null);
    const typeTrigger = useRef<HTMLButtonElement>(null);
    const selectedToggle = useRef<HTMLButtonElement>(null);
    const rowRefs = useRef(new Map<string, HTMLDivElement>());
    const pendingFocus = useRef<string | null>(null);
    const selectedCount = included.length + excluded.length;
    const leafTags = tags.filter((tag) => !tag.group);
    const query = search.trim().toLocaleLowerCase();
    const visibleLeaves = leafTags.filter(
        (tag) =>
            (!selectedOnly || included.includes(tag.id) || excluded.includes(tag.id)) &&
            tag.path.join(' / ').toLocaleLowerCase().includes(query)
    );
    const filtering = selectedOnly || query !== '';
    const isVisibleDescendant = (groupId: string): boolean =>
        visibleLeaves.some((leaf) => {
            let parentId = leaf.parentId;
            while (parentId) {
                if (parentId === groupId) return true;
                parentId = tags.find((tag) => tag.id === parentId)?.parentId;
            }
            return false;
        });
    const setTagState = (id: string, state: TagState): void => {
        if (selectedOnly && state === 'neutral') {
            const index = visibleLeaves.findIndex((tag) => tag.id === id);
            pendingFocus.current =
                visibleLeaves.at(index + 1)?.id ??
                (index > 0 ? visibleLeaves.at(index - 1)?.id : undefined) ??
                'selected-toggle';
        }
        setIncluded((values) =>
            state === 'include'
                ? values.includes(id)
                    ? values
                    : [...values, id]
                : values.filter((entry) => entry !== id)
        );
        setExcluded((values) =>
            state === 'exclude'
                ? values.includes(id)
                    ? values
                    : [...values, id]
                : values.filter((entry) => entry !== id)
        );
    };
    useEffect(() => {
        if (!pendingFocus.current) return;
        const target = pendingFocus.current;
        pendingFocus.current = null;
        if (target === 'selected-toggle') selectedToggle.current?.focus();
        else
            (
                rowRefs.current.get(target)?.querySelector<HTMLInputElement>('input:checked') ?? selectedToggle.current
            )?.focus();
    }, [included, excluded, selectedOnly, search]);
    const filteredItems = items.filter(
        (item) =>
            (included.length === 0 || included.some((id) => item.tags.includes(id))) &&
            excluded.every((id) => !item.tags.includes(id)) &&
            (itemType === 'Any' || item.type === itemType)
    );
    const leafRow = (tag: Tag, depth: number): React.ReactElement => {
        const state: TagState = included.includes(tag.id)
            ? 'include'
            : excluded.includes(tag.id)
            ? 'exclude'
            : 'neutral';
        const status = state === 'include' ? 'Included' : state === 'exclude' ? 'Excluded' : '';
        return (
            <div
                className="direct-tag-row"
                key={tag.id}
                style={{ paddingLeft: 8 + depth * 12 }}
                ref={(element) => {
                    if (element) rowRefs.current.set(tag.id, element);
                    else rowRefs.current.delete(tag.id);
                }}
            >
                <span className="direct-tag-text">
                    <span className="direct-tag-name" title={tag.name}>
                        {tag.name}
                    </span>
                    <small title={tag.path.join(' / ')}>
                        {tag.path.slice(0, -1).join(' / ')}
                        {status && <em className={'direct-tag-status ' + status.toLowerCase()}> · {status}</em>}
                    </small>
                </span>
                <TriStateTagToggle
                    name={tag.name}
                    state={state}
                    onChange={(position) => {
                        setTagState(tag.id, position);
                    }}
                />
            </div>
        );
    };
    const tree = (parentId: string | undefined, depth: number): React.ReactElement[] =>
        tags
            .filter(
                (tag) =>
                    tag.parentId === parentId &&
                    (tag.group ? !filtering || isVisibleDescendant(tag.id) : visibleLeaves.includes(tag))
            )
            .map((tag) =>
                tag.group ? (
                    <div key={tag.id}>
                        <button
                            type="button"
                            className="direct-group"
                            style={{ paddingLeft: 10 + depth * 12 }}
                            aria-expanded={(filtering ? filterExpanded : expanded).includes(tag.id)}
                            onClick={() => {
                                const update = filtering ? setFilterExpanded : setExpanded;
                                update((values) =>
                                    values.includes(tag.id)
                                        ? values.filter((entry) => entry !== tag.id)
                                        : [...values, tag.id]
                                );
                            }}
                        >
                            <span aria-hidden="true">
                                {(filtering ? filterExpanded : expanded).includes(tag.id) ? '▾' : '▸'}
                            </span>{' '}
                            {tag.name}
                        </button>
                        {(filtering ? filterExpanded : expanded).includes(tag.id) && tree(tag.id, depth + 1)}
                    </div>
                ) : (
                    leafRow(tag, depth)
                )
            );
    const showSelected = (): void => {
        setSelectedOnly(true);
        setOpen('tags');
    };
    const closeMenu = (): void => {
        setOpen(null);
    };

    return (
        <div
            className="direct-shell"
            data-testid="direct-selection-proof"
            onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                if (open) {
                    const trigger = open === 'tags' ? tagsTrigger : typeTrigger;
                    closeMenu();
                    trigger.current?.focus();
                }
            }}
        >
            <header className="direct-banner">
                <button type="button" className="direct-banner-button" aria-label="Exit search">
                    ‹
                </button>
                <button type="button" className="direct-banner-button">
                    All Items ▾
                </button>
                <input className="direct-query" aria-label="Search query" placeholder="Search items…" />
                <div className="direct-anchor">
                    <button
                        type="button"
                        ref={tagsTrigger}
                        className="direct-banner-button"
                        aria-label={'Tags: ' + selectedCount + ' selected'}
                        aria-expanded={open === 'tags'}
                        onClick={() => {
                            setOpen(open === 'tags' ? null : 'tags');
                        }}
                    >
                        Tags{selectedCount > 0 ? ' · ' + selectedCount : ''} ▾
                    </button>
                    {open === 'tags' && (
                        <div className="direct-panel" role="dialog" aria-label="Tag filters">
                            <div className="direct-panel-header">
                                <div className="direct-title-row">
                                    <h2>
                                        Tags <span>{selectedCount > 0 ? selectedCount + ' selected' : ''}</span>
                                    </h2>
                                    <button
                                        type="button"
                                        ref={selectedToggle}
                                        className="direct-view-toggle"
                                        role="switch"
                                        aria-checked={selectedOnly}
                                        onClick={() => {
                                            setSelectedOnly(!selectedOnly);
                                        }}
                                    >
                                        Show selected only · {selectedCount}
                                        <span className="direct-binary-track" aria-hidden="true">
                                            <span className="direct-binary-thumb" />
                                        </span>
                                        <span className="direct-binary-label" aria-hidden="true">
                                            {selectedOnly ? 'On' : 'Off'}
                                        </span>
                                    </button>
                                </div>
                                <input
                                    className="direct-tag-search"
                                    aria-label="Find a tag"
                                    placeholder="Find a tag"
                                    value={search}
                                    onChange={(event) => {
                                        setSearch(event.target.value);
                                    }}
                                />
                            </div>
                            <div className="direct-catalog" aria-label="Tag catalog">
                                {visibleLeaves.length > 0 ? (
                                    tree(undefined, 0)
                                ) : (
                                    <div className="direct-empty">
                                        <p>
                                            {selectedOnly
                                                ? query === ''
                                                    ? 'No selected tags.'
                                                    : 'No selected tags match.'
                                                : 'No matching tags.'}
                                        </p>
                                        {query !== '' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearch('');
                                                }}
                                            >
                                                Clear tag search
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="direct-anchor">
                    <button
                        type="button"
                        ref={typeTrigger}
                        className="direct-banner-button"
                        aria-label={'Type: ' + itemType}
                        aria-expanded={open === 'type'}
                        onClick={() => {
                            setOpen(open === 'type' ? null : 'type');
                        }}
                    >
                        Type: {itemType} ▾
                    </button>
                    {open === 'type' && (
                        <div className="direct-type-panel" role="dialog" aria-label="Type filter">
                            <strong>Type</strong>
                            {(['Any', 'Items', 'Containers'] as const).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={itemType === value}
                                    onClick={() => {
                                        setItemType(value);
                                    }}
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>
            {(selectedCount > 0 || itemType !== 'Any') && (
                <div className="direct-applied" aria-label="Applied filters">
                    {selectedCount > 3 ? (
                        <>
                            <span>
                                {included.length} included · {excluded.length} excluded
                            </span>
                            <button type="button" onClick={showSelected}>
                                Review selected
                            </button>
                        </>
                    ) : (
                        <>
                            {included.length > 0 && <span>Tags:</span>}
                            {included.map((id, index) => (
                                <React.Fragment key={'in-' + id}>
                                    {index > 0 && <span>or</span>}
                                    <button
                                        type="button"
                                        aria-label={'Remove included ' + nameFor(id)}
                                        onClick={() => {
                                            setTagState(id, 'neutral');
                                        }}
                                    >
                                        {nameFor(id)} ×
                                    </button>
                                </React.Fragment>
                            ))}
                            {excluded.length > 0 && <span>Not:</span>}
                            {excluded.map((id) => (
                                <button
                                    key={'out-' + id}
                                    type="button"
                                    aria-label={'Remove excluded ' + nameFor(id)}
                                    onClick={() => {
                                        setTagState(id, 'neutral');
                                    }}
                                >
                                    {nameFor(id)} ×
                                </button>
                            ))}
                        </>
                    )}
                    {itemType !== 'Any' && (
                        <button
                            type="button"
                            onClick={() => {
                                setItemType('Any');
                            }}
                        >
                            Type: {itemType} ×
                        </button>
                    )}
                </div>
            )}
            <main className="direct-results">
                <strong>{filteredItems.length} mock results</strong>
                <small>Local example tags and items only.</small>
                {filteredItems.map((item) => (
                    <p key={item.name}>{item.name}</p>
                ))}
            </main>
        </div>
    );
};

const meta = {
    title: 'Prototypes/Direct-selection Tag Picker',
    component: DirectSelectionTagPicker,
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
} satisfies Meta<typeof DirectSelectionTagPicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Browse: Story = { args: {} };
export const OneSelected: Story = { args: { initialIncluded: ['sorting'] } };
export const TwoSelected: Story = { args: { initialIncluded: ['sorting', 'location'] } };
export const Excluded: Story = {
    args: { initialIncluded: ['sorting', 'location'], initialExcluded: ['fragile'], initialSearch: 'fragile' },
};
export const SixteenSelected: Story = {
    args: {
        initialIncluded: Array.from({ length: 16 }, (_, index) => 'fastener-' + (index + 1)),
        initialSearch: 'hardware',
    },
};
export const ReviewSelected: Story = {
    args: {
        initialIncluded: Array.from({ length: 16 }, (_, index) => 'fastener-' + (index + 1)),
        initialSelectedOnly: true,
    },
};
export const SelectedSearch: Story = {
    args: {
        initialIncluded: ['sorting', 'location'],
        initialExcluded: ['fragile'],
        initialSelectedOnly: true,
        initialSearch: 'fragile',
    },
};
export const SelectedEmpty: Story = {
    args: { initialIncluded: ['sorting'], initialSelectedOnly: true, initialSearch: 'lens' },
};
export const PathSearch: Story = { args: { initialSearch: 'lens' } };
export const TypeOpen: Story = { args: { initialOpen: 'type', initialType: 'Items' } };
