import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

export const GENERATED_METEOR_LOCAL_ENTRIES = ['build', 'bundler-cache', 'isopacks', 'plugin-cache', 'types'];

const PRESERVED_METEOR_LOCAL_ENTRIES = new Set(['db']);

async function pathExists(targetPath) {
    try {
        await stat(targetPath);
        return true;
    } catch (error) {
        if (error?.code === 'ENOENT') return false;
        throw error;
    }
}

function parseAppDir(argv) {
    const appDirIndex = argv.indexOf('--app-dir');

    if (appDirIndex === -1) return path.join(REPO_ROOT, 'meteor-app');
    if (argv[appDirIndex + 1] === undefined) {
        throw new Error('Missing value for --app-dir');
    }

    return path.resolve(process.cwd(), argv[appDirIndex + 1]);
}

export async function cleanupMeteorGenerated({ appDir } = {}) {
    const resolvedAppDir = path.resolve(appDir ?? path.join(REPO_ROOT, 'meteor-app'));
    const localDir = path.join(resolvedAppDir, '.meteor', 'local');
    const removed = [];
    const preserved = [];

    if (!(await pathExists(localDir))) return { localDir, preserved, removed };

    const entries = await readdir(localDir, { withFileTypes: true });

    for (const entry of entries) {
        if (PRESERVED_METEOR_LOCAL_ENTRIES.has(entry.name)) {
            preserved.push(entry.name);
            continue;
        }

        await rm(path.join(localDir, entry.name), { recursive: true, force: true });
        removed.push(entry.name);
    }

    return { localDir, preserved, removed };
}

async function main() {
    const result = await cleanupMeteorGenerated({ appDir: parseAppDir(process.argv.slice(2)) });

    console.log(`Cleaned generated Meteor state in ${result.localDir}`);
    console.log(`Removed: ${result.removed.length > 0 ? result.removed.join(', ') : '(none)'}`);
    console.log(`Preserved: ${result.preserved.length > 0 ? result.preserved.join(', ') : '(none)'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
