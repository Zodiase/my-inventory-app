/** Source-parity/command contract checks only; no browser or actual-App proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { normalizeControlledApp } from './retained-root-app-normalization.mjs';
const require = createRequire(import.meta.url),
    ts = require('../meteor-app/node_modules/typescript');
const parse = (s) => ts.createSourceFile('fixture.tsx', s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });
const compile = (s) =>
    ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
        .outputText;
const source = readFileSync('meteor-app/imports/utility/e2eControlledApp.ts', 'utf8');
const ev = { exports: {} };
vm.runInNewContext(compile(readFileSync('meteor-app/imports/utility/e2eScalarEvidence.ts', 'utf8')), ev);
function load(variant = 'equal-pending', development = true, enabled = true) {
    let clock = 0,
        allocations = 0;
    const order = [];
    const tracker = {
        currentComputation: null,
        Dependency: class {
            constructor() {
                allocations++;
            }
            depend() {}
            changed() {
                order.push('gate.changed');
            }
        },
        flush: () => order.push('Tracker.flush'),
    };
    const context = vm.createContext({
        exports: {},
        performance: { now: () => ++clock },
        require: (n) =>
            n === 'meteor/meteor'
                ? { Meteor: { isClient: true, isDevelopment: development } }
                : n === 'meteor/tracker'
                  ? { Tracker: tracker }
                  : n === 'react-dom'
                    ? {
                          flushSync: (f) => {
                              order.push('flushSync');
                              f();
                          },
                      }
                    : ev.exports,
    });
    if (enabled)
        context.inventoryE2eControlledCapability = {
            schema: 1,
            epoch: 'document-0123456789abcdef',
            variant,
            private: 'PRIVATE',
        };
    vm.runInContext(compile(source), context);
    return { context, tracker, order, allocations: () => allocations, api: context.inventoryE2eControlledApp };
}
test('production and absent capability create no gate/API; immutable bootstrap contains only safe fields', () => {
    for (const [dev, on] of [
        [false, true],
        [true, false],
    ]) {
        const x = load('equal-pending', dev, on);
        assert.equal(x.allocations(), 0);
        assert.equal(x.api, undefined);
        assert.equal(x.context.exports.observeReady('inventory.identities', true, { ready: () => true }), true);
    }
    const x = load();
    assert.equal(x.allocations(), 1);
    assert.doesNotMatch(JSON.stringify(x.context.inventoryE2eControlledBootstrap), /PRIVATE|private/);
    x.context.inventoryE2eControlledCapability = undefined;
    vm.runInContext('(function(){' + compile(source) + '})()', x.context);
    assert.equal(x.api.read().hotReload, true);
    assert.equal(x.api.read().complete, false);
    assert.equal(x.allocations(), 1);
});
test('exact installed no-deps body parity after reversing only observed readiness call', () => {
    const before = readFileSync('tests/e2e/mechanisms/installed/hooks.js', 'utf8');
    const after = readFileSync('meteor-app/imports/utility/controlledRootSubscribe.js', 'utf8');
    function declaration(text) {
        const f = parse(text);
        return f.statements.find(
            (s) =>
                ts.isVariableStatement(s) && s.declarationList.declarations[0].name.getText(f) === 'useSubscribeClient'
        );
    }
    const normalized = ts.transform(declaration(after), [
        (context) => (root) => {
            const visit = (n) =>
                ts.isCallExpression(n) && n.expression.getText() === 'observeReady'
                    ? n.arguments[1]
                    : ts.visitEachChild(n, visit, context);
            return ts.visitNode(root, visit);
        },
    ]);
    assert.equal(
        printer.printNode(ts.EmitHint.Unspecified, normalized.transformed[0], parse(after)),
        printer.printNode(ts.EmitHint.Unspecified, declaration(before), parse(before))
    );
    normalized.dispose();
});
test('App differs from frozen185 only by import and existing setter binding; effect dependencies unchanged', () => {
    const path = 'meteor-app/imports/ui/App.tsx',
        before = execFileSync('git', ['show', 'd3b707006692c35dee8a3ec401a3f31e22736303:' + path], {
            encoding: 'utf8',
        }),
        after = readFileSync(path, 'utf8');
    assert.equal(printer.printFile(parse(normalizeControlledApp(after))), printer.printFile(parse(before)));
    const file = parse(after);
    function visit(n) {
        if (ts.isCallExpression(n) && n.expression.getText(file) === 'useEffect' && n.arguments[1])
            assert.doesNotMatch(n.arguments[1].getText(file), /showFilterBuilder/);
        ts.forEachChild(n, visit);
    }
    visit(file);
    assert.match(after, /\[showFilterBuilder, setShowFilterBuilder\] = useState\(false\)/);
});
for (const variant of ['equal-pending', 'changed-state', 'flush-first', 'retained-pending'])
    test(`bridge command order ${variant} (mock only)`, () => {
        const x = load(variant);
        let current = false;
        const comp = { firstRun: true, invalidated: false, stopped: false, onInvalidate: (f) => {}, onStop: (f) => {} };
        x.tracker.currentComputation = comp;
        for (const name of ['tags.all', 'items.all', 'inventory.identities']) {
            const ready = x.api.observe(name, true, { ready: () => true });
            assert.equal(ready, name !== 'inventory.identities');
        }
        const bind = () =>
            x.api.bind({
                showFilterBuilder: current,
                routeContainerId: 'PRIVATE',
                setShowFilterBuilder: (value) => {
                    x.order.push('setter:' + value);
                    current = value;
                    bind();
                },
            });
        bind();
        x.api.prime();
        x.order.length = 0;
        x.api.trigger();
        assert.equal(x.api.read().gateOpen, true);
        assert.equal(current, variant !== 'changed-state');
        assert.equal(x.order[0], 'gate.changed');
        const setter = x.order.indexOf('setter:' + (variant !== 'changed-state')),
            flush = x.order.indexOf('Tracker.flush');
        assert.equal(flush < setter, variant === 'flush-first');
        assert.ok(x.order.filter((e) => e === 'Tracker.flush').length === (variant === 'flush-first' ? 2 : 1));
        assert.doesNotMatch(JSON.stringify(x.api.read()), /PRIVATE/);
        assert.throws(() => x.api.trigger(), /Invalid trigger/);
    });
test('commands reject unready/wrong route; overflow invalidates interpretation and snapshots copy', () => {
    const x = load();
    assert.throws(() => x.api.prime(), /Real ready roots/);
    x.tracker.currentComputation = {
        firstRun: true,
        invalidated: false,
        stopped: false,
        onInvalidate: () => {},
        onStop: () => {},
    };
    for (let i = 0; i < 205; i++) x.api.observe('inventory.identities', false, { ready: () => false });
    const s = x.api.read();
    assert.equal(s.complete, false);
    assert.equal(s.dropped, 5);
    s.events[0].phase = 'PRIVATE';
    assert.notEqual(x.api.read().events[0].phase, 'PRIVATE');
    assert.throws(() => x.api.observe('arbitrary', true, { ready: () => true }), /fixed roots/);
});

test('prepared matrix has exactly four variants and original five-second deadline, no automatic retries', () => {
    const spec = readFileSync('tests/e2e/app/controlled-readiness.discriminator.spec.proposal.ts', 'utf8');
    const config = readFileSync('playwright.controlled-readiness.config.js', 'utf8');
    assert.match(spec, /\['equal-pending', 'changed-state', 'flush-first', 'retained-pending'\]/);
    assert.match(spec, /toBeVisible\(\{ timeout: 5000 \}\)/);
    assert.match(config, /retries: 0/);
    assert.match(config, /workers: 1/);
    assert.match(config, /CONTROLLED_APP_REVIEWED_HEAD/);
    const fixture = readFileSync('meteor-app/imports/utility/e2eControlledApp.ts', 'utf8');
    assert.doesNotMatch(
        fixture,
        /_runFlush|_pending|_reactInternals|setInterval|setTimeout|requestAnimationFrame|autorun\(/
    );
});

// Exercise the same oracle imported by the proposed App cases, without launching a browser.
const { verifyControlledChain, verifyControlledTimeout } = await import(
    '../tests/e2e/helpers/controlled-readiness-oracle.mjs'
);
function lifecycle(variant) {
    const event = (phase, extra = {}) => ({ phase, ...extra });
    const ready = event('subscription-read', {
        name: 'inventory.identities',
        computation: variant === 'retained-pending' ? 1 : 2,
        underlyingReady: true,
        observedReady: true,
        firstRun: variant !== 'retained-pending',
    });
    const stop = event('stop', { computation: 1, stopped: true, invalidated: true });
    const setter = event('trigger-setter', { renderedValue: true, intendedValue: variant !== 'changed-state' });
    const phases =
        variant === 'flush-first'
            ? [
                  event('drain-start'),
                  stop,
                  ready,
                  event('drain-end'),
                  setter,
                  event('trigger-setter-return'),
                  event('drain-start'),
                  event('drain-end'),
              ]
            : [
                  setter,
                  ...(variant === 'retained-pending' ? [] : [stop, ready]),
                  event('trigger-setter-return'),
                  event('drain-start'),
                  ...(variant === 'retained-pending' ? [ready] : []),
                  event('drain-end'),
              ];
    return {
        complete: true,
        dropped: 0,
        variant,
        events: [
            event('subscription-read', {
                name: 'inventory.identities',
                computation: 1,
                underlyingReady: true,
                observedReady: false,
            }),
            event('gate-release'),
            event('invalidate', { computation: 1, stopped: false, invalidated: true }),
            ...phases,
            event('trigger-end'),
        ].map((e, i) => ({ ...e, sequence: i + 1 })),
    };
}
for (const variant of ['equal-pending', 'changed-state', 'flush-first', 'retained-pending'])
    test(`lifecycle oracle ${variant} rejects a ready read beyond its drain bound`, () => {
        const snapshot = lifecycle(variant);
        verifyControlledChain(snapshot, variant);
        const readyIndex = snapshot.events.findIndex(
            (e) => e.phase === 'subscription-read' && e.observedReady === true
        );
        const [ready] = snapshot.events.splice(readyIndex, 1);
        const boundary = snapshot.events.findIndex(
            (e) => e.phase === (['equal-pending', 'changed-state'].includes(variant) ? 'drain-start' : 'drain-end')
        );
        snapshot.events.splice(boundary + 1, 0, ready);
        snapshot.events.forEach((e, i) => {
            e.sequence = i + 1;
        });
        assert.throws(() => verifyControlledChain(snapshot, variant), /variant lifecycle order/);
    });
test('lifecycle oracle rejects wrong firstRun, stop before setter, and readiness beyond trigger-end', () => {
    for (const mutate of [
        (s) => {
            s.events.find((e) => e.phase === 'subscription-read' && e.observedReady).firstRun = false;
        },
        (s) => {
            const setter = s.events.findIndex((e) => e.phase === 'trigger-setter');
            [s.events[setter], s.events[setter + 1]] = [s.events[setter + 1], s.events[setter]];
        },
        (s) => {
            const index = s.events.findIndex((e) => e.phase === 'subscription-read' && e.observedReady);
            s.events.push(...s.events.splice(index, 1));
        },
    ]) {
        const s = lifecycle('equal-pending');
        mutate(s);
        s.events.forEach((e, i) => {
            e.sequence = i + 1;
        });
        assert.throws(() => verifyControlledChain(s, s.variant), /variant lifecycle order/);
    }
});
function expectedTimeout() {
    const headingLocator = "locator('.app-shell-main').getByRole('heading', { name: 'Living room', exact: true })";
    const error = Object.assign(new Error(`expect(locator).toBeVisible() failed\nLocator: ${headingLocator}`), {
        matcherResult: {
            name: 'toBeVisible',
            pass: false,
            expected: 'visible',
            actual: '<element(s) not found>',
            timeout: 5000,
        },
    });
    return {
        error,
        elapsedMs: 5002,
        headingLocator,
        finalLoading: true,
        finalHeading: false,
        pageClosed: false,
        publicErrors: {
            schema: 'public-browser-errors/v1',
            started: true,
            stopped: true,
            finalSampleCompleted: true,
            complete: true,
            dropped: 0,
            unlinkedEvents: 0,
            events: [],
        },
    };
}
test('baseline oracle rejects unrelated late errors, other locators/deadlines, and incomplete or dirty final evidence', () => {
    verifyControlledTimeout(expectedTimeout());
    for (const mutate of [
        (x) => {
            x.error = new Error('Target page, context or browser has been closed');
            x.elapsedMs = 5100;
        },
        (x) => {
            x.error = new Error('transport failure');
            x.elapsedMs = 5100;
        },
        (x) => {
            x.error.matcherResult.name = 'toHaveCount';
        },
        (x) => {
            x.error.matcherResult.timeout = 10000;
        },
        (x) => {
            x.error.message = x.error.message.replace('Living room', 'Other heading');
        },
        (x) => {
            x.publicErrors.events.push({ kind: 'pageerror' });
        },
        (x) => {
            x.publicErrors.complete = false;
        },
        (x) => {
            x.publicErrors.unlinkedEvents = 1;
        },
        (x) => {
            x.finalLoading = false;
        },
        (x) => {
            x.finalHeading = true;
        },
        (x) => {
            x.pageClosed = true;
        },
    ]) {
        const x = expectedTimeout();
        mutate(x);
        assert.throws(() => verifyControlledTimeout(x), /Invalid controlled evidence/);
    }
});

test('baseline oracle accepts installed Playwright matcher result and rendered message without browser execution', () => {
    const { formatMatcherMessage } = require('../node_modules/playwright/lib/matchers/matcherHint.js');
    const x = expectedTimeout();
    x.error.message = formatMatcherMessage(
        { isNot: false },
        {
            matcherName: 'toBeVisible',
            locator: { toString: () => x.headingLocator },
            timeout: 5000,
            timedOut: true,
            printedExpected: 'Expected: visible',
            printedReceived: 'Received: <element(s) not found>',
            log: ['waiting for ' + x.headingLocator],
        }
    );
    verifyControlledTimeout(x);
});

for (const variant of ['equal-pending', 'changed-state', 'flush-first', 'retained-pending'])
    test(`actual controller producer feeds lifecycle oracle ${variant} (synthetic scheduler only)`, () => {
        const x = load(variant);
        const computation = () => {
            const invalidations = [],
                stops = [];
            const comp = {
                firstRun: true,
                invalidated: false,
                stopped: false,
                onInvalidate: (fn) => invalidations.push(fn),
                onStop: (fn) => stops.push(fn),
                invalidate: () => {
                    comp.invalidated = true;
                    for (const fn of invalidations.splice(0)) fn();
                },
                stop: () => {
                    comp.stopped = true;
                    for (const fn of stops.splice(0)) fn();
                },
            };
            return comp;
        };
        const old = computation();
        const observe = (comp, name = 'inventory.identities') => {
            x.tracker.currentComputation = comp;
            x.api.observe(name, true, { ready: () => true });
        };
        observe(computation(), 'tags.all');
        observe(computation(), 'items.all');
        observe(old);
        // Commands and event emission execute the actual compiled producer. Only scheduling is synthetic.
        x.tracker.Dependency.prototype.changed = () => old.invalidate();
        const replace = () => {
            if (!old.stopped) {
                old.stop();
                observe(computation());
            }
        };
        x.tracker.flush = () => {
            if (!x.api.read().gateOpen) return;
            if (variant === 'retained-pending') {
                old.firstRun = false;
                old.invalidated = false;
                observe(old);
            } else replace();
        };
        let value = false;
        const bind = () =>
            x.api.bind({
                showFilterBuilder: value,
                routeContainerId: 'container',
                setShowFilterBuilder: (next) => {
                    value = next;
                    if (x.api.read().gateOpen && variant !== 'retained-pending') replace();
                    bind();
                },
            });
        bind();
        x.api.prime();
        x.api.trigger();
        const snapshot = x.api.read();
        assert.ok(snapshot.events.some((e) => e.phase === 'subscription-read' && e.computation === 3));
        verifyControlledChain(snapshot, variant);
    });
test('lifecycle oracle rejects invalid producer aliases in reads, invalidations and stops', () => {
    for (const phase of ['subscription-read', 'invalidate', 'stop'])
        for (const alias of ['old', '1', 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null, undefined]) {
            const snapshot = lifecycle('equal-pending');
            snapshot.events.find((e) => e.phase === phase).computation = alias;
            assert.throws(
                () => verifyControlledChain(snapshot, snapshot.variant),
                /positive safe-integer computation alias/
            );
        }
});
