/** Discoverable secondary row actions; callers retain routing and confirmation ownership. */
import { Box, Button, DropButton } from 'grommet';
import { More } from 'grommet-icons';
import React, { type ReactElement, useCallback, useRef, useState } from 'react';

import type { ContextMenuAction } from './LongPressContextMenu';

export const ItemRowActions = ({
    name,
    actions,
}: {
    name: string;
    actions: ContextMenuAction[];
}): ReactElement | null => {
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const restoreOnDismiss = useRef(false);
    const focusMenu = useCallback((element: HTMLDivElement | null): void => {
        if (element !== null) {
            element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
        } else if (restoreOnDismiss.current) {
            // Restore only after the portal and its focus trap actually unmount.
            restoreOnDismiss.current = false;
            requestAnimationFrame(() => trigger.current?.focus());
        }
    }, []);
    const close = (): void => {
        restoreOnDismiss.current = true;
        setOpen(false);
    };
    if (actions.length === 0) return null;
    return (
        <DropButton
            ref={trigger}
            plain
            aria-label={`Actions for ${name}`}
            aria-haspopup="dialog"
            aria-expanded={open}
            icon={<More size="20px" color="text-weak" />}
            style={{ width: 44, height: 44, flex: '0 0 44px', display: 'grid', placeItems: 'center', borderRadius: 6 }}
            open={open}
            onOpen={() => {
                restoreOnDismiss.current = false;
                setOpen(true);
            }}
            onClose={close}
            dropAlign={{ top: 'bottom', right: 'right' }}
            // Drop's implicit teardown restoration can steal focus from an
            // action's new dialog. Own dismissal restoration and initial focus.
            dropProps={{ restrictFocus: false }}
            dropContent={
                <Box
                    ref={focusMenu}
                    role="dialog"
                    aria-label={`Actions for ${name}`}
                    pad="xsmall"
                    background="white"
                    round="small"
                    width="200px"
                >
                    {actions.map((action) => (
                        <Button
                            key={action.label}
                            plain
                            disabled={action.disabled}
                            style={{
                                minHeight: 44,
                                padding: '8px 12px',
                                textAlign: 'left',
                                color: action.variant === 'danger' ? '#c52828' : 'inherit',
                            }}
                            onClick={() => {
                                restoreOnDismiss.current = false;
                                setOpen(false);
                                action.onClick();
                            }}
                        >
                            {action.label}
                        </Button>
                    ))}
                </Box>
            }
        />
    );
};
