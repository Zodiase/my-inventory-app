/**
 * Owns the scoped capture input and explicit focus lifecycle for scanner views.
 * The caller supplies a pure reducer; capture never attaches to global typing or
 * resumes automatically. Proof and app simulation use the same tap/scan events.
 */
import { useCallback, useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';

import { attachCapture } from './adapter';
import type { Action, Event, State } from './model';

export function useCaptureSession<T extends State, E>(
    initial: () => T,
    reducer: (state: T, event: Event | E) => T
): {
    state: T;
    current: MutableRefObject<T>;
    sink: RefObject<HTMLInputElement>;
    send: (event: Event | E) => void;
    action: (value: Action) => void;
} {
    const [state, setState] = useState(initial);
    const current = useRef(state);
    const sink = useRef<HTMLInputElement>(null);
    const send = useCallback(
        (event: Event | E): void => {
            const next = reducer(current.current, event);
            current.current = next;
            setState(next);
        },
        [reducer]
    );
    useEffect(() => {
        const input = sink.current;
        if (input === null) return;
        return attachCapture(input, () => current.current, send);
    }, [send]);
    const action = (value: Action): void => {
        send({ type: 'action', action: value, origin: 'tap', localGesture: true });
        if (value === 'start' || value === 'resume') {
            sink.current?.focus({ preventScroll: true });
            if (
                document.hidden ||
                document.activeElement !== sink.current ||
                document.querySelector('dialog[open]') !== null
            )
                send({ type: 'pause', reason: 'Capture focus unavailable. Resume explicitly when visible.' });
        }
    };
    return { state, current, sink, send, action };
}
