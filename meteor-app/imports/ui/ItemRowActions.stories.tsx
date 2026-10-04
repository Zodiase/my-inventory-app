/** Isolated row-action proposal with mock callbacks; no app routing or data mutations are installed. */
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Heading, Layer, Text } from 'grommet';
import { Folder, Next } from 'grommet-icons';
import React, { useCallback, useState } from 'react';

import { ItemRowActions } from './ItemRowActions';
import { TouchButton } from './TouchButton';

const Example = ({
    detailsOnly = false,
    grouped = false,
    short = false,
}: {
    detailsOnly?: boolean;
    grouped?: boolean;
    short?: boolean;
}): React.ReactElement => {
    const [message, setMessage] = useState('No action selected');
    const [deleting, setDeleting] = useState<string>();
    const focusConfirmation = useCallback((element: HTMLDivElement | null): void => {
        if (element === null) return;
        // Layer mounts its portal after the parent's effect. Focus only when
        // the confirmation content exists, after the outgoing menu restores focus.
        requestAnimationFrame(() => {
            if (element.isConnected) element.querySelector<HTMLButtonElement>('button')?.focus();
        });
    }, []);
    const cancelDelete = (): void => {
        const name = deleting;
        setDeleting(undefined);
        requestAnimationFrame(() => {
            const button: HTMLButtonElement | undefined = Array.from(
                document.querySelectorAll<HTMLButtonElement>('button')
            ).find((element: HTMLButtonElement) => element.getAttribute('aria-label') === `Actions for ${name}`);
            button?.focus();
        });
    };
    const names = [
        'Storage box',
        'Claw hammer',
        'Very long inventory name with enough details to need truncation on a narrow phone screen',
    ];
    return (
        <Box pad="small" style={{ maxWidth: 1200, margin: '0 auto', height: short ? 260 : 'calc(100vh - 32px)' }}>
            <Heading level={2} margin={{ bottom: 'small', top: 'none' }}>
                Garage
            </Heading>
            <Box style={{ minHeight: 0, overflowY: 'auto' }}>
                {grouped && (
                    <Text weight="bold" margin={{ vertical: 'small' }}>
                        Workbench contents · list fallback
                    </Text>
                )}
                {[...names, ...names.map((name) => `${name} spare`)].map((name, index) => (
                    <Box
                        key={name}
                        direction="row"
                        align="center"
                        gap="8px"
                        style={{ borderBottom: '1px solid #e6ebef', padding: '8px', minHeight: 64, flexShrink: 0 }}
                        data-testid="action-row"
                    >
                        <a
                            href={`#${index === 0 ? 'container' : 'item'}-${index}`}
                            onClick={(event) => {
                                event.preventDefault();
                                setMessage(`Opened ${name}`);
                            }}
                            style={{ flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none' }}
                        >
                            <Box direction="row" align="center" gap="small">
                                {index === 0 && <Folder size="20px" color="brand" />}
                                <Box style={{ minWidth: 0 }} flex>
                                    <Text truncate title={name} weight={index === 0 ? 'bold' : 'normal'}>
                                        {name}
                                    </Text>
                                    <Text size="small" color="text-weak" truncate>
                                        {index === 0 ? 'Container' : 'Item · Garage'}
                                    </Text>
                                </Box>
                                {index === 0 && <Next size="20px" color="text-weak" />}
                            </Box>
                        </a>
                        <ItemRowActions
                            name={name}
                            actions={[
                                {
                                    label: 'View Details',
                                    onClick: () => {
                                        setMessage(`Details: ${name}`);
                                    },
                                },
                                ...(!detailsOnly
                                    ? [
                                          {
                                              label: 'Edit',
                                              onClick: () => {
                                                  setMessage(`Edit: ${name}`);
                                              },
                                          },
                                          {
                                              label: 'Delete',
                                              variant: 'danger' as const,
                                              onClick: () => {
                                                  setDeleting(name);
                                              },
                                          },
                                      ]
                                    : []),
                            ]}
                        />
                    </Box>
                ))}
            </Box>
            <Text role="status" margin={{ top: 'small' }}>
                {message}
            </Text>
            {deleting !== undefined && (
                <Layer
                    responsive={false}
                    role="dialog"
                    aria-label={`Delete ${deleting}?`}
                    onEsc={cancelDelete}
                    onClickOutside={cancelDelete}
                >
                    <Box
                        ref={focusConfirmation}
                        pad="medium"
                        gap="small"
                        width="medium"
                        style={{ maxWidth: 'calc(100vw - 32px)' }}
                    >
                        <Heading level={3} margin="none">
                            Delete {deleting}?
                        </Heading>
                        <Text>This is a mock confirmation. No inventory data will change.</Text>
                        <TouchButton data-testid="cancel-row-delete" variant="secondary" onClick={cancelDelete}>
                            Cancel
                        </TouchButton>
                        <TouchButton
                            variant="danger"
                            onClick={() => {
                                setMessage(`Deleted: ${deleting}`);
                                setDeleting(undefined);
                            }}
                        >
                            Delete item
                        </TouchButton>
                    </Box>
                </Layer>
            )}
        </Box>
    );
};
const meta = {
    title: 'Prototypes/Item Row Actions',
    component: Example,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Full: Story = { args: {} };
export const AvailableOnly: Story = { args: { detailsOnly: true } };
export const GroupedFallback: Story = { args: { grouped: true } };
export const ConstrainedHeight: Story = { args: { short: true } };
