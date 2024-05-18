// https://github.com/proposal-signals/signal-polyfill/issues/10
import type { Signal as Polyfill } from 'signal-polyfill'

export declare type Watcher = Polyfill.subtle.Watcher

let firstSignal: typeof Polyfill | undefined = undefined

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

function getSignal() {
  const globalSignal: typeof Polyfill = globalNS['Signal']
  if (globalSignal == null) throw new Error('Signal is undefined')
  if (firstSignal == null) firstSignal = globalSignal
  if (firstSignal !== globalSignal) throw new Error('Signal have multiple instances')

  return globalSignal
}

export function createWatch(notify: (this: Polyfill.subtle.Watcher) => void): Polyfill.subtle.Watcher {
  const signal = getSignal()
  return new signal.subtle.Watcher(notify)
}

export function createState<T>(initial: T, options?: Polyfill.Options<T> | undefined): Polyfill.State<T> {
  const signal = getSignal()
  return new signal.State(initial, options)
}

export function createComputed<T>(computation: () => T, options?: Polyfill.Options<T> | undefined): Polyfill.Computed<T> {
  const signal = getSignal()
  return new signal.Computed(computation, options)
}

export function isState<T>(target: unknown): target is Polyfill.State<T> {
  const signal = getSignal()
  return target instanceof signal.State
}
