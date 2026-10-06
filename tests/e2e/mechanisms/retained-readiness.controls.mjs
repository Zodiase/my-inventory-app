/**
 * Executes installed Tracker, hooks and Connection.subscribe with controlled scheduling.
 * The socket/readiness server and empty-params EJSON are synthetic, explicitly not App proof.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('../../../meteor-app/node_modules/typescript');
const compile = (path) =>
    ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
const candidate = compile('meteor-app/imports/utility/useRootReadiness.ts');
const evidence = compile('meteor-app/imports/utility/e2eScalarEvidence.ts');
const pageErrors = new WeakMap();
test.afterEach(async ({ page }) => expect(pageErrors.get(page) || []).toEqual([]));
async function setup(page, retained = true) {
    const errors = [];
    pageErrors.set(page, errors);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent('<main id="root"></main>');
    await page.addScriptTag({ path: resolve('meteor-app/node_modules/react/umd/react.development.js') });
    await page.addScriptTag({ path: resolve('meteor-app/node_modules/react-dom/umd/react-dom.development.js') });
    await page.addScriptTag({
        content: `
        window.queue=[]; window.Package={};
        window.Meteor={isClient:true,isDevelopment:true,_noYieldsAllowed:f=>f(),
          _setImmediate:f=>queue.push(f),defer:f=>queue.push(f),_debug:()=>{},
          _suppressed_log_expected:()=>false};
    `,
    });
    for (const file of ['tracker', 'hooks'])
        await page.addScriptTag({ path: resolve(`tests/e2e/mechanisms/installed/${file}.js`) });
    await page.addScriptTag({
        content: `
        const slice=Array.prototype.slice,hasOwn=Object.prototype.hasOwnProperty;
        let fixtureSubId=0;
        const Random={id:()=>String(++fixtureSubId)};
        const EJSON={equals:(a,b)=>JSON.stringify(a)===JSON.stringify(b),clone:a=>JSON.parse(JSON.stringify(a))};
    `,
    });
    await page.addScriptTag({ path: resolve('tests/e2e/mechanisms/installed/subscribe.js') });
    await page.addScriptTag({
        content: `
        window.messages=[];window.comps=[];window.reads=[];
        window.connection={_subscriptions:{},_send:m=>messages.push(m),_sendQueued:m=>messages.push(m)};
        Meteor.subscribe=(name)=>{
          const c=Tracker.currentComputation;
          if(c&&!comps.includes(c))comps.push(c);
          const h=window.installedSubscribe.call(connection,name);reads.push({name,id:h.subscriptionId,comp:c?c._id:null});return h;
        };
        window.evidenceExports={};(function(exports){${evidence}})(evidenceExports);
        ${retained ? "window.inventoryE2eRetainedCapability={schema:1,epoch:'document-0123456789abcdef'};" : ''}
        window.candidateExports={};(function(exports,require){${candidate}})(candidateExports,
          name=>name==='meteor/meteor'?{Meteor}:name==='./reactMeteorData'?installedHooks:evidenceExports);
        window.commits=[];window.children=[];
        function Child({loading}){children.push(loading);return React.createElement('output',null,loading?'Loading':'Ready');}
        function Owner(){
          const [tick,setTick]=React.useState(0);window.setTick=setTick;
          const [name,setName]=React.useState('tags.all');window.setName=setName;
          const isLoading=candidateExports.useRootReadiness(name),loading=isLoading();
          commits.push({tick,name,loading});return React.createElement(Child,{loading});
        }
        window.root=ReactDOM.createRoot(document.getElementById('root'));
        window.mount=()=>ReactDOM.flushSync(()=>root.render(React.createElement(Owner)));
        window.drain=()=>ReactDOM.flushSync(()=>{Tracker.flush();let n=0;while(queue.length){if(++n>100)throw Error('queue bound');queue.shift()();}});
        window.ready=(name,value=true)=>{Object.values(connection._subscriptions).filter(s=>s.name===name).forEach(s=>{s.ready=value;s.readyDeps.changed();});};
        window.state=()=>({dom:document.getElementById('root').textContent,commits,children,
          computations:comps.map(c=>({id:c._id,stopped:c.stopped,invalidated:c.invalidated})),
          subs:Object.values(connection._subscriptions).map(s=>({id:s.id,name:s.name,ready:s.ready,inactive:s.inactive})),messages,reads});
        mount();
    `,
    });
}
async function action(page, source) {
    return page.evaluate(source);
}
async function state(page) {
    return action(page, 'state()');
}
async function archive(page, info) {
    await info.attach('lifecycle-state', {
        body: JSON.stringify(await state(page), null, 2),
        contentType: 'application/json',
    });
}
for (const retained of [false, true])
    test(`pending same-value ${retained ? 'retained' : 'original'}`, async ({ page }, info) => {
        await setup(page, retained);
        await action(
            page,
            'ReactDOM.flushSync(()=>setTick(1)); ready("tags.all"); ReactDOM.flushSync(()=>setTick(1)); drain();'
        );
        await expect(page.locator('output')).toHaveText(retained ? 'Ready' : 'Loading');
        await archive(page, info);
    });
for (const variant of ['changed-state', 'flush-first'])
    test(`original ${variant} discriminator`, async ({ page }, info) => {
        await setup(page, false);
        await action(page, 'ReactDOM.flushSync(()=>setTick(1)); ready("tags.all");');
        await action(
            page,
            variant === 'changed-state'
                ? 'ReactDOM.flushSync(()=>setTick(2));drain();'
                : 'drain();ReactDOM.flushSync(()=>setTick(1));'
        );
        await expect(page.locator('output')).toHaveText('Ready');
        await archive(page, info);
    });
for (const initialReady of [false, true])
    test(`retained ${initialReady ? 'ready' : 'pending'} unmount and late event`, async ({ page }, info) => {
        await setup(page);
        if (initialReady) {
            await action(page, 'ready("tags.all");drain();');
            await expect(page.locator('output')).toHaveText('Ready');
        }
        const before = await state(page);
        await action(page, 'ReactDOM.flushSync(()=>root.unmount());ready("tags.all");drain();');
        const after = await state(page);
        expect(after.dom).toBe('');
        expect(after.subs).toHaveLength(0);
        expect(after.computations.every((c) => c.stopped)).toBe(true);
        expect(after.commits.length).toBe(before.commits.length);
        expect(after.messages.filter((m) => m.msg === 'unsub')).toHaveLength(1);
        await archive(page, info);
    });
test('name old-new-old isolates readiness and disposes each previous owner', async ({ page }, info) => {
    await setup(page);
    await action(page, 'ready("tags.all");drain();');
    await expect(page.locator('output')).toHaveText('Ready');
    await action(page, 'ReactDOM.flushSync(()=>setName("items.all"));');
    await expect(page.locator('output')).toHaveText('Loading');
    await action(page, 'ready("tags.all");drain();');
    await expect(page.locator('output')).toHaveText('Loading');
    expect((await state(page)).subs.map((s) => s.name)).toEqual(['items.all']);
    await action(page, 'ready("items.all");drain();ReactDOM.flushSync(()=>setName("tags.all"));drain();');
    await expect(page.locator('output')).toHaveText('Loading');
    expect((await state(page)).subs.map((s) => s.name)).toEqual(['tags.all']);
    await action(page, 'ready("tags.all");drain();');
    await expect(page.locator('output')).toHaveText('Ready');
    expect((await state(page)).computations.filter((c) => !c.stopped)).toHaveLength(1);
    await archive(page, info);
});
test('unchanged name retains one computation through renders and repeated readiness transitions', async ({
    page,
}, info) => {
    await setup(page);
    const initial = await state(page);
    await action(page, 'ReactDOM.flushSync(()=>setTick(1));ReactDOM.flushSync(()=>setTick(2));drain();');
    expect((await state(page)).computations).toEqual(initial.computations);
    for (const ready of [true, false, true]) {
        await action(page, `ready('tags.all',${ready});drain();`);
        await expect(page.locator('output')).toHaveText(ready ? 'Ready' : 'Loading');
    }
    const after = await state(page);
    expect(after.computations).toHaveLength(1);
    expect(after.subs).toHaveLength(1);
    expect(after.messages.filter((m) => m.msg === 'sub')).toHaveLength(1);
    expect(after.messages.filter((m) => m.msg === 'unsub')).toHaveLength(0);
    await archive(page, info);
});
test('rapid name change and unmount before afterFlush leaves no owners', async ({ page }, info) => {
    await setup(page);
    await action(
        page,
        'ReactDOM.flushSync(()=>setName("items.all"));ReactDOM.flushSync(()=>setName("inventory.identities"));ReactDOM.flushSync(()=>root.unmount());ready("tags.all");ready("items.all");ready("inventory.identities");drain();'
    );
    const after = await state(page);
    expect(after.dom).toBe('');
    expect(after.subs).toHaveLength(0);
    expect(after.computations.every((c) => c.stopped)).toBe(true);
    await archive(page, info);
});
for (const retained of [false, true])
    test(`removed/nonready subscription keeps Loading ${retained}`, async ({ page }, info) => {
        await setup(page, retained);
        await action(page, 'Object.values(connection._subscriptions).forEach(s=>s.remove());drain();');
        await expect(page.locator('output')).toHaveText('Loading');
        await archive(page, info);
    });
test('installed shared publication uses separate active handles and preserves remaining owner', async ({
    page,
}, info) => {
    await setup(page);
    await action(page, `window.owner2=Tracker.autorun(()=>Meteor.subscribe('tags.all').ready());`);
    const both = await state(page);
    expect(both.subs).toHaveLength(2);
    await action(page, 'ready("tags.all");drain();ReactDOM.flushSync(()=>root.unmount());drain();');
    const one = await state(page);
    expect(one.subs).toHaveLength(1);
    expect(one.subs[0].ready).toBe(true);
    await action(page, 'owner2.stop();drain();');
    expect((await state(page)).subs).toHaveLength(0);
    await archive(page, info);
});
test('inactive shared handle reactivation survives queued former-owner cleanup', async ({ page }, info) => {
    await setup(page);
    const first = await state(page);
    await action(
        page,
        'ReactDOM.flushSync(()=>root.unmount());window.owner2=Tracker.autorun(()=>Meteor.subscribe("tags.all").ready());drain();'
    );
    const reused = await state(page);
    expect(reused.subs.map((s) => s.id)).toEqual(first.subs.map((s) => s.id));
    expect(reused.messages.filter((m) => m.msg === 'unsub')).toHaveLength(0);
    expect(reused.computations.filter((c) => !c.stopped)).toHaveLength(1);
    await action(page, 'owner2.stop();drain();');
    expect((await state(page)).subs).toHaveLength(0);
    expect((await state(page)).messages.filter((m) => m.msg === 'unsub')).toHaveLength(1);
    await archive(page, info);
});

for (const retained of [false, true])
    test(`ready subscription removal returns Loading ${retained}`, async ({ page }, info) => {
        await setup(page, retained);
        await action(page, 'ready("tags.all");drain();');
        await expect(page.locator('output')).toHaveText('Ready');
        await action(page, 'Object.values(connection._subscriptions).forEach(s=>s.remove());drain();');
        await expect(page.locator('output')).toHaveText('Loading');
        await archive(page, info);
    });
