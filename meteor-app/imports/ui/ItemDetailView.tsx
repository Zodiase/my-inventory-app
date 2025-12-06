import { Box, Button, Heading, Text } from 'grommet';
import React from 'react';
import { useParams, Link } from 'wouter';

import { InventoryItemsCollection } from '/imports/api/items';
import { TagsCollection } from '/imports/api/tags';
import { ItemDetailViewPresentation } from '/imports/ui/ItemDetailViewPresentation';
import { useTracker } from '/imports/utility/reactMeteorData';
import { usePageTitle } from '/imports/utility/usePageTitle';

export type { ItemDetailViewProps } from '/imports/ui/ItemDetailViewPresentation';
export { ItemDetailViewPresentation } from '/imports/ui/ItemDetailViewPresentation';

/**
 * ItemDetailView - Route-aware wrapper that extracts itemId from URL parameters.
 *
 * This component:
 * - Extracts itemId from /items/:itemId route using useParams
 * - Fetches item data reactively using useTracker
 * - Fetches associated tags reactively
 * - Handles error cases (missing itemId, item not found)
 * - Delegates rendering to ItemDetailViewPresentation
 *
 * @remarks
 * Use this component in Route definitions. For non-route usage, use ItemDetailViewPresentation directly.
 *
 * @example
 * ```tsx
 * // In App.tsx routes:
 * <Route path="/items/:itemId">
 *   {() => <ItemDetailView />}
 * </Route>
 * ```
 */
export const ItemDetailView: React.FC = () => {
    const { itemId } = useParams<{ itemId: string }>();

    usePageTitle('Item Details - My Inventory');

    // Fetch item from database
    const item = useTracker(() => {
        if (!itemId) return undefined;
        return InventoryItemsCollection.findOne({ _id: itemId });
    }, [itemId]);

    // Fetch tags for the item
    const tags = useTracker(() => {
        if (!item) return [];
        return TagsCollection.find({ _id: { $in: item.tagIds ?? [] } }).fetch();
    }, [item?.tagIds?.join(',')]);

    // Validate itemId exists
    if (!itemId) {
        return (
            <Box fill align="center" justify="center" gap="medium" pad="large">
                <Heading level={3} color="status-error">
                    Invalid Item ID
                </Heading>
                <Text>The item ID in the URL is missing or invalid.</Text>
                <Link href="/items">
                    <Button label="Go to Items" primary />
                </Link>
            </Box>
        );
    }

    // Check if item exists in database
    if (item === undefined) {
        return (
            <Box fill align="center" justify="center" gap="medium" pad="large">
                <Heading level={3} color="status-error">
                    Item Not Found
                </Heading>
                <Text>The item you're looking for doesn't exist or has been deleted.</Text>
                <Link href="/items">
                    <Button label="Go to Items" primary />
                </Link>
            </Box>
        );
    }

    // Render the presentation component with fetched data
    return (
        <ItemDetailViewPresentation
            item={item}
            tags={tags}
            containerPath={[]}
            // TODO: Add onEdit, onDelete, onMove handlers in future tasks
        />
    );
};
