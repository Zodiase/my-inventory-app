/**
 * Pure in-memory existing-item moves, deliberately isolated from inventory APIs.
 * Captured intents bind destination and generation; interruption invalidates
 * pending work, and an item already at the target is an explicit no-op.
 */
import { fixtures, initialState, reduce, type Event, type State } from './model';
export const itemA = 'item: 11111111-1111-4111-8111-111111111111';
export const itemB = 'item: 22222222-2222-4222-8222-222222222222';
export const containerA = 'container: 33333333-3333-4333-8333-333333333333';
export const containerB = 'container: 44444444-4444-4444-8444-444444444444';
export const demoFixtures: typeof fixtures = {
    ...fixtures,
    [containerA]: { kind: 'container', name: 'Demo shelf A' },
    [containerB]: { kind: 'container', name: 'Demo shelf B' },
};
interface Intent {
    epoch: number;
    attempt: number;
    generation: number;
    destination?: string;
}
export interface MoveState extends State {
    destination?: string;
    generation: number;
    intents: Record<string, Intent | undefined>;
    locations: Record<string, string>;
    moves: Array<{ readId: string; item: string; from: string; to: string }>;
}
export type MoveEvent =
    | Event
    | { type: 'resolve-simulation'; id: string; epoch: number; attempt: number; generation: number; fail?: boolean };
export function initialMoveState(): MoveState {
    return {
        ...initialState(),
        generation: 0,
        intents: {},
        locations: { [itemA]: 'Demo staging', [itemB]: 'Demo staging' },
        moves: [],
    };
}
function invalidate(state: MoveState, clearDestination = false): MoveState {
    const next = {
        ...state,
        generation: state.generation + 1,
        intents: {},
        destination: clearDestination ? undefined : state.destination,
    };
    return {
        ...next,
        reads: next.reads.map((read) =>
            read.outcome === 'pending'
                ? {
                      ...read,
                      outcome: 'cancelled',
                      detail: 'Pending simulation cancelled; rescan explicitly. No item moved.',
                  }
                : read
        ),
    };
}
export function reduceMove(state: MoveState, event: MoveEvent): MoveState {
    if (event.type === 'resolve-simulation') {
        const read = state.reads.find((entry) => entry.id === event.id);
        const intent = state.intents[event.id];
        if (
            read === undefined ||
            intent === undefined ||
            read.outcome !== 'pending' ||
            read.epoch !== event.epoch ||
            state.epoch !== event.epoch ||
            read.attempt !== event.attempt ||
            intent.generation !== event.generation ||
            state.generation !== event.generation ||
            !['ready', 'collecting'].includes(state.capture)
        )
            return state;
        const fixture = demoFixtures[read.value];
        let next = state;
        let outcome: 'resolved' | 'unknown' | 'error' = 'resolved';
        let detail = fixture?.name ?? 'Unknown demo identity. Destination unchanged; no item moved.';
        if (event.fail === true) {
            outcome = 'error';
            detail = 'Synthetic lookup failed. Rescan explicitly; no item moved.';
        } else if (fixture === undefined) outcome = 'unknown';
        else if (state.mode === 'move-demo') {
            if (read.kind !== 'item' || fixture.kind !== 'item') {
                outcome = 'error';
                detail = 'An owned item identity is required; product codes cannot move an item.';
            } else if (intent.destination === undefined) {
                outcome = 'error';
                detail = 'Scan a demo destination container first. No item moved.';
            } else if (intent.destination !== state.destination) return state;
            else if (state.locations[read.value] === intent.destination)
                detail = `${fixture.name} already at ${
                    demoFixtures[intent.destination]?.name
                }. No-op; nothing duplicated.`;
            else {
                const from = state.locations[read.value];
                next = {
                    ...state,
                    locations: { ...state.locations, [read.value]: intent.destination },
                    moves: [...state.moves, { readId: read.id, item: read.value, from, to: intent.destination }],
                };
                detail = `Simulated move: ${fixture.name} → ${demoFixtures[intent.destination]?.name}.`;
            }
        }
        const intents = { ...next.intents };
        intents[event.id] = undefined;
        return {
            ...next,
            ...reduce(next, { type: 'result', id: read.id, epoch: read.epoch, attempt: read.attempt, outcome, detail }),
            intents,
        };
    }
    // External result/retry events cannot bypass the bound simulated resolver.
    if (event.type === 'result' || event.type === 'retry') return state;
    let next: MoveState = { ...state, ...reduce(state, event) };
    if (next.mode !== state.mode || next.capture === 'off' || (event.type === 'action' && event.action === 'start'))
        next = invalidate(next, true);
    else if (next.capture === 'paused' && state.capture !== 'paused') next = invalidate(next);
    if (event.type !== 'delimiter' || next.sequence === state.sequence) return next;
    const read = next.reads.at(-1);
    if (read?.outcome !== 'pending') return next;
    const fixture = demoFixtures[read.value];
    if (next.mode === 'move-demo' && read.kind === 'container' && fixture?.kind === 'container') {
        next = {
            ...next,
            ...reduce(next, {
                type: 'result',
                id: read.id,
                epoch: read.epoch,
                attempt: read.attempt,
                outcome: 'resolved',
                detail: `Destination selected: ${fixture.name}. Scan an existing demo item.`,
            }),
        };
        next = invalidate(next);
        return { ...next, destination: read.value };
    }
    return {
        ...next,
        intents: {
            ...next.intents,
            [read.id]: {
                epoch: read.epoch,
                attempt: read.attempt,
                generation: next.generation,
                destination: next.destination,
            },
        },
    };
}
