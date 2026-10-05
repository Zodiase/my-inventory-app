/**
 * Owns the synthetic keyboard protocol only while its explicit capture field has
 * focus. Browser interruptions pause the model; this adapter never captures keys
 * from unrelated fields, infers device connectivity, or restores focus itself.
 */
import { type Event, type State, limits } from './model';
export function attachCapture(input: HTMLInputElement, state: () => State, send: (event: Event) => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined = undefined;
    let pasted = false;
    const clear = (): void => {
        clearTimeout(timer);
    };
    const onInput = (): void => {
        send({ type: 'input', value: input.value, pasted });
        clear();
        if (state().capture === 'collecting')
            timer = setTimeout(() => {
                send({ type: 'timeout' });
            }, limits.inactivityMs);
    };
    const onPaste = (): void => {
        pasted = true;
    };
    const onKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            pause('Escape paused capture. Resume explicitly.');
            return;
        }
        if (
            event.key !== 'Enter' ||
            event.repeat ||
            event.isComposing ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.shiftKey
        )
            return;
        if (state().capture === 'off' || state().capture === 'paused') return;
        event.preventDefault();
        clear();
        if (
            !input.isConnected ||
            document.activeElement !== input ||
            document.hidden ||
            !document.hasFocus() ||
            document.querySelector('dialog[open]') !== null
        ) {
            pause('Capture context interrupted. Resume explicitly.');
            return;
        }
        send({ type: 'delimiter', continuationAllowed: true });
        pasted = false;
    };
    const pause = (reason: string): void => {
        clear();
        pasted = false;
        send({ type: 'pause', reason });
    };
    const onBlur = (): void => {
        pause('Capture focus left. Resume explicitly; scanner input may type into the focused field.');
    };
    const onPageHide = (): void => {
        pause('Page left. Return does not resume capture; retained memory is not durable storage.');
    };
    const onWindowBlur = (): void => {
        pause('Window lost focus. Resume explicitly.');
    };
    const onVisibility = (): void => {
        if (document.hidden) pause('Page hidden. Resume explicitly.');
    };
    const onComposition = (): void => {
        pause('Composition input is not a qualified scan frame.');
    };
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKey);
    input.addEventListener('paste', onPaste);
    input.addEventListener('blur', onBlur);
    input.addEventListener('compositionstart', onComposition);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
        clear();
        input.removeEventListener('input', onInput);
        input.removeEventListener('keydown', onKey);
        input.removeEventListener('paste', onPaste);
        input.removeEventListener('blur', onBlur);
        input.removeEventListener('compositionstart', onComposition);
        window.removeEventListener('blur', onWindowBlur);
        window.removeEventListener('pagehide', onPageHide);
        document.removeEventListener('visibilitychange', onVisibility);
    };
}
