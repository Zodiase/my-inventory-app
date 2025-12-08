import { Box, Text } from 'grommet';
import React, { type ReactElement } from 'react';
import styled, { keyframes } from 'styled-components';

/**
 * LoadingSpinner component optimized for mobile touch interfaces.
 *
 * Features:
 * - iOS-style spinning animation
 * - Multiple size variants
 * - Optional loading text
 * - Customizable colors
 * - Overlay mode for full-screen loading
 * - Smooth 60fps animation
 * - Accessible with ARIA labels
 *
 * @example
 * ```tsx
 * // Inline spinner
 * <LoadingSpinner size="small" />
 *
 * // With text
 * <LoadingSpinner size="medium" text="Loading items..." />
 *
 * // Full-screen overlay
 * <LoadingSpinner size="large" overlay text="Please wait..." />
 * ```
 */

export type LoadingSpinnerSize = 'small' | 'medium' | 'large';

export interface LoadingSpinnerProps {
    /** Size variant of the spinner */
    size?: LoadingSpinnerSize;
    /** Optional loading text to display */
    text?: string;
    /** Color of the spinner (default: iOS blue) */
    color?: string;
    /** Show as full-screen overlay with backdrop */
    overlay?: boolean;
    /** ARIA label for accessibility */
    ariaLabel?: string;
}

const spin = keyframes`
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
`;

// Size constants in pixels
const SPINNER_SIZE_SMALL_PX = 20;
const SPINNER_SIZE_MEDIUM_PX = 40;
const SPINNER_SIZE_LARGE_PX = 60;
const MIN_BORDER_WIDTH_PX = 2;
const BORDER_WIDTH_DIVISOR = 10;

interface SpinnerCircleProps {
    $size: LoadingSpinnerSize;
    $color: string;
}

const getSizePx = (size: LoadingSpinnerSize): number => {
    switch (size) {
        case 'small':
            return SPINNER_SIZE_SMALL_PX;
        case 'medium':
            return SPINNER_SIZE_MEDIUM_PX;
        case 'large':
            return SPINNER_SIZE_LARGE_PX;
        default:
            return SPINNER_SIZE_MEDIUM_PX;
    }
};

const SpinnerCircle = styled.div<SpinnerCircleProps>`
    width: ${(props) => getSizePx(props.$size)}px;
    height: ${(props) => getSizePx(props.$size)}px;
    border: ${(props) =>
        Math.max(MIN_BORDER_WIDTH_PX, getSizePx(props.$size) / BORDER_WIDTH_DIVISOR)}px solid rgba(0, 0, 0, 0.1);
    border-top-color: ${(props) => props.$color};
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
    will-change: transform;
`;

const SpinnerContainer = styled(Box)`
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
`;

const OverlayBackdrop = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease-out;

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;

/**
 * LoadingSpinner component with iOS-style animation.
 *
 * Provides a consistent loading indicator across the app
 * with proper accessibility and mobile optimization.
 */
export const LoadingSpinner = ({
    size = 'medium',
    text,
    color = '#007aff',
    overlay = false,
    ariaLabel = 'Loading',
}: LoadingSpinnerProps): ReactElement => {
    const spinner = (
        <SpinnerContainer role="status" aria-label={ariaLabel}>
            <SpinnerCircle $size={size} $color={color} aria-hidden="true" />
            {text !== undefined && (
                <Text
                    size={size === 'small' ? 'small' : 'medium'}
                    color="dark-4"
                    textAlign="center"
                    style={{ maxWidth: '250px' }}
                >
                    {text}
                </Text>
            )}
            <span className="sr-only">{ariaLabel}</span>
        </SpinnerContainer>
    );

    if (overlay) {
        return <OverlayBackdrop>{spinner}</OverlayBackdrop>;
    }

    return spinner;
};
