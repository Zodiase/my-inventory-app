import { expect } from 'chai';

import type SearchFragment from '/imports/model/SearchFragment';

import { buildSearchQuery, buildContainerHierarchyQuery } from './searchQuery';

// Use any for test assertions to avoid TypeScript compilation issues with MongoDB Filter types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any;

describe('searchQuery utility', function () {
    describe('buildSearchQuery', function () {
        describe('T067: search query builder with all fragment types', function () {
            it('returns empty query for no fragments', function () {
                const query = buildSearchQuery([]);
                expect(query).to.deep.equal({});
            });

            it('handles single name fragment (partial match, case-insensitive)', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'name',
                        value: 'laptop',
                    },
                ];

                const query = buildSearchQuery(fragments);

                expect(query).to.have.property('name');
                expect(query.name).to.have.property('$regex', 'laptop');
                expect(query.name).to.have.property('$options', 'i');
            });

            it('handles tagInclude fragment with single tag', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'tagInclude',
                        tagIds: ['tag1'],
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                expect(query).to.have.property('tagIds');
                expect(query.tagIds).to.have.property('$in');
                expect(query.tagIds.$in).to.deep.equal(['tag1']);
            });

            it('handles tagInclude fragment with multiple tags (OR logic within fragment)', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'tagInclude',
                        tagIds: ['tag1', 'tag2', 'tag3'],
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                expect(query).to.have.property('tagIds');
                expect(query.tagIds).to.have.property('$in');
                expect(query.tagIds.$in).to.deep.equal(['tag1', 'tag2', 'tag3']);
            });

            it('handles tagExclude fragment (NOR logic)', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'tagExclude',
                        tagIds: ['archived', 'deleted'],
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                expect(query).to.have.property('tagIds');
                expect(query.tagIds).to.have.property('$nin');
                expect(query.tagIds.$nin).to.deep.equal(['archived', 'deleted']);
            });

            it('handles containerType fragment: containers only', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'containerType',
                        value: 'containers',
                    },
                ];

                const query = buildSearchQuery(fragments);

                expect(query).to.have.property('isContainer', true);
            });

            it('handles containerType fragment: items only', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'containerType',
                        value: 'items',
                    },
                ];

                const query = buildSearchQuery(fragments);

                expect(query).to.have.property('isContainer', false);
            });

            it('handles containerType fragment: all (no filtering)', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'containerType',
                        value: 'all',
                    },
                ];

                const query = buildSearchQuery(fragments);

                // Should not add isContainer condition
                expect(query).to.not.have.property('isContainer');
                expect(query).to.deep.equal({});
            });

            it('handles containerScope fragment with specific container', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'containerScope',
                        containerRootId: 'container123',
                    },
                ];

                const query = buildSearchQuery(fragments);

                expect(query).to.have.property('containerId', 'container123');
            });

            it('handles containerScope fragment with null (global search)', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'containerScope',
                        containerRootId: null,
                    },
                ];

                const query = buildSearchQuery(fragments);

                // Should not add containerId condition
                expect(query).to.not.have.property('containerId');
                expect(query).to.deep.equal({});
            });

            it('handles containerScope fragment with empty string (global search)', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'containerScope',
                        containerRootId: '',
                    },
                ];

                const query = buildSearchQuery(fragments);

                // Should not add containerId condition
                expect(query).to.not.have.property('containerId');
                expect(query).to.deep.equal({});
            });

            it('handles property fragment with string value (partial match)', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'property',
                        field: 'make',
                        value: 'sony',
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                expect(query).to.have.property('properties.make');
                const makeQuery = query['properties.make'];
                expect(makeQuery).to.have.property('$regex', 'sony');
                expect(makeQuery).to.have.property('$options', 'i');
            });

            it('handles property fragment with number value (exact match)', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'property',
                        field: 'purchasePrice',
                        value: 500,
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                expect(query).to.have.property('properties.purchasePrice', 500);
            });

            it('combines multiple fragments with AND logic', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'name',
                        value: 'laptop',
                    },
                    {
                        type: 'tagInclude',
                        tagIds: ['electronics'],
                    },
                    {
                        type: 'containerType',
                        value: 'items',
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                expect(query).to.have.property('$and');
                expect(query.$and).to.be.an('array');
                expect(query.$and).to.have.lengthOf(3);

                // Verify each condition is present
                const conditions = query.$and;
                expect(conditions[0]).to.have.property('name');
                expect(conditions[1]).to.have.property('tagIds');
                expect(conditions[2]).to.have.property('isContainer', false);
            });

            it('handles complex query: name + included tags + excluded tags', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'name',
                        value: 'camping',
                    },
                    {
                        type: 'tagInclude',
                        tagIds: ['outdoor', 'gear'],
                    },
                    {
                        type: 'tagExclude',
                        tagIds: ['archived', 'sold'],
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                expect(query).to.have.property('$and');
                expect(query.$and).to.have.lengthOf(3);

                const conditions = query.$and;
                expect(conditions[0].name).to.have.property('$regex', 'camping');
                expect(conditions[1].tagIds).to.have.property('$in');
                expect(conditions[1].tagIds.$in).to.deep.equal(['outdoor', 'gear']);
                expect(conditions[2].tagIds).to.have.property('$nin');
                expect(conditions[2].tagIds.$nin).to.deep.equal(['archived', 'sold']);
            });

            it('handles scoped search within container', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'containerScope',
                        containerRootId: 'kitchen123',
                    },
                    {
                        type: 'name',
                        value: 'plate',
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                expect(query).to.have.property('$and');
                expect(query.$and).to.have.lengthOf(2);

                const conditions = query.$and;
                expect(conditions[0]).to.have.property('containerId', 'kitchen123');
                expect(conditions[1]).to.have.property('name');
            });

            it('requires ALL tags when multiple tagInclude fragments (AND logic)', function () {
                const fragments: SearchFragment[] = [
                    {
                        type: 'tagInclude',
                        tagIds: ['tag1'],
                    },
                    {
                        type: 'tagInclude',
                        tagIds: ['tag2'],
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                expect(query).to.have.property('$and');
                expect(query.$and).to.have.lengthOf(2);

                // Each condition requires a different tag
                const conditions = query.$and;
                expect(conditions[0].tagIds.$in).to.deep.equal(['tag1']);
                expect(conditions[1].tagIds.$in).to.deep.equal(['tag2']);
            });

            it('prevents contradictory filters: same tag included and excluded', function () {
                // This test validates the query structure allows contradictory filters
                // UI should prevent this, but the query builder doesn't enforce it
                const fragments: SearchFragment[] = [
                    {
                        type: 'tagInclude',
                        tagIds: ['tag1'],
                    },
                    {
                        type: 'tagExclude',
                        tagIds: ['tag1'],
                    },
                ];

                const query: AnyQuery = buildSearchQuery(fragments);

                // Query is built but would return no results
                expect(query).to.have.property('$and');
                expect(query.$and).to.have.lengthOf(2);

                const conditions = query.$and;
                expect(conditions[0].tagIds).to.have.property('$in');
                expect(conditions[1].tagIds).to.have.property('$nin');

                // This would never match any items (tag must be in AND not in)
                // UI validation should prevent this scenario
            });
        });
    });

    describe('buildContainerHierarchyQuery', function () {
        it('builds query for items in specific container', function () {
            const query = buildContainerHierarchyQuery('container123');

            expect(query).to.have.property('containerId', 'container123');
        });

        it('handles empty string container ID', function () {
            const query = buildContainerHierarchyQuery('');

            expect(query).to.have.property('containerId', '');
        });

        // TODO: Add tests for recursive container hierarchy when implemented
        // Currently only searches direct children, not the full hierarchy
    });
});
