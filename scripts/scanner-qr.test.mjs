import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import jsQR from 'jsqr';
const require = createRequire(new URL('../meteor-app/package.json', import.meta.url));
const ts = require('typescript');
const sharp = require('sharp');
const source = await fs.readFile(
    new URL('../meteor-app/imports/ui/ScannerFoundation/qrCodes.ts', import.meta.url),
    'utf8'
);
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, module, module.exports);
const { actionCards, fixtureCards, qrImage } = module.exports;
const expected = [
    'inventory-action:v1:inspect-demo',
    'inventory-action:v1:show-actions',
    'item: 11111111-1111-4111-8111-111111111111',
    'container: 33333333-3333-4333-8333-333333333333',
    '00012345678905',
];
test('real action and synthetic fixture images independently decode to the exact fixed payloads', async () => {
    assert.deepEqual(
        [...actionCards, ...fixtureCards].map((card) => card.payload),
        expected
    );
    for (const payload of expected) {
        const svg = decodeURIComponent(qrImage(payload).split(',')[1]);
        const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.equal(info.width, info.height);
        const result = jsQR(new Uint8ClampedArray(data), info.width, info.height);
        assert.equal(result?.data, payload);
        // Four 8px modules form a white border on all four sides, not CSS padding.
        for (let y = 0; y < info.height; y++)
            for (let x = 0; x < info.width; x++) {
                if (x >= 32 && y >= 32 && x < info.width - 32 && y < info.height - 32) continue;
                const pixel = (y * info.width + x) * 4;
                assert.deepEqual([...data.subarray(pixel, pixel + 4)], [255, 255, 255, 255]);
            }
        assert.equal(
            jsQR(new Uint8ClampedArray(info.width * info.height * 4).fill(255), info.width, info.height),
            null
        );
    }
});
