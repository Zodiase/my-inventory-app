import { Box, Button, CheckBox, Text } from 'grommet';
import { Add } from 'grommet-icons';
import React from 'react';

import type { TagRecord } from '/imports/model/TagRecord';

/**
 * TagSelector component allows users to select tags to apply to an item.
 *
 * @remarks
 * Pure presentation component with no Meteor dependencies.
 * Shows available tags with checkboxes and allows creating new tags.
 * All touch targets are 44x44px minimum for iOS accessibility.
 */

export interface TagSelectorProps {
    /** Available tags to choose from */
    availableTags: TagRecord[];

    /** IDs of tags currently selected/applied */
    selectedTagIds: string[];

    /** Callback when a tag is toggled on/off */
    onToggleTag?: (tagId: string, isSelected: boolean) => void;

    /** Callback when "Create New Tag" is clicked */
    onCreateNewTag?: () => void;

    /** Whether the selector is disabled (e.g., during async operations) */
    disabled?: boolean;

    /** Optional message to display when no tags are available */
    emptyMessage?: string;
}

/**
 * TagSelector component for selecting tags to apply to items.
 *
 * @example
 * ```tsx
 * const [selectedTags, setSelectedTags] = useState<string[]>(['tag1']);
 *
 * <TagSelector
 *   availableTags={allTags}
 *   selectedTagIds={selectedTags}
 *   onToggleTag={(tagId, isSelected) => {
 *     setSelectedTags(isSelected
 *       ? [...selectedTags, tagId]
 *       : selectedTags.filter(id => id !== tagId)
 *     );
 *   }}
 *   onCreateNewTag={() => setShowCreateDialog(true)}
 * />
 * ```
 */
export const TagSelector: React.FC<TagSelectorProps> = ({
    availableTags,
    selectedTagIds,
    onToggleTag,
    onCreateNewTag,
    disabled = false,
    emptyMessage = 'No tags available',
}) => {
    const handleToggle = (tagId: string, checked: boolean): void => {
        if (onToggleTag !== undefined && !disabled) {
            onToggleTag(tagId, checked);
        }
    };

    return (
        <Box gap="small" pad="small">
            {/* Header */}
            <Box direction="row" justify="between" align="center">
                <Text weight="bold">Select Tags</Text>
                {onCreateNewTag !== undefined && (
                    <Button
                        icon={<Add size="small" />}
                        label="New Tag"
                        onClick={onCreateNewTag}
                        disabled={disabled}
                        size="small"
                        plain={false}
                    />
                )}
            </Box>

            {/* Tag List */}
            {availableTags.length === 0 ? (
                <Box pad="medium" align="center">
                    <Text color="dark-3">{emptyMessage}</Text>
                </Box>
            ) : (
                <Box gap="xsmall" overflow="auto" style={{ maxHeight: '400px', WebkitOverflowScrolling: 'touch' }}>
                    {availableTags.map((tag) => (
                        <Box
                            key={tag._id}
                            pad="small"
                            round="xsmall"
                            background={selectedTagIds.includes(tag._id) ? 'light-2' : undefined}
                            style={{ minHeight: '44px' }}
                        >
                            <CheckBox
                                label={tag.name}
                                checked={selectedTagIds.includes(tag._id)}
                                onChange={(event) => {
                                    handleToggle(tag._id, event.target.checked);
                                }}
                                disabled={disabled}
                            />
                        </Box>
                    ))}
                </Box>
            )}

            {/* Selection Summary */}
            {availableTags.length > 0 && (
                <Box pad={{ top: 'small' }} border={{ side: 'top', color: 'light-4' }}>
                    <Text size="small" color="dark-3">
                        {selectedTagIds.length} of {availableTags.length} tags selected
                    </Text>
                </Box>
            )}
        </Box>
    );
};
