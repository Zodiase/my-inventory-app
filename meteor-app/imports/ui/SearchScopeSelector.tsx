import { Apps, Folder } from 'grommet-icons';
import React, { type ComponentProps } from 'react';
import styled from 'styled-components';

/**
 * SearchScopeSelector component for switching between global and scoped search.
 *
 * Provides a toggle to switch between:
 * - Global search: Searches entire inventory across all containers
 * - Scoped search: Searches only within current container and its children
 *
 * @remarks
 * This component is designed for touch-friendly interaction with:
 * - Large tap targets (44x44px minimum)
 * - Clear visual indication of current mode
 * - iOS-style segmented control design
 * - Smooth transition animations
 *
 * Used in conjunction with SearchBar to control search scope.
 */

interface SearchScopeSelectorProps extends Omit<ComponentProps<'div'>, 'onChange'> {
    /** Current search scope mode */
    value?: 'global' | 'scoped';
    /** Callback when scope changes */
    onChange?: (scope: 'global' | 'scoped') => void;
    /** Whether the selector is disabled */
    disabled?: boolean;
    /** Whether scoped search is unavailable */
    scopedDisabled?: boolean;
    /** Label for the scoped search option */
    scopeLabel?: string;
}

const Container = styled.div`
    display: inline-flex;
    background: #e5e5e5;
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
`;

const SegmentButton = styled.button<{ isActive: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 44px;
    min-height: 44px;
    padding: 8px 16px;
    background: ${(props) => (props.isActive ? 'white' : 'transparent')};
    color: ${(props) => (props.isActive ? '#007aff' : '#666')};
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: ${(props) => (props.isActive ? '600' : '400')};
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    white-space: nowrap;

    &:hover:not(:disabled) {
        background: ${(props) => (props.isActive ? 'white' : 'rgba(255, 255, 255, 0.5)')};
    }

    &:active:not(:disabled) {
        transform: scale(0.98);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    ${(props) =>
        props.isActive &&
        `
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `}
`;

const Icon = styled.span`
    display: inline-flex;
    align-items: center;
`;

const Label = styled.span``;

export const SearchScopeSelector: React.FC<SearchScopeSelectorProps> = ({
    value = 'global',
    onChange,
    disabled = false,
    scopedDisabled = false,
    scopeLabel = 'Current',
    className,
    style,
}) => {
    const handleGlobalClick = (): void => {
        if (!disabled && value !== 'global') {
            onChange?.('global');
        }
    };

    const handleScopedClick = (): void => {
        if (!disabled && !scopedDisabled && value !== 'scoped') {
            onChange?.('scoped');
        }
    };

    return (
        <Container className={className} style={style}>
            <SegmentButton
                isActive={value === 'global'}
                onClick={handleGlobalClick}
                disabled={disabled}
                type="button"
                aria-label="Global search"
                aria-pressed={value === 'global'}
            >
                <Icon>
                    <Apps size="16px" />
                </Icon>
                <Label>All Items</Label>
            </SegmentButton>
            <SegmentButton
                isActive={value === 'scoped'}
                onClick={handleScopedClick}
                disabled={disabled || scopedDisabled}
                type="button"
                aria-label={scopedDisabled ? 'Scoped search unavailable' : 'Scoped search'}
                aria-pressed={value === 'scoped'}
                title={scopedDisabled ? 'Choose a container in Items before using scoped search' : undefined}
            >
                <Icon>
                    <Folder size="16px" />
                </Icon>
                <Label>{scopeLabel}</Label>
            </SegmentButton>
        </Container>
    );
};

export default SearchScopeSelector;
