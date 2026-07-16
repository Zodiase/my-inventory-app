/**
 * Shared frame for inventory item dialogs.
 * Centralizes reliable dismissal behavior, explicit close naming, and phone-safe sizing.
 */
import { Box, Button, Heading, Layer } from 'grommet';
import { Close } from 'grommet-icons';
import React, { type ReactElement, type ReactNode } from 'react';

interface ItemDialogProps {
    children: ReactNode;
    onClose: () => void;
    title: string;
    width?: 'medium' | 'large';
}

export const ItemDialog = ({ children, onClose, title, width = 'large' }: ItemDialogProps): ReactElement => {
    return (
        <Layer aria-label={`${title} dialog`} aria-modal="true" onEsc={onClose} onClickOutside={onClose} role="dialog">
            <Box className="item-dialog-content" pad="medium" gap="medium" width={width}>
                <Box className="item-dialog-header" direction="row" justify="between" align="center" gap="small">
                    <Heading className="item-dialog-title" level="3" margin="none">
                        {title}
                    </Heading>
                    <Button
                        aria-label={`Close ${title} dialog`}
                        className="item-dialog-close"
                        icon={<Close aria-hidden="true" />}
                        onClick={onClose}
                        type="button"
                    />
                </Box>
                {children}
            </Box>
        </Layer>
    );
};
