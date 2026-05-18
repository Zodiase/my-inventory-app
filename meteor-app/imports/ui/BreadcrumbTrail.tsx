import React from 'react';
import styled from 'styled-components';

import type { InventoryItem } from '/imports/model/InventoryItem';

/**
 * Breadcrumb trail showing the path from root to current item.
 *
 * @remarks
 * Displays the container hierarchy as a clickable trail.
 * Each item in the path is a button that navigates to that container.
 * The current item (last in path) is not clickable.
 *
 * Touch targets are 44x44px minimum for iOS accessibility.
 */

const BreadcrumbContainer = styled.nav`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background-color: #f5f5f5;
    border-radius: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
`;

const BreadcrumbButton = styled.button`
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 8px 12px;
    background-color: transparent;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    color: #007aff;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.2s ease;

    &:hover {
        background-color: rgba(0, 122, 255, 0.1);
    }

    &:active {
        background-color: rgba(0, 122, 255, 0.2);
    }

    /* iOS-style tap highlight */
    -webkit-tap-highlight-color: rgba(0, 122, 255, 0.2);
`;

const BreadcrumbText = styled.span`
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 8px 12px;
    font-size: 16px;
    color: #333;
    white-space: nowrap;
`;

const Separator = styled.span`
    color: #999;
    font-size: 18px;
    user-select: none;
`;

const HomeIcon = styled.span`
    font-size: 20px;
`;

export interface BreadcrumbTrailProps {
    /** Path from root to current item (root first, current last) */
    path: InventoryItem[];

    /** Callback when a breadcrumb is clicked */
    onNavigate?: (item: InventoryItem) => void;

    /** Show home icon for root instead of text */
    showHomeIcon?: boolean;

    /** Additional CSS class name */
    className?: string;
}

/**
 * BreadcrumbTrail component displays the container hierarchy path.
 *
 * @example
 * ```tsx
 * const path = await getItemPath(itemId);
 * <BreadcrumbTrail
 *   path={path}
 *   onNavigate={(item) => navigateToContainer(item._id)}
 *   showHomeIcon
 * />
 * ```
 */
export const BreadcrumbTrail: React.FC<BreadcrumbTrailProps> = ({
    path,
    onNavigate,
    showHomeIcon = false,
    className,
}) => {
    if (path.length === 0) {
        return null;
    }

    const handleClick = (item: InventoryItem, index: number): void => {
        // Don't navigate to the current item (last in path)
        if (index === path.length - 1) {
            return;
        }

        if (typeof onNavigate !== 'undefined') {
            onNavigate(item);
        }
    };

    return (
        <BreadcrumbContainer className={className}>
            {path.map((item, index) => {
                const isLast = index === path.length - 1;
                const isFirst = index === 0;
                const showHome = showHomeIcon && isFirst && !isLast;

                return (
                    <React.Fragment key={item._id}>
                        {index > 0 && <Separator>›</Separator>}

                        {isLast ? (
                            <BreadcrumbText>{showHome ? <HomeIcon>🏠</HomeIcon> : item.name}</BreadcrumbText>
                        ) : (
                            <BreadcrumbButton
                                type="button"
                                onClick={() => {
                                    handleClick(item, index);
                                }}
                                aria-label={`Navigate to ${item.name}`}
                            >
                                {showHome ? <HomeIcon>🏠</HomeIcon> : item.name}
                            </BreadcrumbButton>
                        )}
                    </React.Fragment>
                );
            })}
        </BreadcrumbContainer>
    );
};

export default BreadcrumbTrail;
