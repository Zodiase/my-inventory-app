import { Box, Button, Heading, Layer, RadioButtonGroup, Text } from 'grommet';
import { Alert, Close } from 'grommet-icons';
import React, { useState } from 'react';

import type { InventoryItem } from '/imports/model/InventoryItem';
import { TouchButton } from '/imports/ui/TouchButton';

/**
 * DeleteContainerDialog component for handling container deletion with multiple strategies.
 *
 * @remarks
 * Displays a modal dialog with three deletion options when deleting a container with children:
 * - Option A: Move children to parent container and add a tag indicating lost container
 * - Option B: Select a new container for all children
 * - Option C: Recursively delete the container and all its contents
 *
 * All touch targets are 44x44px minimum for iOS accessibility.
 */

export type DeletionStrategy = 'moveToParent' | 'selectContainer' | 'deleteAll';

export interface DeleteContainerDialogProps {
    /** The container being deleted */
    container: InventoryItem;

    /** Number of items directly contained in this container */
    childCount: number;

    /** Total number of items including descendants (for recursive delete) */
    totalDescendants?: number;

    /** Callback when deletion is confirmed */
    onConfirm: (strategy: DeletionStrategy, targetContainerId?: string) => void;

    /** Callback when dialog is cancelled */
    onCancel: () => void;

    /** Callback to show container selector for Option B */
    onSelectContainer?: () => void;

    /** Selected target container for Option B (undefined means not selected yet) */
    selectedTargetContainerId?: string;

    /** Name of the selected target container for display */
    selectedTargetContainerName?: string;

    /** Whether the deletion is in progress */
    isDeleting?: boolean;

    /** Error message to display */
    error?: string;
}

/**
 * DeleteContainerDialog component displays deletion options for containers.
 *
 * @example
 * ```tsx
 * const [showDialog, setShowDialog] = useState(false);
 * const [targetContainer, setTargetContainer] = useState<string | undefined>();
 *
 * <DeleteContainerDialog
 *   container={containerToDelete}
 *   childCount={5}
 *   totalDescendants={12}
 *   onConfirm={(strategy, targetId) => {
 *     if (strategy === 'moveToParent') {
 *       // Move children to parent and tag them
 *     } else if (strategy === 'selectContainer') {
 *       // Move children to targetId
 *     } else {
 *       // Recursively delete all
 *     }
 *     setShowDialog(false);
 *   }}
 *   onCancel={() => setShowDialog(false)}
 *   onSelectContainer={() => setShowContainerSelector(true)}
 *   selectedTargetContainerId={targetContainer}
 *   selectedTargetContainerName={targetContainerName}
 * />
 * ```
 */
export const DeleteContainerDialog: React.FC<DeleteContainerDialogProps> = ({
    container,
    childCount,
    totalDescendants = childCount,
    onConfirm,
    onCancel,
    onSelectContainer,
    selectedTargetContainerId,
    selectedTargetContainerName,
    isDeleting = false,
    error,
}) => {
    const [selectedStrategy, setSelectedStrategy] = useState<DeletionStrategy>('moveToParent');

    const handleConfirm = (): void => {
        if (selectedStrategy === 'selectContainer' && !selectedTargetContainerId) {
            // Need to select a container first
            if (onSelectContainer) {
                onSelectContainer();
            }
            return;
        }

        onConfirm(selectedStrategy, selectedTargetContainerId);
    };

    const canConfirm = selectedStrategy !== 'selectContainer' || !!selectedTargetContainerId;

    return (
        <Layer onEsc={onCancel} onClickOutside={onCancel} position="center" modal>
            <Box pad="medium" gap="medium" width="large">
                {/* Header */}
                <Box direction="row" align="center" justify="between">
                    <Box direction="row" align="center" gap="small">
                        <Alert color="status-warning" />
                        <Heading level={3} margin="none">
                            Delete Container
                        </Heading>
                    </Box>
                    <Button icon={<Close />} onClick={onCancel} plain disabled={isDeleting} />
                </Box>

                {/* Warning message */}
                <Text>
                    You are about to delete <strong>{container.name}</strong> which contains{' '}
                    <strong>{childCount}</strong> {childCount === 1 ? 'item' : 'items'}.
                </Text>

                {/* Strategy selection */}
                <Box gap="small">
                    <Text weight="bold">Choose how to handle the contents:</Text>
                    <RadioButtonGroup
                        name="deletionStrategy"
                        options={[
                            {
                                label: 'Move to parent (mark as "lost container")',
                                value: 'moveToParent',
                            },
                            {
                                label: 'Choose new container',
                                value: 'selectContainer',
                            },
                            {
                                label: `Delete all contents (${totalDescendants} ${
                                    totalDescendants === 1 ? 'item' : 'items'
                                } total)`,
                                value: 'deleteAll',
                            },
                        ]}
                        value={selectedStrategy}
                        onChange={(event) => setSelectedStrategy(event.target.value as DeletionStrategy)}
                        disabled={isDeleting}
                    />
                </Box>

                {/* Option A description */}
                {selectedStrategy === 'moveToParent' && (
                    <Box background="light-2" pad="small" round="small" border={{ color: 'border', size: 'small' }}>
                        <Text size="small">
                            All items will be moved to the parent container
                            {container.containerId ? '' : ' (root level)'} and tagged to indicate they lost their
                            container.
                        </Text>
                    </Box>
                )}

                {/* Option B - Container selection */}
                {selectedStrategy === 'selectContainer' && (
                    <Box gap="small">
                        <Box background="light-2" pad="small" round="small" border={{ color: 'border', size: 'small' }}>
                            <Text size="small">All items will be moved to a container you select.</Text>
                        </Box>
                        {selectedTargetContainerId ? (
                            <Box
                                direction="row"
                                align="center"
                                justify="between"
                                pad="small"
                                background="brand"
                                round="small"
                            >
                                <Text color="white">Target: {selectedTargetContainerName || 'Selected Container'}</Text>
                                <Button label="Change" onClick={onSelectContainer} size="small" disabled={isDeleting} />
                            </Box>
                        ) : (
                            <Button
                                label="Select Container"
                                onClick={onSelectContainer}
                                primary
                                disabled={isDeleting}
                            />
                        )}
                    </Box>
                )}

                {/* Option C warning */}
                {selectedStrategy === 'deleteAll' && (
                    <Box
                        background="status-critical"
                        pad="small"
                        round="small"
                        border={{ color: 'status-critical', size: 'small' }}
                    >
                        <Text size="small" color="white" weight="bold">
                            ⚠️ WARNING: This will permanently delete the container and ALL {totalDescendants}{' '}
                            {totalDescendants === 1 ? 'item' : 'items'} inside it. This action cannot be undone!
                        </Text>
                    </Box>
                )}

                {/* Error message */}
                {error && (
                    <Box
                        background="status-critical"
                        pad="small"
                        round="small"
                        border={{ color: 'status-critical', size: 'small' }}
                    >
                        <Text color="white">{error}</Text>
                    </Box>
                )}

                {/* Action buttons */}
                <Box direction="row" gap="small" justify="end">
                    <TouchButton onClick={onCancel} disabled={isDeleting} variant="secondary">
                        Cancel
                    </TouchButton>
                    <TouchButton onClick={handleConfirm} disabled={isDeleting || !canConfirm} variant="danger">
                        {isDeleting ? 'Deleting...' : 'Delete Container'}
                    </TouchButton>
                </Box>
            </Box>
        </Layer>
    );
};

export default DeleteContainerDialog;
