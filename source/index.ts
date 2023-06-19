import { AirxElement } from './element'
import { render } from './render'

export * from './types'

export { createRef } from './reactive'

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
    }
  }

  return app
}
