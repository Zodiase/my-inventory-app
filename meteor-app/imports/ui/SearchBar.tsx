import { Close, Search as SearchIcon } from 'grommet-icons';
import React, { type ComponentProps, useCallback, useState } from 'react';
import styled from 'styled-components';

interface SearchBarProps extends Omit<ComponentProps<'div'>, 'onChange' | 'onSearch'> {
    /** Current search query text */
    value?: string;
    /** Placeholder text for the input */
    placeholder?: string;
    /** Kept for existing callers; visible scope is owned by SearchScopeSelector. */
    searchMode?: 'global' | 'scoped';
    /** Callback when search is executed (Enter key or search button) */
    onSearch?: (query: string) => void;
    /** Callback when search query text changes */
    onChange?: (query: string) => void;
    /** Callback when clear button is clicked */
    onClear?: () => void;
    /** Kept for existing callers; visible scope is owned by SearchScopeSelector. */
    scopeLabel?: string;
    /** Whether the submit button is disabled */
    submitDisabled?: boolean;
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
    gap: 6px;
    padding: 4px 6px 4px 12px;
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

const IconSlot = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #666;
    flex: 0 0 auto;
`;

const Input = styled.input`
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    font-size: 16px;
    padding: 0;
    background: transparent;

    &::placeholder {
        color: #999;
    }
`;

const IconButton = styled.button`
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
    transition: background-color 0.15s;

    &:hover {
        background: rgba(0, 0, 0, 0.05);
    }

    &:active {
        background: rgba(0, 0, 0, 0.1);
    }
`;

const SubmitButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    padding: 8px 14px;
    background: #007aff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: background-color 0.15s, transform 0.15s;
    white-space: nowrap;

    &:hover:not(:disabled) {
        background: #0051d5;
    }

    &:active:not(:disabled) {
        background: #003d99;
        transform: scale(0.98);
    }

    &:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
`;

export const SearchBar: React.FC<SearchBarProps> = ({
    value = '',
    placeholder = 'Search items...',
    onSearch,
    onChange,
    onClear,
    submitDisabled = false,
    className,
    style,
}) => {
    const [query, setQuery] = useState(value);

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

    const submitSearch = useCallback(() => {
        if (!submitDisabled) {
            onSearch?.(query);
        }
    }, [onSearch, query, submitDisabled]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                submitSearch();
            }
        },
        [submitSearch]
    );

    const handleClear = useCallback(() => {
        setQuery('');
        onChange?.('');
        onClear?.();
    }, [onChange, onClear]);

    return (
        <Container className={className} style={style}>
            <SearchInputWrapper>
                <IconSlot aria-hidden="true">
                    <SearchIcon size="20px" />
                </IconSlot>
                <Input
                    type="text"
                    value={query}
                    placeholder={placeholder}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    aria-label="Search query"
                />
                {query.length > 0 && (
                    <IconButton onClick={handleClear} aria-label="Clear search" title="Clear search" type="button">
                        <Close size="18px" />
                    </IconButton>
                )}
                <SubmitButton
                    onClick={submitSearch}
                    disabled={submitDisabled}
                    aria-label="Submit search"
                    title="Submit search"
                    type="button"
                >
                    <SearchIcon size="18px" />
                    Search
                </SubmitButton>
            </SearchInputWrapper>
        </Container>
    );
};

export default SearchBar;
