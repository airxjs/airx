import type { Signal as Polyfill } from 'signal-polyfill'

import { onUnmounted } from './render'
import { createState, createWatch, isState } from './signal'

export interface Ref<T = unknown> {
  value: T
  readonly signal: Polyfill.State<T>
}

class LegacyRef<T> implements Ref<T> {
  readonly signal: Polyfill.State<T>

  constructor(initial: T) {
    this.signal = createState(initial)
  }

  get value(): T {
    return this.signal.get()
  }

  set value(next: T) {
    this.signal.set(next)
  }
}

export function createRef<T>(): Ref<T | undefined>
export function createRef<T>(initial: T): Ref<T>
export function createRef<T>(initial?: T): Ref<T | undefined> {
  return new LegacyRef(initial)
}

function resolveSignal<T>(target: Ref<T> | Polyfill.State<T>): Polyfill.State<T> {
  if (isState(target)) return target
  return target.signal
}

export function watch<T>(target: Ref<T> | Polyfill.State<T>, callback: (next: T, prev: T) => void): () => void {
  const signal = resolveSignal(target)
  let previous = signal.get()

  const watcher = createWatch(() => {
    const next = signal.get()
    const prev = previous
    previous = next
    callback(next, prev)
  })

  watcher.watch(signal)

  const dispose = () => {
    watcher.unwatch(signal)
  }

  try {
    onUnmounted(dispose)
  } catch {
    // Ignore when used outside of a component lifecycle context.
  }

  return dispose
}
