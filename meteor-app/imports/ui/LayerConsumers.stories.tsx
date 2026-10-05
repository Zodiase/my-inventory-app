/** Shared portal consumers over real app chrome, with synthetic data and no persistence. */
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, Grommet } from 'grommet';
import React, { useState } from 'react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';

import { AppShell } from '/imports/ui/AppShell';
import { CreateTagDialog } from '/imports/ui/CreateTagDialog';
import { DeleteContainerDialog } from '/imports/ui/DeleteContainerDialog';
import { LoadingSpinner } from '/imports/ui/LoadingSpinner';
import { LongPressContextMenu } from '/imports/ui/LongPressContextMenu';
import { DesignSystemGlobalStyle, theme } from '/imports/ui/theme';

const meta: Meta = {
    title: 'Integration/LayerConsumers',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                story: `Purpose: representative tag and container-delete portals sharing the global theme.
Composition: dialogs and backdrop cover app header; title/actions remain readable. Loading overlay remains above ordinary dialogs.
Viewports: tag/delete1280x800,820x900,390x844; context1280x844,390x844; loading1280x800. Responsive behavior follows the unchanged production Layer rules.
Interactions: open, inspect title hit target, Cancel/close and Escape, restored opener focus, background blocking; loading overlay blocks dialog.
Exclusions: saving/deleting real records, nested selectors, physical touch and screen-reader certification.`,
            },
        },
    },
};
export default meta;
type Story = StoryObj;
function ConsumerHarness({ kind }: { kind: 'tag' | 'delete' | 'loading' | 'context' }): React.ReactElement {
    const [open, setOpen] = useState(false);
    const { hook } = React.useMemo(() => memoryLocation({ path: '/items' }), []);
    const close = (): void => {
        setOpen(false);
    };
    return (
        <Grommet theme={theme}>
            <DesignSystemGlobalStyle />
            <Router hook={hook}>
                <AppShell location="/items">
                    <Box pad="medium">
                        {kind === 'context' && (
                            <LongPressContextMenu actions={[{ label: 'Inspect fixture', onClick: () => undefined }]}>
                                <Button label="Hold for actions" />
                            </LongPressContextMenu>
                        )}
                        <Button
                            label="Open consumer"
                            onClick={() => {
                                setOpen(true);
                            }}
                        />
                        {open &&
                            (kind === 'tag' ? (
                                <CreateTagDialog isOpen onClose={close} onSubmit={() => undefined} />
                            ) : (
                                <DeleteContainerDialog
                                    container={{
                                        _id: 'fixture',
                                        name: 'Fixture container',
                                        isContainer: true,
                                        description: '',
                                        tagIds: [],
                                        createdAt: new Date('2026-01-01'),
                                        modifiedAt: new Date('2026-01-01'),
                                    }}
                                    childCount={2}
                                    onCancel={close}
                                    onConfirm={() => undefined}
                                />
                            ))}
                        {open && kind === 'loading' && (
                            <LoadingSpinner overlay ariaLabel="Loading priority" text="Please wait" />
                        )}
                    </Box>
                </AppShell>
            </Router>
        </Grommet>
    );
}
export const Tag: Story = { render: () => <ConsumerHarness kind="tag" /> };
export const DeleteContainer: Story = { render: () => <ConsumerHarness kind="delete" /> };
export const LoadingPriority: Story = { render: () => <ConsumerHarness kind="loading" /> };

export const ContextMenu: Story = { render: () => <ConsumerHarness kind="context" /> };
