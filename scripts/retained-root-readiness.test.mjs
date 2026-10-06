/** Exact App delta, opt-in topology and installed-fixture provenance guards for the experiment. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { normalizeRetainedRoots } from './retained-root-app-normalization.mjs';
const require = createRequire(import.meta.url),
    ts = require('../meteor-app/node_modules/typescript');
const compile = (s) =>
    ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
        .outputText;
const hook = readFileSync('meteor-app/imports/utility/useRootReadiness.ts', 'utf8');
const ev = { exports: {} };
vm.runInNewContext(compile(readFileSync('meteor-app/imports/utility/e2eScalarEvidence.ts', 'utf8')), ev);
test('App changes only the import and exactly three fixed-name root hook calls', () => {
    const p = 'meteor-app/imports/ui/App.tsx',
        before = execFileSync('git', ['show', '56a48bf3202ebc80296dcffe0ad57a7f8d7fccc8:' + p], { encoding: 'utf8' });
    const printer = ts.createPrinter({ removeComments: true });
    const ast = (s) => {
        const parsed = ts.createSourceFile(p, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const transformed = ts.transform(parsed, [
            (context) => (root) => {
                const visit = (n) =>
                    ts.isParenthesizedExpression(n)
                        ? ts.visitNode(n.expression, visit)
                        : ts.visitEachChild(n, visit, context);
                return ts.visitNode(root, visit);
            },
        ]);
        const printed = printer.printFile(transformed.transformed[0]);
        transformed.dispose();
        return printed;
    };
    assert.equal(ast(normalizeRetainedRoots(readFileSync(p, 'utf8'))), ast(before));
});
test('installed source fixture hashes are pinned and unmodified', () => {
    const provenance = JSON.parse(readFileSync('tests/e2e/mechanisms/installed/provenance.json', 'utf8'));
    for (const [name, p] of Object.entries(provenance))
        assert.equal(
            createHash('sha256')
                .update(readFileSync(`tests/e2e/mechanisms/installed/${name}.js`))
                .digest('hex'),
            p.extractedSha256
        );
});
test('production/no opt-in retain original hook; initial selection survives re-evaluation', () => {
    const original = () => {},
        retained = () => {};
    for (const production of [false, true])
        for (const enabled of [false, true]) {
            const context = vm.createContext({
                exports: {},
                require: (name) =>
                    name === 'meteor/meteor'
                        ? { Meteor: { isClient: true, isDevelopment: !production } }
                        : name === './reactMeteorData'
                          ? { useSubscribe: original, useTracker: retained }
                          : ev.exports,
            });
            if (enabled) context.inventoryE2eRetainedCapability = { schema: 1, epoch: 'document-0123456789abcdef' };
            const run = () => vm.runInContext('(function(){' + compile(hook) + '})()', context);
            run();
            assert.equal(context.exports.retainedRootReadinessEnabled, enabled && !production);
            const first = context.exports.retainedRootReadinessEnabled;
            context.inventoryE2eRetainedCapability = enabled
                ? undefined
                : { schema: 1, epoch: 'document-0123456789abcdef' };
            run();
            assert.equal(context.exports.retainedRootReadinessEnabled, first);
        }
});
