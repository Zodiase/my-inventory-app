import { expect, test } from '@playwright/test';
import { callMeteorMethod, resetDatabase, waitForMeteorReady } from '../helpers/database';
import { createItem, createTag } from '../helpers/factories';

test('direct tag choices preserve scoped query and unrelated URL filters', async ({ page }, info) => {
    await page.goto('/');
    await waitForMeteorReady(page);
    await resetDatabase(page);
    const root = await createItem(page, { name: 'Toggle Rack', isContainer: true });
    const first = await createTag(page, { name: 'Camera equipment' });
    const other = await createTag(page, { name: 'Spare' });
    const item = await createItem(page, { name: 'Toggle fixture', containerId: root, tagIds: [first, other] });
    await expect
        .poll(
            async () =>
                (
                    await callMeteorMethod<Array<{ _id: string }>>(page, 'items.search', [
                        { type: 'text', value: 'Toggle' },
                        { type: 'containerScope', containerRootId: root },
                    ])
                ).map((item) => item._id),
            { timeout: 30_000 }
        )
        .toEqual([item]);
    const include = encodeURIComponent(JSON.stringify({ type: 'tagInclude', tagIds: [other] }));
    await page.goto(`/search?container=${root}&scope=within&q=Toggle&f=${include}&run=1`);
    await waitForMeteorReady(page);
    await expect(
        page.getByRole('region', { name: 'Search results' }).locator(`a[href="/items/${item}"]`)
    ).toBeVisible();
    const banner = page.getByRole('search', { name: 'Inventory search' });
    const opener = banner.getByRole('button', { name: /^(Tags:|Filters:|Scope: Toggle Rack;)/u });
    const touch = info.project.name !== 'chromium';
    if (touch) await opener.tap();
    else await opener.click();
    const menu = page.getByRole('dialog', { name: 'Search controls' });
    for (const state of ['include', 'exclude', 'neutral', 'include']) {
        const choice = menu.getByRole('radio', {
            name: `${state === 'neutral' ? 'No filter for' : state === 'include' ? 'Include' : 'Exclude'} Camera equipment`,
            exact: true,
        });
        if (touch) await choice.tap();
        else await choice.click();
        await expect(choice).toBeChecked();
        await expect
            .poll(() => {
                const url = new URL(page.url()),
                    fragments = url.searchParams.getAll('f').map((value) => JSON.parse(value));
                return {
                    query: url.searchParams.get('q'),
                    container: url.searchParams.get('container'),
                    scope: url.searchParams.get('scope'),
                    other: fragments.some((f) => f.type === 'tagInclude' && f.tagIds.includes(other)),
                    chosen: fragments.some(
                        (f) =>
                            f.type === (state === 'include' ? 'tagInclude' : 'tagExclude') && f.tagIds.includes(first)
                    ),
                };
            })
            .toEqual({ query: 'Toggle', container: root, scope: 'within', other: true, chosen: state !== 'neutral' });
        await expect(menu.getByRole('radio', { name: 'Include Spare', exact: true })).toBeChecked();
    }
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(opener).toBeFocused();
    await page.reload();
    await waitForMeteorReady(page);
    await expect(banner.getByRole('textbox', { name: 'Search query' })).toHaveValue('Toggle');
    if (touch) await opener.tap();
    else await opener.click();
    await expect(menu.getByRole('radio', { name: 'Include Camera equipment', exact: true })).toBeChecked();
});
