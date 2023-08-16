import { AirxElement } from '../element'
import { innerRender } from './browser'

export {
  inject,
  provide,
  onMounted,
  onUnmounted
} from './common'

export { render } from './browser'
export { render as renderToString } from './server'

export function hydrate(element: AirxElement, domRef: HTMLElement) {
  const dom = document.createElement('div')
  innerRender(element, dom, { ensureRendered: true })
  domRef.replaceChildren()
  domRef.append(dom)
  return
}
