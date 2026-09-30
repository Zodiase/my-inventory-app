/** One searchable hierarchy for directly including, clearing, or excluding tags. */
import React, { type ReactElement, useMemo, useRef, useState } from 'react';

import type TagRecord from '/imports/model/TagRecord';

import { SelectedTagsSwitch } from './SelectedTagsSwitch';
import { TriStateTagToggle, type TagFilterState } from './TriStateTagToggle';
import './SearchTagCatalog.css';

const BASE_INDENT = 12;
const DEPTH_INDENT = 12;

interface SearchTagCatalogProps {
    tags: Array<Pick<TagRecord, '_id' | 'name' | 'parentTagId' | 'path'>>;
    selected: Record<string, TagFilterState>;
    onChange: (tagId: string, state: TagFilterState) => void;
    initialSelectedOnly?: boolean;
}

export const SearchTagCatalog = ({
    tags,
    selected,
    onChange,
    initialSelectedOnly = false,
}: SearchTagCatalogProps): ReactElement => {
    const [find, setFind] = useState('');
    const [selectedOnly, setSelectedOnly] = useState(initialSelectedOnly);
    const [collapsed, setCollapsed] = useState<string[]>([]);
    const switchRef = useRef<HTMLInputElement>(null);
    const findRef = useRef<HTMLInputElement>(null);
    const selectedCount = Object.values(selected).filter((state) => state !== 'neutral').length;
    const tagById = useMemo(() => new Map(tags.map((tag) => [tag._id, tag])), [tags]);
    const children = useMemo(() => {
        const groups = new Map<string, typeof tags>();
        for (const tag of tags) {
            const parent = tagById.has(tag.parentTagId) ? tag.parentTagId : '';
            groups.set(parent, [...(groups.get(parent) ?? []), tag]);
        }
        return groups;
    }, [tagById, tags]);
    const term = find.trim().toLocaleLowerCase();
    const matching = new Set(
        tags
            .filter(
                (tag) =>
                    (selectedOnly ? selected[tag._id] === 'include' || selected[tag._id] === 'exclude' : true) &&
                    (term === '' ||
                        tag.path
                            .map((part) => part.name)
                            .join(' / ')
                            .toLocaleLowerCase()
                            .includes(term))
            )
            .map((tag) => tag._id)
    );
    const hasVisibleDescendant = (tagId: string): boolean => {
        const descendants = children.get(tagId) ?? [];
        return descendants.some((tag) => matching.has(tag._id) || hasVisibleDescendant(tag._id));
    };
    const renderLevel = (parentId: string, depth: number): ReactElement[] =>
        (children.get(parentId) ?? []).flatMap((tag) => {
            const hasChildren = (children.get(tag._id)?.length ?? 0) > 0;
            if (!matching.has(tag._id) && !hasVisibleDescendant(tag._id)) return [];
            const expanded = term !== '' || selectedOnly || !collapsed.includes(tag._id);
            return [
                <div key={tag._id} className="search-tag-node">
                    {hasChildren ? (
                        <button
                            className="search-tag-group"
                            type="button"
                            style={{ paddingInlineStart: BASE_INDENT + depth * DEPTH_INDENT }}
                            aria-expanded={expanded}
                            onClick={() => {
                                setCollapsed((current) =>
                                    current.includes(tag._id)
                                        ? current.filter((id) => id !== tag._id)
                                        : [...current, tag._id]
                                );
                            }}
                        >
                            <span aria-hidden="true">{expanded ? '▾' : '▸'}</span> {tag.name}
                        </button>
                    ) : (
                        <div
                            className="search-tag-row"
                            style={{ paddingInlineStart: BASE_INDENT + depth * DEPTH_INDENT }}
                        >
                            <span className="search-tag-identity">
                                <span title={tag.name}>{tag.name}</span>
                                {term !== '' && tag.path.length > 1 && (
                                    <small
                                        title={tag.path
                                            .slice(0, -1)
                                            .map((part) => part.name)
                                            .join(' / ')}
                                    >
                                        {tag.path
                                            .slice(0, -1)
                                            .map((part) => part.name)
                                            .join(' / ')}
                                    </small>
                                )}
                            </span>
                            <TriStateTagToggle
                                name={tag.name}
                                state={selected[tag._id] ?? 'neutral'}
                                variant="compact"
                                onChange={(state) => {
                                    if (selectedOnly && state === 'neutral') {
                                        requestAnimationFrame(() => {
                                            if (selectedCount === 1) findRef.current?.focus();
                                            else switchRef.current?.focus();
                                        });
                                    }
                                    onChange(tag._id, state);
                                    if (selectedOnly && state === 'neutral' && selectedCount === 1)
                                        setSelectedOnly(false);
                                }}
                            />
                        </div>
                    )}
                    {hasChildren && expanded && renderLevel(tag._id, depth + 1)}
                </div>,
            ];
        });
    const visibleRows = renderLevel('', 0);

    return (
        <section className="search-tag-catalog" aria-label="Tags">
            <header className="search-tag-catalog-head">
                <strong>Tags · {selectedCount}</strong>
                <SelectedTagsSwitch
                    inputRef={switchRef}
                    checked={selectedOnly}
                    count={selectedCount}
                    onChange={setSelectedOnly}
                />
            </header>
            <input
                ref={findRef}
                className="search-tag-find"
                type="search"
                aria-label="Find a tag"
                placeholder="Find a tag"
                value={find}
                onChange={(event) => {
                    setFind(event.target.value);
                }}
            />
            <div className="search-tag-list" role="region" aria-label="Tag catalog">
                {visibleRows.length > 0 ? (
                    visibleRows
                ) : (
                    <p className="search-tag-empty">
                        {selectedOnly && term === '' ? 'No selected tags.' : 'No matching tags.'}
                        {term !== '' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFind('');
                                    findRef.current?.focus();
                                }}
                            >
                                Clear tag search
                            </button>
                        )}
                    </p>
                )}
            </div>
        </section>
    );
};
