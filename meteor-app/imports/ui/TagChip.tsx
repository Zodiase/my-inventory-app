import { Box, Button, type BoxProps } from 'grommet';
import { Close } from 'grommet-icons';
import type { ComponentProps } from 'react';

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
export function TagChip({ tagName, onRemove, disabled = false, color = 'brand', ...boxProps }: TagChipProps) {
    return (
        <Box
            direction="row"
            align="center"
            background={disabled ? 'light-4' : { color, opacity: 'weak' }}
            pad={{ horizontal: 'small', vertical: 'xsmall' }}
            round="medium"
            gap="xsmall"
            {...boxProps}
        >
            <Box
                as="span"
                style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: disabled ? '#999' : '#333',
                }}
            >
                {tagName}
            </Box>
            {onRemove !== undefined && (
                <Button
                    icon={<Close size="small" color={disabled ? 'light-6' : 'dark-3'} />}
                    onClick={onRemove}
                    disabled={disabled}
                    plain
                    style={{
                        minWidth: '44px',
                        minHeight: '44px',
                        padding: '12px',
                    }}
                    aria-label={`Remove ${tagName} tag`}
                />
            )}
        </Box>
    );
}
