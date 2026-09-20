/**
 * Shared breadcrumb trail for inventory hierarchy navigation.
 * Keeps the root anchor fixed while a deep ancestor path uses a right-prioritized,
 * horizontally scrollable viewport so the nearest location remains visible.
 * By default the final crumb is static; container-only paths can keep it navigable.
 */
import { Home } from 'grommet-icons';
import React, { useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import type { InventoryItem } from '/imports/model/InventoryItem';

const BreadcrumbContainer = styled.nav`
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background-color: #f5f5f5;
    border-radius: 8px;
    min-width: 0;
    overflow: hidden;
`;

const RootCrumb = styled.span`
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    min-width: 0;
`;

const BreadcrumbPathViewport = styled.span<{ $overflowing: boolean }>`
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    direction: ${(props) => (props.$overflowing ? 'rtl' : 'ltr')};
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
        display: none;
    }
`;

const BreadcrumbPath = styled.span`
    display: flex;
    align-items: center;
    width: max-content;
    direction: ltr;
`;

const BreadcrumbGroup = styled.span`
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    min-width: 0;
`;

const BreadcrumbButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
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
    gap: 6px;
    min-height: 44px;
    padding: 8px 12px;
    font-size: 16px;
    color: #333;
    white-space: nowrap;
    max-width: min(42vw, 32rem);
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Separator = styled.span`
    color: #999;
    font-size: 18px;
    user-select: none;
    flex: 0 0 auto;
`;

const HomeIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    padding: 0;
`;

export interface BreadcrumbTrailProps {
    /** Path from root to current item (root first, current last) */
    path: InventoryItem[];

    /** Callback when a breadcrumb is clicked */
    onNavigate?: (item: InventoryItem) => void;

    /** Callback when the root breadcrumb is clicked */
    onNavigateRoot?: () => void;

    /** Show home icon for root instead of text */
    showHomeIcon?: boolean;

    /** Whether the final crumb is the current location and should be static text */
    lastCrumbIsCurrent?: boolean;

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
 *   lastCrumbIsCurrent
 * />
 * ```
 */
export const BreadcrumbTrail: React.FC<BreadcrumbTrailProps> = ({
    path,
    onNavigate,
    onNavigateRoot,
    showHomeIcon = false,
    lastCrumbIsCurrent = true,
    className,
}) => {
    const pathViewportRef = useRef<HTMLSpanElement>(null);
    const [pathOverflows, setPathOverflows] = useState(false);

    useLayoutEffect(() => {
        const viewport = pathViewportRef.current;
        if (viewport === null) return;

        const updateOverflowState = (): void => {
            setPathOverflows(viewport.scrollWidth > viewport.clientWidth + 1);
        };

        updateOverflowState();
        const observer = new ResizeObserver(updateOverflowState);
        observer.observe(viewport);

        return () => {
            observer.disconnect();
        };
    }, [path]);

    if (path.length === 0 && (!showHomeIcon || onNavigateRoot === undefined)) {
        return null;
    }

    const handleClick = (item: InventoryItem, index: number): void => {
        // Don't navigate to the current item (last in path)
        if (lastCrumbIsCurrent && index === path.length - 1) {
            return;
        }

        if (typeof onNavigate !== 'undefined') {
            onNavigate(item);
        }
    };

    return (
        <BreadcrumbContainer className={className}>
            {showHomeIcon && onNavigateRoot !== undefined && (
                <RootCrumb className="breadcrumb-root">
                    <BreadcrumbButton type="button" onClick={onNavigateRoot} aria-label="Navigate to all items">
                        <HomeIcon className="breadcrumb-home-icon">
                            <Home size="medium" />
                        </HomeIcon>
                        <span className="breadcrumb-root-label">All Items</span>
                    </BreadcrumbButton>
                    {path.length > 0 && <Separator className="breadcrumb-separator">›</Separator>}
                </RootCrumb>
            )}

            {path.length > 0 && (
                <BreadcrumbPathViewport
                    ref={pathViewportRef}
                    className="breadcrumb-path-viewport"
                    $overflowing={pathOverflows}
                    data-overflowing={pathOverflows ? 'true' : 'false'}
                >
                    <BreadcrumbPath className="breadcrumb-path">
                        {path.map((item, index) => {
                            const isLast = index === path.length - 1;

                            return (
                                <BreadcrumbGroup className="breadcrumb-group" key={item._id}>
                                    {index > 0 && <Separator className="breadcrumb-separator">›</Separator>}

                                    {isLast && lastCrumbIsCurrent ? (
                                        <BreadcrumbText title={item.name}>{item.name}</BreadcrumbText>
                                    ) : (
                                        <BreadcrumbButton
                                            type="button"
                                            onClick={() => {
                                                handleClick(item, index);
                                            }}
                                            aria-label={`Navigate to ${item.name}`}
                                            title={item.name}
                                        >
                                            {item.name}
                                        </BreadcrumbButton>
                                    )}
                                </BreadcrumbGroup>
                            );
                        })}
                    </BreadcrumbPath>
                </BreadcrumbPathViewport>
            )}
        </BreadcrumbContainer>
    );
};

export default BreadcrumbTrail;
