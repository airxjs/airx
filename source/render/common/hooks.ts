import { AirxComponentContext } from '../../element'

interface GlobalContext {
  current: AirxComponentContext | null
}

export const globalContext: GlobalContext = {
  current: null
}

function useContext(): AirxComponentContext {
  if (globalContext.current == null) {
    throw new Error('Unable to find a valid component context')
  }

  return globalContext.current
}

export const onMounted: AirxComponentContext['onMounted'] = (listener) => {
  return useContext().onMounted(listener)
}

export const onUnmounted: AirxComponentContext['onUnmounted'] = (listener) => {
  return useContext().onUnmounted(listener)
}

export const inject: AirxComponentContext['inject'] = (key) => {
  return useContext().inject(key)
}

export const provide: AirxComponentContext['provide'] = (key, value) => {
  return useContext().provide(key, value)
}
