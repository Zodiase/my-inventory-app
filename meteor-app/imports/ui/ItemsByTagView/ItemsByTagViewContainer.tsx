import React, { type ComponentProps, type ReactElement, useState } from 'react';

import { InventoryItemsCollection, type InventoryItem } from '/imports/api/items';
import { TagsCollection, type TagRecord } from '/imports/api/tags';
import { useTracker } from '/imports/utility/reactMeteorData';

import { ItemsByTagViewPresentation } from '/imports/ui/ItemsByTagView/ItemsByTagViewPresentation';

/**
 * ItemsByTagViewContainer is a container component that connects ItemsByTagViewPresentation
 * to Meteor's reactive data system.
 *
 * Features:
 * - Manages selected tag state
 * - Subscribes to items.byTags publication reactively
 * - Fetches container paths for items
 * - Handles item selection callbacks
 */

export interface ItemsByTagViewContainerProps {
    /**
     * Initial tag to select (optional)
     */
    initialTagId?: string;

    /**
     * Callback when an item is selected
     */
    onSelectItem?: (item: InventoryItem) => void;
}

export const ItemsByTagViewContainer = (props: ItemsByTagViewContainerProps): ReactElement => {
    const { initialTagId, onSelectItem } = props;

    const [selectedTagId, setSelectedTagId] = useState<string | undefined>(initialTagId);

    // Fetch selected tag reactively
    const selectedTag = useTracker(() => {
        if (selectedTagId === undefined) return undefined;
        return TagsCollection.findOne({ _id: selectedTagId });
    }, [selectedTagId]);

    // Fetch items with selected tag reactively
    const items = useTracker(() => {
        if (selectedTagId === undefined) return [];

        return InventoryItemsCollection.find(
            { tagIds: { $in: [selectedTagId] } },
            {
                sort: [
                    ['name', 'asc'],
                    ['createdAt', 'asc'],
                ],
            }
        ).fetch();
    }, [selectedTagId]);

    // Fetch container paths for items (simplified - doesn't recursively build full path)
    const containerPaths = useTracker(() => {
        const paths: Record<string, Array<{ _id: string; name: string }>> = {};

        for (const item of items) {
            if (item.containerId !== undefined) {
                const container = InventoryItemsCollection.findOne({ _id: item.containerId });
                if (container !== undefined) {
                    paths[item._id] = [{ _id: container._id, name: container.name }];
                }
            }
        }

        return paths;
    }, [items]);

    const handleClearSelection = (): void => {
        setSelectedTagId(undefined);
    };

    return (
        <ItemsByTagViewPresentation
            selectedTag={selectedTag}
            items={items}
            containerPaths={containerPaths}
            onSelectItem={onSelectItem}
            onClearSelection={handleClearSelection}
        />
    );
};
