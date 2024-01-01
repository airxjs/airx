import { AirxElement } from './element'
import { Plugin, PluginContext, render } from './render'

export * from './types'
export { Plugin } from './render'
export { createRef, Ref, watch } from './reactive'

export {
  Fragment,
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createApp(element: AirxElement<any>): AirxApp {
  const appContext = new PluginContext()
  const app: AirxApp = {
    plugin: (...plugins: Plugin[]) => {
      appContext.registerPlugin(...plugins)
      return app
    },

    mount: (container: HTMLElement) => {
      render(appContext, element, container)
      return app
    }
  }

  return app
}
