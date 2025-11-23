import React, { type ComponentProps, useState, useCallback } from 'react';
import styled from 'styled-components';

import type { SearchFragment } from '/imports/model/SearchFragment';

/**
 * SearchFragmentBuilder component for creating complex search queries.
 *
 * Allows users to add multiple search criteria:
 * - Name search (partial, case-insensitive)
 * - Tag inclusion (must have these tags)
 * - Tag exclusion (must NOT have these tags)
 * - Container type filter (containers only, items only, or all)
 *
 * @remarks
 * This component builds an array of SearchFragment objects that can be
 * passed to the items.search Meteor method.
 *
 * Touch-optimized with:
 * - Large tap targets (44x44px minimum)
 * - Clear visual grouping of fragments
 * - Easy removal of fragments
 * - Visual feedback for interactions
 */

interface SearchFragmentBuilderProps extends Omit<ComponentProps<'div'>, 'onChange'> {
    /** Current array of search fragments */
    fragments?: SearchFragment[];
    /** Callback when fragments change */
    onChange?: (fragments: SearchFragment[]) => void;
    /** Available tags for selection (id and name pairs) */
    availableTags?: Array<{ _id: string; name: string }>;
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const FragmentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FragmentChip = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f0f0f0;
    border-radius: 8px;
    min-height: 44px;
`;

const FragmentType = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
`;

const FragmentValue = styled.span`
    flex: 1;
    font-size: 14px;
    color: #333;
`;

const RemoveButton = styled.button`
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
    color: #ff3b30;
    font-size: 20px;
    transition: background-color 0.15s;

    &:hover {
        background: rgba(255, 59, 48, 0.1);
    }

    &:active {
        background: rgba(255, 59, 48, 0.2);
    }
`;

const AddFragmentSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: #fafafa;
    border: 1px dashed #ddd;
    border-radius: 8px;
`;

const SectionTitle = styled.h4`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #666;
`;

const FormRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
`;

const Input = styled.input`
    flex: 1;
    min-width: 200px;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    min-height: 44px;

    &:focus {
        outline: 2px solid rgba(0, 122, 255, 0.2);
        border-color: #007aff;
    }
`;

const Select = styled.select`
    flex: 1;
    min-width: 150px;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    min-height: 44px;
    background: white;

    &:focus {
        outline: 2px solid rgba(0, 122, 255, 0.2);
        border-color: #007aff;
    }
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 44px;
    min-height: 44px;
    padding: 10px 16px;
    background: #007aff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
        background: #0051d5;
    }

    &:active {
        background: #003d99;
        transform: scale(0.98);
    }

    &:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
`;

const EmptyState = styled.div`
    padding: 20px;
    text-align: center;
    color: #999;
    font-size: 14px;
`;

export const SearchFragmentBuilder: React.FC<SearchFragmentBuilderProps> = ({
    fragments = [],
    onChange,
    availableTags = [],
    className,
    style,
}) => {
    const [nameInput, setNameInput] = useState('');
    const [selectedIncludeTag, setSelectedIncludeTag] = useState('');
    const [selectedExcludeTag, setSelectedExcludeTag] = useState('');
    const [containerTypeValue, setContainerTypeValue] = useState<'containers' | 'items' | 'all'>('all');

    const handleRemoveFragment = useCallback(
        (index: number) => {
            const newFragments = [...fragments];
            newFragments.splice(index, 1);
            onChange?.(newFragments);
        },
        [fragments, onChange]
    );

    const handleAddNameFragment = useCallback(() => {
        if (nameInput.trim()) {
            onChange?.([...fragments, { type: 'name', value: nameInput.trim() }]);
            setNameInput('');
        }
    }, [nameInput, fragments, onChange]);

    const handleAddTagInclude = useCallback(() => {
        if (selectedIncludeTag) {
            onChange?.([...fragments, { type: 'tagInclude', tagIds: [selectedIncludeTag] }]);
            setSelectedIncludeTag('');
        }
    }, [selectedIncludeTag, fragments, onChange]);

    const handleAddTagExclude = useCallback(() => {
        if (selectedExcludeTag) {
            onChange?.([...fragments, { type: 'tagExclude', tagIds: [selectedExcludeTag] }]);
            setSelectedExcludeTag('');
        }
    }, [selectedExcludeTag, fragments, onChange]);

    const handleAddContainerType = useCallback(() => {
        onChange?.([...fragments, { type: 'containerType', value: containerTypeValue }]);
    }, [containerTypeValue, fragments, onChange]);

    const getFragmentDisplay = (fragment: SearchFragment): { type: string; value: string } => {
        switch (fragment.type) {
            case 'name':
                return { type: 'Name', value: `"${fragment.value}"` };
            case 'tagInclude':
                return {
                    type: 'Has Tag',
                    value: fragment.tagIds.map((id) => availableTags.find((t) => t._id === id)?.name ?? id).join(', '),
                };
            case 'tagExclude':
                return {
                    type: 'Not Tag',
                    value: fragment.tagIds.map((id) => availableTags.find((t) => t._id === id)?.name ?? id).join(', '),
                };
            case 'containerType':
                return {
                    type: 'Type',
                    value: fragment.value === 'all' ? 'All' : fragment.value === 'containers' ? 'Containers' : 'Items',
                };
            case 'containerScope':
                return { type: 'Scope', value: fragment.containerRootId ?? 'All' };
            case 'property':
                return { type: 'Property', value: `${fragment.field} = ${fragment.value}` };
            default:
                return { type: 'Unknown', value: '' };
        }
    };

    return (
        <Container className={className} style={style}>
            {fragments.length > 0 ? (
                <FragmentList>
                    {fragments.map((fragment, index) => {
                        const display = getFragmentDisplay(fragment);
                        return (
                            <FragmentChip key={index}>
                                <FragmentType>{display.type}:</FragmentType>
                                <FragmentValue>{display.value}</FragmentValue>
                                <RemoveButton
                                    onClick={() => handleRemoveFragment(index)}
                                    aria-label="Remove filter"
                                    type="button"
                                >
                                    ✕
                                </RemoveButton>
                            </FragmentChip>
                        );
                    })}
                </FragmentList>
            ) : (
                <EmptyState>No search filters added yet</EmptyState>
            )}

            <AddFragmentSection>
                <SectionTitle>Add Filter</SectionTitle>

                {/* Name filter */}
                <FormRow>
                    <Input
                        type="text"
                        placeholder="Search by name..."
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddNameFragment();
                            }
                        }}
                    />
                    <AddButton onClick={handleAddNameFragment} disabled={!nameInput.trim()} type="button">
                        + Name
                    </AddButton>
                </FormRow>

                {/* Tag include filter */}
                {availableTags.length > 0 && (
                    <FormRow>
                        <Select value={selectedIncludeTag} onChange={(e) => setSelectedIncludeTag(e.target.value)}>
                            <option value="">Select tag to include...</option>
                            {availableTags.map((tag) => (
                                <option key={tag._id} value={tag._id}>
                                    {tag.name}
                                </option>
                            ))}
                        </Select>
                        <AddButton onClick={handleAddTagInclude} disabled={!selectedIncludeTag} type="button">
                            + Has Tag
                        </AddButton>
                    </FormRow>
                )}

                {/* Tag exclude filter */}
                {availableTags.length > 0 && (
                    <FormRow>
                        <Select value={selectedExcludeTag} onChange={(e) => setSelectedExcludeTag(e.target.value)}>
                            <option value="">Select tag to exclude...</option>
                            {availableTags.map((tag) => (
                                <option key={tag._id} value={tag._id}>
                                    {tag.name}
                                </option>
                            ))}
                        </Select>
                        <AddButton onClick={handleAddTagExclude} disabled={!selectedExcludeTag} type="button">
                            + Not Tag
                        </AddButton>
                    </FormRow>
                )}

                {/* Container type filter */}
                <FormRow>
                    <Select value={containerTypeValue} onChange={(e) => setContainerTypeValue(e.target.value as any)}>
                        <option value="all">All types</option>
                        <option value="containers">Containers only</option>
                        <option value="items">Items only</option>
                    </Select>
                    <AddButton onClick={handleAddContainerType} type="button">
                        + Type
                    </AddButton>
                </FormRow>
            </AddFragmentSection>
        </Container>
    );
};

export default SearchFragmentBuilder;
