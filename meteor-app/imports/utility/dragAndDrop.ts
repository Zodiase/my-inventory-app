import { type RefObject, useEffect, useState } from 'react';

// Drag and drop constants
const DRAG_MOVE_THRESHOLD_PX = 10; // Movement threshold to cancel drag start
const DRAG_START_DELAY_MS = 200; // Default delay before drag starts

// Visual constants exported for use in drag/drop styling
export const DRAG_OPACITY = 0.5; // Opacity of dragged element
export const DROP_HOVER_OPACITY = 0.9; // Opacity when draggable is over drop target
export const DROP_HIGHLIGHT_OFFSET_PX = 16; // Visual offset for drop highlight

/**
 * Drag state information
 */
export interface DragState {
    /**
     * Whether a drag operation is currently active
     */
    isDragging: boolean;

    /**
     * Data associated with the dragged item
     */
    dragData: unknown;

    /**
     * Current touch position during drag
     */
    position: { x: number; y: number } | null;
}

/**
 * Drop target state
 */
export interface DropTargetState {
    /**
     * Whether this drop target is currently being dragged over
     */
    isOver: boolean;

    /**
     * Whether this drop target can accept the current drag item
     */
    canDrop: boolean;
}

/**
 * Configuration for draggable element
 */
export interface DraggableOptions {
    /**
     * Data to associate with this draggable item
     */
    data: unknown;

    /**
     * Whether dragging is enabled
     * @default true
     */
    enabled?: boolean;

    /**
     * Delay in ms before drag starts (helps distinguish from scroll)
     * @default 200
     */
    delay?: number;
}

/**
 * Configuration for drop target element
 */
export interface DropTargetOptions<T = unknown> {
    /**
     * Whether this drop target is enabled
     * @default true
     */
    enabled?: boolean;

    /**
     * Function to determine if drag data can be dropped here
     */
    canDrop?: (dragData: T) => boolean;

    /**
     * Callback when item is dropped on this target
     */
    onDrop?: (dragData: T) => void;
}

/**
 * Hook for making an element draggable via touch
 *
 * @remarks
 * Provides touch-based drag functionality with visual feedback.
 * Uses a delay to distinguish drag from scroll gestures.
 *
 * @example
 * ```tsx
 * const itemRef = useRef<HTMLDivElement>(null);
 * const { isDragging } = useDraggable(itemRef, {
 *   data: { itemId: '123' },
 *   delay: 200,
 * });
 *
 * return (
 *   <div ref={itemRef} style={{ opacity: isDragging ? 0.5 : 1 }}>
 *     Drag me
 *   </div>
 * );
 * ```
 */
export function useDraggable(elementRef: RefObject<HTMLElement>, options: DraggableOptions): DragState {
    const { data, enabled = true, delay = DRAG_START_DELAY_MS } = options;
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const element = elementRef.current;
        if (element === null) return;

        let dragTimer: NodeJS.Timeout | null = null;
        let startPos: { x: number; y: number } | null = null;

        const handleTouchStart = (event: TouchEvent): void => {
            const touch = event.touches[0];

            startPos = { x: touch.clientX, y: touch.clientY };

            // Start drag after delay
            dragTimer = setTimeout(() => {
                setIsDragging(true);
                setPosition(startPos);
                // Dispatch custom event for drop targets to listen
                window.dispatchEvent(
                    new CustomEvent('dragstart', {
                        detail: { data },
                    })
                );
            }, delay);
        };

        const handleTouchMove = (event: TouchEvent): void => {
            if (dragTimer !== null) {
                // Movement before delay cancels drag
                const touch = event.touches[0];
                // Defensive check: TypeScript types this as always defined, but runtime may differ
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (touch !== undefined && startPos !== null) {
                    const dx = Math.abs(touch.clientX - startPos.x);
                    const dy = Math.abs(touch.clientY - startPos.y);
                    if (dx > DRAG_MOVE_THRESHOLD_PX || dy > DRAG_MOVE_THRESHOLD_PX) {
                        clearTimeout(dragTimer);
                        dragTimer = null;
                    }
                }
            }

            if (isDragging) {
                const touch = event.touches[0];
                // Defensive check: TypeScript types this as always defined, but runtime may differ
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (touch !== undefined) {
                    setPosition({ x: touch.clientX, y: touch.clientY });
                    // Prevent scrolling during drag
                    event.preventDefault();

                    // Dispatch move event for drop targets
                    window.dispatchEvent(
                        new CustomEvent('dragmove', {
                            detail: {
                                data,
                                x: touch.clientX,
                                y: touch.clientY,
                            },
                        })
                    );
                }
            }
        };

        const handleTouchEnd = (event: TouchEvent): void => {
            if (dragTimer !== null) {
                clearTimeout(dragTimer);
                dragTimer = null;
            }

            if (isDragging) {
                const touch = event.changedTouches[0];
                // Defensive check: TypeScript types this as always defined, but runtime may differ
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (touch !== undefined) {
                    // Dispatch drop event
                    window.dispatchEvent(
                        new CustomEvent('dragend', {
                            detail: {
                                data,
                                x: touch.clientX,
                                y: touch.clientY,
                            },
                        })
                    );
                }
                setIsDragging(false);
                setPosition(null);
            }
        };

        const handleTouchCancel = (): void => {
            if (dragTimer !== null) {
                clearTimeout(dragTimer);
                dragTimer = null;
            }
            setIsDragging(false);
            setPosition(null);
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });
        element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

        return () => {
            if (dragTimer !== null) {
                clearTimeout(dragTimer);
            }
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchCancel);
        };
    }, [elementRef, data, enabled, delay, isDragging]);

    return {
        isDragging,
        dragData: data,
        position,
    };
}

/**
 * Hook for making an element a drop target
 *
 * @remarks
 * Listens for drag events and provides visual feedback when dragged over.
 * Calls onDrop when a valid item is dropped.
 *
 * @example
 * ```tsx
 * const targetRef = useRef<HTMLDivElement>(null);
 * const { isOver, canDrop } = useDropTarget(targetRef, {
 *   canDrop: (data) => data.type === 'item',
 *   onDrop: (data) => console.log('Dropped:', data),
 * });
 *
 * return (
 *   <div
 *     ref={targetRef}
 *     style={{
 *       background: isOver && canDrop ? 'lightgreen' : 'white',
 *       border: canDrop ? '2px dashed blue' : 'none',
 *     }}
 *   >
 *     Drop here
 *   </div>
 * );
 * ```
 */
export function useDropTarget<T = unknown>(
    elementRef: RefObject<HTMLElement>,
    options: DropTargetOptions<T>
): DropTargetState {
    const { enabled = true, canDrop, onDrop } = options;
    const [isOver, setIsOver] = useState(false);
    const [dragData, setDragData] = useState<T | null>(null);

    const canAcceptDrop = dragData !== null && (canDrop === undefined || canDrop(dragData));

    useEffect(() => {
        if (!enabled) return;

        const element = elementRef.current;
        if (element === null) return;

        const handleDragStart = (event: Event): void => {
            const customEvent = event as CustomEvent;
            // CustomEvent detail is typed as any by the DOM API
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            setDragData(customEvent.detail.data as T);
        };

        const handleDragMove = (event: Event): void => {
            const customEvent = event as CustomEvent;
            const { x, y } = customEvent.detail as { x: number; y: number };

            // Check if drag is over this element
            const rect = element.getBoundingClientRect();
            const over = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

            setIsOver(over);
        };

        const handleDragEnd = (event: Event): void => {
            const customEvent = event as CustomEvent;
            const { data, x, y } = customEvent.detail as { data: T; x: number; y: number };

            // Check if dropped on this element
            const rect = element.getBoundingClientRect();
            const over = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

            if (over && canAcceptDrop && onDrop !== undefined) {
                onDrop(data);
            }

            setIsOver(false);
            setDragData(null);
        };

        window.addEventListener('dragstart', handleDragStart);
        window.addEventListener('dragmove', handleDragMove);
        window.addEventListener('dragend', handleDragEnd);

        return () => {
            window.removeEventListener('dragstart', handleDragStart);
            window.removeEventListener('dragmove', handleDragMove);
            window.removeEventListener('dragend', handleDragEnd);
        };
    }, [elementRef, enabled, canDrop, onDrop, canAcceptDrop]);

    return {
        isOver,
        canDrop: canAcceptDrop,
    };
}
