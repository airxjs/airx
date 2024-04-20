import * as symbol from './symbol'

/** FIXME: 污染全局总是不好的 */
const globalContext = {
  dependencies: new Set<Signal<unknown>>()
}

export function createCollector() {
  const newDependencies = new Set<Signal<unknown>>()
  return {
    clear: () => newDependencies.clear(),
    complete: () => [...newDependencies.values()],
    collect: <R = unknown>(process: () => R) => {
      const beforeDeps = globalContext.dependencies
      globalContext.dependencies = newDependencies
      const result = process()
      globalContext.dependencies = beforeDeps
      return result
    }
  }
}

function triggerRef<T = unknown>(ref: Signal<T>) {
  requestAnimationFrame(() => {
    const deps = Reflect.get(ref, symbol.airxReactiveDependenciesSymbol)
    for (const dep of deps) {
      try { dep() }
      catch (error) { console.log(error) }
    }
  })
}

export interface Signal<T = unknown> {
  value: T
}

function createRefObject<T = unknown>(value: T): Signal<T> {
  const object = Object.create({ value })

  Reflect.defineProperty(object, symbol.airxReactiveDependenciesSymbol, {
    configurable: false,
    enumerable: false,
    writable: true,
    value: new Set()
  })

  return object
}

export function watchSignal<T = unknown>(ref: Signal<T>, listener: () => unknown) {
  const deps: Set<() => unknown> = Reflect.get(ref, symbol.airxReactiveDependenciesSymbol)
  deps.add(listener)
  return () => { deps.delete(listener) }
}

export function createSignal<T>(obj: T): Signal<T> {
  const ref = createRefObject(obj)

  if (!globalContext.dependencies.has(ref)) {
    globalContext.dependencies.add(ref)
  }

  let value: T = ref.value

  Reflect.defineProperty(ref, 'value', {
    get() {
      if (!globalContext.dependencies.has(ref)) {
        globalContext.dependencies.add(ref)
      }
      return value
    },
    set(newValue) {
      value = newValue
      triggerRef(ref)
    }
  })

  return ref
}
