import fs from 'fs';
import path from 'path';

export function loadFixture(filename: string): string {
    const meteorAppDir = process.env.PWD;
    if (meteorAppDir == null || meteorAppDir === '') {
        throw new Error('process.env.PWD is not defined');
    }
    const workspaceRoot = path.resolve(meteorAppDir, '..');
    const fixturePath = path.join(workspaceRoot, 'specs/004-import-export/fixtures', filename);
    return fs.readFileSync(fixturePath, 'utf8');
}
