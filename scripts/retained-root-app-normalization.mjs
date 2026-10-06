/** Reverses only the explicit three-root experiment delta for inherited diagnostic guards. */
import assert from 'node:assert/strict';
export function normalizeRetainedRoots(source) {
    if (!source.includes("from '/imports/utility/useRootReadiness'")) return source;
    const names = ['tags.all', 'items.all', 'inventory.identities'];
    for (const name of names) {
        const call = `useRootReadiness('${name}')`;
        assert.equal(source.split(call).length - 1, 1, 'exactly one fixed root call');
        source = source.replace(call, `useSubscribe('${name}')`);
    }
    source = source.replace("import { useRootReadiness } from '/imports/utility/useRootReadiness';", '');
    source = source.replace(
        "import { useTracker } from '/imports/utility/reactMeteorData';",
        "import { useSubscribe, useTracker } from '/imports/utility/reactMeteorData';"
    );
    assert.equal(source.includes('useRootReadiness'), false, 'no additional retained call/import');
    return source;
}
