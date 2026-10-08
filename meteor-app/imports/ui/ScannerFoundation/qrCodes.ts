/**
 * Encodes the fixed read-only demo actions and synthetic fixture payloads as real
 * QR images. These codes never configure hardware, open URLs or identify owned
 * household records; encoding stays separate from capture and semantic dispatch.
 * Only the eight fixed demo payloads are cached so typing reuses unchanged images
 * without retaining arbitrary scanned values.
 */
import qrcode from 'qrcode-generator';

export const actionCards = [
    {
        label: 'Inspect',
        description: 'Inspect the next demo code.',
        action: 'inspect-demo',
        payload: 'inventory-action:v1:inspect-demo',
    },
    {
        label: 'Show actions',
        description: 'Switch to the demo action menu.',
        action: 'show-actions',
        payload: 'inventory-action:v1:show-actions',
    },
] as const;
export const fixtureCards = [
    {
        label: 'Demo item',
        description: 'Synthetic instance identity',
        payload: 'item: 11111111-1111-4111-8111-111111111111',
    },
    {
        label: 'Demo container',
        description: 'Synthetic container identity',
        payload: 'container: 33333333-3333-4333-8333-333333333333',
    },
    { label: 'Demo product', description: 'Product code, not an owned item', payload: '00012345678905' },
] as const;
export const quietModules = 4;
const cachedPayloads = new Set<string>([
    ...actionCards.map((card) => card.payload),
    ...fixtureCards.map((card) => card.payload),
    'inventory-action:v1:move-demo',
    'item: 22222222-2222-4222-8222-222222222222',
    'container: 44444444-4444-4444-8444-444444444444',
]);
const images = new Map<string, string>();
export function qrImage(payload: string): string {
    const cached = images.get(payload);
    if (cached !== undefined) return cached;
    const qr = qrcode(0, 'M');
    qr.addData(payload, 'Byte');
    qr.make();
    const cellSize = 8;
    const image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        qr.createSvgTag({ cellSize, margin: quietModules * cellSize, scalable: true })
    )}`;
    if (cachedPayloads.has(payload)) images.set(payload, image);
    return image;
}
