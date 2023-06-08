import * as symbol from './symbol'

/** TODO: 污染全局总是不好的 */
const globalContext = {
  dependencies: new Set<Ref<any>>()
}

export function createCollector() {
  const newDependencies = new Set<Ref<any>>()
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

function triggerRef<T = any>(ref: Ref<T>) {
  requestAnimationFrame(() => {
    const deps = Reflect.get(ref, symbol.airxReactiveDependenciesSymbol)
    for (const dep of deps) {
      dep()
    }
  })
}

interface Ref<T = any> {
  value: T
}

function createRefObject<T = any>(value: T): Ref<T> {
  const object = Object.create({ value })

  Reflect.defineProperty(object, symbol.airxReactiveDependenciesSymbol, {
    configurable: false,
    enumerable: false,
    writable: true,
    value: new Set()
  })

  return object
}

function isRefObject<T = any>(obj: unknown): obj is Ref<T> {
  return obj != null
    && typeof obj === 'object'
    && Reflect.has(obj, symbol.airxReactiveDependenciesSymbol)
}

export function watch<T = any>(ref: Ref<T>, listener: () => any) {
  const deps: Set<() => any> = Reflect.get(ref, symbol.airxReactiveDependenciesSymbol)
  deps.add(listener)
  return () => { deps.delete(listener) }
}

export function createRef<T extends unknown>(obj: T): Ref<T> {
  const ref = isRefObject<T>(obj) ? obj : createRefObject(obj)

  if (!globalContext.dependencies.has(ref)) {
    globalContext.dependencies.add(ref)
  }

  return new Proxy(ref, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      if (!globalContext.dependencies.has(ref)) {
        globalContext.dependencies.add(ref)
      }
      return result
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      triggerRef(target)
      return result
    },
  })
}
