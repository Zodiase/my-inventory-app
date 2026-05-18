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

        const handlePointerDown = (event: PointerEvent): void => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;

            // Only start tracking if the pointer begins near the left edge.
            if (event.clientX > edgeThreshold) return;

            startX = event.clientX;
            startY = event.clientY;
            isSwiping = true;
        };

        const handlePointerMove = (event: PointerEvent): void => {
            if (!isSwiping) return;

            const deltaY = Math.abs(event.clientY - startY);

            // Cancel if moved too much vertically (likely scrolling)
            if (deltaY > maxVerticalDeviation) {
                isSwiping = false;
            }

            // Visual feedback could be added here
            // (e.g., translate the view slightly with deltaX)
        };

        const handlePointerUp = (event: PointerEvent): void => {
            if (!isSwiping) return;

            const deltaX = event.clientX - startX;
            const deltaY = Math.abs(event.clientY - startY);

            // Valid swipe-back: moved right enough, stayed horizontal
            if (deltaX > threshold && deltaY < maxVerticalDeviation) {
                onSwipeBack();
            }

            isSwiping = false;
        };

        const handlePointerCancel = (): void => {
            isSwiping = false;
        };

        element.addEventListener('pointerdown', handlePointerDown);
        element.addEventListener('pointermove', handlePointerMove);
        element.addEventListener('pointerup', handlePointerUp);
        element.addEventListener('pointercancel', handlePointerCancel);

        return () => {
            element.removeEventListener('pointerdown', handlePointerDown);
            element.removeEventListener('pointermove', handlePointerMove);
            element.removeEventListener('pointerup', handlePointerUp);
            element.removeEventListener('pointercancel', handlePointerCancel);
        };
    }, [elementRef, threshold, maxVerticalDeviation, edgeThreshold, enabled, onSwipeBack]);
}
