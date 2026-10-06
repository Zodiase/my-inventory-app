const {useReducer,useEffect,useRef,useMemo}=React;
// Warns if data is a Mongo.Cursor or a POJO containing a Mongo.Cursor.
function checkCursor(data) {
  let shouldWarn = false;
  if (Package.mongo && Package.mongo.Mongo && data && typeof data === 'object') {
    if (data instanceof Package.mongo.Mongo.Cursor) {
      shouldWarn = true;
    } else if (Object.getPrototypeOf(data) === Object.prototype) {
      Object.keys(data).forEach(key => {
        if (data[key] instanceof Package.mongo.Mongo.Cursor) {
          shouldWarn = true;
        }
      });
    }
  }
  if (shouldWarn) {
    console.warn('Warning: your reactive function is returning a Mongo cursor. ' + 'This value will not be reactive. You probably want to call ' + '`.fetch()` on the cursor before returning it.');
  }
}
// Used to create a forceUpdate from useReducer. Forces update by
// incrementing a number whenever the dispatch method is invoked.
const fur = x => x + 1;
const useForceUpdate = () => useReducer(fur, 0)[1];
const useTrackerNoDeps = function (reactiveFn) {
  let skipUpdate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  const {
    current: refs
  } = useRef({
    isMounted: false,
    trackerData: null
  });
  const forceUpdate = useForceUpdate();
  // Without deps, always dispose and recreate the computation with every render.
  if (refs.computation) {
    refs.computation.stop();
    // @ts-ignore This makes TS think ref.computation is "never" set
    delete refs.computation;
  }
  // Use Tracker.nonreactive in case we are inside a Tracker Computation.
  // This can happen if someone calls `ReactDOM.render` inside a Computation.
  // In that case, we want to opt out of the normal behavior of nested
  // Computations, where if the outer one is invalidated or stopped,
  // it stops the inner one.
  Tracker.nonreactive(() => Tracker.autorun(c => {
    refs.computation = c;
    const data = reactiveFn(c);
    if (c.firstRun) {
      // Always run the reactiveFn on firstRun
      refs.trackerData = data;
    } else if (!skipUpdate || !skipUpdate(refs.trackerData, data)) {
      // For any reactive change, forceUpdate and let the next render rebuild the computation.
      forceUpdate();
    }
  }));
  // To clean up side effects in render, stop the computation immediately
  if (!refs.isMounted) {
    Meteor.defer(() => {
      if (!refs.isMounted && refs.computation) {
        refs.computation.stop();
        delete refs.computation;
      }
    });
  }
  useEffect(() => {
    // Let subsequent renders know we are mounted (render is committed).
    refs.isMounted = true;
    // In some cases, the useEffect hook will run before Meteor.defer, such as
    // when React.lazy is used. In those cases, we might as well leave the
    // computation alone!
    if (!refs.computation) {
      // Render is committed, but we no longer have a computation. Invoke
      // forceUpdate and let the next render recreate the computation.
      if (!skipUpdate) {
        forceUpdate();
      } else {
        Tracker.nonreactive(() => Tracker.autorun(c => {
          const data = reactiveFn(c);
          refs.computation = c;
          if (!skipUpdate(refs.trackerData, data)) {
            // For any reactive change, forceUpdate and let the next render rebuild the computation.
            forceUpdate();
          }
        }));
      }
    }
    // stop the computation on unmount
    return () => {
      var _refs$computation;
      (_refs$computation = refs.computation) === null || _refs$computation === void 0 ? void 0 : _refs$computation.stop();
      delete refs.computation;
      refs.isMounted = false;
    };
  }, []);
  return refs.trackerData;
};
const useTrackerWithDeps = function (reactiveFn, deps) {
  let skipUpdate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  const forceUpdate = useForceUpdate();
  const {
    current: refs
  } = useRef({
    reactiveFn
  });
  // keep reactiveFn ref fresh
  refs.reactiveFn = reactiveFn;
  useMemo(() => {
    // To jive with the lifecycle interplay between Tracker/Subscribe, run the
    // reactive function in a computation, then stop it, to force flush cycle.
    const comp = Tracker.nonreactive(() => Tracker.autorun(c => {
      const data = refs.reactiveFn();
      if (c.firstRun) {
        refs.data = data;
      } else if (!skipUpdate || !skipUpdate(refs.data, data)) {
        refs.data = data;
        forceUpdate();
      }
    }));
    // Stop the computation immediately to avoid creating side effects in render.
    // refers to this issues:
    // https://github.com/meteor/react-packages/issues/382
    // https://github.com/meteor/react-packages/issues/381
    if (refs.comp) refs.comp.stop();
    // In some cases, the useEffect hook will run before Meteor.defer, such as
    // when React.lazy is used. This will allow it to be stopped earlier in
    // useEffect if needed.
    refs.comp = comp;
    // To avoid creating side effects in render, stop the computation immediately
    Meteor.defer(() => {
      if (!refs.isMounted && refs.comp) {
        refs.comp.stop();
        delete refs.comp;
      }
    });
  }, deps);
  useEffect(() => {
    // Let subsequent renders know we are mounted (render is committed).
    refs.isMounted = true;
    if (!refs.comp) {
      refs.comp = Tracker.nonreactive(() => Tracker.autorun(c => {
        const data = refs.reactiveFn(c);
        if (!skipUpdate || !skipUpdate(refs.data, data)) {
          refs.data = data;
          forceUpdate();
        }
      }));
    }
    return () => {
      refs.comp.stop();
      delete refs.comp;
      refs.isMounted = false;
    };
  }, deps);
  return refs.data;
};
function useTrackerClient(reactiveFn) {
  let deps = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let skipUpdate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  if (deps === null || deps === undefined || !Array.isArray(deps)) {
    if (typeof deps === "function") {
      skipUpdate = deps;
    }
    return useTrackerNoDeps(reactiveFn, skipUpdate);
  } else {
    return useTrackerWithDeps(reactiveFn, deps, skipUpdate);
  }
}

const useTracker=useTrackerClient;
const useSubscribeClient = function (name) {
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }
  let updateOnReady = false;
  let subscription;
  const isReady = useTracker(() => {
    if (!name) return true;
    subscription = Meteor.subscribe(name, ...args);
    return subscription.ready();
  }, () => !updateOnReady);
  return () => {
    updateOnReady = true;
    return !isReady;
  };
};

window.installedHooks={useTracker:useTrackerClient,useSubscribe:useSubscribeClient};