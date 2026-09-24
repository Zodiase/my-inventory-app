#!/usr/bin/env node
/**
 * Sends one JSON inventory request through the selected Compose app container.
 * The token stays in the container environment; transport failures never retry writes.
 */
import { readFileSync, existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { operationKind } from './inventory-agent-operations.mjs';

const usage = 'Usage: inventory-agent.mjs --project-dir /absolute/checkout [--allow-mutation] < request.json';
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
    console.log(usage);
    process.exit(0);
}
if (
    ![2, 3].includes(args.length) ||
    args[0] !== '--project-dir' ||
    (args.length === 3 && args[2] !== '--allow-mutation')
) {
    console.error(usage);
    process.exit(64);
}
const project = args[1];
if (!isAbsolute(project) || !existsSync(join(project, 'docker-compose.yml'))) {
    console.error('An absolute project directory containing docker-compose.yml is required.');
    process.exit(66);
}
if (process.stdin.isTTY) {
    console.error('Provide one JSON request on standard input.');
    process.exit(64);
}
let input;
try {
    input = readFileSync(0, 'utf8');
    if (Buffer.byteLength(input) > 32768) throw new Error('size');
    const request = JSON.parse(input);
    const kind = request && typeof request === 'object' ? operationKind(request.op) : undefined;
    if (kind === undefined) throw new Error('op');
    if (kind === 'mutation' && !args.includes('--allow-mutation')) {
        console.error('Mutation requires --allow-mutation and a durable requestId/source.');
        process.exit(64);
    }
} catch {
    console.error('Expected one supported JSON request of at most 32768 bytes. Nothing was sent.');
    process.exit(65);
}
const client = String.raw`
const {readFileSync} = require('node:fs');
const token = process.env.INVENTORY_AGENT_TOKEN;
if (!token || token.length < 32) {
    console.error('Agent API token is not configured in the app container. Nothing was sent.');
    process.exit(78);
}
fetch('http://127.0.0.1:3000/api/agent/v1', {
    method: 'POST',
    headers: {'Content-Type':'application/json', Authorization:'Bearer '+token},
    body: readFileSync(0,'utf8'),
    signal: AbortSignal.timeout(15000)
}).then(async response => {
    const body = await response.text();
    process.stdout.write(body+'\n');
    process.exitCode = response.ok ? 0 : 1;
}).catch(() => {
    console.error('Transport failed; outcome may be indeterminate. Inspect status with the original requestId; do not submit a new mutation key.');
    process.exitCode = 75;
});
`;
const result = spawnSync(
    'docker',
    [
        'compose',
        '--project-directory',
        project,
        '-f',
        join(project, 'docker-compose.yml'),
        'exec',
        '-T',
        'meteorapp',
        'node',
        '-e',
        client,
    ],
    {
        cwd: project,
        input,
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 8 * 1024 * 1024,
    }
);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error || result.signal) {
    console.error('Container invocation failed; do not retry a mutation with a new requestId.');
    process.exit(75);
}
process.exit(result.status ?? 75);
