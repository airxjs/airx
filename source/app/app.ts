import { browserRender, serverRender, Plugin, PluginContext } from '../render'
import { AirxComponent, AirxElement, createElement } from '../element'

/**
 * Airx 应用实例。
 *
 * @example
 * import { createApp } from 'airx'
 * import { App } from './App'
 *
 * createApp(App).mount(document.getElementById('root')!)
 */
export interface AirxApp {
  mount: (container: HTMLElement) => AirxApp

  /** @deprecated WIP */
  plugin: (...plugins: Plugin[]) => AirxApp
  /** @deprecated WIP */
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
 * import { App } from './App'
 *
 * createApp(App).mount(document.getElementById('root')!)
 *
 * @example
 * import { createApp, createElement } from 'airx'
 * import { App } from './App'
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
