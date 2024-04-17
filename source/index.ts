import { AirxComponent, AirxElement, createElement } from './element'
import { Plugin, PluginContext } from './render'
import { browserRender, serverRender } from './render'

export * from './types'
export { Plugin } from './render'
export { createSignal, Signal, watchSignal } from './reactive'

export {
  Fragment,
  component,
  createElement,
  AirxComponent,
  AirxElement,
  AirxChildren,
  AirxComponentContext
} from './element'

export {
  inject,
  provide,
  onMounted,
  onUnmounted
} from './render'

export interface AirxApp {
  plugin: (...plugins: Plugin[]) => AirxApp
  mount: (container: HTMLElement) => AirxApp
  renderToHTML: () => Promise<string>
}

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
