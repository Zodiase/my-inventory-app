import { type RefObject, useEffect } from 'react';

/**
 * Configuration options for swipe-back navigation gesture.
 *
 * @remarks
 * Implements iOS-style edge swipe for hierarchical navigation.
 * Defaults match iOS Human Interface Guidelines for back gesture.
 */
export interface SwipeNavigationOptions {
    /**
     * Minimum horizontal distance (pixels) to trigger navigation
     * @default 100
     */
    threshold?: number;

    /**
     * Maximum vertical deviation allowed while swiping
     * @default 50
     */
    maxVerticalDeviation?: number;

    /**
     * Maximum horizontal start position from left edge (pixels)
     * @default 50
     */
    edgeThreshold?: number;

    /**
     * Whether swipe navigation is enabled
     * @default true
     */
    enabled?: boolean;
}

/**
 * Custom hook for swipe-back navigation gesture detection.
 *
 * @remarks
 * Detects left-to-right swipe gestures starting from the left edge of the container.
 * Follows iOS back gesture pattern - only triggers when swipe starts near left edge
 * and moves horizontally with minimal vertical deviation.
 *
 * This provides a natural, familiar navigation pattern for iOS users navigating
 * up a hierarchy (e.g., from nested location back to parent).
 *
 * @example
 * ```tsx
 * function MyView({ onNavigateUp }: { onNavigateUp: () => void }) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *
 *   useSwipeNavigation(containerRef, {
 *     onSwipeBack: onNavigateUp,
 *     enabled: true, // Disable when at root level
 *   });
 *
 *   return <div ref={containerRef}>...</div>;
 * }
 * ```
 *
 * @param elementRef - React ref to the container element to detect swipes on
 * @param options - Configuration options for swipe detection
 * @param onSwipeBack - Callback invoked when valid swipe-back gesture detected
 */
export function useSwipeNavigation(
    elementRef: RefObject<HTMLElement>,
    options: SwipeNavigationOptions,
    onSwipeBack: () => void
): void {
    const { threshold = 100, maxVerticalDeviation = 50, edgeThreshold = 50, enabled = true } = options;

    useEffect(() => {
        if (!enabled) return;

        const element = elementRef.current;
        if (element === null) return;

        let startX = 0;
        let startY = 0;
        let isSwiping = false;

        const handleTouchStart = (event: TouchEvent): void => {
            const touch = event.touches[0];
            // Defensive check: TypeScript types this as always defined, but runtime may differ
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (touch === undefined) return;

            // Only start tracking if touch begins near left edge
            if (touch.clientX > edgeThreshold) return;

            startX = touch.clientX;
            startY = touch.clientY;
            isSwiping = true;
        };

        const handleTouchMove = (event: TouchEvent): void => {
            if (!isSwiping) return;

            const touch = event.touches[0];
            // Defensive check: TypeScript types this as always defined, but runtime may differ
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (touch === undefined) return;

            const deltaY = Math.abs(touch.clientY - startY);

            // Cancel if moved too much vertically (likely scrolling)
            if (deltaY > maxVerticalDeviation) {
                isSwiping = false;
            }

            // Visual feedback could be added here
            // (e.g., translate the view slightly with deltaX)
        };

        const handleTouchEnd = (event: TouchEvent): void => {
            if (!isSwiping) return;

            const touch = event.changedTouches[0];
            // Defensive check: TypeScript types this as always defined, but runtime may differ
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (touch === undefined) {
                isSwiping = false;
                return;
            }

            const deltaX = touch.clientX - startX;
            const deltaY = Math.abs(touch.clientY - startY);

            // Valid swipe-back: moved right enough, stayed horizontal
            if (deltaX > threshold && deltaY < maxVerticalDeviation) {
                onSwipeBack();
            }

            isSwiping = false;
        };

        const handleTouchCancel = (): void => {
            isSwiping = false;
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: true });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });
        element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchCancel);
        };
    }, [elementRef, threshold, maxVerticalDeviation, edgeThreshold, enabled, onSwipeBack]);
}
