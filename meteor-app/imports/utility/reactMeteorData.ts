/**
 * @file re-declares methods from 'meteor/react-meteor-data' to avoid TS errors.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Meteor package imports may not resolve correctly in all environments
import { useTracker as _useTracker, useSubscribe as _useSubscribe } from 'meteor/react-meteor-data';

type UseTrackerType<R> = (reactiveFn: () => R, deps?: unknown[]) => R;
type UseSubscribeType = (name: string, ...args: unknown[]) => () => boolean;

export const useTracker = <R>(reactiveFn: () => R, deps?: unknown[]): R => {
    return (_useTracker as unknown as UseTrackerType<R>)(reactiveFn, deps);
};

export const useSubscribe: UseSubscribeType = (name: string, ...args: unknown[]): (() => boolean) => {
    return (_useSubscribe as unknown as UseSubscribeType)(name, ...args);
};
