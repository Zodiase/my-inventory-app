/**
 * Synthetic compact-filter composition for reviewing available-space allocation.
 * Reuses the current tag controls without changing production menus or styling.
 * Local query, scope and selections demonstrate interactions, not persistence.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from 'grommet';
import React, { useEffect, useRef, useState } from 'react';

import type TagRecord from '/imports/model/TagRecord';

import { SearchTagCatalog } from './SearchTagCatalog';
import type { TagFilterState } from './TriStateTagToggle';
import './CompactFilterProof.stories.css';

type Tag = Pick<TagRecord, '_id' | 'name' | 'parentTagId' | 'path'>;
const group: Tag = { _id: 'tools', name: 'Tools', parentTagId: '', path: [{ _id: 'tools', name: 'Tools' }] };
const tags: Tag[] = [
    group,
    ...Array.from({ length: 24 }, (_, n) => {
        const name =
            n === 3 ? 'Camera equipment with a long descriptive name' : n === 0 ? 'Spare' : `Hardware part ${n}`;
        return { _id: `part-${n}`, name, parentTagId: group._id, path: [...group.path, { _id: `part-${n}`, name }] };
    }),
];

function Example({
    empty = false,
    selectedOnly = false,
}: {
    empty?: boolean;
    selectedOnly?: boolean;
}): React.ReactElement {
    const dialog = useRef<HTMLDialogElement>(null);
    const [open, setOpen] = useState(false);
    const [scope, setScope] = useState('Rack A');
    const [kind, setKind] = useState('All types');
    const [view, setView] = useState<'tags' | 'scope' | 'type'>('tags');
    const [query, setQuery] = useState('storage');
    const [selected, setSelected] = useState<Record<string, TagFilterState>>(
        empty ? {} : { 'part-0': 'include', 'part-2': 'exclude' }
    );
    const [wholeScroll, setWholeScroll] = useState(false);
    const [contentHeight, setContentHeight] = useState(600);
    const [layoutReady, setLayoutReady] = useState(false);
    useEffect(() => {
        if (open && !dialog.current?.open) dialog.current?.showModal();
        if (!open && dialog.current?.open) dialog.current.close();
    }, [open]);
    useEffect(() => {
        const sheet = dialog.current;
        if (!sheet || !open) return undefined;
        const measure = () => {
            setLayoutReady(true);
            const header = sheet.querySelector('.compact-proof-summary')?.getBoundingClientRect().height ?? 0;
            const catalogHeader = sheet.querySelector('.search-tag-catalog-head')?.getBoundingClientRect().height ?? 0;
            const find = sheet.querySelector('.search-tag-find')?.getBoundingClientRect().height ?? 0;
            const list = sheet.querySelector('.search-tag-list');
            const content = list
                ? Array.from(list.children).reduce((sum, el) => sum + el.getBoundingClientRect().height, 0)
                : 128;
            if (view === 'tags') setContentHeight(header + catalogHeader + find + 12 + Math.max(128, content));
            setWholeScroll(header + catalogHeader + find + 12 + 128 > sheet.clientHeight);
        };
        const observer = new ResizeObserver(measure);
        observer.observe(sheet);
        sheet.querySelectorAll('.compact-proof-summary, .search-tag-catalog-head, .search-tag-find').forEach((el) => {
            observer.observe(el);
        });
        const mutation = new MutationObserver(measure);
        const list = sheet.querySelector('.search-tag-list');
        if (list) mutation.observe(list, { childList: true, subtree: true, characterData: true });
        measure();
        return () => {
            observer.disconnect();
            mutation.disconnect();
        };
    }, [open, view]);
    const back = () => {
        const previous = view;
        setView('tags');
        requestAnimationFrame(() =>
            dialog.current?.querySelector<HTMLButtonElement>(`[data-summary="${previous}"]`)?.focus()
        );
    };
    return (
        <main className="compact-filter-proof">
            <div className="compact-proof-toolbar">
                <input
                    aria-label="Inventory query"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                    }}
                />
                <Button
                    label="Filters"
                    onClick={() => {
                        setView('tags');
                        setOpen(true);
                    }}
                />
            </div>
            <section className="compact-proof-results" aria-label="Synthetic results">
                <h2>Inventory</h2>
                <p>
                    Query: {query} · Scope: {scope} · Type: {kind}
                </p>
                <p>{Object.values(selected).filter((s) => s !== 'neutral').length} tags selected</p>
                <article>Storage box · Rack A</article>
                <article>Camera case · Rack A</article>
            </section>
            <dialog
                ref={dialog}
                data-layout-ready={layoutReady}
                style={{ height: `min(600px, calc(100dvh - 68px), ${view === 'tags' ? contentHeight : 240}px)` }}
                aria-label="Filters"
                className={'compact-proof-sheet' + (wholeScroll ? ' compact-proof-whole-scroll' : '')}
                onCancel={() => {
                    setOpen(false);
                }}
                onClose={() => {
                    setOpen(false);
                }}
            >
                <div className="compact-proof-summary">
                    {view === 'tags' ? (
                        <>
                            <Button
                                data-summary="scope"
                                aria-expanded={false}
                                aria-controls="compact-proof-choices"
                                label={
                                    <span className="compact-proof-disclosure">
                                        <span>Scope: {scope}</span>
                                        <span aria-hidden="true">⌄</span>
                                    </span>
                                }
                                onClick={() => {
                                    setView('scope');
                                }}
                            />
                            <Button
                                data-summary="type"
                                aria-expanded={false}
                                aria-controls="compact-proof-choices"
                                label={
                                    <span className="compact-proof-disclosure">
                                        <span>Type: {kind}</span>
                                        <span aria-hidden="true">⌄</span>
                                    </span>
                                }
                                onClick={() => {
                                    setView('type');
                                }}
                            />
                        </>
                    ) : (
                        <>
                            <Button label="Back" onClick={back} />
                            <strong>{view === 'scope' ? 'Scope' : 'Type'}</strong>
                        </>
                    )}
                    <Button
                        aria-label="Close filters"
                        label="×"
                        onClick={() => {
                            setOpen(false);
                        }}
                    />
                </div>
                <div className="compact-proof-catalog" hidden={view !== 'tags'}>
                    <SearchTagCatalog
                        tags={empty ? [] : tags}
                        selected={selected}
                        initialSelectedOnly={selectedOnly}
                        onChange={(id, state) => {
                            setSelected((current) => ({ ...current, [id]: state }));
                        }}
                    />
                </div>
                {view !== 'tags' && (
                    <div
                        id="compact-proof-choices"
                        className="compact-proof-choices"
                        role="group"
                        aria-label={view === 'scope' ? 'Scope choices' : 'Type choices'}
                    >
                        {(view === 'scope'
                            ? ['Rack A', 'Home', 'Current container']
                            : ['All types', 'Items', 'Containers']
                        ).map((value) => (
                            <Button
                                key={value}
                                label={value}
                                aria-pressed={(view === 'scope' ? scope : kind) === value}
                                onClick={() => {
                                    if (view === 'scope') setScope(value);
                                    else setKind(value);
                                    back();
                                }}
                            />
                        ))}
                    </div>
                )}
            </dialog>
        </main>
    );
}
const meta = {
    title: 'Prototypes/CompactFilterProof',
    component: Example,
    parameters: {
        layout: 'fullscreen',
        review: {
            purpose: 'Synthetic working filter menu to prove one scroll owner and useful compact tag context.',
            expectedComposition:
                'A 60px toolbar sits above the bounded sheet. Scope/Type are a compact summary row; Tags/count, selected-only and Find stay above a single scrolling list. At390x480 normal text at least200px list and three complete50px leaves are visible. The shared toggle artwork and44px hit areas remain unchanged; long names wrap alongside vertically centered rails.',
            requiredViewports: ['1280x720', '820x900', '390x844', '390x480'],
            expectedResponsiveChanges:
                'Sheet has12px side and8px bottom clearance, capped at600px height. Text125% must stay reachable with one scrolling surface; if fixed header cannot leave128px list context, switch to whole-sheet scrolling. Production desktop/tablet menus are untouched.',
            interactionChecks: [
                'Open Filters, Find Camera, select Include/Exclude without dismissal, selected-only and no-results recovery.',
                'Open each Scope/Type choice set, select and return; query and tag selections survive.',
                'Native keyboard radios, Escape and opener focus; scroll to last tag.',
            ],
            knownExclusions:
                'Synthetic local state only; no app integration, live writes, approved styling/timing goldens or persistence.',
        },
    },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ManyTags: Story = { args: {} };
export const Empty: Story = { args: { empty: true } };
export const SelectedOnly: Story = { args: { selectedOnly: true } };
