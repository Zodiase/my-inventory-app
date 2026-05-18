/**
 * Search fragment types for building complex search queries.
 *
 * @remarks
 * Each fragment represents a single search criterion. Multiple fragments can be
 * combined with AND logic to create complex queries. Fragments are converted to
 * MongoDB queries by the searchQuery utility.
 *
 * The fragment system provides:
 * - Type-safe search query building
 * - Clear separation of search concerns
 * - Easy serialization for URL parameters or storage
 * - Composable search logic
 */

/**
 * Base interface for all search fragments.
 *
 * @remarks
 * Each fragment type has a unique `type` field for discriminated union typing.
 */
export interface BaseSearchFragment {
    type: string;
}

/**
 * Search for items by name (partial match, case-insensitive).
 *
 * @remarks
 * Uses regex matching to find items whose names contain the search text.
 * The search is case-insensitive by default.
 *
 * @example
 * ```typescript
 * const fragment: NameFragment = {
 *   type: 'name',
 *   value: 'laptop'
 * };
 * // Matches: "Gaming Laptop", "Old laptop", "Laptop Bag", etc.
 * ```
 */
export interface NameFragment extends BaseSearchFragment {
    type: 'name';
    value: string;
}

/**
 * Search for items with ANY of the specified tags (OR logic).
 *
 * @remarks
 * Items must have at least one of the specified tags to match.
 * Use multiple TagIncludeFragments in the same query to require ALL tags (AND logic).
 *
 * @example
 * ```typescript
 * const fragment: TagIncludeFragment = {
 *   type: 'tagInclude',
 *   tagIds: ['tag1', 'tag2']
 * };
 * // Matches items with tag1 OR tag2
 * ```
 */
export interface TagIncludeFragment extends BaseSearchFragment {
    type: 'tagInclude';
    tagIds: string[];
}

/**
 * Search for items WITHOUT any of the specified tags (NOR logic).
 *
 * @remarks
 * Items must not have ANY of the specified tags to match.
 *
 * @example
 * ```typescript
 * const fragment: TagExcludeFragment = {
 *   type: 'tagExclude',
 *   tagIds: ['archived', 'deleted']
 * };
 * // Matches items without 'archived' AND without 'deleted'
 * ```
 */
export interface TagExcludeFragment extends BaseSearchFragment {
    type: 'tagExclude';
    tagIds: string[];
}

/**
 * Filter by container type (containers only, items only, or all).
 *
 * @remarks
 * - 'containers': Only items with isContainer=true
 * - 'items': Only items with isContainer=false
 * - 'all': No filtering on container type
 *
 * @example
 * ```typescript
 * const fragment: ContainerTypeFragment = {
 *   type: 'containerType',
 *   value: 'containers'
 * };
 * // Matches only items that are containers (boxes, bags, etc.)
 * ```
 */
export interface ContainerTypeFragment extends BaseSearchFragment {
    type: 'containerType';
    value: 'containers' | 'items' | 'all';
}

/**
 * Search within a specific container (and its descendants).
 *
 * @remarks
 * This creates a scoped search rooted at a container. Only items within the
 * specified container (or its sub-containers) are searched.
 *
 * A null or empty containerRootId means search all items (no container scope).
 *
 * @example
 * ```typescript
 * const fragment: ContainerScopeFragment = {
 *   type: 'containerScope',
 *   containerRootId: 'container-abc123'
 * };
 * // Matches only items inside container-abc123 or its sub-containers
 * ```
 */
export interface ContainerScopeFragment extends BaseSearchFragment {
    type: 'containerScope';
    containerRootId: string | null;
}

/**
 * Search for items by property field (make, model, etc.).
 *
 * @remarks
 * Searches in the embedded properties document. The search is case-insensitive
 * partial match for string fields. For numeric fields (purchasePrice, marketValue),
 * exact match is used.
 *
 * @example
 * ```typescript
 * const fragment: PropertyFragment = {
 *   type: 'property',
 *   field: 'make',
 *   value: 'apple'
 * };
 * // Matches items with properties.make containing 'apple' (case-insensitive)
 * ```
 */
export interface PropertyFragment extends BaseSearchFragment {
    type: 'property';
    field: 'serialNumber' | 'make' | 'model' | 'purchaseFrom' | 'purchasePrice' | 'marketValue' | 'condition';
    value: string | number;
}

/**
 * Union type of all search fragment types.
 *
 * @remarks
 * This is a discriminated union where the `type` field determines which
 * fragment interface applies.
 */
export type SearchFragment =
    | NameFragment
    | TagIncludeFragment
    | TagExcludeFragment
    | ContainerTypeFragment
    | ContainerScopeFragment
    | PropertyFragment;

export default SearchFragment;
