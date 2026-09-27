/**
 * Defines the inventory agent CLI operation policy independently of transport.
 * Keeping the allowlists importable lets tests prove that destructive requests
 * require the explicit mutation flag before the Docker client is invoked.
 */
export const READ_OPERATIONS = [
    'get',
    'auditGet',
    'lookup',
    'history',
    'status',
    'getDeleteResult',
    'children',
    'hierarchy',
    'getTag',
    'tags',
    'taggedItems',
];

export const MUTATION_OPERATIONS = [
    'create',
    'update',
    'move',
    'lock',
    'unlock',
    'bindIdentity',
    'createTag',
    'prepareDelete',
    'confirmDelete',
];

export const operationKind = (operation) => {
    if (READ_OPERATIONS.includes(operation)) return 'read';
    if (MUTATION_OPERATIONS.includes(operation)) return 'mutation';
    return undefined;
};
