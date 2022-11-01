import assert from 'assert';

import { Meteor } from 'meteor/meteor';

describe('meteor-app', function () {
    it('package.json has correct name', async function () {
        const { name } = await import('../package.json');
        assert.strictEqual(name, 'my-inventory-app');
    });

    if (Meteor.isClient) {
        it('client is not server', function () {
            assert.strictEqual(Meteor.isServer, false);
        });
    }

    if (Meteor.isServer) {
        it('server is not client', function () {
            assert.strictEqual(Meteor.isClient, false);
        });
    }
});
