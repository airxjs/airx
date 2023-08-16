import { AirxElement } from './element'
import { render, renderToString, hydrate } from './render'

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
  // plugin: (plugins: Plugin[]) => AirxApp
  mount: (container: HTMLElement) => AirxApp
  hydrate: (container: HTMLElement) => AirxApp
  renderToString: () => string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createApp(element: AirxElement<any>): AirxApp {
  const app: AirxApp = {
    // plugin: (plugins) => {
    //   console.log(plugins)
    //   return app
    // },

    mount: (container: HTMLElement) => {
      render(element, container)
      return app
    },
    hydrate: (container: HTMLElement) => {
      hydrate(element, container)
      return app
    },
    renderToString: () => {
      return renderToString(element) || ''
    }
  }

  return app
}
