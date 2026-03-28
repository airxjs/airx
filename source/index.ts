/**
 * JSX/DOM 属性类型定义。
 */
export * from './types/index.js'

/**
 * 渲染插件类型。
 */
export { type Plugin } from './render/index.js'

/**
 * 应用入口 API。
 *
 * @example
 * import { createApp } from 'airx'
 * import { App } from './App.js'
 *
 * createApp(App).mount(document.getElementById('root')!)
 */
export { type AirxApp, createApp } from './app/index.js'

/**
 * 节点和组件 API。
 *
 * @example
 * import { createElement, component } from 'airx'
 *
 * const Title = component((props: { text: string }) => {
 *   return () => createElement('h1', null as never, props.text)
 * })
 */
export {
  Fragment,
  component,
  createElement,
  type AirxComponent,
  type AirxElement,
  type AirxChildren,
  type AirxComponentContext
} from './element/index.js'

/**
 * 组件上下文 Hook API。
 *
 * @example
 * import { provide, inject } from 'airx'
 *
 * provide('lang', 'en')
 * const lang = inject<string>('lang')
 */
export {
  inject,
  provide,
  onMounted,
  onUnmounted
} from './render/index.js'
