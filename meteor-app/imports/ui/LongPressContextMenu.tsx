import React, { type ReactElement, type ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Layer, Box } from 'grommet';

/**
 * LongPressContextMenu component providing iOS-style context menus on long-press.
 *
 * Features:
 * - Activates after 500ms long-press (iOS standard)
 * - Visual feedback during press (scale animation)
 * - Backdrop dismissal
 * - Touch-friendly menu items (44px minimum)
 * - Keyboard support (Escape to close)
 * - Haptic feedback simulation
 * - Prevents accidental activation on scroll
 *
 * @example
 * ```tsx
 * <LongPressContextMenu
 *   actions={[
 *     { label: 'Edit', icon: <Edit />, onClick: handleEdit },
 *     { label: 'Delete', icon: <Trash />, onClick: handleDelete, variant: 'danger' }
 *   ]}
 * >
 *   <ItemCard>Press and hold me</ItemCard>
 * </LongPressContextMenu>
 * ```
 */

export interface ContextMenuAction {
    /** Action label */
    label: string;
    /** Optional icon */
    icon?: ReactElement;
    /** Click handler */
    onClick: () => void;
    /** Visual variant */
    variant?: 'default' | 'danger';
    /** Disabled state */
    disabled?: boolean;
}

export interface LongPressContextMenuProps {
    /** Child element to attach long-press to */
    children: ReactNode;
    /** Menu actions to display */
    actions: ContextMenuAction[];
    /** Long-press duration in milliseconds (default: 500) */
    pressDuration?: number;
    /** Movement threshold to cancel press in pixels (default: 10) */
    moveThreshold?: number;
    /** Called when menu opens */
    onMenuOpen?: () => void;
    /** Called when menu closes */
    onMenuClose?: () => void;
}

const Wrapper = styled.div<{ $isPressed: boolean }>`
    display: inline-block;
    transition: transform 0.15s ease-out;
    transform: scale(${(props) => (props.$isPressed ? 0.95 : 1)});
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
`;

const MenuContainer = styled(Box)`
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    min-width: 200px;
`;

const MenuItem = styled.button<{ $variant: 'default' | 'danger' }>`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 44px;
    padding: 12px 16px;
    border: none;
    background: transparent;
    color: ${(props) => (props.$variant === 'danger' ? '#ff3b30' : '#000000')};
    font-size: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    cursor: pointer;
    transition: background-color 0.15s;
    text-align: left;

    &:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.05);
    }

    &:active:not(:disabled) {
        background: rgba(0, 0, 0, 0.1);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    /* Separator between items */
    &:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
`;

const IconWrapper = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    width: 20px;
    height: 20px;
`;

/**
 * LongPressContextMenu component with iOS-style interaction.
 *
 * Provides context menu on long-press with proper visual feedback
 * and touch-friendly menu items.
 */
export const LongPressContextMenu = ({
    children,
    actions,
    pressDuration = 500,
    moveThreshold = 10,
    onMenuOpen,
    onMenuClose,
}: LongPressContextMenuProps): ReactElement => {
    const [isPressed, setIsPressed] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startPositionRef = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);

    const handlePressStart = useCallback(
        (clientX: number, clientY: number) => {
            setIsPressed(true);
            hasMovedRef.current = false;
            startPositionRef.current = { x: clientX, y: clientY };

            // Start timer for long-press
            pressTimerRef.current = setTimeout(() => {
                if (!hasMovedRef.current) {
                    setShowMenu(true);
                    setMenuPosition({ x: clientX, y: clientY });
                    setIsPressed(false);
                    onMenuOpen?.();

                    // Haptic feedback simulation (if supported)
                    if ('vibrate' in navigator) {
                        navigator.vibrate(50);
                    }
                }
            }, pressDuration);
        },
        [pressDuration, onMenuOpen]
    );

    const handlePressMove = useCallback(
        (clientX: number, clientY: number) => {
            if (!isPressed) return;

            const deltaX = Math.abs(clientX - startPositionRef.current.x);
            const deltaY = Math.abs(clientY - startPositionRef.current.y);

            if (deltaX > moveThreshold || deltaY > moveThreshold) {
                hasMovedRef.current = true;
                setIsPressed(false);
                if (pressTimerRef.current !== null) {
                    clearTimeout(pressTimerRef.current);
                    pressTimerRef.current = null;
                }
            }
        },
        [isPressed, moveThreshold]
    );

    const handlePressEnd = useCallback(() => {
        setIsPressed(false);
        if (pressTimerRef.current !== null) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    }, []);

    const handleMenuClose = useCallback(() => {
        setShowMenu(false);
        onMenuClose?.();
    }, [onMenuClose]);

    const handleActionClick = useCallback(
        (action: ContextMenuAction) => {
            if (action.disabled) return;
            action.onClick();
            handleMenuClose();
        },
        [handleMenuClose]
    );

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (pressTimerRef.current !== null) {
                clearTimeout(pressTimerRef.current);
            }
        };
    }, []);

    // Keyboard support
    useEffect(() => {
        if (!showMenu) return;

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                handleMenuClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showMenu, handleMenuClose]);

    return (
        <>
            <Wrapper
                $isPressed={isPressed}
                onPointerDown={(e) => {
                    handlePressStart(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                    handlePressMove(e.clientX, e.clientY);
                }}
                onPointerUp={handlePressEnd}
                onPointerCancel={handlePressEnd}
                onPointerLeave={handlePressEnd}
                onContextMenu={(e) => {
                    // Prevent default context menu
                    e.preventDefault();
                }}
            >
                {children}
            </Wrapper>

            {showMenu && (
                <Layer
                    position="center"
                    onEsc={handleMenuClose}
                    onClickOutside={handleMenuClose}
                    responsive={false}
                    plain
                    animation="fadeIn"
                >
                    <MenuContainer pad="none" elevation="medium">
                        {actions.map((action, index) => (
                            <MenuItem
                                key={index}
                                $variant={action.variant ?? 'default'}
                                onClick={() => {
                                    handleActionClick(action);
                                }}
                                disabled={action.disabled}
                            >
                                {action.icon !== undefined && <IconWrapper>{action.icon}</IconWrapper>}
                                {action.label}
                            </MenuItem>
                        ))}
                    </MenuContainer>
                </Layer>
            )}
        </>
    );
};
