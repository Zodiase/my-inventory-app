/** Installed no-deps body for controlled App fixture; only ready read is gated/recorded. */
/* eslint-disable no-var, prefer-rest-params */
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';

import { observeReady } from './e2eControlledApp';
// The following installed-generated body stays exact except the reviewed ready observer.
/* eslint-disable no-underscore-dangle, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/init-declarations, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-argument */
const useSubscribeClient = function (name) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
    }
    let updateOnReady = false;
    let subscription;
    const isReady = useTracker(
        () => {
            if (!name) return true;
            subscription = Meteor.subscribe(name, ...args);
            return observeReady(name, subscription.ready(), subscription);
        },
        () => !updateOnReady
    );
    return () => {
        updateOnReady = true;
        return !isReady;
    };
};
/* eslint-enable no-underscore-dangle, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/init-declarations, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-argument */
export const useControlledOriginalRootReadiness = useSubscribeClient;
/** @param {string} name */
export function useControlledRetainedRootReadiness(name) {
    const loading = useTracker(() => {
        const subscription = Meteor.subscribe(name);
        return !observeReady(name, subscription.ready(), subscription);
    }, [name]);
    return () => loading;
}
