import { Box, Button, type BoxProps } from 'grommet';
import { Close } from 'grommet-icons';
import React, { type ReactElement } from 'react';

import { uiTokens } from './theme';

export interface TagChipProps extends Omit<BoxProps, 'onClick'> {
    /** The name of the tag to display */
    tagName: string;
    /** Optional callback when the remove button is clicked */
    onRemove?: () => void;
    /** Whether the chip is in a disabled state */
    disabled?: boolean;
    /** Optional color for the chip (default: 'brand') */
    color?: string;
}

/**
 * TagChip component displays a tag as a small pill/badge with optional remove button.
 *
 * @remarks
 * This is a pure presentational component with no Meteor dependencies.
 * Suitable for displaying tags on items, in lists, or tag selectors.
 * iOS-optimized with 44px minimum tap target for remove button.
 */
export function TagChip({
    tagName,
    onRemove,
    disabled = false,
    color = 'brand',
    ...boxProps
}: TagChipProps): ReactElement {
    return (
        <Box
            direction="row"
            align="center"
            background={disabled ? uiTokens.color.surfaceSubtle : { color, opacity: 'weak' }}
            pad={{ horizontal: 'small', vertical: 'xsmall' }}
            round={uiTokens.radius.pill}
            gap="xsmall"
            {...boxProps}
        >
            <Box
                as="span"
                style={{
                    fontSize: uiTokens.font.sizeSmall,
                    fontWeight: uiTokens.font.weightMedium,
                    color: disabled ? uiTokens.color.textMuted : uiTokens.color.text,
                }}
            >
                {tagName}
            </Box>
            {onRemove !== undefined && (
                <Button
                    icon={<Close size="small" color={disabled ? uiTokens.color.textMuted : uiTokens.color.textWeak} />}
                    onClick={onRemove}
                    disabled={disabled}
                    plain
                    style={{
                        minWidth: uiTokens.size.touchTarget,
                        minHeight: uiTokens.size.touchTarget,
                        padding: uiTokens.space.md,
                    }}
                    aria-label={`Remove ${tagName} tag`}
                />
            )}
        </Box>
    );
}
