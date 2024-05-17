// Copy from https://github.com/proposal-signals/signal-utils/blob/460ee4da50f5b1c33f9da1fc07656ec88bc5de2a/src/subtle/microtask-effect.ts
import { Signal } from "signal-polyfill";

// NOTE: this implementation *LEAKS*
//       because there is nothing to unwatch a computed.

let pending = false;

const watcher = new Signal.subtle.Watcher(() => {
  if (!pending) {
    pending = true;
    queueMicrotask(() => {
      pending = false;
      flushPending();
    });
  }
});

function flushPending() {
  for (const signal of watcher.getPending()) {
    signal.get();
  }

  // Keep watching... we don't know when we're allowed to stop watching
  watcher.watch();
}

/**
 * ⚠️ WARNING: Nothing unwatches ⚠️
 * This will produce a memory leak.
 */
export function effect(cb: () => void) {
  const c = new Signal.Computed(() => cb());

  watcher.watch(c);

  c.get();

  return () => {
    watcher.unwatch(c);
  };
}
