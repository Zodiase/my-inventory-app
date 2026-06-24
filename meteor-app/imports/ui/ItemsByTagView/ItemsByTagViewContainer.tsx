import { Box, Button, Heading, Text } from 'grommet';
import React, { type ReactElement } from 'react';
import { useParams, Link } from 'wouter';

import { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import { LoadingState } from '/imports/ui/common/LoadingState';
import { ItemsByTagViewPresentation } from '/imports/ui/ItemsByTagView/ItemsByTagViewPresentation';
import { useSubscribe, useTracker } from '/imports/utility/reactMeteorData';
import { usePageTitle } from '/imports/utility/usePageTitle';

/**
 * ItemsByTagViewContainer - Route-aware wrapper that extracts tagId from URL parameters.
 *
 * This component:
 * - Extracts tagId from /tags/:tagId route using useParams
 * - Fetches tag data reactively using useTracker
 * - Fetches items with the selected tag reactively
 * - Handles error cases (missing tagId, tag not found)
 * - Delegates rendering to ItemsByTagViewPresentation
 *
 * @remarks
 * Use this component in Route definitions. For non-route usage with props,
 * create a separate non-route container component.
 */

export const ItemsByTagViewContainer = (): ReactElement => {
    const { tagId } = useParams<{ tagId: string }>();

    const isLoadingTags = useSubscribe('tags.all');
    const isLoadingItems = useSubscribe('items.byTags', typeof tagId === 'string' && tagId !== '' ? [tagId] : []);

    usePageTitle('Tag Filter - My Inventory');

    // Fetch selected tag reactively
    const selectedTag = useTracker(() => {
        if (tagId === '') return undefined;
        return TagsCollection.findOne({ _id: tagId });
    }, [tagId]);

    // Fetch items with selected tag reactively
    const items = useTracker(() => {
        if (tagId === '') return [];

        return InventoryItemsCollection.find(
            { tagIds: { $in: [tagId] } },
            {
                sort: [
                    ['name', 'asc'],
                    ['createdAt', 'asc'],
                ],
            }
        ).fetch();
    }, [tagId]);

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

    if (isLoadingTags() || isLoadingItems()) {
        return <LoadingState />;
    }

    // Validate tagId exists
    if (tagId === '') {
        return (
            <Box fill align="center" justify="center" gap="medium" pad="large">
                <Heading level={3} color="status-error">
                    Invalid Tag ID
                </Heading>
                <Text>The tag ID in the URL is missing or invalid.</Text>
                <Link href="/tags">
                    <Button label="Go to Tags" primary />
                </Link>
            </Box>
        );
    }

    // Check if tag exists in database
    if (selectedTag === undefined) {
        return (
            <Box fill align="center" justify="center" gap="medium" pad="large">
                <Heading level={3} color="status-error">
                    Tag Not Found
                </Heading>
                <Text>The tag you're looking for doesn't exist or has been deleted.</Text>
                <Link href="/tags">
                    <Button label="Go to Tags" primary />
                </Link>
            </Box>
        );
    }

    return (
        <ItemsByTagViewPresentation
            selectedTag={selectedTag}
            items={items}
            containerPaths={containerPaths}
            onClearSelection={() => {
                /* Route-based, navigate to /tags instead */
            }}
        />
    );
};
