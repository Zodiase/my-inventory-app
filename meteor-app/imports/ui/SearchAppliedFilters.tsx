/** Compact, removable explanation of the active Search constraints below the banner. */
import React, { type ReactElement } from 'react';

import type { SearchFragment } from '/imports/model/SearchFragment';
import type TagRecord from '/imports/model/TagRecord';

import { getSelectedItemType, getSelectedTags, hasAllRequiredTagRule } from './searchFilterState';
import './SearchAppliedFilters.css';

const MAX_VISIBLE_TAGS = 4;

interface Props {
    fragments: SearchFragment[];
    tags: Array<Pick<TagRecord, '_id' | 'name'>>;
    onRemoveTag: (tagId: string) => void;
    onClearType: () => void;
}

export const SearchAppliedFilters = ({ fragments, tags, onRemoveTag, onClearType }: Props): ReactElement | null => {
    const included = getSelectedTags(fragments, 'tagInclude');
    const excluded = getSelectedTags(fragments, 'tagExclude');
    const itemType = getSelectedItemType(fragments);
    if (included.length === 0 && excluded.length === 0 && itemType === 'all') return null;
    const nameFor = (id: string): string => tags.find((tag) => tag._id === id)?.name ?? 'Unavailable tag';
    const visibleIncluded = included.slice(0, MAX_VISIBLE_TAGS);
    const visibleExcluded = excluded.slice(0, Math.max(0, MAX_VISIBLE_TAGS - visibleIncluded.length));
    const joiner = hasAllRequiredTagRule(fragments) ? 'all of' : 'any of';
    return (
        <div className="search-applied-filters" aria-label="Applied filters">
            {included.length > 0 && <span className="search-applied-rule">Include {joiner}:</span>}
            {visibleIncluded.map((id) => (
                <button
                    key={`include-${id}`}
                    type="button"
                    className="search-applied-chip"
                    aria-label={`Remove include filter for ${nameFor(id)}`}
                    onClick={() => {
                        onRemoveTag(id);
                    }}
                >
                    {nameFor(id)} <span aria-hidden="true">×</span>
                </button>
            ))}
            {excluded.length > 0 && <span className="search-applied-rule">Exclude:</span>}
            {visibleExcluded.map((id) => (
                <button
                    key={`exclude-${id}`}
                    type="button"
                    className="search-applied-chip"
                    aria-label={`Remove exclude filter for ${nameFor(id)}`}
                    onClick={() => {
                        onRemoveTag(id);
                    }}
                >
                    {nameFor(id)} <span aria-hidden="true">×</span>
                </button>
            ))}
            {included.length + excluded.length > MAX_VISIBLE_TAGS && (
                <span>+{included.length + excluded.length - MAX_VISIBLE_TAGS} more in Tags</span>
            )}
            {itemType !== 'all' && (
                <button
                    type="button"
                    className="search-applied-chip"
                    onClick={onClearType}
                    aria-label={`Remove type filter ${itemType}`}
                >
                    {itemType === 'items' ? 'Items' : 'Containers'} <span aria-hidden="true">×</span>
                </button>
            )}
        </div>
    );
};
