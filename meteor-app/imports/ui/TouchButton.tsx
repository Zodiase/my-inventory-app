import React, { type ComponentProps, type ReactElement, useState, useCallback } from 'react';
import styled from 'styled-components';

import { uiTokens } from './theme';

/**
 * TouchButton component providing iOS-style visual feedback for touch interactions.
 *
 * Features:
 * - 44x44px minimum touch target size
 * - iOS-style highlight on active state
 * - Smooth transitions for visual feedback
 * - Configurable variants (primary, secondary, danger)
 * - Support for icons and labels
 * - Disabled state handling
 *
 * @example
 * ```tsx
 * <TouchButton variant="primary" onClick={handleClick}>
 *   Save
 * </TouchButton>
 *
 * <TouchButton variant="danger" icon={<Trash />} onClick={handleDelete}>
 *   Delete
 * </TouchButton>
 * ```
 */

type TouchButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface TouchButtonProps extends Omit<ComponentProps<'button'>, 'type' | 'ref'> {
    /** Button variant determining visual style */
    variant?: TouchButtonVariant;
    /** Icon to display before the label */
    icon?: ReactElement;
    /** Whether the button is in a loading state */
    isLoading?: boolean;
    /** Button type for forms */
    type?: 'button' | 'submit' | 'reset';
    /** Full width button */
    fullWidth?: boolean;
}

interface StyledButtonProps {
    $variant: TouchButtonVariant;
    $isPressed: boolean;
    $fullWidth: boolean;
}

const StyledButton = styled.button<StyledButtonProps>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${uiTokens.space.sm};
    min-height: ${uiTokens.size.touchTarget};
    min-width: ${uiTokens.size.touchTarget};
    padding: ${uiTokens.space.md} ${uiTokens.space.xl};
    border: none;
    border-radius: ${uiTokens.radius.control};
    font-size: ${uiTokens.font.size};
    font-weight: ${uiTokens.font.weightSemibold};
    font-family: ${uiTokens.font.family};
    cursor: pointer;
    user-select: none;
    transition: background-color ${uiTokens.motion.fast}, box-shadow ${uiTokens.motion.fast},
        transform ${uiTokens.motion.fast}, opacity ${uiTokens.motion.fast};
    width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};

    /* Variant: Primary */
    ${(props) =>
        props.$variant === 'primary' &&
        `
        background: ${uiTokens.color.brand};
        color: ${uiTokens.color.white};
        box-shadow: ${uiTokens.shadow.raised};

        &:hover:not(:disabled) {
            background: ${uiTokens.color.brandHover};
            box-shadow: ${uiTokens.shadow.raisedHover};
        }

        &:active:not(:disabled), &.pressed {
            background: ${uiTokens.color.brandActive};
            box-shadow: ${uiTokens.shadow.pressed};
            transform: scale(0.98);
        }
    `}

    /* Variant: Secondary */
    ${(props) =>
        props.$variant === 'secondary' &&
        `
        background: ${uiTokens.color.surfaceSubtle};
        color: ${uiTokens.color.brand};
        box-shadow: none;

        &:hover:not(:disabled) {
            background: ${uiTokens.color.surfaceSubtleHover};
        }

        &:active:not(:disabled), &.pressed {
            background: ${uiTokens.color.surfaceSubtleActive};
            transform: scale(0.98);
        }
    `}

    /* Variant: Danger */
    ${(props) =>
        props.$variant === 'danger' &&
        `
        background: ${uiTokens.color.danger};
        color: ${uiTokens.color.white};
        box-shadow: ${uiTokens.shadow.raised};

        &:hover:not(:disabled) {
            background: ${uiTokens.color.dangerHover};
            box-shadow: ${uiTokens.shadow.raisedHover};
        }

        &:active:not(:disabled), &.pressed {
            background: ${uiTokens.color.dangerActive};
            box-shadow: ${uiTokens.shadow.pressed};
            transform: scale(0.98);
        }
    `}

    /* Variant: Ghost */
    ${(props) =>
        props.$variant === 'ghost' &&
        `
        background: transparent;
        color: ${uiTokens.color.brand};
        box-shadow: none;

        &:hover:not(:disabled) {
            background: ${uiTokens.color.brandGhostHover};
        }

        &:active:not(:disabled), &.pressed {
            background: ${uiTokens.color.brandGhostActive};
            transform: scale(0.98);
        }
    `}

    /* Disabled state */
    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    /* iOS-style active highlight */
    ${(props) =>
        props.$isPressed &&
        `
        opacity: 0.85;
    `}
`;

const IconWrapper = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: ${uiTokens.font.sizeLarge};
`;

const LoadingSpinner = styled.span`
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: ${uiTokens.radius.round};
    animation: spin 0.6s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

/**
 * TouchButton component with iOS-style visual feedback.
 *
 * Provides a consistent, touch-friendly button experience across the app
 * with proper visual feedback and accessibility support.
 */
export const TouchButton = ({
    variant = 'primary',
    icon,
    isLoading = false,
    type = 'button',
    fullWidth = false,
    disabled = false,
    children,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    ...props
}: TouchButtonProps): ReactElement => {
    const [isPressed, setIsPressed] = useState(false);

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            setIsPressed(true);
            onPointerDown?.(event);
        },
        [onPointerDown]
    );

    const handlePointerUp = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            setIsPressed(false);
            onPointerUp?.(event);
        },
        [onPointerUp]
    );

    const handlePointerCancel = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            setIsPressed(false);
            onPointerCancel?.(event);
        },
        [onPointerCancel]
    );

    const handlePointerLeave = useCallback(
        (event: React.PointerEvent<HTMLButtonElement>) => {
            setIsPressed(false);
            onPointerLeave?.(event);
        },
        [onPointerLeave]
    );

    return (
        <StyledButton
            type={type}
            disabled={disabled || isLoading}
            $variant={variant}
            $isPressed={isPressed}
            $fullWidth={fullWidth}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerLeave}
            {...props}
        >
            {isLoading ? (
                <LoadingSpinner />
            ) : (
                <>
                    {icon !== undefined && <IconWrapper>{icon}</IconWrapper>}
                    {children}
                </>
            )}
        </StyledButton>
    );
};
