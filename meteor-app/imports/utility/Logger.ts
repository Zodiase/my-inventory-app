import printable from './printable';

export interface Logger {
    log: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
}

function createLogger(module: Pick<NodeJS.Module, 'id'>): Logger {
    const name = module.id.replace(/^\/imports\/(([^/]{1,}\/){0,}[^/]{1,})\.ts/, '$1');

    return {
        log(message, ...args) {
            console.log(`[${name}] ${message}`, ...args.map(printable));
        },
        warn(message, ...args) {
            console.warn(`[${name}] ${message}`, ...args.map(printable));
        },
    };
}

export default createLogger;
