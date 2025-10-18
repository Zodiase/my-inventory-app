/**
 * @file re-declares methods from 'meteor/react-meteor-data' to avoid TS errors.
 */

// @ts-expect-error: No type definitions for 'meteor/react-meteor-data'
import { useTracker as _useTracker } from 'meteor/react-meteor-data';

type UseTrackerType<R> = (reactiveFn: () => R, deps?: unknown[]) => R;

export const useTracker = <R>(reactiveFn: () => R, deps?: unknown[]): R => {
    return (_useTracker as unknown as UseTrackerType<R>)(reactiveFn, deps);
};
