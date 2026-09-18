/**
 * Opt-in loopback HTTP boundary for local agents. Tokens remain server-side;
 * input is bounded before parsing and the service returns stable JSON errors.
 */
import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { AgentError } from './service';

const MIN_TOKEN_LENGTH = 32;
const HTTP = {
    ok: 200,
    invalid: 400,
    unauthorized: 401,
    forbidden: 403,
    disabled: 404,
    method: 405,
    conflict: 409,
    large: 413,
    content: 415,
    internal: 500,
};
const MAX_BYTES = 32768;
const LOOPBACK = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
const MAX_PORT = 65535;
const METEOR_PROXY_HEADERS = ['x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-port', 'x-forwarded-host'];
export const createAgentHandler =
    (token: string | undefined, execute: (input: unknown) => Promise<unknown>, allowMeteorDevelopmentProxy = false) =>
    async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        const send = (status: number, value: unknown): void => {
            res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(value));
        };
        const reject = (status: number, code: string, message: string): void => {
            send(status, { ok: false, error: { code, message } });
        };
        if (token === undefined || token.length < MIN_TOKEN_LENGTH) {
            reject(HTTP.disabled, 'disabled', 'Agent API is disabled');
            return;
        }
        if (!LOOPBACK.includes(req.socket.remoteAddress ?? '')) {
            reject(HTTP.forbidden, 'forbidden', 'Agent API requires a loopback connection');
            return;
        }
        // Meteor's development runner uses http-proxy with xfwd:true. It appends
        // the real caller address; accept only its single loopback hop, never a
        // chain or a remote address supplied through that local proxy.
        const forwardedFor = req.headers['x-forwarded-for'];
        const forwardedPort = req.headers['x-forwarded-port'];
        const proxyHeaders = Object.keys(req.headers).filter((header) => header.startsWith('x-forwarded-'));
        const hasProxyHeaders = proxyHeaders.length > 0;
        const isLocalDevelopmentProxy =
            allowMeteorDevelopmentProxy &&
            proxyHeaders.every((header) => METEOR_PROXY_HEADERS.includes(header)) &&
            typeof forwardedFor === 'string' &&
            LOOPBACK.includes(forwardedFor) &&
            req.headers['x-forwarded-proto'] === 'http' &&
            typeof forwardedPort === 'string' &&
            /^\d+$/.test(forwardedPort) &&
            Number(forwardedPort) > 0 &&
            Number(forwardedPort) <= MAX_PORT;
        if (
            req.headers.origin !== undefined ||
            req.headers.forwarded !== undefined ||
            (hasProxyHeaders && !isLocalDevelopmentProxy)
        ) {
            reject(
                HTTP.forbidden,
                'forbidden',
                'Only direct local requests or the single loopback Meteor development proxy are supported'
            );
            return;
        }
        const supplied = Buffer.from(req.headers.authorization ?? '');
        const expected = Buffer.from(`Bearer ${token}`);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
            reject(HTTP.unauthorized, 'unauthorized', 'Bearer token required');
            return;
        }
        if (req.method !== 'POST') {
            reject(HTTP.method, 'method_not_allowed', 'Use POST');
            return;
        }
        if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
            reject(HTTP.content, 'invalid_input', 'Use application/json');
            return;
        }
        try {
            const chunks: Buffer[] = [];
            let bytes = 0;
            for await (const chunk of req) {
                const buffer = Buffer.from(chunk as Uint8Array);
                bytes += buffer.length;
                if (bytes > MAX_BYTES) {
                    reject(HTTP.large, 'invalid_input', 'Request body exceeds 32768 bytes');
                    return;
                }
                chunks.push(buffer);
            }
            let input: unknown = null;
            try {
                input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch {
                reject(HTTP.invalid, 'invalid_input', 'Invalid JSON');
                return;
            }
            send(HTTP.ok, await execute(input));
        } catch (error) {
            if (error instanceof AgentError) {
                const status =
                    error.code === 'not_found'
                        ? HTTP.disabled
                        : ['conflict', 'busy', 'indeterminate'].includes(error.code)
                        ? HTTP.conflict
                        : HTTP.invalid;
                reject(status, error.code, error.message);
            } else
                reject(
                    HTTP.internal,
                    'internal_error',
                    'Agent operation failed; inspect server state before retrying a mutation'
                );
        }
    };
