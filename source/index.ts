import { Plugin } from './plugin'
import { AirxElement } from './element'
import { render } from './render'

export * from './types'

export { render } from './render'
export { createRef } from './reactive'
export {
  Fragment,
  createElement,
  AirxComponent,
  AirxElement,
  AirxChildren,
  AirxComponentContext
} from './element'

export interface AirxApp {
  plugin: (plugins: Plugin[]) => AirxApp
  mount: (container: HTMLElement) => AirxApp
}


export function createApp(element: AirxElement<any>): AirxApp {

  const app: AirxApp = {
    plugin: (plugins) => {
      console.log(plugins)
      return app
    },

    mount: (container: HTMLElement) => {
      const root = render(element, container)
      console.log('root', root)
      return app
    }
  }

  return app
}
