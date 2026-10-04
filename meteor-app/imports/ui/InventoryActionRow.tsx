/**
 * Places discoverable actions beside a row's primary link, never inside it.
 * Shares supported commands with the optional long-press accelerator; callers
 * retain mutation and routing ownership, with detail navigation as the default.
 */
import { Box } from 'grommet';
import React, { type ReactElement, type ReactNode } from 'react';
import styled from 'styled-components';
import { useLocation } from 'wouter';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { ItemRowActions } from '/imports/ui/ItemRowActions';
import { LongPressContextMenu, type ContextMenuAction } from '/imports/ui/LongPressContextMenu';

const Row = styled(Box)<{ $physicalSlot: boolean }>`
    @media (max-width: 600px) {
        ${(props) =>
            props.$physicalSlot &&
            `
            flex-direction: column;
            align-items: stretch;
            height: auto !important;
            > div { height: auto !important; flex: 0 0 auto; }
            > button { align-self: flex-end; }
        `}
    }
`;

export const InventoryActionRow = ({
    item,
    actions,
    onViewDetails,
    physicalSlot = false,
    children,
}: {
    item: InventoryItem;
    actions?: ContextMenuAction[];
    onViewDetails?: (id: string) => void;
    physicalSlot?: boolean;
    children: ReactNode;
}): ReactElement => {
    const [, setLocation] = useLocation();
    const availableActions = actions ?? [
        {
            label: 'View Details',
            onClick: () => {
                if (onViewDetails !== undefined) onViewDetails(item._id);
                else setLocation(`/items/${encodeURIComponent(item._id)}`);
            },
        },
    ];
    return (
        <Row
            $physicalSlot={physicalSlot}
            direction="row"
            align="center"
            style={{ minWidth: 0, height: physicalSlot ? '100%' : 'auto', flexShrink: 0 }}
        >
            <Box flex style={{ minWidth: 0, height: physicalSlot ? '100%' : 'auto' }}>
                <LongPressContextMenu actions={availableActions}>{children}</LongPressContextMenu>
            </Box>
            <ItemRowActions name={item.name} actions={availableActions} />
        </Row>
    );
};
