// https://github.com/proposal-signals/signal-polyfill/issues/10
import { Signal as Polyfill } from 'signal-polyfill'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalNS: any = (function () {
  // the only reliable means to get the global object is
  // `Function('return this')()`
  // However, this causes CSP violations in Chrome apps.
  if (typeof self !== 'undefined') {
    return self
  }
  if (typeof window !== 'undefined') {
    return window
  }
  if (typeof global !== 'undefined') {
    return global
  }
  throw new Error('unable to locate global object')
})()

export const globalSignal: typeof Polyfill = globalNS['Signal'] || Polyfill

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Signal {
  export class State<T> extends globalSignal.State<T> {}
  export class Computed<T> extends globalSignal.Computed<T> {}

  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace subtle {
    export class Watcher extends globalSignal.subtle.Watcher {}
  }
}
