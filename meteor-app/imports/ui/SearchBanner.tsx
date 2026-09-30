/**
 * One-row Search-mode header that collapses controls by available width.
 * This component presents route-owned URL state without owning search requests.
 */
import { Close, FormPrevious, Search as SearchIcon } from 'grommet-icons';
import React, { type ReactElement, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import type { SearchFragment } from '/imports/model/SearchFragment';
import type TagRecord from '/imports/model/TagRecord';

import {
    getActiveFilterCount,
    getContradictoryTags,
    getLegacyFilters,
    getSelectedItemType,
    getSelectedTags,
    hasAllRequiredTagRule,
    type SearchItemType,
} from './searchFilterState';
import { SearchTagCatalog } from './SearchTagCatalog';
import type { TagFilterState } from './TriStateTagToggle';

type Menu = 'scope' | 'tags' | 'type' | 'filters' | 'all';
type Mode = 'roomy' | 'medium' | 'narrow';
const ROOMY_MIN_WIDTH = 620;
const MEDIUM_MIN_WIDTH = 460;

const Landmark = styled.section`
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
    width: 100%;
    min-width: 0;
`;
const ExitLink = styled.a`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 44px;
    height: 44px;
    color: white;
    border-radius: 8px;
    &:hover,
    &:focus-visible { background: rgb(255 255 255 / 20%); }
    &:focus-visible { outline: 2px solid white; outline-offset: 2px; }
`;
const Control = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex: 0 0 auto;
    max-width: 136px;
    min-width: 44px;
    height: 44px;
    padding: 0 9px;
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 62%);
    border-radius: 8px;
    background: rgb(255 255 255 / 14%);
    color: white;
    cursor: pointer;
    white-space: nowrap;
    font-weight: 600;
    &:hover,
    &[aria-expanded='true'] { background: rgb(255 255 255 / 28%); }
    &:focus-visible { outline: 2px solid white; outline-offset: 2px; }
    .label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
`;
const CompactControl = styled(Control)`
    flex: 0 0 76px;
    max-width: 76px;
    padding-inline: 5px;
`;
const QueryForm = styled.form`
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1 1 160px;
    min-width: 160px;
    height: 44px;
    padding-left: 10px;
    &.compact { padding-left: 4px; }
    background: white;
    border: 2px solid transparent;
    border-radius: 8px;
    color: #555;
    &:focus-within { border-color: #164d9c; outline: 2px solid white; }
`;
const QueryInput = styled.input`
    flex: 1 1 0;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 16px;
`;
const ClearButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 40px;
    height: 40px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #555;
    cursor: pointer;
    &:focus-visible { outline: 2px solid #164d9c; }
`;
const MenuPanel = styled.div`
    position: absolute;
    top: calc(100% + 8px);
    z-index: 50;
    display: flex;
    flex-direction: column;
    width: min(390px, 100%);
    max-height: min(70vh, 560px);
    overflow-y: auto;
    padding: 10px 0;
    border-radius: 10px;
    background: white;
    color: #222;
    box-shadow: 0 6px 24px rgb(0 0 0 / 28%);
    > section:not(.search-tag-catalog) { padding: 0 12px; }
`;
const SectionTitle = styled.h2`
    margin: 10px 0 6px;
    font-size: 14px;
`;
const Choice = styled.button`
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 44px;
    padding: 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #222;
    text-align: left;
    cursor: pointer;
    &:hover,
    &:focus-visible { background: #eaf2ff; }
    &:disabled { color: #777; cursor: not-allowed; }
`;
const HiddenHeading = styled.h1`
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
`;

interface SearchBannerProps {
    exitHref: string;
    exitLabel: string;
    query: string;
    onQueryChange: (query: string) => void;
    onSearch: (query: string) => void;
    scope: 'global' | 'scoped';
    scopeLabel: string;
    scopeAvailable: boolean;
    onScopeChange: (scope: 'global' | 'scoped') => void;
    fragments: SearchFragment[];
    availableTags: Array<Pick<TagRecord, '_id' | 'name' | 'parentTagId' | 'path'>>;
    onSetTagState: (tagId: string, state: TagFilterState) => void;
    onTypeChange: (type: SearchItemType) => void;
    onResetFilters: () => void;
}

export const SearchBanner = ({
    exitHref,
    exitLabel,
    query,
    onQueryChange,
    onSearch,
    scope,
    scopeLabel,
    scopeAvailable,
    onScopeChange,
    fragments,
    availableTags,
    onSetTagState,
    onTypeChange,
    onResetFilters,
}: SearchBannerProps): ReactElement => {
    const root = useRef<HTMLElement>(null);
    const trigger = useRef<HTMLButtonElement | null>(null);
    const composing = useRef(false);
    const [width, setWidth] = useState(0);
    const [openMenu, setOpenMenu] = useState<Menu | null>(null);
    const [draft, setDraft] = useState(query);
    const mode: Mode = width >= ROOMY_MIN_WIDTH ? 'roomy' : width >= MEDIUM_MIN_WIDTH ? 'medium' : 'narrow';
    const activeCount = getActiveFilterCount(fragments);
    const included = getSelectedTags(fragments, 'tagInclude');
    const excluded = getSelectedTags(fragments, 'tagExclude');
    const itemType = getSelectedItemType(fragments);
    const legacyFilters = getLegacyFilters(fragments);
    const combineFilters = mode === 'medium' || (mode === 'roomy' && legacyFilters.length > 0);
    const currentScope = scope === 'scoped' ? scopeLabel : 'All Items';
    const selectedTags: Record<string, TagFilterState> = {};
    included.forEach((id) => {
        selectedTags[id] = 'include';
    });
    excluded.forEach((id) => {
        selectedTags[id] = 'exclude';
    });

    useEffect(() => {
        setDraft(query);
    }, [query]);
    useEffect(() => {
        if (root.current === null) return;
        const observer = new ResizeObserver(([entry]) => {
            setWidth(entry.contentRect.width);
        });
        observer.observe(root.current);
        return () => {
            observer.disconnect();
        };
    }, []);
    useEffect(() => {
        if (openMenu === null) return;
        const onPointerDown = (event: PointerEvent): void => {
            if (root.current !== null && !root.current.contains(event.target as Node)) setOpenMenu(null);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [openMenu]);
    useEffect(() => {
        setOpenMenu(null);
    }, [mode]);

    const toggleMenu = (menu: Menu, event: React.MouseEvent<HTMLButtonElement>): void => {
        trigger.current = event.currentTarget;
        setOpenMenu(openMenu === menu ? null : menu);
    };
    const closeMenu = (): void => {
        setOpenMenu(null);
        trigger.current?.focus();
    };
    const showScope = openMenu === 'scope' || openMenu === 'all';
    const showTags = openMenu === 'tags' || openMenu === 'filters' || openMenu === 'all';
    const showType = openMenu === 'type' || openMenu === 'filters' || openMenu === 'all';

    return (
        <Landmark
            ref={root}
            role="search"
            aria-label="Inventory search"
            className="search-banner"
            onKeyDown={(event) => {
                if (event.key === 'Escape' && openMenu !== null) closeMenu();
            }}
        >
            <HiddenHeading>Search</HiddenHeading>
            <ExitLink href={exitHref} aria-label={exitLabel} title={exitLabel}>
                <FormPrevious aria-hidden="true" />
            </ExitLink>
            {mode !== 'narrow' && (
                <Control
                    type="button"
                    aria-label={`Scope: ${currentScope}`}
                    aria-expanded={openMenu === 'scope'}
                    onClick={(event) => {
                        toggleMenu('scope', event);
                    }}
                >
                    <span className="label">{currentScope}</span> ▾
                </Control>
            )}
            {mode === 'narrow' && (
                <CompactControl
                    type="button"
                    aria-label={`Scope: ${currentScope}; ${activeCount} active filter${activeCount === 1 ? '' : 's'}`}
                    aria-expanded={openMenu === 'all'}
                    onClick={(event) => {
                        toggleMenu('all', event);
                    }}
                >
                    <span className="label">{currentScope}</span>
                    {activeCount > 0 && <span>+{activeCount}</span>}
                </CompactControl>
            )}
            <QueryForm
                className={mode === 'narrow' ? 'compact' : undefined}
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!composing.current) onSearch(draft);
                }}
            >
                {mode !== 'narrow' && <SearchIcon size="18px" aria-hidden="true" />}
                <QueryInput
                    type="text"
                    inputMode="search"
                    enterKeyHint="search"
                    aria-label="Search query"
                    placeholder="Search items…"
                    value={draft}
                    onChange={(event) => {
                        setDraft(event.target.value);
                        if (!composing.current) onQueryChange(event.target.value);
                    }}
                    onCompositionStart={() => {
                        composing.current = true;
                    }}
                    onCompositionEnd={(event) => {
                        composing.current = false;
                        onQueryChange(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape' && openMenu === null && draft !== '') {
                            setDraft('');
                            onQueryChange('');
                        }
                    }}
                />
                {mode !== 'narrow' && draft !== '' && (
                    <ClearButton
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                            setDraft('');
                            onQueryChange('');
                        }}
                    >
                        <Close size="18px" />
                    </ClearButton>
                )}
            </QueryForm>
            {mode === 'roomy' && !combineFilters && (
                <>
                    <Control
                        type="button"
                        aria-label={`Tags: ${included.length + excluded.length} selected`}
                        aria-expanded={openMenu === 'tags'}
                        onClick={(event) => {
                            toggleMenu('tags', event);
                        }}
                    >
                        Tags{included.length + excluded.length > 0 ? ` · ${included.length + excluded.length}` : ''} ▾
                    </Control>
                    <Control
                        type="button"
                        aria-label={`Type: ${
                            itemType === 'all' ? 'Any' : itemType === 'items' ? 'Items' : 'Containers'
                        }`}
                        aria-expanded={openMenu === 'type'}
                        onClick={(event) => {
                            toggleMenu('type', event);
                        }}
                    >
                        Type: {itemType === 'all' ? 'Any' : itemType === 'items' ? 'Items' : 'Containers'} ▾
                    </Control>
                </>
            )}
            {combineFilters && (
                <Control
                    type="button"
                    aria-label={`Filters: ${activeCount} active`}
                    aria-expanded={openMenu === 'filters'}
                    onClick={(event) => {
                        toggleMenu('filters', event);
                    }}
                >
                    Filters{activeCount > 0 ? ` · ${activeCount}` : ''} ▾
                </Control>
            )}
            {openMenu !== null && (
                <MenuPanel
                    role="dialog"
                    aria-label="Search controls"
                    style={{
                        left: openMenu === 'scope' || openMenu === 'all' ? 0 : 'auto',
                        right: openMenu === 'scope' || openMenu === 'all' ? 'auto' : 0,
                        height: showTags ? 'min(70vh, 560px)' : undefined,
                    }}
                >
                    {showScope && (
                        <section aria-label="Scope">
                            <SectionTitle>Scope</SectionTitle>
                            <Choice
                                type="button"
                                aria-pressed={scope === 'global'}
                                onClick={() => {
                                    onScopeChange('global');
                                }}
                            >
                                {scope === 'global' ? '✓ ' : ''}All Items
                            </Choice>
                            {scopeAvailable && (
                                <Choice
                                    type="button"
                                    aria-pressed={scope === 'scoped'}
                                    onClick={() => {
                                        onScopeChange('scoped');
                                    }}
                                >
                                    {scope === 'scoped' ? '✓ ' : ''}
                                    {scopeLabel}
                                </Choice>
                            )}
                        </section>
                    )}
                    {legacyFilters.length > 0 && (openMenu === 'filters' || openMenu === 'all') && (
                        <section aria-label="Older saved filters">
                            <SectionTitle>Older saved filters · {legacyFilters.length}</SectionTitle>
                            <p>
                                This link has additional filters from the older search controls. Reset filters removes
                                them.
                            </p>
                            <Choice type="button" onClick={onResetFilters}>
                                Reset filters
                            </Choice>
                        </section>
                    )}
                    {showTags && (
                        <SearchTagCatalog tags={availableTags} selected={selectedTags} onChange={onSetTagState} />
                    )}
                    {showTags && (hasAllRequiredTagRule(fragments) || getContradictoryTags(fragments).length > 0) && (
                        <p role="alert" style={{ margin: '4px 12px' }}>
                            {hasAllRequiredTagRule(fragments)
                                ? 'This saved search requires all included tags. Clear filters to use the quick picker’s any-tag rule.'
                                : 'This saved search both includes and excludes a tag. Remove one choice to resolve it.'}
                        </p>
                    )}
                    {showType && (
                        <section aria-label="Type">
                            <SectionTitle>Type</SectionTitle>
                            {(['all', 'items', 'containers'] as const).map((value) => (
                                <Choice
                                    key={value}
                                    type="button"
                                    aria-pressed={itemType === value}
                                    onClick={() => {
                                        onTypeChange(value);
                                    }}
                                >
                                    {itemType === value ? '✓ ' : ''}
                                    {value === 'all' ? 'Any' : value === 'items' ? 'Items' : 'Containers'}
                                </Choice>
                            ))}
                        </section>
                    )}
                    {openMenu === 'all' && draft !== '' && (
                        <Choice
                            type="button"
                            onClick={() => {
                                setDraft('');
                                onQueryChange('');
                            }}
                        >
                            Clear query
                        </Choice>
                    )}
                    {(openMenu === 'filters' || openMenu === 'all') && legacyFilters.length === 0 && (
                        <Choice type="button" onClick={onResetFilters}>
                            Reset filters
                        </Choice>
                    )}
                </MenuPanel>
            )}
        </Landmark>
    );
};
