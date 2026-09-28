/**
 * Storybook-only proof of the task-based inventory Search filters.
 * All catalog, results, and interactions are local mock state; this never calls Meteor.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

type Match = 'any' | 'all';
type SelectionMode = 'include' | 'exclude';
type Menu = 'tags' | 'type' | null;
interface Tag {
    id: string;
    name: string;
    parentId?: string;
    path: string[];
    group?: boolean;
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
            id: `fastener-${index + 1}`,
            name: `Fastener ${String(index + 1).padStart(2, '0')}`,
            parentId: 'hardware',
            path: ['Equipment', 'Hardware', `Fastener ${String(index + 1).padStart(2, '0')}`],
        })
    ),
];
const exampleItems = [
    { name: 'Unsorted box', tags: ['sorting'], type: 'Containers' },
    { name: 'Unknown shelf', tags: ['location'], type: 'Containers' },
    { name: 'Both tasks', tags: ['sorting', 'location'], type: 'Items' },
    { name: 'Fragile camera', tags: ['sorting', 'fragile'], type: 'Items' },
    { name: 'Spare lens', tags: ['lens'], type: 'Items' },
    { name: 'Hardware pack', tags: ['fastener-1'], type: 'Items' },
];

const Shell = styled.div`
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fff;
    font: 14px system-ui, sans-serif;
    color: #232b36;
    button, input { font: inherit; }
`;
const Banner = styled.header`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #0875ef;
    color: #fff;
    flex: none;
`;
const BannerButton = styled.button`
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid rgb(255 255 255 / 75%);
    border-radius: 7px;
    background: rgb(255 255 255 / 12%);
    color: #fff;
    cursor: pointer;
    white-space: nowrap;
    &:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
`;
const Query = styled.input`
    min-width: 160px;
    flex: 1;
    height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 7px;
    background: #fff;
    color: #1e2833;
`;
const Anchor = styled.div`
    position: relative;
    flex: none;
`;
const Panel = styled.div`
    position: absolute;
    box-sizing: border-box;
    top: calc(100% + 8px);
    right: 0;
    z-index: 5;
    width: min(420px, calc(100vw - 24px));
    max-height: min(66vh, 520px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #d4dce8;
    border-radius: 10px;
    background: #fff;
    color: #232b36;
    box-shadow: 0 10px 26px rgb(0 0 0 / 24%);
`;
const PanelHeader = styled.div`
    flex: none;
    padding: 12px;
    border-bottom: 1px solid #e1e6ee;
`;
const PanelTitle = styled.h2`
    margin: 0 0 7px;
    font-size: 16px;
`;
const Help = styled.p`
    margin: 4px 0 8px;
    color: #526174;
    line-height: 1.35;
    font-size: 12px;
`;
const Controls = styled.div`
    display: flex;
    gap: 6px;
    margin: 6px 0;
`;
const ModeButton = styled.button<{ $active: boolean }>`
    min-height: 36px;
    padding: 0 11px;
    border: 1px solid ${(p) => (p.$active ? '#1169d2' : '#b8c4d2')};
    border-radius: 6px;
    background: ${(p) => (p.$active ? '#e9f2ff' : '#fff')};
    color: #17293d;
    font-weight: ${(p) => (p.$active ? 700 : 400)};
    cursor: pointer;
`;
const SearchBox = styled.div`
    display: flex;
    gap: 6px;
    input { min-width: 0; flex: 1; height: 36px; padding: 0 9px; border: 1px solid #9aaabe; border-radius: 6px; }
    button { min-width: 44px; border: 0; background: transparent; cursor: pointer; }
`;
const Catalog = styled.div`
    min-height: 0;
    overflow-y: auto;
    padding: 8px 12px 12px;
    overscroll-behavior: contain;
`;
const GroupButton = styled.button`
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 40px;
    padding: 0 6px;
    border: 0;
    background: #edf2f7;
    color: #26384d;
    text-align: left;
    font-weight: 700;
    cursor: pointer;
`;
const TagRow = styled.label<{ $level: number; $disabled: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 4px 6px 4px ${(p) => String(10 + p.$level * 13)}px;
    opacity: ${(p) => (p.$disabled ? 0.58 : 1)};
    cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
    &:hover { background: #f2f6fc; }
    input { width: 18px; height: 18px; }
`;
const Path = styled.small`
    display: block;
    color: #66768a;
    line-height: 1.3;
`;
const Selected = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: center;
`;
const SelectedChip = styled.button`
    min-height: 31px;
    padding: 3px 7px;
    border: 1px solid #a9c5eb;
    border-radius: 6px;
    background: #f2f7ff;
    color: #174c8e;
    cursor: pointer;
`;
const Applied = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
    min-height: 43px;
    padding: 5px 16px;
    overflow: hidden;
    border-bottom: 1px solid #e6e9ee;
    white-space: nowrap;
    &.expanded { flex-wrap: wrap; max-height: 110px; overflow-y: auto; }
    button { flex: none; }
`;
const Body = styled.main`
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    padding: 18px 24px;
    color: #526174;
`;

interface PrototypeProps {
    initialOpen?: Menu;
    initialIncluded?: string[];
    initialExcluded?: string[];
    initialMatch?: Match;
    initialSearch?: string;
    initialSelectionMode?: SelectionMode;
    initialType?: 'Any' | 'Items' | 'Containers';
}

const SearchFilterPrototype = ({
    initialOpen = 'tags',
    initialIncluded = [],
    initialExcluded = [],
    initialMatch = 'any',
    initialSearch = '',
    initialSelectionMode = 'include',
    initialType = 'Any',
}: PrototypeProps): React.ReactElement => {
    const [open, setOpen] = useState<Menu>(initialOpen);
    const [included, setIncluded] = useState(initialIncluded);
    const [excluded, setExcluded] = useState(initialExcluded);
    const [match, setMatch] = useState<Match>(initialMatch);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>(initialSelectionMode);
    const [term, setTerm] = useState(initialSearch);
    const [expandedGroups, setExpandedGroups] = useState(['workflow', 'handling', 'equipment', 'camera']);
    const [itemType, setItemType] = useState(initialType);
    const [expandedSummary, setExpandedSummary] = useState(false);
    const tagsTrigger = useRef<HTMLButtonElement>(null);
    const typeTrigger = useRef<HTMLButtonElement>(null);
    const nameFor = (id: string): string => tags.find((tag) => tag.id === id)?.name ?? id;
    const removeTag = (id: string): void => {
        setIncluded((ids) => ids.filter((entry) => entry !== id));
        setExcluded((ids) => ids.filter((entry) => entry !== id));
    };
    const toggleTag = (id: string): void => {
        if (selectionMode === 'include') {
            if (excluded.includes(id)) return;
            setIncluded((ids) => (ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]));
        } else {
            if (included.includes(id)) return;
            setExcluded((ids) => (ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]));
        }
    };
    const matching = useMemo(() => {
        const query = term.trim().toLocaleLowerCase();
        return query === ''
            ? []
            : tags.filter((tag) => !tag.group && tag.path.join(' / ').toLocaleLowerCase().includes(query));
    }, [term]);
    const results = exampleItems.filter((item) => {
        const includedMatch =
            included.length === 0 ||
            (match === 'any'
                ? included.some((id) => item.tags.includes(id))
                : included.every((id) => item.tags.includes(id)));
        return (
            includedMatch &&
            excluded.every((id) => !item.tags.includes(id)) &&
            (itemType === 'Any' || item.type === itemType)
        );
    });
    const summary = [
        ...included.map((id) => ({
            id,
            label: `${match === 'any' ? 'Has any' : 'Has all'}: ${nameFor(id)}`,
            remove: () => {
                removeTag(id);
            },
        })),
        ...excluded.map((id) => ({
            id,
            label: `Does not have: ${nameFor(id)}`,
            remove: () => {
                removeTag(id);
            },
        })),
        ...(itemType === 'Any'
            ? []
            : [
                  {
                      id: 'type',
                      label: `Type: ${itemType}`,
                      remove: () => {
                          setItemType('Any');
                      },
                  },
              ]),
    ];
    const visibleSummary = expandedSummary ? summary : summary.slice(0, 2);
    const toggleGroup = (id: string): void => {
        setExpandedGroups((groups) => (groups.includes(id) ? groups.filter((group) => group !== id) : [...groups, id]));
    };
    const tagRow = (tag: Tag, level: number): React.ReactElement => {
        const opposite = selectionMode === 'include' ? excluded.includes(tag.id) : included.includes(tag.id);
        const selected = selectionMode === 'include' ? included.includes(tag.id) : excluded.includes(tag.id);
        return (
            <TagRow key={tag.id} $level={level} $disabled={opposite}>
                <input
                    type="checkbox"
                    checked={selected}
                    disabled={opposite}
                    onChange={() => {
                        toggleTag(tag.id);
                    }}
                    aria-label={`${selectionMode === 'include' ? 'Include' : 'Exclude'} ${tag.name}`}
                />
                <span>
                    {tag.name}
                    <Path>{tag.path.slice(0, -1).join(' / ')}</Path>
                </span>
                {opposite && <Path>Remove from {selectionMode === 'include' ? 'Does not have' : 'Has'} first</Path>}
            </TagRow>
        );
    };
    const tree = (parentId: string | undefined, level: number): React.ReactElement[] =>
        tags
            .filter((tag) => tag.parentId === parentId)
            .map((tag) =>
                tag.group ? (
                    <div key={tag.id}>
                        <GroupButton
                            type="button"
                            aria-expanded={expandedGroups.includes(tag.id)}
                            onClick={() => {
                                toggleGroup(tag.id);
                            }}
                            style={{ paddingLeft: 6 + level * 13 }}
                        >
                            {expandedGroups.includes(tag.id) ? '▾' : '▸'} {tag.name}
                        </GroupButton>
                        {expandedGroups.includes(tag.id) && tree(tag.id, level + 1)}
                    </div>
                ) : (
                    tagRow(tag, level)
                )
            );
    return (
        <Shell
            data-testid="search-filter-prototype"
            onKeyDown={(event) => {
                if (event.key !== 'Escape' || open === null) return;
                setOpen(null);
                (open === 'tags' ? tagsTrigger : typeTrigger).current?.focus();
            }}
        >
            <Banner>
                <BannerButton type="button" aria-label="Exit search">
                    ‹
                </BannerButton>
                <BannerButton type="button">All Items ▾</BannerButton>
                <Query aria-label="Search query" placeholder="Search items…" />
                <Anchor>
                    <BannerButton
                        ref={tagsTrigger}
                        type="button"
                        aria-label={`Tags: ${included.length + excluded.length} selected`}
                        aria-expanded={open === 'tags'}
                        onClick={() => {
                            setOpen(open === 'tags' ? null : 'tags');
                        }}
                    >
                        Tags{included.length + excluded.length > 0 ? ` · ${included.length + excluded.length}` : ''} ▾
                    </BannerButton>
                    {open === 'tags' && (
                        <Panel
                            role="dialog"
                            aria-label="Tag filters"
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setOpen(null);
                                    tagsTrigger.current?.focus();
                                }
                            }}
                        >
                            <PanelHeader>
                                <PanelTitle>Tags</PanelTitle>
                                <Help>
                                    Choose tags without closing this panel. Groups organize tags; they do not select
                                    their children.
                                </Help>
                                <Controls role="group" aria-label="Included tags match">
                                    <ModeButton
                                        type="button"
                                        $active={match === 'any'}
                                        aria-pressed={match === 'any'}
                                        onClick={() => {
                                            setMatch('any');
                                        }}
                                    >
                                        Has any
                                    </ModeButton>
                                    <ModeButton
                                        type="button"
                                        $active={match === 'all'}
                                        aria-pressed={match === 'all'}
                                        onClick={() => {
                                            setMatch('all');
                                        }}
                                    >
                                        Has all
                                    </ModeButton>
                                </Controls>
                                <Help>
                                    {match === 'any' ? 'Match at least one included tag.' : 'Match every included tag.'}{' '}
                                    Excluded tags must be absent.
                                </Help>
                                {(included.length > 0 || excluded.length > 0) && (
                                    <Selected aria-label="Current rule">
                                        {included.map((id) => (
                                            <SelectedChip
                                                key={`in-${id}`}
                                                type="button"
                                                onClick={() => {
                                                    removeTag(id);
                                                }}
                                                aria-label={`Remove ${nameFor(id)} from included tags`}
                                            >
                                                {match === 'any' ? 'Has any' : 'Has all'}: {nameFor(id)} ×
                                            </SelectedChip>
                                        ))}
                                        {excluded.map((id) => (
                                            <SelectedChip
                                                key={`out-${id}`}
                                                type="button"
                                                onClick={() => {
                                                    removeTag(id);
                                                }}
                                                aria-label={`Remove ${nameFor(id)} from excluded tags`}
                                            >
                                                Does not have: {nameFor(id)} ×
                                            </SelectedChip>
                                        ))}
                                    </Selected>
                                )}
                                <Controls role="group" aria-label="Choose tag mode">
                                    <ModeButton
                                        type="button"
                                        $active={selectionMode === 'include'}
                                        aria-pressed={selectionMode === 'include'}
                                        onClick={() => {
                                            setSelectionMode('include');
                                        }}
                                    >
                                        Include
                                    </ModeButton>
                                    <ModeButton
                                        type="button"
                                        $active={selectionMode === 'exclude'}
                                        aria-pressed={selectionMode === 'exclude'}
                                        onClick={() => {
                                            setSelectionMode('exclude');
                                        }}
                                    >
                                        Exclude
                                    </ModeButton>
                                </Controls>
                                <SearchBox>
                                    <input
                                        aria-label="Find a tag"
                                        placeholder="Find a tag or path"
                                        value={term}
                                        onChange={(event) => {
                                            setTerm(event.target.value);
                                        }}
                                    />
                                    {term !== '' && (
                                        <button
                                            type="button"
                                            aria-label="Clear tag search"
                                            onClick={() => {
                                                setTerm('');
                                            }}
                                        >
                                            ×
                                        </button>
                                    )}
                                </SearchBox>
                            </PanelHeader>
                            <Catalog aria-label="Tag catalog">
                                {term.trim() === '' ? (
                                    tree(undefined, 0)
                                ) : matching.length > 0 ? (
                                    matching.map((tag) => tagRow(tag, 0))
                                ) : (
                                    <p>No matching tags.</p>
                                )}
                            </Catalog>
                        </Panel>
                    )}
                </Anchor>
                <Anchor>
                    <BannerButton
                        ref={typeTrigger}
                        type="button"
                        aria-label={`Type: ${itemType}`}
                        aria-expanded={open === 'type'}
                        onClick={() => {
                            setOpen(open === 'type' ? null : 'type');
                        }}
                    >
                        Type: {itemType} ▾
                    </BannerButton>
                    {open === 'type' && (
                        <Panel
                            role="dialog"
                            aria-label="Type filter"
                            style={{ width: 196 }}
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    setOpen(null);
                                    typeTrigger.current?.focus();
                                }
                            }}
                        >
                            <PanelHeader>
                                <PanelTitle>Type</PanelTitle>
                                {(['Any', 'Items', 'Containers'] as const).map((choice) => (
                                    <ModeButton
                                        key={choice}
                                        type="button"
                                        $active={itemType === choice}
                                        aria-pressed={itemType === choice}
                                        onClick={() => {
                                            setItemType(choice);
                                        }}
                                        style={{ display: 'block', width: '100%', marginTop: 5, textAlign: 'left' }}
                                    >
                                        {choice}
                                    </ModeButton>
                                ))}
                            </PanelHeader>
                        </Panel>
                    )}
                </Anchor>
            </Banner>
            {summary.length > 0 && (
                <Applied className={expandedSummary ? 'expanded' : ''} aria-label="Applied filters">
                    {visibleSummary.map((chip) => (
                        <SelectedChip
                            key={chip.id}
                            type="button"
                            onClick={chip.remove}
                            aria-label={`Remove ${chip.label}`}
                        >
                            {chip.label} ×
                        </SelectedChip>
                    ))}
                    {summary.length > 2 && (
                        <ModeButton
                            type="button"
                            $active={expandedSummary}
                            onClick={() => {
                                setExpandedSummary(!expandedSummary);
                            }}
                        >
                            {expandedSummary ? 'Show less' : `Show all filters (${summary.length})`}
                        </ModeButton>
                    )}
                </Applied>
            )}
            <Body>
                <strong>{results.length} mock results</strong>
                <Help>This Storybook proof uses local example tags and items only.</Help>
                {results.map((item) => (
                    <p key={item.name}>{item.name}</p>
                ))}
            </Body>
        </Shell>
    );
};

const meta = {
    title: 'Prototypes/Task-based Search Filters',
    component: SearchFilterPrototype,
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
} satisfies Meta<typeof SearchFilterPrototype>;
export default meta;
type Story = StoryObj<typeof meta>;
export const OpenTagsDesktop: Story = { args: { initialOpen: 'tags' } };
export const OpenTagsIPad: Story = { args: { initialOpen: 'tags', initialIncluded: ['sorting', 'location'] } };
export const OpenTypeIPad: Story = { args: { initialOpen: 'type', initialType: 'Items' } };
export const ExcludingFragile: Story = {
    args: {
        initialOpen: 'tags',
        initialIncluded: ['sorting', 'location'],
        initialExcluded: ['fragile'],
        initialSelectionMode: 'exclude',
        initialSearch: 'fragile',
    },
};
export const MatchAll: Story = {
    args: { initialOpen: 'tags', initialIncluded: ['sorting', 'location'], initialMatch: 'all' },
};
export const SearchByPath: Story = { args: { initialOpen: 'tags', initialSearch: 'hardware' } };
