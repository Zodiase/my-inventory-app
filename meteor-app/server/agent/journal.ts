/**
 * Durable ordering for agent request events that can be used as a search barrier.
 * The existing exclusive agent writer makes sequence allocation serial; the event
 * collection itself remains the source of truth across process restarts.
 */
import { Mongo } from 'meteor/mongo';

import type { Event } from './service';

export const agentRequestEvents = new Mongo.Collection<Event>('agent_requests');

export const nextAgentJournalSequence = async (): Promise<number> => {
    const latest = await agentRequestEvents.findOneAsync(
        { journalSequence: { $exists: true } },
        { sort: { journalSequence: -1 } }
    );
    return (latest?.journalSequence ?? 0) + 1;
};

/** Only completed events without a gap may be covered by a successful full rebuild. */
export const completedAgentJournalPrefix = async (): Promise<number> => {
    const events = await agentRequestEvents.find(
        { journalSequence: { $exists: true } },
        { sort: { journalSequence: 1 } }
    ).fetchAsync();
    let expected = 1;
    for (const event of events) {
        if (event.journalSequence !== expected || event.status !== 'completed') break;
        expected++;
    }
    return expected - 1;
};
