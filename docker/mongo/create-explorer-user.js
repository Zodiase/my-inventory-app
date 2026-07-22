/**
 * Reconciles the MongoDB account used by the opt-in data explorer.
 * The one-shot Compose service runs this with root access before Mongo Express.
 *
 * Belongs here: creating or rotating the explorer's inventory-app-only read user.
 * Does not belong here: application users, browser authentication, or write roles.
 */

const username = _getEnv('MONGO_EXPRESS_DB_USERNAME');
const password = _getEnv('MONGO_EXPRESS_DB_PASSWORD');

if (!username || !password) {
    throw new Error('MONGO_EXPRESS_DB_USERNAME and MONGO_EXPRESS_DB_PASSWORD are required');
}

const inventoryDatabase = db.getSiblingDB('inventory-app');
const roles = [{ role: 'read', db: 'inventory-app' }];

if (inventoryDatabase.getUser(username)) {
    inventoryDatabase.updateUser(username, { pwd: password, roles });
    print('Updated the Mongo Express read-only database user.');
} else {
    inventoryDatabase.createUser({ user: username, pwd: password, roles });
    print('Created the Mongo Express read-only database user.');
}
