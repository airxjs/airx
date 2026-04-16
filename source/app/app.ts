import { browserRender, serverRender, Plugin, PluginContext } from '../render/index.js'
import { AirxComponent, AirxElement, createElement } from '../element/index.js'
import { setLogLevel, LogLevel } from '../logger/logger.js'

/**
 * Airx 应用实例。
 *
 * @example
 * import { createApp } from 'airx'
 * import { App } from './App.js'
 *
 * createApp(App).mount(document.getElementById('root')!)
 */
export interface AirxApp {
  mount: (container: HTMLElement) => AirxApp
  debug: (level?: LogLevel) => AirxApp

  /**
   * 注册插件，返回 app 实例以支持链式调用。
   *
   * @example
   * import { createApp } from 'airx'
   * import { customPlugin } from './plugins'
   *
   * createApp(App).plugin(customPlugin).mount(...)
   */
  plugin: (...plugins: Plugin[]) => AirxApp

  /**
   * 将应用渲染为 HTML 字符串（SSR）。
   *
   * @example
   * const html = await createApp(App).renderToHTML()
   */
  renderToHTML: () => Promise<string>
}

/**
 * 创建一个 Airx 应用。
 *
 * 支持直接传入组件函数，也支持传入已经创建好的元素。
 *
 * @param element 根组件或根元素。
 * @returns 可继续链式调用的应用实例。
 *
 * @example
 * import { createApp } from 'airx'
 * import { App } from './App.js'
 *
 * createApp(App).mount(document.getElementById('root')!)
 *
 * @example
 * import { createApp, createElement } from 'airx'
 * import { App } from './App.js'
 *
 * const appElement = createElement(App, { title: 'Airx' })
 * createApp(appElement).mount(document.getElementById('root')!)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createApp(element: AirxElement<any> | AirxComponent): AirxApp {
  const appContext = new PluginContext()

  const ensureAsElement = (element: AirxElement | AirxComponent): AirxElement => {
    if (typeof element === 'function') {
      return createElement(element, {})
    }

    return element
  }

  const app: AirxApp = {
    debug: (level: LogLevel = 'debug') => {
      setLogLevel(level)
      return app
    },

    plugin: (...plugins: Plugin[]) => {
      appContext.registerPlugin(...plugins)
      return app
    },

    mount: (container: HTMLElement) => {
      container.innerHTML = '' // 先清空再说
      browserRender(appContext, ensureAsElement(element), container)
      return app
    },

    renderToHTML: (): Promise<string> => {
      return new Promise<string>(resolve => {
        serverRender(appContext, ensureAsElement(element), resolve)
      })
    }
  }

  return app
}
