import assert from 'node:assert/strict';
import { test } from 'node:test';

import { operationKind } from './inventory-agent-operations.mjs';

test('logical deletion operations require the CLI mutation gate', () => {
    assert.equal(operationKind('prepareDelete'), 'mutation');
    assert.equal(operationKind('confirmDelete'), 'mutation');
    assert.equal(operationKind('getDeleteResult'), 'read');
    assert.equal(operationKind('auditGet'), 'read');
    assert.equal(operationKind('delete'), undefined);
});
