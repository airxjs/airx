import { AirxComponentContext } from '../../../element'

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

/**
 * 注册组件挂载后回调。
 *
 * 回调返回函数时，该函数会在组件卸载时自动执行。
 *
 * @example
 * import { onMounted } from 'airx'
 *
 * function Comp() {
 *   onMounted(() => {
 *     const timer = setInterval(() => console.log('tick'), 1000)
 *     return () => clearInterval(timer)
 *   })
 *
 *   return () => 'content'
 * }
 */
export const onMounted: AirxComponentContext['onMounted'] = (listener) => {
  return useContext().onMounted(listener)
}

/**
 * 注册组件卸载前回调。
 *
 * @example
 * import { onUnmounted } from 'airx'
 *
 * function Comp() {
 *   onUnmounted(() => {
 *     console.log('component is about to be removed')
 *   })
 *
 *   return () => 'content'
 * }
 */
export const onUnmounted: AirxComponentContext['onUnmounted'] = (listener) => {
  return useContext().onUnmounted(listener)
}

/**
 * 从当前组件上下文读取依赖。
 *
 * @example
 * import { inject } from 'airx'
 *
 * const user = inject<{ name: string }>('user')
 */
export const inject: AirxComponentContext['inject'] = (key) => {
  return useContext().inject(key)
}

/**
 * 在当前组件上下文提供依赖。
 *
 * 返回一个更新器，可用于后续更新该依赖值。
 *
 * @example
 * import { provide } from 'airx'
 *
 * const updateTheme = provide('theme', 'light')
 * updateTheme('dark')
 */
export const provide: AirxComponentContext['provide'] = (key, value) => {
  return useContext().provide(key, value)
}
