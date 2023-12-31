import { render } from './render'
import { Plugin } from './render/common/plugin'
import { RenderContext } from './render/common/context'
import { AirxElement } from './element'

export * from './types'

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
  const appContext = new RenderContext()
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
