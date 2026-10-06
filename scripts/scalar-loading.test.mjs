/** Validates opt-in, redaction, bounds and exact source invariance before causal measurement. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ts = require('../meteor-app/node_modules/typescript');
const evidenceSource = readFileSync(
    new URL('../meteor-app/imports/utility/e2eScalarEvidence.ts', import.meta.url),
    'utf8'
);
const captureSource = readFileSync(
    new URL('../meteor-app/imports/utility/e2eScalarCapture.ts', import.meta.url),
    'utf8'
);
const compile = (s) =>
    ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
        .outputText;
const ev = { exports: {} };
vm.runInNewContext(compile(evidenceSource), { exports: ev.exports });
const { createScalarEvidence, validScalarCapability } = ev.exports;
const epoch = 'document-0123456789abcdef';
function load(meteor, capability, host = {}) {
    const context = vm.createContext({
        exports: {},
        require: (name) => (name === 'meteor/meteor' ? { Meteor: meteor } : ev.exports),
        performance: { now: () => 1 },
        ...host,
    });
    if (capability !== undefined) context.inventoryE2eScalarCapability = capability;
    vm.runInContext('(function(){' + compile(captureSource) + '})()', context);
    return context;
}
test('production and missing/invalid opt-in have no recorder API or work', () => {
    for (const [meteor, cap] of [
        [
            { isClient: true, isDevelopment: false },
            { schema: 1, epoch },
        ],
        [
            { isClient: false, isDevelopment: true },
            { schema: 1, epoch },
        ],
        [{ isClient: true, isDevelopment: true }, undefined],
        [
            { isClient: true, isDevelopment: true },
            { schema: 2, epoch },
        ],
    ]) {
        const c = load(meteor, cap);
        assert.equal(c.exports.scalarRoot({ allItemsLoading: false }), undefined);
        c.exports.scalarRecord(1, 'return');
        assert.equal(c.inventoryE2eScalarCapture, undefined);
    }
});
test('initial disabled topology cannot be enabled later; hot reload invalidates capture', () => {
    const c = load({ isClient: true, isDevelopment: true });
    c.inventoryE2eScalarCapability = { schema: 1, epoch };
    vm.runInContext('(function(){' + compile(captureSource) + '})()', c);
    assert.equal(c.inventoryE2eScalarCapture, undefined);
    const on = load({ isClient: true, isDevelopment: true }, { schema: 1, epoch });
    assert.equal(on.exports.scalarRoot({ allItemsLoading: true }), 1);
    vm.runInContext('(function(){' + compile(captureSource) + '})()', on);
    assert.equal(on.inventoryE2eScalarCapture.read().reason, 'hot-reload');
});
test('events keep only allowed scalars and report every lost event', () => {
    assert.equal(validScalarCapability({ schema: 1, epoch }), true);
    assert.equal(validScalarCapability({ schema: 1, epoch: 'private' }), false);
    const c = createScalarEvidence(epoch, () => Infinity);
    c.record('root', {
        frame: c.nextFrame(),
        allItemsLoading: true,
        privateId: 'PRIVATE',
        decision: 'PRIVATE',
        site: 'PRIVATE',
    });
    const first = c.read();
    assert.doesNotMatch(JSON.stringify(first), /PRIVATE/);
    assert.equal(first.events[0].at, 0);
    first.events[0].allItemsLoading = false;
    assert.equal(c.read().events[0].allItemsLoading, true);
    for (let i = 0; i < 205; i++) c.record('return', { frame: 1 });
    assert.equal(c.read().events.length, 200);
    assert.equal(c.read().dropped, 6);
    assert.equal(c.read().complete, false);
    assert.equal(c.read().reason, 'event-overflow');
    c.stop();
    c.record('return', { frame: 2 });
    assert.equal(c.read().dropped, 6);
});
test('App AST is identical after removing scalar import/declaration/call statements', () => {
    const path = 'meteor-app/imports/ui/App.tsx';
    const before = execFileSync('git', ['show', 'ba7e3a35c40e80d9301620f6e0bda44ef1b0016b:' + path], {
        encoding: 'utf8',
    });
    const after = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    const parse = (s) => ts.createSourceFile(path, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const transformed = ts.transform(parse(after), [
        (context) => (node) => {
            const visit = (n) => {
                if (ts.isParenthesizedExpression(n)) return ts.visitNode(n.expression, visit);
                if (ts.isImportDeclaration(n) && n.moduleSpecifier.text === '/imports/utility/e2eScalarCapture')
                    return undefined;
                if (
                    ts.isVariableStatement(n) &&
                    n.declarationList.declarations.some((d) => d.name.getText() === 'scalarFrame')
                )
                    return undefined;
                if (
                    ts.isExpressionStatement(n) &&
                    ts.isCallExpression(n.expression) &&
                    n.expression.expression.getText() === 'scalarRecord'
                )
                    return undefined;
                return ts.visitEachChild(n, visit, context);
            };
            return ts.visitNode(node, visit);
        },
    ]);
    const printer = ts.createPrinter({ removeComments: true });
    assert.equal(
        printer.printFile(transformed.transformed[0]),
        printer.printFile(
            ts.transform(parse(before), [
                (context) => (node) => {
                    const visit = (n) =>
                        ts.isParenthesizedExpression(n)
                            ? ts.visitNode(n.expression, visit)
                            : ts.visitEachChild(n, visit, context);
                    return ts.visitNode(node, visit);
                },
            ]).transformed[0]
        )
    );
    transformed.dispose();
});

test('scalar rejects simultaneous wrapped diagnostic capability', () => {
    const c = load(
        { isClient: true, isDevelopment: true },
        { schema: 1, epoch },
        { inventoryE2eLoadingCapability: { schema: 1, epoch } }
    );
    assert.equal(c.exports.scalarRoot({}), undefined);
    assert.equal(c.inventoryE2eScalarCapture, undefined);
});

test('scalar call arguments add no getter, hook or other call evaluation', () => {
    const source = readFileSync(new URL('../meteor-app/imports/ui/App.tsx', import.meta.url), 'utf8');
    const file = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(n) {
        if (ts.isCallExpression(n) && ['scalarRoot', 'scalarRecord'].includes(n.expression.getText(file))) {
            for (const arg of n.arguments) {
                function nested(x) {
                    assert.equal(ts.isCallExpression(x), false, 'scalar arguments must be existing scalar reads only');
                    ts.forEachChild(x, nested);
                }
                nested(arg);
            }
        }
        ts.forEachChild(n, visit);
    }
    visit(file);
});

test('measurement retains exact original nested test and beforeEach AST', () => {
    const before = readFileSync(new URL('../tests/e2e/app/top-navigation-layout.spec.ts', import.meta.url), 'utf8');
    const after = readFileSync(
        new URL('../tests/e2e/app/scalar-navigation.measurement.spec.proposal.ts', import.meta.url),
        'utf8'
    );
    const printer = ts.createPrinter({ removeComments: true });
    function bodies(text) {
        const file = ts.createSourceFile('test.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        const result = {};
        function visit(n) {
            if (ts.isCallExpression(n)) {
                const label = n.expression.getText(file);
                if (label === 'test.beforeEach')
                    result.setup = printer.printNode(ts.EmitHint.Unspecified, n.arguments[0].body, file);
                if (
                    label === 'test' &&
                    n.arguments[0]?.text === 'shows one root icon and parent names in nested breadcrumbs'
                )
                    result.body = printer.printNode(ts.EmitHint.Unspecified, n.arguments[1].body, file);
            }
            ts.forEachChild(n, visit);
        }
        visit(file);
        return result;
    }
    assert.deepEqual(bodies(after), bodies(before));
});
