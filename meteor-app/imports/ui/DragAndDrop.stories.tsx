import type { Meta, StoryObj } from '@storybook/react';
import { Box, Grommet, Text } from 'grommet';
import { Folder, Package } from 'grommet-icons';
import React, { useRef, useState } from 'react';
import styled from 'styled-components';

import { useDraggable, useDropTarget } from '/imports/utility/dragAndDrop';

const meta = {
    title: 'Utilities/Drag and Drop',
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Touch-based drag-and-drop with visual feedback. Drag items to move them between containers.',
            },
        },
    },
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const DraggableItem = styled.div<{ $isDragging: boolean }>`
    padding: 12px 16px;
    background: white;
    border: 2px solid #ddd;
    border-radius: 8px;
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: grab;
    transition: all 0.2s ease;
    opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};
    transform: ${(props) => (props.$isDragging ? 'scale(1.05)' : 'scale(1)')};
    touch-action: none;
    user-select: none;

    &:active {
        cursor: grabbing;
    }
`;

const DropZone = styled.div<{ $isOver: boolean; $canDrop: boolean }>`
    padding: 24px;
    min-height: 200px;
    background: ${(props) => {
        if (props.$isOver && props.$canDrop) return '#e8f5e9';
        if (props.$canDrop) return '#f5f5f5';
        return '#fafafa';
    }};
    border: 3px dashed
        ${(props) => {
            if (props.$isOver && props.$canDrop) return '#4caf50';
            if (props.$canDrop) return '#2196f3';
            return '#ddd';
        }};
    border-radius: 12px;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 12px;

    ${(props) =>
        props.$isOver &&
        props.$canDrop &&
        `
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    `}
`;

interface DemoItem {
    id: string;
    name: string;
    type: 'item' | 'container';
}

/**
 * Interactive demo showing drag-and-drop between containers
 */
function DragDropDemo(): React.ReactElement {
    const [containerA, setContainerA] = useState<DemoItem[]>([
        { id: '1', name: 'Coffee Maker', type: 'item' },
        { id: '2', name: 'Blender', type: 'item' },
        { id: '3', name: 'Toaster', type: 'item' },
    ]);

    const [containerB, setContainerB] = useState<DemoItem[]>([
        { id: '4', name: 'Plates', type: 'item' },
        { id: '5', name: 'Bowls', type: 'item' },
    ]);

    const handleDrop = (targetContainer: 'A' | 'B', item: DemoItem): void => {
        // Remove from source
        setContainerA((prev) => prev.filter((i) => i.id !== item.id));
        setContainerB((prev) => prev.filter((i) => i.id !== item.id));

        // Add to target
        if (targetContainer === 'A') {
            setContainerA((prev) => [...prev, item]);
        } else {
            setContainerB((prev) => [...prev, item]);
        }
    };

    return (
        <Grommet>
            <Box gap="medium" pad="medium">
                <Box background="light-2" pad="medium" round="small">
                    <Text weight="bold" margin={{ bottom: 'small' }}>
                        Instructions:
                    </Text>
                    <Box as="ul" margin={{ left: 'medium' }} gap="xsmall">
                        <Text as="li">Long-press on an item (200ms) to start dragging</Text>
                        <Text as="li">Drag the item over a drop zone</Text>
                        <Text as="li">Drop zone highlights green when you're over it</Text>
                        <Text as="li">Release to drop the item into the new container</Text>
                    </Box>
                </Box>

                <Box direction="row" gap="medium" wrap>
                    {/* Container A */}
                    <Box flex={{ grow: 1, shrink: 0 }} basis="300px">
                        <Text weight="bold" margin={{ bottom: 'small' }}>
                            Kitchen Counter
                        </Text>
                        <DropZoneComponent items={containerA} onDrop={(item) => handleDrop('A', item)} />
                    </Box>

                    {/* Container B */}
                    <Box flex={{ grow: 1, shrink: 0 }} basis="300px">
                        <Text weight="bold" margin={{ bottom: 'small' }}>
                            Cabinet
                        </Text>
                        <DropZoneComponent items={containerB} onDrop={(item) => handleDrop('B', item)} />
                    </Box>
                </Box>
            </Box>
        </Grommet>
    );
}

interface DropZoneComponentProps {
    items: DemoItem[];
    onDrop: (item: DemoItem) => void;
}

function DropZoneComponent({ items, onDrop }: DropZoneComponentProps): React.ReactElement {
    const dropRef = useRef<HTMLDivElement>(null);
    const { isOver, canDrop } = useDropTarget<DemoItem>(dropRef, {
        canDrop: (data) => data.type === 'item',
        onDrop,
    });

    return (
        <DropZone ref={dropRef} $isOver={isOver} $canDrop={canDrop}>
            {items.length === 0 ? (
                <Box align="center" justify="center" flex>
                    <Text color="text-weak">Drop items here</Text>
                </Box>
            ) : (
                items.map((item) => <DraggableItemComponent key={item.id} item={item} />)
            )}
            {isOver && canDrop && (
                <Box background="status-ok" pad="small" round="small" style={{ opacity: 0.9 }}>
                    <Text color="white" weight="bold" textAlign="center">
                        Release to drop here
                    </Text>
                </Box>
            )}
        </DropZone>
    );
}

function DraggableItemComponent({ item }: { item: DemoItem }): React.ReactElement {
    const itemRef = useRef<HTMLDivElement>(null);
    const { isDragging } = useDraggable(itemRef, {
        data: item,
        delay: 200,
    });

    return (
        <DraggableItem ref={itemRef} $isDragging={isDragging}>
            <Package color="brand" />
            <Text weight="bold">{item.name}</Text>
            {isDragging && <Text size="small">(dragging...)</Text>}
        </DraggableItem>
    );
}

export const Interactive: Story = {
    render: () => <DragDropDemo />,
};

/**
 * Shows different visual states of drop targets
 */
export const VisualFeedback: Story = {
    render: () => {
        return (
            <Grommet>
                <Box gap="medium" pad="medium">
                    <Text size="large" weight="bold">
                        Drop Target Visual States
                    </Text>

                    {/* Normal state */}
                    <Box>
                        <Text weight="bold" margin={{ bottom: 'small' }}>
                            Normal (can accept drops)
                        </Text>
                        <DropZone $isOver={false} $canDrop={true}>
                            <Folder size="large" color="brand" />
                            <Text>Cabinet</Text>
                            <Text size="small" color="text-weak">
                                Dashed blue border indicates valid drop target
                            </Text>
                        </DropZone>
                    </Box>

                    {/* Hover state */}
                    <Box>
                        <Text weight="bold" margin={{ bottom: 'small' }}>
                            Dragging Over (valid drop)
                        </Text>
                        <DropZone $isOver={true} $canDrop={true}>
                            <Folder size="large" color="status-ok" />
                            <Text>Cabinet</Text>
                            <Text size="small" color="status-ok" weight="bold">
                                Green highlight + shadow indicates ready to receive
                            </Text>
                        </DropZone>
                    </Box>

                    {/* Disabled state */}
                    <Box>
                        <Text weight="bold" margin={{ bottom: 'small' }}>
                            Cannot Drop
                        </Text>
                        <DropZone $isOver={false} $canDrop={false}>
                            <Folder size="large" color="text-weak" />
                            <Text color="text-weak">Read-only container</Text>
                            <Text size="small" color="text-weak">
                                Gray border indicates cannot accept drops
                            </Text>
                        </DropZone>
                    </Box>
                </Box>
            </Grommet>
        );
    },
};

/**
 * Nested containers example
 */
export const NestedContainers: Story = {
    render: () => {
        const [items, setItems] = useState([
            { id: '1', name: 'Screwdriver', container: 'toolbox' },
            { id: '2', name: 'Hammer', container: 'toolbox' },
            { id: '3', name: 'Wrench', container: 'drawer' },
        ]);

        const handleMove = (itemId: string, newContainer: string): void => {
            setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, container: newContainer } : item)));
        };

        return (
            <Grommet>
                <Box gap="medium" pad="medium">
                    <Text size="large" weight="bold">
                        Move Items Between Locations
                    </Text>

                    {['toolbox', 'drawer', 'shelf'].map((container) => {
                        const containerItems = items.filter((item) => item.container === container);
                        const dropRef = useRef<HTMLDivElement>(null);
                        const { isOver, canDrop } = useDropTarget<{ id: string; name: string }>(dropRef, {
                            onDrop: (item) => handleMove(item.id, container),
                        });

                        return (
                            <Box key={container}>
                                <Text
                                    weight="bold"
                                    margin={{ bottom: 'small' }}
                                    style={{ textTransform: 'capitalize' }}
                                >
                                    {container}
                                </Text>
                                <DropZone ref={dropRef} $isOver={isOver} $canDrop={canDrop}>
                                    {containerItems.length === 0 ? (
                                        <Text color="text-weak">Empty</Text>
                                    ) : (
                                        containerItems.map((item) => {
                                            const itemRef = useRef<HTMLDivElement>(null);
                                            const { isDragging } = useDraggable(itemRef, {
                                                data: { id: item.id, name: item.name },
                                                delay: 200,
                                            });
                                            return (
                                                <DraggableItem key={item.id} ref={itemRef} $isDragging={isDragging}>
                                                    <Package color="brand" />
                                                    {item.name}
                                                </DraggableItem>
                                            );
                                        })
                                    )}
                                </DropZone>
                            </Box>
                        );
                    })}
                </Box>
            </Grommet>
        );
    },
};
