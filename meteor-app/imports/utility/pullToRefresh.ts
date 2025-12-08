import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

// Pull-to-refresh rubber-band effect threshold
const RUBBER_BAND_THRESHOLD_PX = 50;
const RUBBER_BAND_DAMPING_FACTOR = 0.5; // Reduces pull distance after threshold

/**
 * Pull-to-refresh utility for iOS-style gesture-based refresh.
 *
 * This module provides a hook and utilities for implementing pull-to-refresh
 * on scrollable containers, similar to iOS Mail/Safari.
 *
 * Features:
 * - Touch-based pull detection with rubber-band effect
 * - Configurable trigger distance (default 80px)
 * - Loading spinner integration
 * - Prevents overscroll during pull
 * - Smooth spring animation on release
 *
 * @remarks
 * Only activates when container is scrolled to top (scrollTop === 0).
 * Uses pointer events for cross-device compatibility.
 *
 * @example
 * ```tsx
 * const MyList = () => {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const { isPulling, isRefreshing } = usePullToRefresh({
 *     containerRef,
 *     onRefresh: async () => {
 *       await fetchData();
 *     }
 *   });
 *
 *   return (
 *     <div ref={containerRef}>
 *       {isRefreshing && <LoadingSpinner />}
 *       {items.map(item => <ItemCard key={item._id} {...item} />)}
 *     </div>
 *   );
 * };
 * ```
 */

/**
 * Configuration for pull-to-refresh hook
 */
export interface PullToRefreshConfig {
    /**
     * Reference to the scrollable container element
     */
    containerRef: RefObject<HTMLElement>;

    /**
     * Async callback triggered when refresh is activated
     */
    onRefresh: () => Promise<void>;

    /**
     * Distance in pixels to trigger refresh (default: 80)
     */
    triggerDistance?: number;

    /**
     * Whether pull-to-refresh is enabled (default: true)
     */
    enabled?: boolean;
}

/**
 * State returned by usePullToRefresh hook
 */
export interface PullToRefreshState {
    /**
     * Whether user is currently pulling (but not yet triggered)
     */
    isPulling: boolean;

    /**
     * Whether refresh is in progress
     */
    isRefreshing: boolean;

    /**
     * Current pull distance in pixels (for custom UI)
     */
    pullDistance: number;

    /**
     * Whether trigger distance has been reached
     */
    isTriggered: boolean;
}

/**
 * React hook for pull-to-refresh functionality.
 *
 * Handles touch/pointer events to detect downward pull gesture when
 * container is scrolled to top. Triggers refresh callback when
 * pull distance exceeds threshold.
 *
 * @param config - Configuration object
 * @returns State object with pulling/refreshing status
 *
 * @remarks
 * - Only activates when scrollTop === 0
 * - Uses requestAnimationFrame for smooth pull animation
 * - Prevents body scroll during pull to avoid bounce artifacts
 * - Automatically resets after refresh completes
 *
 * @example
 * ```tsx
 * const { isPulling, isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
 *   containerRef,
 *   onRefresh: async () => {
 *     await Meteor.callAsync('items.refresh');
 *   },
 *   triggerDistance: 100,
 *   enabled: !isLoading
 * });
 * ```
 */
export function usePullToRefresh({
    containerRef,
    onRefresh,
    triggerDistance = 80,
    enabled = true,
}: PullToRefreshConfig): PullToRefreshState {
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isTriggered, setIsTriggered] = useState(false);

    const startY = useRef<number>(0);
    const currentY = useRef<number>(0);
    const isDragging = useRef(false);

    /**
     * Handle refresh trigger
     */
    const triggerRefresh = useCallback(async () => {
        if (!enabled || isRefreshing) return;

        setIsRefreshing(true);
        setIsPulling(false);
        setPullDistance(0);

        try {
            await onRefresh();
        } catch (error) {
            console.error('Pull-to-refresh error:', error);
        } finally {
            setIsRefreshing(false);
            setIsTriggered(false);
        }
    }, [enabled, isRefreshing, onRefresh]);

    /**
     * Check if container is scrolled to top
     */
    const isAtTop = useCallback((): boolean => {
        if (containerRef.current === null) return false;
        return containerRef.current.scrollTop === 0;
    }, [containerRef]);

    /**
     * Handle pointer down (start of pull)
     */
    const handlePointerDown = useCallback(
        (e: PointerEvent) => {
            if (!enabled || !isAtTop()) return;

            startY.current = e.clientY;
            currentY.current = e.clientY;
            isDragging.current = true;
        },
        [enabled, isAtTop]
    );

    /**
     * Handle pointer move (during pull)
     */
    const handlePointerMove = useCallback(
        (e: PointerEvent) => {
            if (!enabled || !isDragging.current || !isAtTop()) return;

            currentY.current = e.clientY;
            const deltaY = currentY.current - startY.current;

            // Only pull down (positive deltaY)
            if (deltaY > 0) {
                // Prevent default scroll
                e.preventDefault();

                // Apply rubber-band effect (diminishing returns after threshold)
                const rubberBandedDistance =
                    deltaY < RUBBER_BAND_THRESHOLD_PX
                        ? deltaY
                        : RUBBER_BAND_THRESHOLD_PX + (deltaY - RUBBER_BAND_THRESHOLD_PX) * RUBBER_BAND_DAMPING_FACTOR;

                setIsPulling(true);
                setPullDistance(rubberBandedDistance);
                setIsTriggered(rubberBandedDistance >= triggerDistance);
            } else {
                // Reset if pulling up
                setIsPulling(false);
                setPullDistance(0);
                setIsTriggered(false);
            }
        },
        [enabled, isAtTop, triggerDistance]
    );

    /**
     * Handle pointer up (end of pull)
     */
    const handlePointerUp = useCallback(() => {
        if (!enabled || !isDragging.current) return;

        isDragging.current = false;

        if (isTriggered) {
            void triggerRefresh();
        } else {
            // Spring back
            setIsPulling(false);
            setPullDistance(0);
            setIsTriggered(false);
        }
    }, [enabled, isTriggered, triggerRefresh]);

    /**
     * Set up event listeners
     */
    useEffect(() => {
        const container = containerRef.current;
        if (container === null || !enabled) return;

        container.addEventListener('pointerdown', handlePointerDown);
        container.addEventListener('pointermove', handlePointerMove, { passive: false });
        container.addEventListener('pointerup', handlePointerUp);
        container.addEventListener('pointercancel', handlePointerUp);

        return () => {
            container.removeEventListener('pointerdown', handlePointerDown);
            container.removeEventListener('pointermove', handlePointerMove);
            container.removeEventListener('pointerup', handlePointerUp);
            container.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [containerRef, enabled, handlePointerDown, handlePointerMove, handlePointerUp]);

    return {
        isPulling,
        isRefreshing,
        pullDistance,
        isTriggered,
    };
}
