import { Button } from 'grommet';
import { Apps } from 'grommet-icons';
import React, { type ComponentProps, type ReactElement } from 'react';
import styled from 'styled-components';

import type { InventoryItem } from '/imports/model/InventoryItem';
import type { TagRecord } from '/imports/model/TagRecord';
import { uiTokens } from '/imports/ui/theme';
import { DESCRIPTION_PREVIEW_LENGTH } from '/imports/utility/constants';

/**
 * ItemsByTagViewPresentation is a pure presentation component that displays items filtered by a selected tag.
 *
 * This component receives all data and callbacks as props and has no dependencies
 * on Meteor's reactive data system, making it fully testable in Storybook.
 *
 * Features:
 * - Display selected tag name
 * - List of items with the selected tag
 * - Item cards showing name, description preview, and container path
 * - Empty state when no tag is selected or no items match
 * - Clear selection action
 * - Touch-optimized buttons (44x44px minimum)
 */

interface ItemCardProps {
    item: InventoryItem;
    containerPath?: Array<{ _id: string; name: string }>;
    onSelectItem?: (item: InventoryItem) => void;
}

const ItemCard = styled(
    ({
        item,
        containerPath,
        onSelectItem,
        ...rootElementProps
    }: ItemCardProps & ComponentProps<'div'>): ReactElement => {
        const handleClick = (): void => {
            if (onSelectItem !== undefined) {
                onSelectItem(item);
            }
        };

        const containerPathString =
            containerPath !== undefined && containerPath.length > 0
                ? containerPath.map((c) => c.name).join(' > ')
                : 'Root';

        return (
            <div {...rootElementProps} onClick={handleClick} data-item-id={item._id}>
                <div className="item-card-header">
                    <h3 className="item-name">{item.name}</h3>
                    {item.isContainer && <Apps className="container-badge" size="18px" />}
                </div>
                {typeof item.description === 'string' && item.description !== '' && (
                    <p className="item-description">
                        {item.description.substring(0, DESCRIPTION_PREVIEW_LENGTH)}
                        {item.description.length > DESCRIPTION_PREVIEW_LENGTH ? '...' : ''}
                    </p>
                )}
                <div className="item-location">
                    <span className="location-label">Location:</span> {containerPathString}
                </div>
            </div>
        );
    }
)`
    border: 1px solid ${uiTokens.color.border};
    border-radius: ${uiTokens.radius.control};
    padding: 1em;
    cursor: ${(props) => (props.onSelectItem !== undefined ? 'pointer' : 'default')};
    transition: background-color 0.2s, box-shadow 0.2s;

    &:hover {
        background-color: ${(props) => (props.onSelectItem !== undefined ? uiTokens.color.surface : 'transparent')};
        box-shadow: ${(props) => (props.onSelectItem !== undefined ? '0 2px 4px rgba(0,0,0,0.1)' : 'none')};
    }

    .item-card-header {
        display: flex;
        align-items: center;
        gap: 0.5em;
        margin-bottom: 0.5em;
    }

    .item-name {
        margin: 0;
        font-size: 1.1em;
        font-weight: 600;
    }

    .container-badge {
        color: ${uiTokens.color.brand};
    }

    .item-description {
        margin: 0.5em 0;
        color: ${uiTokens.color.textWeak};
        font-size: 0.9em;
        line-height: 1.4;
    }

    .item-location {
        margin-top: 0.5em;
        font-size: 0.85em;
        color: ${uiTokens.color.textMuted};
    }

    .location-label {
        font-weight: 600;
    }
`;

export interface ItemsByTagViewPresentationProps {
    /**
     * The currently selected tag to filter items by
     */
    selectedTag?: TagRecord;

    /**
     * Items that have the selected tag
     */
    items: InventoryItem[];

    /**
     * Container paths for items (map of itemId to path array)
     */
    containerPaths?: Record<string, Array<{ _id: string; name: string }>>;

    /**
     * Callback when an item is clicked
     */
    onSelectItem?: (item: InventoryItem) => void;

    /**
     * Callback when clearing the tag selection
     */
    onClearSelection?: () => void;

    /**
     * Loading state
     */
    isLoading?: boolean;
}

export const ItemsByTagViewPresentation = styled(
    ({
        selectedTag,
        items,
        containerPaths = {},
        onSelectItem,
        onClearSelection,
        isLoading = false,
        ...rootElementProps
    }: ItemsByTagViewPresentationProps & ComponentProps<'div'>): ReactElement => {
        if (isLoading) {
            return (
                <div {...rootElementProps}>
                    <div className="loading-state">Loading items...</div>
                </div>
            );
        }

        if (selectedTag === undefined) {
            return (
                <div {...rootElementProps}>
                    <div className="empty-state">
                        <p>Select a tag to view items</p>
                    </div>
                </div>
            );
        }

        return (
            <div {...rootElementProps}>
                <div className="header">
                    <div className="tag-info">
                        <h2 className="tag-name">Items tagged with: {selectedTag.name}</h2>
                        <p className="item-count">
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                        </p>
                    </div>
                    {onClearSelection !== undefined && (
                        <Button className="clear-button" secondary label="Clear Selection" onClick={onClearSelection} />
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="empty-state">
                        <p>No items found with tag "{selectedTag.name}"</p>
                    </div>
                ) : (
                    <div className="items-grid">
                        {items.map((item) => (
                            <ItemCard
                                key={item._id}
                                item={item}
                                containerPath={containerPaths[item._id]}
                                onSelectItem={onSelectItem}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }
)`
    .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5em;
        padding-bottom: 1em;
        border-bottom: 2px solid ${uiTokens.color.border};
    }

    .tag-info {
        flex: 1;
    }

    .tag-name {
        margin: 0 0 0.5em 0;
        font-size: 1.5em;
        font-weight: 600;
    }

    .item-count {
        margin: 0;
        color: ${uiTokens.color.textWeak};
        font-size: 0.9em;
    }

    .clear-button {
        margin-left: 1em;
    }

    .items-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1em;
    }

    .empty-state,
    .loading-state {
        text-align: center;
        padding: 3em;
        color: ${uiTokens.color.textMuted};
        font-size: 1.1em;
    }

    .loading-state {
        color: ${uiTokens.color.textWeak};
    }

    ${ItemCard} {
        /* Item card styles are already defined in the component */
    }
`;
