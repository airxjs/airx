import * as symbol from './symbol'

/** TODO: 污染全局总是不好的 */
const globalContext = {
  dependencies: new Set<Ref<unknown>>()
}

export function createCollector() {
  const newDependencies = new Set<Ref<unknown>>()
  return {
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

function triggerRef<T = unknown>(ref: Ref<T>) {
  requestAnimationFrame(() => {
    const deps = Reflect.get(ref, symbol.airxReactiveDependenciesSymbol)
    for (const dep of deps) {
      dep()
    }
  })
}

export interface Ref<T = unknown> {
  value: T
}

function createRefObject<T = unknown>(value: T): Ref<T> {
  const object = Object.create({ value })

  Reflect.defineProperty(object, symbol.airxReactiveDependenciesSymbol, {
    configurable: false,
    enumerable: false,
    writable: true,
    value: new Set()
  })

  return object
}

export function watch<T = unknown>(ref: Ref<T>, listener: () => unknown) {
  const deps: Set<() => unknown> = Reflect.get(ref, symbol.airxReactiveDependenciesSymbol)
  deps.add(listener)
  return () => { deps.delete(listener) }
}

export function createRef<T>(obj: T): Ref<T> {
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
      return value
    }
  })

  return ref
}
