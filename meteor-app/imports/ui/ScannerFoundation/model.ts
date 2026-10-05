/**
 * Models explicit, bounded scan sessions without DOM, clocks, or inventory writes.
 * Capture order and resolution order are separate; epoch and attempt tokens prevent
 * stale asynchronous results from changing a newer session. Hardware profiles must
 * be qualified separately from this synthetic Enter-delimited protocol.
 */
export type Capture = 'off' | 'paused' | 'draining' | 'ready' | 'collecting';
export type Kind = 'item' | 'container' | 'product' | 'command' | 'invalid';
export type Action = 'inspect-demo' | 'show-actions' | 'pause' | 'exit' | 'start' | 'resume';
export type Outcome = 'pending' | 'resolved' | 'unknown' | 'error' | 'cancelled' | 'rejected' | 'discarded';
export interface Read {
    id: string;
    sequence: number;
    epoch: number;
    kind: Kind;
    value: string;
    provenance: 'input' | 'paste' | 'tap';
    outcome: Outcome;
    detail: string;
    attempt: number;
    corrected: boolean;
    attempts: Array<{ attempt: number; outcome: Outcome; detail: string }>;
}
export interface State {
    epoch: number;
    sequence: number;
    capture: Capture;
    buffer: string;
    uncertain: boolean;
    reason: string;
    mode: 'inspect-demo' | 'show-actions';
    reads: Read[];
    actions: Array<{ action: Action; origin: 'tap' | 'scan'; epoch: number }>;
    provenance: 'input' | 'paste';
}
export const limits = { frame: 512, records: 100, pending: 8, attempts: 3, inactivityMs: 2000 };
export const initialState = (): State => ({
    epoch: 0,
    sequence: 0,
    capture: 'off',
    buffer: '',
    uncertain: false,
    reason: 'Start a synthetic session.',
    mode: 'inspect-demo',
    reads: [],
    actions: [],
    provenance: 'input',
});
const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const identity = new RegExp(`^(item|container): (${uuid})$`, 'u');
export const commands: readonly Action[] = ['inspect-demo', 'show-actions', 'pause', 'exit'];
const firstPrintable = 32;
const deleteCode = 127;
function hasControls(value: string): boolean {
    return Array.from(value).some((char) => {
        const code = char.codePointAt(0) ?? 0;
        return code < firstPrintable || code === deleteCode;
    });
}
export function classify(value: string): { kind: Kind; action?: Action } {
    if (value.length === 0 || value.length > limits.frame || hasControls(value)) return { kind: 'invalid' };
    if (value.startsWith('inventory-action:')) {
        const verb = value.slice('inventory-action:v1:'.length);
        return value.startsWith('inventory-action:v1:') && commands.includes(verb as Action)
            ? { kind: 'command', action: verb as Action }
            : { kind: 'invalid' };
    }
    const match = identity.exec(value);
    if (match !== null) return { kind: match[1] as Kind };
    if (/^[0-9]{8,14}$/u.test(value)) return { kind: 'product' };
    return { kind: 'invalid' };
}
export type Event =
    | { type: 'action'; action: Action; origin: 'tap' | 'scan'; localGesture?: boolean }
    | { type: 'input'; value: string; pasted?: boolean }
    | { type: 'delimiter' }
    | { type: 'pause'; reason: string }
    | { type: 'timeout' }
    | {
          type: 'result';
          id: string;
          epoch: number;
          attempt: number;
          outcome: 'resolved' | 'unknown' | 'error';
          detail: string;
      }
    | { type: 'retry' | 'cancel' | 'correct'; id: string };
function append(
    state: State,
    read: Omit<Read, 'id' | 'sequence' | 'epoch' | 'attempt' | 'corrected' | 'attempts'>
): State {
    if (state.reads.length >= limits.records) return state;
    const sequence = state.sequence + 1;
    return {
        ...state,
        sequence,
        reads: [
            ...state.reads,
            {
                ...read,
                sequence,
                epoch: state.epoch,
                id: `${state.epoch}:${sequence}`,
                attempt: 1,
                corrected: false,
                attempts: [],
            },
        ],
    };
}
function interrupt(state: State, reason: string): State {
    let next = state;
    if (state.buffer !== '')
        next = append(state, {
            kind: 'invalid',
            value: '[partial omitted]',
            provenance: state.provenance,
            outcome: 'rejected',
            detail: reason,
        });
    return {
        ...next,
        buffer: '',
        capture: 'paused',
        uncertain: state.uncertain || state.buffer !== '' || state.capture === 'draining',
        reason,
    };
}
function capacity(state: State): boolean {
    return (
        state.reads.length < limits.records &&
        state.reads.filter((read) => read.outcome === 'pending').length < limits.pending
    );
}
export function reduce(state: State, event: Event): State {
    if (event.type === 'action') {
        const { action, origin } = event;
        if ((action === 'start' || action === 'resume') && (origin !== 'tap' || event.localGesture !== true))
            return state;
        if (origin === 'scan' && state.capture !== 'ready' && state.capture !== 'collecting') return state;
        if (action === 'start' && state.capture !== 'off') return state;
        if (action === 'resume' && state.capture !== 'paused') return state;
        if (state.capture === 'off' && action !== 'start') return state;
        let next = {
            ...state,
            actions: [...state.actions.slice(1 - limits.records), { action, origin, epoch: state.epoch }],
        };
        if (action === 'start')
            return {
                ...next,
                epoch: state.epoch + 1,
                capture: 'ready',
                buffer: '',
                uncertain: false,
                reason: 'Ready for an Enter-delimited synthetic read.',
            };
        if (action === 'resume')
            return {
                ...next,
                capture: state.uncertain ? 'draining' : 'ready',
                reason: state.uncertain
                    ? 'Re-establishing scan boundary; this read will not be added. Scan again when ready.'
                    : 'Ready for an Enter-delimited synthetic read.',
            };
        if (action === 'pause')
            return interrupt(next, 'Paused. Input may type into other fields; it is not captured here.');
        if (action === 'exit' || action !== state.mode) {
            if (state.buffer !== '') next = interrupt(next, 'Partial read interrupted by mode change or exit.');
            next = {
                ...next,
                epoch: state.epoch + 1,
                reads: next.reads.map((read) =>
                    read.outcome === 'pending'
                        ? { ...read, outcome: 'cancelled', detail: 'Session ended or mode changed.' }
                        : read
                ),
            };
        }
        if (action === 'exit')
            return {
                ...next,
                capture: 'off',
                buffer: '',
                uncertain: false,
                reason: 'Exited. Start a new session to capture.',
            };
        return {
            ...next,
            mode: action,
            ...(action !== state.mode
                ? {
                      buffer: '',
                      capture: 'paused',
                      uncertain: next.uncertain,
                      reason: 'Mode changed. Resume explicitly.',
                  }
                : {}),
        };
    }
    if (event.type === 'result')
        return {
            ...state,
            reads: state.reads.map((read) =>
                read.id === event.id &&
                read.epoch === event.epoch &&
                event.epoch === state.epoch &&
                read.attempt === event.attempt &&
                read.outcome === 'pending'
                    ? { ...read, outcome: event.outcome, detail: event.detail }
                    : read
            ),
        };
    if (event.type === 'cancel' || event.type === 'correct' || event.type === 'retry') {
        return {
            ...state,
            reads: state.reads.map((read) => {
                if (read.id !== event.id || read.epoch !== state.epoch) return read;
                if (event.type === 'correct') return { ...read, corrected: true };
                if (event.type === 'cancel' && read.outcome === 'pending')
                    return { ...read, outcome: 'cancelled', detail: 'Cancelled locally; no inventory change.' };
                if (
                    event.type === 'retry' &&
                    read.outcome === 'error' &&
                    read.attempt < limits.attempts &&
                    capacity(state) &&
                    state.capture !== 'off'
                )
                    return {
                        ...read,
                        outcome: 'pending',
                        attempt: read.attempt + 1,
                        attempts: [
                            ...read.attempts,
                            { attempt: read.attempt, outcome: read.outcome, detail: read.detail },
                        ],
                        detail: 'Retry linked to original capture.',
                    };
                return read;
            }),
        };
    }
    if (state.capture === 'off') return state;
    if (event.type === 'pause') return interrupt(state, event.reason);
    if (event.type === 'timeout')
        return state.capture === 'collecting'
            ? interrupt(state, 'Incomplete read timed out; nothing was resolved.')
            : state;
    if (event.type === 'input') {
        if (state.capture === 'paused') return state;
        if (state.capture === 'draining') return { ...state, buffer: '[discarding]' };
        if (!capacity(state))
            return interrupt(state, 'Capacity reached. Resolve pending reads or exit and reload; no read was added.');
        if (event.value.length > limits.frame || hasControls(event.value))
            return interrupt(
                { ...state, buffer: '[invalid]' },
                'Unsupported or oversized frame; re-establish the boundary.'
            );
        return {
            ...state,
            buffer: event.value,
            capture: event.value === '' ? 'ready' : 'collecting',
            provenance: event.pasted === true ? 'paste' : 'input',
        };
    }
    {
        if (state.capture === 'paused') return state;
        if (state.capture === 'draining')
            return {
                ...append(state, {
                    kind: 'invalid',
                    value: '[discard omitted]',
                    provenance: 'input',
                    outcome: 'discarded',
                    detail: 'Boundary recovered; scan again.',
                }),
                capture: 'ready',
                buffer: '',
                uncertain: false,
                reason: 'Boundary recovered. Ready for the next scan.',
            };
        if (state.buffer === '') return state;
        if (!capacity(state)) return interrupt(state, 'Capacity reached; read was not added.');
        const value = state.buffer;
        const classified = classify(value);
        let next: State = { ...state, buffer: '', capture: 'ready', provenance: 'input' };
        next = append(next, {
            kind: classified.kind,
            value: classified.kind === 'invalid' ? '[invalid omitted]' : value,
            provenance: state.provenance,
            outcome:
                classified.kind === 'invalid' ? 'rejected' : classified.kind === 'command' ? 'resolved' : 'pending',
            detail:
                classified.kind === 'invalid'
                    ? 'Unsupported payload; no action or lookup.'
                    : classified.kind === 'command'
                    ? 'Synthetic action dispatched.'
                    : 'Captured; awaiting read-only fixture.',
        });
        if (classified.action !== undefined) return dispatchAction(next, classified.action, { origin: 'scan' });
        return next;
    }
}
export function dispatchAction(
    state: State,
    action: Action,
    context: { origin: 'tap' | 'scan'; localGesture?: boolean }
): State {
    return reduce(state, { type: 'action', action, ...context });
}
export const fixtures: Record<string, { kind: Kind; name: string } | undefined> = {
    'item: 11111111-1111-4111-8111-111111111111': { kind: 'item', name: 'Synthetic item A' },
    'item: 22222222-2222-4222-8222-222222222222': { kind: 'item', name: 'Synthetic item B' },
    'container: 33333333-3333-4333-8333-333333333333': { kind: 'container', name: 'Synthetic container' },
    '00012345678905': { kind: 'product', name: 'Synthetic product code — not an owned item' },
};
