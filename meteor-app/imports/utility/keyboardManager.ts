/**
 * Keyboard visibility management utility for mobile devices.
 *
 * Provides utilities to:
 * - Detect when virtual keyboard appears/disappears
 * - Scroll input fields into view when focused
 * - Adjust viewport to prevent keyboard from obscuring content
 * - Dismiss keyboard programmatically
 *
 * This is particularly important on iOS where the virtual keyboard
 * can obscure up to 50% of the screen.
 */

import { useState, useEffect } from 'react';

/**
 * Scroll an element into view with keyboard-safe padding.
 * Ensures the element remains visible even when keyboard appears.
 *
 * @param element - The DOM element to scroll into view
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 *
 * <input
 *   ref={inputRef}
 *   onFocus={() => scrollIntoViewWithKeyboard(inputRef.current)}
 * />
 * ```
 */
export function scrollIntoViewWithKeyboard(
    element: HTMLElement | null,
    options: {
        /** Extra padding from top in pixels (default: 20) */
        topPadding?: number;
        /** Extra padding from bottom in pixels for keyboard (default: 300) */
        bottomPadding?: number;
        /** Smooth or instant scroll (default: smooth) */
        behavior?: ScrollBehavior;
    } = {}
): void {
    if (element === null) return;

    const { topPadding = 20, bottomPadding = 300, behavior = 'smooth' } = options;

    // Get element position relative to viewport
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Calculate if element is obscured by keyboard
    const elementBottom = rect.bottom + bottomPadding;
    const elementTop = rect.top - topPadding;

    // Only scroll if element is outside visible area
    if (elementBottom > viewportHeight || elementTop < 0) {
        element.scrollIntoView({
            behavior,
            block: 'center',
            inline: 'nearest',
        });
    }
}

/**
 * Dismiss the virtual keyboard by blurring the active input.
 *
 * @example
 * ```tsx
 * <button onClick={dismissKeyboard}>Done</button>
 * ```
 */
export function dismissKeyboard(): void {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
}

/**
 * Check if the virtual keyboard is likely visible.
 * Uses viewport height changes as a heuristic.
 *
 * Note: This is approximate and may not work on all devices.
 *
 * @returns True if keyboard appears to be visible
 */
export function isKeyboardVisible(): boolean {
    // Check if any input/textarea has focus
    const activeElement = document.activeElement;
    const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable);

    if (!isInputFocused) return false;

    // On iOS, visualViewport API provides accurate keyboard detection
    if ('visualViewport' in window && window.visualViewport !== null) {
        const viewport = window.visualViewport;
        const keyboardHeight = window.innerHeight - viewport.height;
        return keyboardHeight > 100; // Keyboard likely visible if >100px difference
    }

    // Fallback: assume keyboard is visible if input is focused
    return true;
}

/**
 * Add event listener for keyboard visibility changes.
 * Uses the Visual Viewport API when available (iOS Safari 13+).
 *
 * @param callback - Called when keyboard visibility changes
 * @returns Cleanup function to remove the listener
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = onKeyboardVisibilityChange((visible) => {
 *     console.log('Keyboard is', visible ? 'visible' : 'hidden');
 *   });
 *   return cleanup;
 * }, []);
 * ```
 */
export function onKeyboardVisibilityChange(callback: (visible: boolean) => void): () => void {
    // Use Visual Viewport API if available (best for iOS)
    if ('visualViewport' in window && window.visualViewport !== null) {
        const viewport = window.visualViewport;
        let previousHeight = viewport.height;

        const handleResize = (): void => {
            const currentHeight = viewport.height;
            const keyboardHeight = window.innerHeight - currentHeight;

            // Keyboard visible if viewport shrunk by >100px
            const isVisible = keyboardHeight > 100;

            // Only call callback if state changed
            if (currentHeight !== previousHeight) {
                previousHeight = currentHeight;
                callback(isVisible);
            }
        };

        viewport.addEventListener('resize', handleResize);

        return () => {
            viewport.removeEventListener('resize', handleResize);
        };
    }

    // Fallback: monitor focus/blur on input elements
    const handleFocus = (): void => {
        callback(true);
    };

    const handleBlur = (): void => {
        // Delay to allow new input to gain focus
        setTimeout(() => {
            const stillFocused =
                document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement ||
                (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable);

            if (!stillFocused) {
                callback(false);
            }
        }, 100);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
        document.removeEventListener('focusin', handleFocus);
        document.removeEventListener('focusout', handleBlur);
    };
}

/**
 * Prevent viewport zoom on input focus (iOS behavior).
 * Sets font-size to 16px to prevent iOS Safari's auto-zoom.
 *
 * Note: This should be applied via CSS, but is provided as a utility
 * for dynamic inputs.
 *
 * @param element - Input element to configure
 *
 * @example
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 *
 * useEffect(() => {
 *   if (inputRef.current) {
 *     preventInputZoom(inputRef.current);
 *   }
 * }, []);
 * ```
 */
export function preventInputZoom(element: HTMLInputElement | HTMLTextAreaElement): void {
    // iOS Safari auto-zooms if font-size < 16px
    const currentFontSize = window.getComputedStyle(element).fontSize;
    const fontSize = parseFloat(currentFontSize);

    if (fontSize < 16) {
        element.style.fontSize = '16px';
    }
}

/**
 * React hook for keyboard visibility management.
 * Returns the current keyboard visibility state and utilities.
 *
 * @returns Object with keyboard state and utilities
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isVisible, dismiss } = useKeyboardManager();
 *
 *   return (
 *     <div>
 *       {isVisible && <Button onClick={dismiss}>Done</Button>}
 *       <input type="text" />
 *     </div>
 *   );
 * }
 * ```
 */
export function useKeyboardManager(): {
    isVisible: boolean;
    dismiss: () => void;
    scrollIntoView: (element: HTMLElement | null) => void;
} {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const cleanup = onKeyboardVisibilityChange((visible) => {
            setIsVisible(visible);
        });

        return cleanup;
    }, []);

    return {
        isVisible,
        dismiss: dismissKeyboard,
        scrollIntoView: scrollIntoViewWithKeyboard,
    };
}
