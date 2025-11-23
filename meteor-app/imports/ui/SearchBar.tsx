import React, { type ComponentProps, useState, useCallback } from 'react';
import styled from 'styled-components';

/**
 * SearchBar component with search mode indicator.
 *
 * Provides a text input for search queries with visual indication of:
 * - Global search mode (searches entire inventory)
 * - Scoped search mode (searches within current container)
 *
 * @remarks
 * This component is designed for touch-friendly interaction with:
 * - Large tap targets (44x44px minimum)
 * - Clear visual feedback
 * - Search mode indicator badge
 * - Clear/reset functionality
 *
 * The search executes on Enter key or when the search button is tapped.
 */

interface SearchBarProps extends Omit<ComponentProps<'div'>, 'onChange' | 'onSearch'> {
    /** Current search query text */
    value?: string;
    /** Placeholder text for the input */
    placeholder?: string;
    /** Search mode: 'global' searches all items, 'scoped' searches current container */
    searchMode?: 'global' | 'scoped';
    /** Callback when search is executed (Enter key or search button) */
    onSearch?: (query: string) => void;
    /** Callback when search query text changes */
    onChange?: (query: string) => void;
    /** Callback when clear button is clicked */
    onClear?: () => void;
    /** Label for scoped search (e.g., "In: Kitchen") */
    scopeLabel?: string;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
`;

const SearchInputWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: white;
    border: 2px solid #ddd;
    border-radius: 8px;
    min-height: 44px;
    transition: border-color 0.2s;

    &:focus-within {
        border-color: #007aff;
        outline: 2px solid rgba(0, 122, 255, 0.2);
    }
`;

const SearchIcon = styled.span`
    font-size: 20px;
    color: #666;
    user-select: none;
`;

const Input = styled.input`
    flex: 1;
    border: none;
    outline: none;
    font-size: 16px;
    padding: 0;
    background: transparent;

    &::placeholder {
        color: #999;
    }
`;

const ClearButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 8px;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    color: #666;
    font-size: 20px;
    transition: background-color 0.15s;

    &:hover {
        background: rgba(0, 0, 0, 0.05);
    }

    &:active {
        background: rgba(0, 0, 0, 0.1);
    }

    &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
`;

const SearchModeIndicator = styled.div<{ mode: 'global' | 'scoped' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    background: ${(props) => (props.mode === 'global' ? '#007aff' : '#34c759')};
    color: white;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    user-select: none;
`;

const ModeIcon = styled.span`
    font-size: 14px;
`;

const ModeText = styled.span``;

export const SearchBar: React.FC<SearchBarProps> = ({
    value = '',
    placeholder = 'Search items...',
    searchMode = 'global',
    onSearch,
    onChange,
    onClear,
    scopeLabel,
    className,
    style,
}) => {
    const [query, setQuery] = useState(value);

    // Sync internal state with prop changes
    React.useEffect(() => {
        setQuery(value);
    }, [value]);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newQuery = e.target.value;
            setQuery(newQuery);
            onChange?.(newQuery);
        },
        [onChange]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                onSearch?.(query);
            }
        },
        [query, onSearch]
    );

    const handleClear = useCallback(() => {
        setQuery('');
        onChange?.('');
        onClear?.();
    }, [onChange, onClear]);

    const modeLabel = searchMode === 'global' ? 'All Items' : scopeLabel ?? 'Current Container';
    const modeIcon = searchMode === 'global' ? '🌐' : '📁';

    return (
        <Container className={className} style={style}>
            <SearchInputWrapper>
                <SearchIcon>🔍</SearchIcon>
                <Input
                    type="text"
                    value={query}
                    placeholder={placeholder}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    aria-label="Search query"
                />
                {query.length > 0 && (
                    <ClearButton onClick={handleClear} aria-label="Clear search" title="Clear search" type="button">
                        ✕
                    </ClearButton>
                )}
            </SearchInputWrapper>
            <SearchModeIndicator mode={searchMode}>
                <ModeIcon>{modeIcon}</ModeIcon>
                <ModeText>{modeLabel}</ModeText>
            </SearchModeIndicator>
        </Container>
    );
};

export default SearchBar;
