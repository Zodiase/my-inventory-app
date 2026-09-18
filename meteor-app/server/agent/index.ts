/** Register the local agent boundary without exposing its token to client code. */
import type { IncomingMessage, ServerResponse } from 'node:http';

import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

import { agentBackend } from './backend';
import { createAgentHandler } from './http';
import { createAgentService } from './service';

const webApp = WebApp as typeof WebApp & {
    handlers: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>) => void };
};
webApp.handlers.use(
    '/api/agent/v1',
    createAgentHandler(process.env.INVENTORY_AGENT_TOKEN, createAgentService(agentBackend), Meteor.isDevelopment)
);
