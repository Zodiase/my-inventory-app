import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { WebSocketServer } from 'ws';

import { expect, test } from '@playwright/test';

import { observeMeteorLoading } from '../helpers/meteor-loading-diagnostics.mjs';

test('retains redacted failure readiness evidence without swallowing the failed assertion', async ({ page }) => {
    const observer = observeMeteorLoading(page);
    const server = createServer((_request, response) => {
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end('<main>Loading… PRIVATE_HOUSEHOLD_CONTENT</main>');
    });
    const sockets = new WebSocketServer({ server, path: '/ddp' });
    sockets.on('connection', (socket) => {
        socket.on('message', () => {
            socket.send(JSON.stringify({ msg: 'ready', subs: ['private-id'] }));
            socket.send(JSON.stringify({ msg: 'nosub', id: 'private-id', error: { reason: 'PRIVATE_ERROR' } }));
            socket.send(JSON.stringify({ msg: 'added', fields: { credential: 'PRIVATE_CREDENTIAL' } }));
        });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Missing fixture listener');
    try {
        await page.goto(`http://127.0.0.1:${address.port}/`);
        await page.evaluate(async () => {
            // Controlled metadata fixture; no real Meteor subscription or database write.
            (window as unknown as { Meteor: unknown }).Meteor = {
                status: () => ({ connected: true }),
                connection: {
                    _subscriptions: {
                        'private-id': {
                            name: 'inventory.identities',
                            ready: false,
                            inactive: false,
                            params: ['PRIVATE_ARGUMENT'],
                        },
                    },
                },
            };
            const socket = new WebSocket(`ws://${location.host}/ddp`);
            await new Promise<void>((resolve) => {
                socket.onopen = () => resolve();
            });
            socket.send(
                JSON.stringify({
                    msg: 'sub',
                    id: 'private-id',
                    name: 'inventory.identities',
                    params: ['PRIVATE_ARGUMENT'],
                })
            );
        });
        let failure: unknown;
        try {
            await expect(page.getByRole('heading', { name: 'Unrendered container' })).toBeVisible({ timeout: 300 });
        } catch (error) {
            failure = error;
        }
        const attachments: { name: string; body: Buffer; contentType: string }[] = [];
        await observer.finish({
            status: 'failed',
            outputPath: test.info().outputPath.bind(test.info()),
            attach: async (name: string, attachment: { path: string; contentType: string }) => {
                attachments.push({ name, body: await readFile(attachment.path), contentType: attachment.contentType });
            },
        });
        expect(failure).toBeInstanceOf(Error);
        expect(attachments).toHaveLength(1);
        expect(attachments[0].name).toBe('meteor-loading-diagnostics');
        const text = attachments[0].body.toString();
        const evidence = JSON.parse(text);
        expect(evidence.samples.at(-1)).toMatchObject({ available: true, connected: true, loading: true });
        expect(evidence.samples.at(-1).subscriptions[0]).toMatchObject({ name: 'inventory.identities', ready: false });
        expect(evidence.events.map((event: { type: string }) => event.type)).toEqual(['sub', 'ready', 'nosub']);
        expect(evidence.events[0].id).toBe(evidence.samples.at(-1).subscriptions[0].id);
        expect(text).not.toMatch(/PRIVATE|private-id|diagnostic.invalid/);
        await test.info().attach('controlled-failure-evidence', attachments[0]);
    } finally {
        await observer.finish({ status: 'passed', attach: async () => {} });
        for (const socket of sockets.clients) socket.terminate();
        sockets.close();
        await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
});

test('does not attach diagnostics for a passing journey and removes its listeners', async ({ page }) => {
    const before = page.listenerCount('websocket');
    const observer = observeMeteorLoading(page);
    let attached = false;
    await observer.finish({
        status: 'passed',
        attach: async () => {
            attached = true;
        },
    });
    expect(attached).toBe(false);
    expect(page.listenerCount('websocket')).toBe(before);
});
