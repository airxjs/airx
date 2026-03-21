export * from './types'
export { type Plugin } from './render'
export { type AirxApp, createApp } from './app'

export {
  Fragment,
  component,
  createElement,
  type AirxComponent,
  type AirxElement,
  type AirxChildren,
  type AirxComponentContext
} from './element'

export {
  inject,
  provide,
  onMounted,
  onUnmounted
} from './render'

export {
  createRef,
  watch,
  type Ref
} from './legacy'
